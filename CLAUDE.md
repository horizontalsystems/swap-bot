# USwap-bot

Telegram, SimpleX, and Signal bots for cross-chain swaps via the [swap API](https://swap-api.unstoppable.money/v1).

## Commands

```bash
npm run dev              # Telegram bot only, hot reload (nodemon + ts-node src/bot.ts)
npm run build            # tsc → dist/
npm run start            # node dist/bot.js          (Telegram)
npm run start:simplex    # node dist/simplex-bot.js  (SimpleX)
npm run start:signal     # node dist/signal-bot.js   (Signal)
npx prettier --write .   # no lint script; prettier config: no semicolons, single quotes, 120 cols
npx ts-node src/scripts/update-profile.ts   # set SimpleX bot display name/avatar
```

There is no test suite and no test framework installed. Verification is manual: run a bot against the live
swap API and walk the flow.

The SimpleX bot needs a running SimpleX CLI websocket (`SIMPLEX_WS_URL`, default `ws://localhost:3030`) with an
active user; the Signal bot needs a `signal-cli daemon --tcp` (Java 25+) on `SIGNAL_RPC_HOST:SIGNAL_RPC_PORT`.
Neither is started by this repo. See README.md for signal-cli registration/linking.

Production is pm2 via `ecosystem.config.js` (`swap-bot-tg`, `swap-bot-simplex`, `swap-bot-signal`).

## Architecture

Three chat bots over one shared swap core.

```
src/bot.ts          src/simplex-bot.ts       src/signal-bot.ts        ← process entrypoints
scenes/swap/index.ts  scenes/swap/simplex.ts  scenes/swap/signal.ts   ← per-platform swap UI
                    scenes/swap/helpers.ts                            ← shared formatting/labels
      db/ (sqlite cache)  services/ (token-sync, prices)  utils/ (api, memoless-api, addressValidator)
      config/assets.ts (provider + featured allowlists)   config/locales/ (en, ru, zh, fa)
```

Every entrypoint follows the same shape: `syncTokensAtStartup()` → `startPeriodicSync()` → connect → on
transport loss `process.exit(1)` so pm2 restarts with a fresh connection → SIGINT/SIGTERM shutdown closes the DB.

### The swap flow is implemented three times

`scenes/swap/index.ts` is a Telegraf `WizardScene` (inline keyboards, one edited message, callback actions).
`simplex.ts` and `signal.ts` are hand-rolled `SwapStep` enum state machines over an in-memory
`Map<contactId, session>` with a 30-minute timeout swept by `cleanupSessions`, driven by numeric menu choices
and single-letter commands (`s` new swap, `c` cancel, `b` back, `r` reset search, `f` FAQ, `y` confirm).

**A change to the swap flow almost always needs the same edit in all three files.** They deliberately share only
`helpers.ts`, the strings, and the util/db layer — the message-building code is duplicated near-verbatim between
`simplex.ts` and `signal.ts`.

Platform quirks: Signal renders plain text, so `toPlainText()` strips markdown before sending and QR codes go out
as a temp-file attachment; SimpleX sends base64 images inline; Telegram sends a photo with a Markdown caption.
SimpleX and Signal hardcode `s('en')`; only Telegram localizes (from `ctx.from.language_code`).

In the Telegram wizard, step indices are hardcoded (`ctx.wizard.selectStep(n)`, `ctx.wizard.cursor === n`).
Inserting or removing a step means updating the `go_back` switch, every `selectStep` call, and the action handlers.

### Quotes, providers, and the THORChain special case

`utils/api.ts` talks to `https://swap-api.unstoppable.money/v1` with `x-api-key` (`SWAP_API_KEY`). The same
`/quote` endpoint is called twice: `dry: true` to list routes, `dry: false` on confirm to commit the order.
A 404 from `/quote` means all providers failed and is converted to `{ routes: [], providerErrors }` rather than thrown.

Provider selection: intersection of both assets' `providers` arrays (`getProvidersForPair`), filtered by
`ALLOWED_PROVIDERS` in `config/assets.ts`. `THORCHAIN` is additionally dropped unless **both** assets are in the
memoless-assets table.

THORChain routes carry a `memo` that a chat user cannot attach to a transfer, so they go through the separate
memoless API (`utils/memoless-api.ts`, `https://swap.unstoppable.money/memoless/api/v1`, no API key):
`register(asset, memo, amount)` → `preflight(asset, reference, amount)` → inbound address, QR, and an **exact**
send amount that encodes the memo. That is why THORChain confirmations show `amountWarning` — sending a different
amount breaks the swap. Non-THORChain routes get their QR/inbound address straight from the route.

Other provider-conditional behavior: a refund address is required for every provider except THORCHAIN;
`amlFlaggedAddress()` prechecks destination+refund before committing (only for providers in
`AML_PRECHECK_PROVIDERS`, and never blocks on an inconclusive result or a service error); `buildTrackUrl()`
keys the tracking link on deposit address for THORCHAIN/NEAR and on `providerSwapId` for everyone else.

### SQLite is a disposable cache

`db/database.ts` **drops and recreates `tokens` and `memoless_assets` on every `getDb()` init** — the DB holds
nothing but the last token sync (hourly, `SYNC_INTERVAL_MS`). The file lives next to the compiled module, so all
three production bots share `dist/db/swap-bot.db` and each one wipes the tables when it starts. It is gitignored.
`syncTokensAtStartup()` tolerates an API outage only if tokens are already cached.

Prices come from a different service entirely (`services/prices.ts`, blocksdecoded, 5-minute in-memory cache,
keyed by `coingeckoId`); a missing price degrades to hiding USD values, never blocks a swap.

### Strings and i18n

`config/locales/{en,ru,zh,fa}.ts` must all export the **same key set** — `Strings` is typed from `en`, so a
missing key in another locale is a compile error, and an extra one is silently unused. `t(template, vars)`
interpolates `{name}` placeholders. Several messages are post-processed with regex (dropping the min-receive line
when it equals the expected amount, dropping the refund line when there is no refund address); if you reword
those templates, check the regexes in `showSummary`/`confirm_swap` and their SimpleX/Signal equivalents.

### Address validation

`utils/addressValidator.ts` maps the chain prefix of an identifier (`BTC.BTC` → `BTC`) to a per-chain validator
and returns a human-readable hint string on failure, `null` on success. Unknown chains fall through to a
length-only check, so adding a chain to `FEATURED_IDENTIFIERS` without a validator silently accepts junk addresses.

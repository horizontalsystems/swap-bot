# USwap-bot

Telegram, SimpleX, and Signal bots for cross-chain swaps via the [swap API](https://swap-api.unstoppable.money/v2).

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

Every entrypoint follows the same shape: `useApiKeyFor(<platform>)` → `syncTokensAtStartup()` →
`startPeriodicSync()` → connect → on transport loss `process.exit(1)` so pm2 restarts with a fresh connection →
SIGINT/SIGTERM shutdown closes the DB.

`useApiKeyFor()` selects that process's swap API key (`SWAP_API_KEY_TELEGRAM` / `_SIMPLEX` / `_SIGNAL`), so the
three bots bill and rate-limit separately. There is no shared fallback key: the call throws when its key is
missing, and `getApiKey()` throws when no platform was selected at all — so a misconfigured bot dies at startup
instead of on the user's first quote. It must run after `dotenv.config()` and before the first request.

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

`utils/api.ts` talks to the aggregator's **v2** API, `https://swap-api.unstoppable.money/v2`, with `x-api-key`
(the calling bot's own key, see `useApiKeyFor` above). v2 splits pricing from committing:

- `POST /rate` (`fetchRate`) — read-only fan-out across providers, returns `{ routes, providerErrors }`. A 404
  means every provider declined and is converted to an empty route list rather than thrown.
- `POST /swap` (`fetchSwap`) — commits against **one** provider, creates the real order, and returns the
  executable route **directly** (no `{ routes }` wrapper) with an `execution` block and a `uuid`. Any non-2xx is
  the provider's own error body; `providerErrorMessage` turns it into the string the user sees.

The route fields that matter downstream: `expectedBuyAmount` is already net of fees (rank on it), `expiresAt` is
epoch **milliseconds**, and `minBuyAmount` is the enforced floor — **null whenever nothing enforces one**, which
is every floating-rate P2P quote. `buildMinLine` turns those three states (no floor / equal to expected / a real
minimum) into the `{minLine}` row, so never present a null as a guarantee.

`execution` is a discriminated union on `method` and is the only place deposit details live. The bot handles
`transfer` (`depositInstructions`) and `thorchain_deposit` (`thorchainMemo`); `signed_transaction` and
`stellar_broker` need a wallet to sign with and are excluded by `ALLOWED_PROVIDERS`. A `transfer` may carry an
`attachment` (XRP destination tag, Cosmos/TON memo) — present ⟺ required, and a deposit missing it is normally
unrecoverable, so all three scenes surface it separately from the address. `execution.qr` is optional; when the
server can't encode a chain, the flow continues without the image.

Provider selection: intersection of both assets' `providers` arrays (`getProvidersForPair`), filtered by
`ALLOWED_PROVIDERS` in `config/assets.ts`. `THORCHAIN` is additionally dropped unless **both** assets are in the
memoless-assets table.

THORChain routes carry a `memo` that a chat user cannot attach to a transfer, so they go through the separate
memoless API (`utils/memoless-api.ts`, `https://swap.unstoppable.money/memoless/api/v1`, no API key):
`register(asset, memo, amount)` → `preflight(asset, reference, amount)` → inbound address, QR, and an **exact**
send amount that encodes the memo. That is why THORChain confirmations show `amountWarning` — sending a different
amount breaks the swap. Non-THORChain routes get their deposit details from `execution`.

Other provider-conditional behavior: a refund address is required for every provider except THORCHAIN;
`amlFlaggedAddress()` prechecks destination+refund before committing via `GET /v2/check-addresses` (only for
providers in `AML_PRECHECK_PROVIDERS`, and never blocks on an inconclusive result or a service error);
`buildTrackUrl()` links to the track page keyed on the committed route's `uuid` — no uuid, no link.

A commit that fails does **not** end the flow: every scene re-quotes and hands the route list back (Telegram
returns to wizard step 4), because a refusal is usually the one committed provider's, not the pair's.

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
interpolates `{name}` placeholders. Two slots in the summary templates are built in code rather than filled with
a value: `{minLine}` (from `buildMinLine`, carrying its own trailing newline so an absent row collapses) and
`{attachment}`. The refund row is still dropped by a regex post-pass (`/↩️.*\n/g`) when there is no refund
address — reword that line and the regex needs checking in `showSummary`/`confirm_swap` and both chat equivalents.

### Address validation

`utils/addressValidator.ts` maps the chain prefix of an identifier (`BTC.BTC` → `BTC`) to a per-chain validator
and returns a human-readable hint string on failure, `null` on success. Unknown chains fall through to a
length-only check, so adding a chain to `FEATURED_IDENTIFIERS` without a validator silently accepts junk addresses.

Zcash is the one chain where a *valid* address can still be unswappable: `zecAddressKind()` splits it into
transparent (`t1`/`t3`), shielded Sapling (`zs1`), and unified (`u1`), and most exchanges only pay out to
transparent — they reject the rest at commit time with a bare "invalid address".

The aggregator models this as **two tokens**: `ZEC.ZEC` (transparent, quoted from the pair's own provider list)
and `ZEC.ZECSHIELDED` (shielded, quoted only from `ZEC_SHIELDED_PROVIDERS` — EXOLIX and MAYACHAIN, of which
only EXOLIX passes `ALLOWED_PROVIDERS`; MAYACHAIN executes via `thorchain_deposit` and would need the memoless
flow first). So `fetchPairRates()` — which every scene calls instead of `fetchRate` — quotes both identifiers
when the receive asset is ZEC, pins the requested identifier onto each route's `buyAsset`, and merges them into
one list; a failure of the shielded leg never takes the transparent quotes down. From there the route decides
everything: `zecRouteTag` labels it in the list, `zecAddressMismatch` refuses an address of the wrong family at
input, and `buyAssetForRoute` is what `POST /v2/swap` and the track URL are given. `zecRefundMismatch` applies
the same rule to a ZEC refund address, keyed on the provider rather than the route.

**As of Aug 2026 the aggregator does not know `ZEC.ZECSHIELDED`** (`tokenNotSupported`) and EXOLIX does not
quote `ZEC.ZEC`, so shielded routes never appear yet — the code is live but dormant until the API adds the token.

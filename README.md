# uswap-bot

Telegram, SimpleX, and Signal bots for cross-chain swaps via the [swap API](https://swap-api.unstoppable.money/v2).

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values
```

`.env` requires `BOT_TOKEN` (Telegram) and one swap API key per bot: `SWAP_API_KEY_TELEGRAM`,
`SWAP_API_KEY_SIMPLEX`, `SWAP_API_KEY_SIGNAL`. There is no shared key — a bot whose own key is missing exits
at startup. The SimpleX bot also reads `SIMPLEX_WS_URL` (defaults to `ws://localhost:3030`) and needs a running SimpleX CLI with an active user.

The Signal bot reads `SIGNAL_ACCOUNT` (the bot's registered phone number, e.g. `+15551234567`), plus `SIGNAL_RPC_HOST` (default `127.0.0.1`) and `SIGNAL_RPC_PORT` (default `7583`). It talks to a locally-running [`signal-cli`](https://github.com/AsamK/signal-cli) JSON-RPC daemon over TCP.

## Signal bot

The bot talks to a locally-running [`signal-cli`](https://github.com/AsamK/signal-cli) daemon over JSON-RPC. `signal-cli` needs **Java 25+** — the daemon won't start on an older JRE.

### 1. Register or link the bot's account (once, out of band)

The bot itself never registers — it assumes the account already exists. Do this once:

**Option A — register a dedicated phone number.** Registration is protected by a captcha: open <https://signalcaptchas.org/registration/generate.html>, solve it, copy the resulting `signalcaptcha://…` token, and pass it (with or without the scheme):

```bash
signal-cli -a +15551234567 register --captcha <captcha-token>
signal-cli -a +15551234567 verify 123456        # the code Signal SMS/calls you
```

Add `--voice` to `register` if the number can't receive SMS.

**Option B — link as a secondary device** to an existing Signal account on your phone:

```bash
signal-cli link -n "swap-bot"                    # prints an sgnl://… URI (and a QR)
# On your phone: Signal → Settings → Linked Devices → + → scan the QR / URI
```

Confirm the account is registered:

```bash
signal-cli listAccounts
```

### 2. Run the daemon

Keep it running under pm2/systemd in production. It must listen on the host/port the bot expects (`SIGNAL_RPC_HOST` / `SIGNAL_RPC_PORT`, default `127.0.0.1:7583`):

```bash
signal-cli -a +15551234567 daemon --tcp 127.0.0.1:7583
```

### 3. Configure and start the bot

Set `SIGNAL_ACCOUNT=+15551234567` in `.env` (and `SIGNAL_RPC_HOST` / `SIGNAL_RPC_PORT` if you changed them), then:

```bash
npm run build
npm run start:signal        # or: pm2 start ecosystem.config.js --only swap-bot-signal
```

The bot connects to the daemon's TCP port, replies to direct messages, and sends swap QR codes as image attachments. Users start a swap by messaging the bot's number with `s` (`f` for FAQ).

## Development

```bash
npm run dev            # Telegram bot with hot reload (nodemon + ts-node)
```

## Production (pm2)

All three bots are defined in `ecosystem.config.js` (`swap-bot-tg`, `swap-bot-simplex`, and `swap-bot-signal`) with exponential-backoff auto-restart, so pm2 keeps retrying even if a dependency (swap API, SimpleX CLI, signal-cli daemon) is down for a while.

First-time setup on the server:

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save               # persist the process list
pm2 startup            # then run the command it prints, so pm2 survives reboots
```

If the bots were started by hand under other names (e.g. `pm2 start dist/bot.js --name telegram-bot`), remove those
first — `pm2 delete <old-name>` for each — or you will end up with two copies of every bot polling at once.

Deploying an update:

```bash
git pull
npm install
npm run build
pm2 restart ecosystem.config.js
pm2 save
```

Useful commands:

```bash
pm2 status                     # process list and state
pm2 logs swap-bot-tg           # tail Telegram bot logs
pm2 logs swap-bot-simplex      # tail SimpleX bot logs
pm2 logs swap-bot-signal       # tail Signal bot logs
pm2 describe swap-bot-tg       # restart count, uptime, log paths
```

> Note: after changing the pm2 process list in any way, run `pm2 save` again — otherwise a reboot restores the old list.

## Scripts

```bash
npm run build            # compile TypeScript to dist/
npm run start            # run Telegram bot from dist/
npm run start:simplex    # run SimpleX bot from dist/
npm run start:signal     # run Signal bot from dist/
npx ts-node src/scripts/update-profile.ts   # update SimpleX bot profile
```

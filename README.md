# uswap-bot

Telegram and SimpleX bots for cross-chain swaps via the [swap API](https://swap-api.unstoppable.money/v1).

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values
```

`.env` requires `SWAP_API_KEY` and `BOT_TOKEN` (Telegram). The SimpleX bot also reads `SIMPLEX_WS_URL` (defaults to `ws://localhost:3030`) and needs a running SimpleX CLI with an active user.

## Development

```bash
npm run dev            # Telegram bot with hot reload (nodemon + ts-node)
```

## Production (pm2)

Both bots are defined in `ecosystem.config.js` (`swap-bot-tg` and `swap-bot-simplex`) with exponential-backoff auto-restart, so pm2 keeps retrying even if a dependency (swap API, SimpleX CLI) is down for a while.

First-time setup on the server:

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save               # persist the process list
pm2 startup            # then run the command it prints, so pm2 survives reboots
```

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
pm2 describe swap-bot-tg       # restart count, uptime, log paths
```

> Note: after changing the pm2 process list in any way, run `pm2 save` again — otherwise a reboot restores the old list.

## Scripts

```bash
npm run build            # compile TypeScript to dist/
npm run start            # run Telegram bot from dist/
npm run start:simplex    # run SimpleX bot from dist/
npx ts-node src/scripts/update-profile.ts   # update SimpleX bot profile
```

// pm2 config for both bots.
//
// First-time setup on the server:
//   npm run build
//   pm2 start ecosystem.config.js
//   pm2 save                # persist the process list
//   pm2 startup             # run the printed command so pm2 survives reboots
//
// After deploying new code:
//   npm run build && pm2 restart ecosystem.config.js

const shared = {
  // Restart on crash, and use exponential backoff (100ms → 15s) instead of
  // pm2's default behavior of marking a fast-crashing app "errored" and
  // giving up. Combined with a high max_restarts this means pm2 keeps
  // retrying even if a dependency (swap API, SimpleX CLI) is down for a while.
  autorestart: true,
  exp_backoff_restart_delay: 100,
  min_uptime: '30s',
  max_restarts: 1000,
  time: true, // prefix logs with timestamps
  max_memory_restart: '500M'
}

module.exports = {
  apps: [
    {
      name: 'swap-bot-tg',
      script: 'dist/bot.js',
      ...shared
    },
    {
      name: 'swap-bot-simplex',
      script: 'dist/simplex-bot.js',
      ...shared
    }
  ]
}

import { Scenes, session, Telegraf } from 'telegraf'
import dotenv from 'dotenv'
import { SwapContext } from './types/context'
import { swapWizard } from './scenes/swap'
import { startPeriodicSync, stopPeriodicSync, syncTokens } from './services/token-sync'
import { closeDb, getTokenCount } from './db/database'

dotenv.config()

const token = process.env.BOT_TOKEN
if (!token) {
  throw new Error('BOT_TOKEN is missing in .env')
}

const bot = new Telegraf<SwapContext>(token)

// Global error handler
bot.catch((err, ctx) => {
  console.error('[Bot] Unhandled error:', err)
  ctx.reply('❌ Something went wrong. Please try again with /swap.').catch(() => {})
})

// Register scenes
const stage = new Scenes.Stage<SwapContext>([swapWizard])

bot.use(session())
bot.use(stage.middleware())

// Commands
bot.start(ctx => {
  ctx.reply('👋 Welcome to *SwapBot*!\n\n' + 'Use /swap to start a new swap.\n' + 'Use /help for more info.', {
    parse_mode: 'Markdown'
  })
})

bot.help(ctx => {
  ctx.reply(
    '🤖 *SwapBot Help*\n\n' +
      '/swap — Start a new token swap\n' +
      '/cancel — Cancel the current swap\n' +
      '/status — Show provider sync status\n' +
      '/help — Show this message',
    { parse_mode: 'Markdown' }
  )
})

bot.command('swap', ctx => ctx.scene.enter('swap-wizard'))

bot.command('cancel', ctx => {
  ctx.scene.leave()
  ctx.reply('🚫 Current operation cancelled.')
})

bot.command('status', ctx => {
  const count = getTokenCount()
  if (count === 0) {
    ctx.reply('⚠️ No tokens synced yet. Token lists may still be loading.')
    return
  }
  ctx.reply(`📊 *Status*\n\n• *Tokens:* ${count}`, {
    parse_mode: 'Markdown'
  })
})

// Startup
async function main() {
  // Sync token lists before starting the bot
  console.log('🔄 Syncing token lists...')
  await syncTokens()

  // Start periodic sync (every hour)
  startPeriodicSync()

  // Launch bot
  bot.launch()
  console.log('🚀 SwapBot is running...')
}

main().catch(err => {
  console.error('Failed to start bot:', err)
  process.exit(1)
})

// Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down...`)
  stopPeriodicSync()
  bot.stop(signal)
  closeDb()
  process.exit(0)
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))

import { Scenes, session, Telegraf } from 'telegraf'
import dotenv from 'dotenv'
import { SwapContext } from './types/context'
import { swapWizard } from './scenes/swap'
import { startPeriodicSync, stopPeriodicSync, syncTokensAtStartup } from './services/token-sync'
import { closeDb } from './db/database'
import { s } from './config/strings'
import { splitLongMessage } from './utils/send-long-message'
import { useApiKeyFor } from './utils/api'

dotenv.config()
useApiKeyFor('telegram')

const token = process.env.BOT_TOKEN
if (!token) {
  throw new Error('BOT_TOKEN is missing in .env')
}

const bot = new Telegraf<SwapContext>(token)

// Global error handler
bot.catch((err, ctx) => {
  console.error('[Bot] Unhandled error:', err)
  const S = s(ctx.from?.language_code)
  ctx.reply(S.botError).catch(() => {})
})

// Register scenes
const stage = new Scenes.Stage<SwapContext>([swapWizard])

bot.use(session())
bot.use(stage.middleware())

// Commands
bot.start(ctx => ctx.scene.enter('swap-wizard'))
bot.command('swap', ctx => ctx.scene.enter('swap-wizard'))

bot.command('faq', async ctx => {
  const S = s(ctx.from?.language_code)
  await ctx.scene.leave()
  for (const part of splitLongMessage(S.faq, 3500)) {
    await ctx.reply(part, { parse_mode: 'Markdown' })
  }
})

bot.command('cancel', ctx => {
  const S = s(ctx.from?.language_code)
  ctx.scene.leave()
  ctx.reply(S.botCancelReply)
})

// Startup
async function main() {
  // Sync token lists before starting the bot
  console.log('🔄 Syncing token lists...')
  await syncTokensAtStartup()

  // Start periodic sync (every hour)
  startPeriodicSync()

  // Set bot menu commands (non-fatal — skip if rate-limited)
  try {
    await bot.telegram.setMyCommands([
      { command: 'swap', description: 'Start a new swap' },
      { command: 'faq', description: 'Frequently asked questions' }
    ])
    await bot.telegram.setMyCommands(
      [
        { command: 'swap', description: 'Начать новый обмен' },
        { command: 'faq', description: 'Часто задаваемые вопросы' }
      ],
      { language_code: 'ru' }
    )
    await bot.telegram.setMyCommands(
      [
        { command: 'swap', description: '开始新兑换' },
        { command: 'faq', description: '常见问题' }
      ],
      { language_code: 'zh' }
    )
    await bot.telegram.setMyCommands(
      [
        { command: 'swap', description: 'شروع تبادل جدید' },
        { command: 'faq', description: 'سؤالات متداول' }
      ],
      { language_code: 'fa' }
    )
  } catch (err) {
    console.warn('[Bot] setMyCommands failed (rate-limited?), skipping:', (err as Error).message)
  }

  // Launch bot. launch() resolves only on shutdown; a rejection means polling
  // died fatally — exit so the process manager restarts us.
  bot.launch().catch(err => {
    console.error('[Bot] Polling stopped with error:', err)
    process.exit(1)
  })
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

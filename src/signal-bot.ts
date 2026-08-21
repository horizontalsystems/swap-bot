import dotenv from 'dotenv'
import { startPeriodicSync, stopPeriodicSync, syncTokensAtStartup } from './services/token-sync'
import { closeDb } from './db/database'
import { cleanupSessions, handleSwapMessage } from './scenes/swap/signal'
import { SignalRpcClient, SignalReceiveParams } from './utils/signal-rpc'
import { useApiKeyFor } from './utils/api'

dotenv.config()
useApiKeyFor('signal')

// The bot talks to a locally-running `signal-cli daemon --tcp` over JSON-RPC.
// The bot's Signal account must already be registered/linked out of band.
const SIGNAL_ACCOUNT = process.env.SIGNAL_ACCOUNT // e.g. +15551234567
const SIGNAL_RPC_HOST = process.env.SIGNAL_RPC_HOST ?? '127.0.0.1'
const SIGNAL_RPC_PORT = parseInt(process.env.SIGNAL_RPC_PORT ?? '7583', 10)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

let client: SignalRpcClient
let cleanupTimer: ReturnType<typeof setInterval> | undefined

// --- Event processing ---

function handleReceive(params: SignalReceiveParams): void {
  const env = params.envelope
  const dataMessage = env.dataMessage
  if (!dataMessage) return // typing indicator, receipt, sync message, etc.

  // Only handle 1:1 direct messages, not group messages.
  if (dataMessage.groupInfo) return

  const text = dataMessage.message?.trim()
  if (!text) return

  // Reply target: prefer the phone number, fall back to UUID.
  const sender = env.sourceNumber || env.source || env.sourceUuid
  if (!sender) {
    console.error('[Signal] Received message with no identifiable sender')
    return
  }

  const senderName = env.sourceName ? `${env.sourceName} (${sender})` : sender
  console.log('[Signal] Message received')

  handleSwapMessage(client, sender, text).catch(err => {
    console.error('[Signal] Message handling failed:', err instanceof Error ? err.name : 'UnknownError')
  })
}

// --- Startup ---

async function main(): Promise<void> {
  if (!SIGNAL_ACCOUNT) {
    console.error('[Signal] SIGNAL_ACCOUNT is missing in .env (the bot phone number, e.g. +15551234567)')
    process.exit(1)
  }

  console.log('[Signal] Syncing token lists...')
  await syncTokensAtStartup()
  startPeriodicSync()

  console.log(`[Signal] Connecting to signal-cli daemon at ${SIGNAL_RPC_HOST}:${SIGNAL_RPC_PORT}...`)
  client = new SignalRpcClient(SIGNAL_RPC_HOST, SIGNAL_RPC_PORT, SIGNAL_ACCOUNT)

  client.on('message', handleReceive)
  client.on('error', err => {
    console.error('[Signal] Socket error:', err)
  })

  // The daemon connection is our only source of events. If it drops, exit so
  // the process manager restarts us with a fresh connection (mirrors the
  // SimpleX bot's behavior).
  const closed = new Promise<void>(resolve => {
    client.on('close', () => {
      console.error('[Signal] Disconnected from signal-cli daemon')
      resolve()
    })
  })

  await client.connect()
  console.log('[Signal] Connected. Bot account configured')

  cleanupTimer = setInterval(cleanupSessions, CLEANUP_INTERVAL_MS)
  console.log('[Signal] Bot is running!')

  await closed

  console.error('[Signal] Connection lost, exiting so process manager can restart')
  process.exit(1)
}

main().catch(err => {
  console.error('[Signal] Fatal error:', err)
  process.exit(1)
})

// Graceful shutdown
function shutdown(signal: string): void {
  console.log(`\n${signal} received. Shutting down...`)
  if (cleanupTimer) clearInterval(cleanupTimer)
  stopPeriodicSync()
  if (client) client.disconnect()
  closeDb()
  process.exit(0)
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))

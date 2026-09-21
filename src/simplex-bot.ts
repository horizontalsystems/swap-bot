import { ChatClient } from 'simplex-chat'
import { CEvt, ChatEvent } from '@simplex-chat/types'
import dotenv from 'dotenv'
import { startPeriodicSync, stopPeriodicSync, syncTokensAtStartup } from './services/token-sync'
import { closeDb } from './db/database'
import { cleanupSessions, handleSwapMessage } from './scenes/swap/simplex'
import { useApiKeyFor } from './utils/api'
import { StallWatchdog, startupDeadline } from './utils/stall-watchdog'

dotenv.config()
useApiKeyFor('simplex')

const SIMPLEX_WS_URL = process.env.SIMPLEX_WS_URL ?? 'ws://localhost:3030'
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const STARTUP_TIMEOUT_MS = 120_000
const API_STALL_MS = 120_000

let client: ChatClient
let cleanupTimer: ReturnType<typeof setInterval> | undefined

// simplex-chat resolves a command only when the agent answers it; if the socket
// wedges (or closes with the command in flight — it never rejects pending
// commands) the call hangs forever, and with it every reply routed through it.
// Every api* method goes through `sendChatCmd`, so that is the one call to watch.
const watchdog = new StallWatchdog('[SimpleX] Chat command', API_STALL_MS)

// --- Event processing ---

function handleNewMessages(event: CEvt.NewChatItems): void {
  for (const aci of event.chatItems) {
    const { chatInfo, chatItem } = aci

    // Only handle direct messages from contacts
    if (chatInfo.type !== 'direct') continue
    if (chatItem.chatDir.type !== 'directRcv') continue

    const contactId = chatInfo.contact.contactId
    const contactName = chatInfo.contact.localDisplayName
    const text = chatItem.meta.itemText.trim()

    if (!text) continue

    console.log(`[SimpleX] Message from ${contactName} (${contactId}): ${text}`)

    handleSwapMessage(client, contactId, text).catch(err => {
      console.error(`[SimpleX] Error handling message from ${contactName} (${contactId}):`, err)
    })
  }
}

async function handleContactConnected(event: CEvt.ContactConnected): Promise<void> {
  const contactId = event.contact.contactId
  const contactName = event.contact.localDisplayName
  console.log(`[SimpleX] Contact connected: ${contactName} (${contactId})`)
  await handleSwapMessage(client, contactId, '/start')
}

async function handleContactRequest(event: CEvt.ReceivedContactRequest): Promise<void> {
  const reqId = event.contactRequest.contactRequestId
  const name = event.contactRequest.localDisplayName
  console.log(`[SimpleX] Accepting contact request from ${name} (${reqId})`)
  try {
    await client.apiAcceptContactRequest(reqId)
  } catch (err) {
    console.error(`[SimpleX] Failed to accept contact request:`, err)
  }
}

// --- Event loop ---

// Note: on disconnect simplex-chat flips `client.connected` but never closes
// `msgQ`, so this loop would sit in `dequeue()` forever. `main` races it against
// `client.client`, which settles when the transport is gone.
async function eventLoop(): Promise<void> {
  console.log('[SimpleX] Event loop started, waiting for messages...')
  while (client.connected) {
    const event: ChatEvent = await client.msgQ.dequeue()

    switch (event.type) {
      case 'newChatItems':
        handleNewMessages(event)
        break
      case 'contactConnected':
        handleContactConnected(event)
        break
      case 'receivedContactRequest':
        handleContactRequest(event)
        break
      default:
        // Ignore other events (subscriptions, file transfers, etc.)
        break
    }
  }
  console.log('[SimpleX] Disconnected from chat server')
}

// --- Startup ---

async function main(): Promise<void> {
  // Anything below can hang without throwing (agent login is the one that did
  // in production) — bound the whole sequence so a stuck start becomes a restart.
  const startupDone = startupDeadline('[SimpleX]', STARTUP_TIMEOUT_MS)

  console.log('[SimpleX] Syncing token lists...')
  await syncTokensAtStartup()
  startPeriodicSync()

  console.log(`[SimpleX] Connecting to ${SIMPLEX_WS_URL}...`)
  client = await ChatClient.create(SIMPLEX_WS_URL)
  client.sendChatCmd = watchdog.wrap(client.sendChatCmd.bind(client))

  const user = await client.apiGetActiveUser()
  if (!user) {
    console.error('[SimpleX] No active user found. Create one in the CLI first.')
    process.exit(1)
  }
  console.log(`[SimpleX] Logged in as: ${user.localDisplayName}`)

  // Print contact address so users can connect
  const address = await client.apiGetUserAddress(user.userId)
  if (address) {
    console.log(`[SimpleX] Bot contact address:\n${address}`)
  } else {
    console.log('[SimpleX] Creating bot contact address...')
    const newAddress = await client.apiCreateUserAddress(user.userId)
    console.log(`[SimpleX] Bot contact address:\n${newAddress}`)
  }

  // Auto-accept incoming contact requests
  await client.enableAddressAutoAccept(user.userId, { type: 'text', text: 'Welcome! Type s to start a new swap.' })
  console.log('[SimpleX] Auto-accept enabled')

  cleanupTimer = setInterval(cleanupSessions, CLEANUP_INTERVAL_MS)

  console.log('[SimpleX] Bot is running!')
  startupDone()
  await Promise.race([eventLoop(), client.client])

  // We only get here when the websocket to the SimpleX CLI is lost.
  // The sync/cleanup intervals would keep the process alive in a zombie state,
  // so exit with an error and let pm2 restart us with a fresh connection.
  console.error('[SimpleX] Connection lost, exiting so process manager can restart')
  process.exit(1)
}

main().catch(err => {
  console.error('[SimpleX] Fatal error:', err)
  process.exit(1)
})

// Graceful shutdown
function shutdown(signal: string): void {
  console.log(`\n${signal} received. Shutting down...`)
  if (cleanupTimer) clearInterval(cleanupTimer)
  watchdog.stop()
  stopPeriodicSync()
  if (client) client.disconnect().catch(() => {})
  closeDb()
  process.exit(0)
}

process.once('SIGINT', () => shutdown('SIGINT'))
process.once('SIGTERM', () => shutdown('SIGTERM'))

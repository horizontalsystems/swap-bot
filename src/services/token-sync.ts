import { SYNC_INTERVAL_MS } from '../config/assets'
import { getTokenCount, upsertTokens } from '../db/database'
import { fetchAllTokens } from '../utils/api'

let syncInterval: NodeJS.Timeout | null = null

export async function syncTokens(): Promise<void> {
  console.log('[Sync] Fetching token list...')

  const tokens = await fetchAllTokens()

  console.log(`COUNT: ${tokens.length}`)

  upsertTokens(tokens.map(t => ({ identifier: t.identifier, name: t.name, providers: t.providers })))

  console.log(`[Sync] Sync complete. Total tokens in DB: ${getTokenCount()}`)
}

export function startPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
  }

  syncInterval = setInterval(async () => {
    try {
      await syncTokens()
    } catch (error) {
      console.error('[Sync] Periodic sync failed:', error)
    }
  }, SYNC_INTERVAL_MS)

  console.log(`[Sync] Periodic sync scheduled every ${SYNC_INTERVAL_MS / 1000 / 60} minutes.`)
}

export function stopPeriodicSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}

import { SYNC_INTERVAL_MS } from '../config/assets'
import { replaceMemolessAssets } from '../db/memoless'
import { getTokenCount, upsertTokens } from '../db/tokens'
import { fetchAllTokens } from '../utils/api'
import { fetchMemolessAssets } from '../utils/memoless-api'

let syncInterval: NodeJS.Timeout | null = null

export async function syncTokens(): Promise<void> {
  console.log('[Sync] Fetching token list...')

  const tokens = await fetchAllTokens()

  console.log(`COUNT: ${tokens.length}`)

  upsertTokens(
    tokens.map(t => ({
      identifier: t.identifier,
      name: t.name,
      ticker: t.ticker as string | undefined,
      chain: t.chain as string | undefined,
      address: t.address as string | null | undefined,
      providers: t.providers,
      coingeckoId: t.coingeckoId as string | null | undefined,
      chainId: t.chainId as string | null | undefined,
      decimals: (t.decimals as number | undefined) ?? null
    }))
  )

  console.log(`[Sync] Sync complete. Total tokens in DB: ${getTokenCount()}`)

  try {
    console.log('[Sync] Fetching memoless assets...')
    const memolessIds = await fetchMemolessAssets()
    replaceMemolessAssets(memolessIds)
    console.log(`[Sync] Memoless assets synced: ${memolessIds.length} available`)
  } catch (error) {
    console.error('[Sync] Memoless asset sync failed:', error)
  }
}

// Startup variant: if the API is down but we already have tokens from a
// previous sync, start anyway instead of crash-looping until the API recovers.
export async function syncTokensAtStartup(): Promise<void> {
  try {
    await syncTokens()
  } catch (error) {
    if (getTokenCount() === 0) {
      throw error
    }
    console.error(`[Sync] Startup sync failed, continuing with ${getTokenCount()} cached tokens:`, error)
  }
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

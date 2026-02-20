const PRICE_API = 'https://api.blocksdecoded.com/v1/coins'
const CACHE_TTL_MS = 300_000

interface CacheEntry {
  price: number
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

async function fetchPrices(coingeckoIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>()
  if (coingeckoIds.length === 0) return result

  try {
    const url = `${PRICE_API}?uids=${coingeckoIds.join(',')}&fields=price`
    console.log(`[Prices] Fetching prices for: ${coingeckoIds.join(', ')}`)
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`[Prices] API returned ${response.status}`)
      return result
    }

    const data = (await response.json()) as { uid: string; price: string | number }[]
    console.log(`[Prices] Received ${data.length} price(s):`, data.map(c => `${c.uid}=$${c.price}`).join(', '))

    const now = Date.now()
    for (const coin of data) {
      const price = typeof coin.price === 'number' ? coin.price : parseFloat(String(coin.price))
      if (coin.uid && !isNaN(price)) {
        result.set(coin.uid, price)
        cache.set(coin.uid, { price, fetchedAt: now })
      }
    }
  } catch (error) {
    console.error('[Prices] Fetch failed:', error)
  }

  return result
}

export async function getAssetPrice(coingeckoId: string | null): Promise<number | null> {
  if (!coingeckoId) return null

  const cached = cache.get(coingeckoId)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    console.log(`[Prices] Cache hit for ${coingeckoId}: $${cached.price}`)
    return cached.price
  }

  const prices = await fetchPrices([coingeckoId])
  const price = prices.get(coingeckoId) ?? cached?.price ?? null
  if (price == null) console.log(`[Prices] No price available for ${coingeckoId}`)
  return price
}

export async function getSwapPrices(
  inId: string | null,
  outId: string | null
): Promise<{ inPrice: number | null; outPrice: number | null }> {
  const ids = [inId, outId].filter((id): id is string => id != null)
  const needsFetch = ids.filter(id => {
    const cached = cache.get(id)
    return !cached || Date.now() - cached.fetchedAt >= CACHE_TTL_MS
  })

  if (needsFetch.length > 0) {
    await fetchPrices(needsFetch)
  } else if (ids.length > 0) {
    console.log(`[Prices] Cache hit for swap prices: ${ids.join(', ')}`)
  }

  return {
    inPrice: inId ? (cache.get(inId)?.price ?? null) : null,
    outPrice: outId ? (cache.get(outId)?.price ?? null) : null
  }
}

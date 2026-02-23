import { Asset } from '../types/context'
import { getDb } from './database'
import { areMemolessAssets } from './memoless'

type TokenRow = {
  identifier: string
  name: string | null
  ticker: string | null
  chain: string | null
  address: string | null
  coingecko_id: string | null
  chain_id: string | null
}

function rowToAsset(r: TokenRow): Asset {
  return {
    identifier: r.identifier,
    name: r.name ?? r.identifier,
    ticker: r.ticker ?? r.identifier.split('.')[1]?.split('-')[0] ?? r.identifier,
    chain: r.chain ?? r.identifier.split('.')[0] ?? '',
    address: r.address ?? null,
    coingeckoId: r.coingecko_id ?? null,
    chainId: r.chain_id ?? null
  }
}

// --- Token operations ---

export function upsertTokens(
  tokens: {
    identifier: string
    name?: string
    ticker?: string
    chain?: string
    address?: string | null
    providers?: string[]
    coingeckoId?: string | null
    chainId?: string | null
  }[]
): void {
  const database = getDb()

  const stmt = database.prepare(`
    INSERT INTO tokens (identifier, name, ticker, chain, address, providers, coingecko_id, chain_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(identifier) DO UPDATE SET
      name = excluded.name, ticker = excluded.ticker, chain = excluded.chain,
      address = excluded.address, providers = excluded.providers,
      coingecko_id = excluded.coingecko_id, chain_id = excluded.chain_id
  `)

  const transaction = database.transaction(() => {
    for (const token of tokens) {
      stmt.run(
        token.identifier,
        token.name ?? null,
        token.ticker ?? null,
        token.chain ?? null,
        token.address ?? null,
        token.providers ? JSON.stringify(token.providers) : null,
        token.coingeckoId ?? null,
        token.chainId ?? null
      )
    }
  })

  transaction()
}

/**
 * Resolve a list of identifiers to Asset objects from the DB.
 * Preserves order; skips identifiers not found.
 */
export function getAssets(identifiers: string[]): Asset[] {
  const database = getDb()
  const placeholders = identifiers.map(() => '?').join(', ')
  const rows = database
    .prepare(
      `SELECT identifier, name, ticker, chain, address, coingecko_id, chain_id FROM tokens WHERE identifier IN (${placeholders})`
    )
    .all(...identifiers) as TokenRow[]

  const byId = new Map(rows.map(r => [r.identifier, r]))
  return identifiers
    .map(id => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => r != null)
    .map(rowToAsset)
}

/**
 * Resolve a single identifier to an Asset, or null if not found.
 */
export function getAssetByIdentifier(identifier: string): Asset | null {
  const database = getDb()
  const row = database
    .prepare('SELECT identifier, name, ticker, chain, address, coingecko_id, chain_id FROM tokens WHERE identifier = ?')
    .get(identifier) as TokenRow | undefined
  if (!row) return null
  return rowToAsset(row)
}

/**
 * Get total token count.
 */
export function getTokenCount(): number {
  const database = getDb()
  const row = database.prepare('SELECT COUNT(*) as count FROM tokens').get() as { count: number }
  return row.count
}

/**
 * Search tokens by ticker and name (case-insensitive).
 * Results ordered: exact ticker match, ticker starts with, ticker contains, name contains.
 */
export function searchAssets(query: string, limit: number = 20): Asset[] {
  const database = getDb()
  const startsWith = `${query}%`
  const contains = `%${query}%`
  const rows = database
    .prepare(
      `SELECT identifier, name, ticker, chain, address, coingecko_id, chain_id,
        CASE
          WHEN ticker LIKE ? COLLATE NOCASE THEN 0
          WHEN ticker LIKE ? COLLATE NOCASE THEN 1
          WHEN ticker LIKE ? COLLATE NOCASE THEN 2
          ELSE 3
        END AS rank
      FROM tokens
      WHERE ticker LIKE ? COLLATE NOCASE OR name LIKE ? COLLATE NOCASE
      ORDER BY rank, ticker COLLATE NOCASE
      LIMIT ?`
    )
    .all(query, startsWith, contains, contains, contains, limit) as (TokenRow & { rank: number })[]
  return rows.map(rowToAsset)
}

/**
 * Find providers that support BOTH tokens (intersection of their providers arrays).
 * Removes THORCHAIN if either asset is missing from the memoless list.
 */
export function getProvidersForPair(identifierIn: string, identifierOut: string): string[] {
  const database = getDb()
  const rowIn = database.prepare('SELECT providers FROM tokens WHERE identifier = ?').get(identifierIn) as
    | { providers: string | null }
    | undefined
  const rowOut = database.prepare('SELECT providers FROM tokens WHERE identifier = ?').get(identifierOut) as
    | { providers: string | null }
    | undefined

  if (!rowIn?.providers || !rowOut?.providers) return []

  const providersIn: string[] = JSON.parse(rowIn.providers)
  const providersOut: string[] = JSON.parse(rowOut.providers)
  const outSet = new Set(providersOut)

  let providers = providersIn.filter(p => outSet.has(p))

  if (!areMemolessAssets(identifierIn, identifierOut)) {
    providers = providers.filter(p => p !== 'THORCHAIN')
  }

  return providers
}

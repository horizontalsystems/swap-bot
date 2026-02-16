import Database from 'better-sqlite3'
import path from 'path'
import { Asset } from '../types/context'

const DB_PATH = path.resolve(process.cwd(), 'swap-bot.db')

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    initSchema()
  }
  return db
}

function initSchema(): void {
  const database = getDb()

  // Drop legacy tables and recreate (tokens are re-synced on startup)
  database.exec(`DROP TABLE IF EXISTS provider_tokens`)
  database.exec(`DROP TABLE IF EXISTS tokens`)

  database.exec(`
    CREATE TABLE tokens (
      identifier TEXT PRIMARY KEY,
      name TEXT,
      providers TEXT
    );
  `)
}

// --- Token operations ---

export function upsertTokens(tokens: { identifier: string; name?: string; providers?: string[] }[]): void {
  const database = getDb()

  const stmt = database.prepare(`
    INSERT INTO tokens (identifier, name, providers)
    VALUES (?, ?, ?)
    ON CONFLICT(identifier) DO UPDATE SET name = excluded.name, providers = excluded.providers
  `)

  const transaction = database.transaction(() => {
    for (const token of tokens) {
      stmt.run(token.identifier, token.name ?? null, token.providers ? JSON.stringify(token.providers) : null)
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
    .prepare(`SELECT identifier, name FROM tokens WHERE identifier IN (${placeholders})`)
    .all(...identifiers) as { identifier: string; name: string | null }[]

  const byId = new Map(rows.map(r => [r.identifier, r]))
  return identifiers
    .map(id => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => r != null)
    .map(r => ({ identifier: r.identifier, name: r.name ?? r.identifier }))
}

/**
 * Resolve a single identifier to an Asset, or null if not found.
 */
export function getAssetByIdentifier(identifier: string): Asset | null {
  const database = getDb()
  const row = database.prepare('SELECT identifier, name FROM tokens WHERE identifier = ?').get(identifier) as
    | { identifier: string; name: string | null }
    | undefined
  if (!row) return null
  return { identifier: row.identifier, name: row.name ?? row.identifier }
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
 * Find providers that support BOTH tokens (intersection of their providers arrays).
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

  return providersIn.filter(p => outSet.has(p))
}

export function closeDb(): void {
  if (db) {
    db.close()
  }
}

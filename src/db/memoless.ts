import { getDb } from './database'

/**
 * Replace the entire memoless_assets table with the given identifiers.
 */
export function replaceMemolessAssets(identifiers: string[]): void {
  const database = getDb()
  const stmt = database.prepare('INSERT INTO memoless_assets (identifier) VALUES (?)')

  const transaction = database.transaction(() => {
    database.exec('DELETE FROM memoless_assets')
    for (const id of identifiers) {
      stmt.run(id)
    }
  })

  transaction()
}

/**
 * Check if both identifiers exist in the memoless_assets table.
 */
export function areMemolessAssets(idIn: string, idOut: string): boolean {
  const database = getDb()
  const row = database
    .prepare('SELECT COUNT(*) as cnt FROM memoless_assets WHERE identifier IN (?, ?)')
    .get(idIn, idOut) as { cnt: number }
  return row.cnt === 2
}

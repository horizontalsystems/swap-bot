import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.resolve(__dirname, 'swap-bot.db')

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

  database.exec(`DROP TABLE IF EXISTS memoless_assets`)
  database.exec(`
    CREATE TABLE memoless_assets (
      identifier TEXT PRIMARY KEY
    );
  `)
}

export function closeDb(): void {
  if (db) {
    db.close()
  }
}

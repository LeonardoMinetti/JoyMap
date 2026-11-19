import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export function openDb(path = process.env.DB_PATH || 'data/mvp.sqlite') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, role TEXT NOT NULL DEFAULT 'creator',
      created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS login_tokens (
      hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS sessions (
      hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS creators (
      id INTEGER PRIMARY KEY, user_id INTEGER UNIQUE NOT NULL, handle TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL, followers INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',          -- pending | approved | rejected | waitlist
      theme TEXT NOT NULL DEFAULT '{}', links TEXT NOT NULL DEFAULT '[]', consents TEXT NOT NULL DEFAULT '{}',
      published INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS places (
      id INTEGER PRIMARY KEY, creator_id INTEGER NOT NULL, name TEXT, address TEXT, municipality TEXT,
      lat REAL, lon REAL, geo_status TEXT NOT NULL DEFAULT 'none',   -- none | pending | found | not_found | rejected
      geo_quality TEXT, category TEXT NOT NULL DEFAULT 'rest', post_url TEXT, post_id TEXT, posted_on TEXT,
      ad INTEGER NOT NULL DEFAULT 0, rec TEXT, confidence TEXT, note TEXT,
      status TEXT NOT NULL DEFAULT 'pending',          -- pending | confirmed | removed | unresolved
      created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE INDEX IF NOT EXISTS places_creator ON places(creator_id);
    CREATE TABLE IF NOT EXISTS geocache (key TEXT PRIMARY KEY, json TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY, creator_id INTEGER NOT NULL, type TEXT NOT NULL, term TEXT, place_id INTEGER,
      results INTEGER, sid TEXT, ts INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS events_creator_ts ON events(creator_id, ts);
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY, creator_id INTEGER, place_id INTEGER, reason TEXT NOT NULL, details TEXT,
      ip_hash TEXT, status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL DEFAULT (datetime('now')));
  `)
  return db
}

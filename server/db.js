import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

// Adiciona coluna se ainda não existe (migração aditiva: bancos criados em versões anteriores continuam valendo).
function ensureColumn(db, table, column, def) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name)
  if (!cols.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`)
}

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
    CREATE TABLE IF NOT EXISTS voo (user_id INTEGER PRIMARY KEY, personality TEXT NOT NULL DEFAULT 'brincalhona');
    CREATE TABLE IF NOT EXISTS visits (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, creator_id INTEGER NOT NULL, place_id INTEGER NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(user_id, place_id));
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS consent_log (
      id INTEGER PRIMARY KEY, creator_id INTEGER NOT NULL, key TEXT NOT NULL, value INTEGER NOT NULL,
      terms_version TEXT, ts TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY, creator_id INTEGER NOT NULL, name TEXT NOT NULL, note TEXT, place_ids TEXT NOT NULL DEFAULT '[]', pos INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS symbols (
      id INTEGER PRIMARY KEY, creator_id INTEGER NOT NULL, name TEXT NOT NULL, d TEXT NOT NULL, vb TEXT NOT NULL, mode TEXT NOT NULL DEFAULT 'fill',
      status TEXT NOT NULL DEFAULT 'pending',          -- pending | approved | rejected
      created_at TEXT NOT NULL DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS media (creator_id INTEGER PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL);
    CREATE TABLE IF NOT EXISTS interest (id INTEGER PRIMARY KEY, creator_id INTEGER NOT NULL, kind TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(creator_id, kind));
    CREATE TABLE IF NOT EXISTS notices (id INTEGER PRIMARY KEY, creator_id INTEGER NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), seen INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS claims (
      id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, place_key TEXT NOT NULL, place_name TEXT NOT NULL, address TEXT, method TEXT NOT NULL, contact TEXT,
      status TEXT NOT NULL DEFAULT 'pending',          -- pending | approved | rejected
      created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(user_id, place_key));
  `)
  // colunas novas (instalações anteriores)
  ensureColumn(db, 'creators', 'tiktok', 'TEXT')
  // criadores que já existiam antes do onboarding novo não precisam refazê-lo
  const hadOnboarding = db.prepare('PRAGMA table_info(creators)').all().some((c) => c.name === 'onboarding')
  ensureColumn(db, 'creators', 'onboarding', "TEXT NOT NULL DEFAULT 'start'")   // start | instagram | tiktok | consents | plan | payment | welcome | done
  if (!hadOnboarding) db.exec("UPDATE creators SET onboarding='done'")
  ensureColumn(db, 'creators', 'instagram_state', "TEXT NOT NULL DEFAULT 'none'") // none | skipped | connected | revoked
  ensureColumn(db, 'creators', 'tiktok_state', "TEXT NOT NULL DEFAULT 'none'")
  ensureColumn(db, 'creators', 'billing', "TEXT NOT NULL DEFAULT 'monthly'")
  ensureColumn(db, 'creators', 'trial_ends', 'TEXT')
  ensureColumn(db, 'creators', 'settings', "TEXT NOT NULL DEFAULT '{}'")
  ensureColumn(db, 'creators', 'domain', 'TEXT')
  ensureColumn(db, 'creators', 'domain_status', "TEXT NOT NULL DEFAULT 'none'")   // none | pending | active
  ensureColumn(db, 'creators', 'verified', 'INTEGER NOT NULL DEFAULT 0')         // titular conferido por quem analisa
  ensureColumn(db, 'creators', 'decided_at', 'TEXT')
  ensureColumn(db, 'creators', 'decided_by', 'TEXT')
  ensureColumn(db, 'places', 'neighborhood', 'TEXT')
  ensureColumn(db, 'places', 'name_src', 'TEXT')
  ensureColumn(db, 'places', 'post_key', 'TEXT')
  ensureColumn(db, 'places', 'dup_ok', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumn(db, 'places', 'hidden', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumn(db, 'places', 'snippet', 'TEXT')
  ensureColumn(db, 'places', 'reviewed', 'INTEGER NOT NULL DEFAULT 0')
  ensureColumn(db, 'events', 'dev', 'TEXT')
  ensureColumn(db, 'events', 'ref', 'TEXT')
  ensureColumn(db, 'events', 'ret', 'INTEGER')
  db.exec("UPDATE places SET category='rest' WHERE category='fish'") // "Japonês" deixou de ser categoria: vira Restaurante
  return db
}

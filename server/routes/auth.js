import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { randomBytes } from 'node:crypto'
import { sha, RESERVED, TERMS_VERSION } from '../lib.js'
import { DEFAULT_THEME } from '../theme.js'
import { humanize } from '../extract.js'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HANDLE = /^[a-z0-9_.]{2,30}$/
const clean = (h) => String(h || '').trim().replace(/^@/, '').toLowerCase()

export default function auth(app, x) {
  const { db, cfg } = x

  app.get('/api/config', (c) => c.json({ minFollowers: x.minFollowers(), devLinks: cfg.dev }))

  // Candidatura pública (B1): cria o cadastro "em análise". Seguidores e titularidade são conferidos por quem analisa.
  app.post('/api/apply', async (c) => {
    const b = await c.req.json().catch(() => ({}))
    const email = String(b.email || '').trim().toLowerCase()
    const handle = clean(b.handle)
    const tiktok = clean(b.tiktok)
    if (!EMAIL.test(email)) return c.json({ error: 'email_invalido' }, 400)
    if (!HANDLE.test(handle)) return c.json({ error: 'handle_invalido' }, 400)
    if (tiktok && !HANDLE.test(tiktok)) return c.json({ error: 'tiktok_invalido' }, 400)
    if (!b.acceptTerms) return c.json({ error: 'aceite_obrigatorio' }, 400)
    db.prepare('INSERT OR IGNORE INTO users(email) VALUES (?)').run(email)
    const u = db.prepare('SELECT * FROM users WHERE email=?').get(email)
    const existing = x.creatorOf(u.id)
    if (existing) return c.json({ error: 'ja_existe', status: existing.status }, 409)
    if (db.prepare('SELECT 1 FROM creators WHERE handle=?').get(handle)) return c.json({ error: 'handle_em_uso' }, 409)
    let slug = handle.replace(/[._]/g, '-').slice(0, 30)
    if (slug.length < 3 || RESERVED.has(slug)) slug = `${slug}-sp`
    while (db.prepare('SELECT 1 FROM creators WHERE slug=?').get(slug)) slug = `${slug.slice(0, 26)}-${randomBytes(2).toString('hex')}`
    const consents = { hosting: true, acceptedAt: new Date().toISOString(), termsVersion: TERMS_VERSION }
    const r = db.prepare('INSERT INTO creators(user_id,handle,tiktok,slug,display_name,followers,status,theme,consents) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(u.id, handle, tiktok || null, slug, humanize(handle).slice(0, 60), 0, 'pending', JSON.stringify(DEFAULT_THEME), JSON.stringify(consents))
    x.logConsent(Number(r.lastInsertRowid), 'terms', true)
    return c.json({ status: 'pending' })
  })

  // Link mágico, sem senha
  app.post('/api/auth/request', async (c) => {
    const { email, next } = await c.req.json().catch(() => ({}))
    const e = String(email || '').trim().toLowerCase()
    if (!EMAIL.test(e)) return c.json({ error: 'email_invalido' }, 400)
    const token = randomBytes(24).toString('hex')
    db.prepare('INSERT INTO login_tokens(hash,email,expires_at) VALUES (?,?,?)').run(sha(token), e, Date.now() + 15 * 60000)
    const link = `${cfg.baseUrl}/api/auth/verify?token=${token}${next === '/voo' ? '&next=voo' : ''}`
    if (await x.sendMail(e, 'Seu link de acesso', `Abra para entrar (vale 15 minutos, uso único):\n${link}`)) return c.json({ ok: true })
    return c.json({ ok: true, devLink: cfg.dev ? link : undefined })
  })
  app.get('/api/auth/verify', (c) => {
    const token = c.req.query('token') || ''
    const row = db.prepare('SELECT * FROM login_tokens WHERE hash=?').get(sha(token))
    if (!row || row.used || row.expires_at < Date.now()) return c.redirect('/entrar?erro=link')
    db.prepare('UPDATE login_tokens SET used=1 WHERE hash=?').run(row.hash)
    db.prepare('INSERT OR IGNORE INTO users(email) VALUES (?)').run(row.email)
    const u = db.prepare('SELECT * FROM users WHERE email=?').get(row.email)
    if (cfg.adminEmail && row.email === cfg.adminEmail && u.role !== 'admin') db.prepare("UPDATE users SET role='admin' WHERE id=?").run(u.id)
    const sid = randomBytes(24).toString('hex')
    db.prepare('INSERT INTO sessions(hash,user_id,expires_at) VALUES (?,?,?)').run(sha(sid), u.id, Date.now() + 30 * 86400000)
    setCookie(c, 'sid', sid, { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 30 * 86400, secure: !cfg.dev })
    return c.redirect(c.req.query('next') === 'voo' ? '/voo' : '/painel')
  })
  // Só em desenvolvimento: "Entrar com Instagram" simulado, sem Meta e sem e-mail. Entra num criador de teste já aprovado.
  app.post('/api/auth/demo', (c) => {
    if (!cfg.dev) return c.json({ error: 'indisponivel' }, 404)
    const email = 'criador.demo@wagli.local'
    db.prepare('INSERT OR IGNORE INTO users(email) VALUES (?)').run(email)
    const u = db.prepare('SELECT * FROM users WHERE email=?').get(email)
    if (!x.creatorOf(u.id)) {
      const consents = { hosting: true, acceptedAt: new Date().toISOString(), termsVersion: TERMS_VERSION }
      db.prepare('INSERT INTO creators(user_id,handle,slug,display_name,followers,status,onboarding,theme,consents) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(u.id, 'criador_demo', 'criador-demo', 'Criador Demo', 12000, 'approved', 'done', JSON.stringify(DEFAULT_THEME), JSON.stringify(consents))
    }
    const sid = randomBytes(24).toString('hex')
    db.prepare('INSERT INTO sessions(hash,user_id,expires_at) VALUES (?,?,?)').run(sha(sid), u.id, Date.now() + 30 * 86400000)
    setCookie(c, 'sid', sid, { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 30 * 86400, secure: false })
    return c.json({ ok: true })
  })
  app.post('/api/auth/logout', (c) => {
    const sid = getCookie(c, 'sid')
    if (sid) db.prepare('DELETE FROM sessions WHERE hash=?').run(sha(sid))
    deleteCookie(c, 'sid', { path: '/' })
    return c.json({ ok: true })
  })
  app.get('/api/me', (c) => {
    const u = x.user(c)
    const cr = u ? x.creatorOf(u.id) : null
    const claims = u ? db.prepare("SELECT id, place_key, place_name, status FROM claims WHERE user_id=?").all(u.id) : []
    return c.json({ user: u, creator: u ? x.view(cr) : null, claims, minFollowers: x.minFollowers(), notices: cr ? db.prepare('SELECT id, text, created_at FROM notices WHERE creator_id=? AND seen=0 ORDER BY id DESC LIMIT 5').all(cr.id) : [] })
  })
}

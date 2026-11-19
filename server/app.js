import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { serveStatic } from '@hono/node-server/serve-static'
import { createHash, randomBytes } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'
import { extract, tiktokId, dateFromTiktokId } from './extract.js'
import { enqueueGeocode } from './geocode.js'

export const ICONS = ['rest', 'cafe', 'bar', 'bread', 'cake', 'pizza', 'fish', 'burger', 'heart', 'star', 'flag', 'store', 'clock', 'spark']
export const DEFAULT_THEME = {
  accent: '#ff4b2b', bg: '#ffffff', fg: '#171717', font: 'sans', radius: 14, tone: 'light', shape: 'drop',
  showLinks: true, showFilters: true, bio: '',
  categories: [
    { id: 'rest', name: 'Restaurantes', color: '#ff4b2b', icon: 'rest' }, { id: 'cafe', name: 'Cafés', color: '#a16207', icon: 'cafe' },
    { id: 'bar', name: 'Drinks', color: '#7c3aed', icon: 'bar' }, { id: 'bread', name: 'Padarias', color: '#f59e0b', icon: 'bread' },
    { id: 'cake', name: 'Doces', color: '#ec4899', icon: 'cake' }, { id: 'pizza', name: 'Pizza', color: '#dc2626', icon: 'pizza' },
    { id: 'fish', name: 'Japonês', color: '#2d7ff9', icon: 'fish' }, { id: 'burger', name: 'Lanches', color: '#ea580c', icon: 'burger' },
  ],
}
const FONTS = ['sans', 'disp', 'serif', 'mono']
const TONES = ['light', 'dark', 'sepia', 'mint', 'blue']
const SHAPES = ['drop', 'circle', 'square', 'hex']
const HEX = /^#[0-9a-fA-F]{6}$/
const RESERVED = new Set(['admin', 'api', 'painel', 'entrar', 'candidatura', 'assets', 'termos', 'privacidade', 'mapa', 'app', 'www'])
const EVENTS = new Set(['session', 'search', 'place_open', 'route_click', 'post_open', 'video_open'])

const sha = (s) => createHash('sha256').update(s).digest('hex')
const j = (s, fb) => { try { return JSON.parse(s) } catch { return fb } }

export function sanitizeTheme(input = {}) {
  const t = { ...DEFAULT_THEME, ...(input || {}) }
  const out = {
    accent: HEX.test(t.accent) ? t.accent : DEFAULT_THEME.accent, bg: HEX.test(t.bg) ? t.bg : DEFAULT_THEME.bg, fg: HEX.test(t.fg) ? t.fg : DEFAULT_THEME.fg,
    font: FONTS.includes(t.font) ? t.font : 'sans', tone: TONES.includes(t.tone) ? t.tone : 'light', shape: SHAPES.includes(t.shape) ? t.shape : 'drop',
    radius: Math.max(0, Math.min(32, parseInt(t.radius, 10) || 0)), showLinks: !!t.showLinks, showFilters: !!t.showFilters,
    bio: String(t.bio || '').slice(0, 160),
  }
  const seen = new Set()
  out.categories = (Array.isArray(t.categories) ? t.categories : DEFAULT_THEME.categories).slice(0, 16).map((c) => ({
    id: String(c.id || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20), name: String(c.name || '').slice(0, 30),
    color: HEX.test(c.color) ? c.color : '#ff4b2b', icon: ICONS.includes(c.icon) ? c.icon : 'rest',
  })).filter((c) => c.id && c.name && !seen.has(c.id) && seen.add(c.id))
  if (!out.categories.length) out.categories = DEFAULT_THEME.categories
  return out
}

export function createApp(db, opts = {}) {
  const cfg = {
    minFollowers: Number(opts.minFollowers ?? process.env.MIN_FOLLOWERS ?? 10000),
    adminEmail: (opts.adminEmail ?? process.env.ADMIN_EMAIL ?? '').toLowerCase(),
    dev: opts.dev ?? process.env.NODE_ENV !== 'production',
    baseUrl: opts.baseUrl ?? process.env.BASE_URL ?? 'http://localhost:4300',
    fetchImpl: opts.fetchImpl ?? fetch,
    geocode: opts.geocode ?? true,
  }
  const app = new Hono()

  // ---------- helpers ----------
  const user = (c) => {
    const sid = getCookie(c, 'sid')
    if (!sid) return null
    return db.prepare(`SELECT u.id, u.email, u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires_at>?`).get(sha(sid), Date.now()) || null
  }
  const creatorOf = (uid) => db.prepare('SELECT * FROM creators WHERE user_id=?').get(uid)
  const view = (cr) => cr && { id: cr.id, handle: cr.handle, slug: cr.slug, displayName: cr.display_name, followers: cr.followers, status: cr.status, published: !!cr.published, theme: sanitizeTheme(j(cr.theme, {})), links: j(cr.links, []), consents: j(cr.consents, {}) }
  const auth = async (c, next) => { const u = user(c); if (!u) return c.json({ error: 'auth' }, 401); c.set('u', u); await next() }
  const approved = async (c, next) => {
    const cr = creatorOf(c.get('u').id)
    if (!cr) return c.json({ error: 'no_creator' }, 403)
    if (cr.status !== 'approved') return c.json({ error: 'not_approved', status: cr.status }, 403)
    c.set('cr', cr); await next()
  }
  const admin = async (c, next) => { if (c.get('u').role !== 'admin') return c.json({ error: 'forbidden' }, 403); await next() }
  const placeOut = (p) => ({ id: p.id, name: p.name, address: p.address, municipality: p.municipality, lat: p.lat, lon: p.lon, geoStatus: p.geo_status, geoQuality: p.geo_quality, category: p.category, postUrl: p.post_url, postedOn: p.posted_on, ad: !!p.ad, rec: p.rec, confidence: p.confidence, note: p.note, status: p.status })

  // ---------- config ----------
  app.get('/api/config', (c) => c.json({ minFollowers: cfg.minFollowers, devLinks: cfg.dev, icons: ICONS }))

  // ---------- auth (link mágico, sem senha) ----------
  app.post('/api/auth/request', async (c) => {
    const { email } = await c.req.json().catch(() => ({}))
    const e = String(email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return c.json({ error: 'email_invalido' }, 400)
    const token = randomBytes(24).toString('hex')
    db.prepare('INSERT INTO login_tokens(hash,email,expires_at) VALUES (?,?,?)').run(sha(token), e, Date.now() + 15 * 60000)
    const link = `${cfg.baseUrl}/api/auth/verify?token=${token}`
    if (process.env.RESEND_API_KEY && !cfg.dev) {
      await cfg.fetchImpl('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: process.env.MAIL_FROM, to: e, subject: 'Seu link de acesso', text: `Abra para entrar (vale 15 minutos, uso único):\n${link}` }),
      })
      return c.json({ ok: true })
    }
    return c.json({ ok: true, devLink: cfg.dev ? link : undefined })
  })
  app.get('/api/auth/verify', (c) => {
    const token = c.req.query('token') || ''
    const row = db.prepare('SELECT * FROM login_tokens WHERE hash=?').get(sha(token))
    if (!row || row.used || row.expires_at < Date.now()) return c.redirect('/#/entrar?erro=link')
    db.prepare('UPDATE login_tokens SET used=1 WHERE hash=?').run(row.hash)
    db.prepare('INSERT OR IGNORE INTO users(email) VALUES (?)').run(row.email)
    const u = db.prepare('SELECT * FROM users WHERE email=?').get(row.email)
    if (cfg.adminEmail && row.email === cfg.adminEmail && u.role !== 'admin') db.prepare("UPDATE users SET role='admin' WHERE id=?").run(u.id)
    const sid = randomBytes(24).toString('hex')
    db.prepare('INSERT INTO sessions(hash,user_id,expires_at) VALUES (?,?,?)').run(sha(sid), u.id, Date.now() + 30 * 86400000)
    setCookie(c, 'sid', sid, { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 30 * 86400, secure: !cfg.dev })
    return c.redirect('/#/painel')
  })
  app.post('/api/auth/logout', (c) => {
    const sid = getCookie(c, 'sid')
    if (sid) db.prepare('DELETE FROM sessions WHERE hash=?').run(sha(sid))
    deleteCookie(c, 'sid', { path: '/' })
    return c.json({ ok: true })
  })
  app.get('/api/me', (c) => {
    const u = user(c)
    return c.json({ user: u, creator: u ? view(creatorOf(u.id)) : null })
  })

  // ---------- candidatura (critério de seguidores; verificação final é manual) ----------
  app.post('/api/apply', auth, async (c) => {
    const u = c.get('u')
    if (creatorOf(u.id)) return c.json({ error: 'ja_existe' }, 409)
    const b = await c.req.json().catch(() => ({}))
    const handle = String(b.handle || '').trim().replace(/^@/, '').toLowerCase()
    const followers = Math.max(0, parseInt(b.followers, 10) || 0)
    if (!/^[a-z0-9_.]{2,30}$/.test(handle)) return c.json({ error: 'handle_invalido' }, 400)
    if (!b.acceptTerms) return c.json({ error: 'aceite_obrigatorio' }, 400)
    let slug = handle.replace(/[._]/g, '-').slice(0, 30)
    if (slug.length < 3 || RESERVED.has(slug)) slug = `${slug}-sp`
    while (db.prepare('SELECT 1 FROM creators WHERE slug=?').get(slug)) slug = `${slug.slice(0, 26)}-${randomBytes(2).toString('hex')}`
    const status = followers >= cfg.minFollowers ? 'pending' : 'waitlist'
    db.prepare('INSERT INTO creators(user_id,handle,slug,display_name,followers,status,theme,consents) VALUES (?,?,?,?,?,?,?,?)')
      .run(u.id, handle, slug, String(b.displayName || handle).slice(0, 60), followers, status, JSON.stringify(DEFAULT_THEME), JSON.stringify({ hosting: true, acceptedAt: new Date().toISOString() }))
    return c.json({ creator: view(creatorOf(u.id)) })
  })

  // ---------- admin ----------
  app.get('/api/admin/creators', auth, admin, (c) => c.json({ minFollowers: cfg.minFollowers, creators: db.prepare('SELECT c.*, u.email FROM creators c JOIN users u ON u.id=c.user_id ORDER BY c.id DESC').all().map((r) => ({ id: r.id, handle: r.handle, email: r.email, followers: r.followers, status: r.status, published: !!r.published, places: db.prepare("SELECT COUNT(*) n FROM places WHERE creator_id=? AND status!='removed'").get(r.id).n })) }))
  app.post('/api/admin/creators/:id/decision', auth, admin, async (c) => {
    const { status } = await c.req.json().catch(() => ({}))
    if (!['approved', 'rejected', 'waitlist', 'pending'].includes(status)) return c.json({ error: 'status' }, 400)
    db.prepare('UPDATE creators SET status=? WHERE id=?').run(status, Number(c.req.param('id')))
    if (status !== 'approved') db.prepare('UPDATE creators SET published=0 WHERE id=?').run(Number(c.req.param('id')))
    return c.json({ ok: true })
  })
  app.get('/api/admin/reports', auth, admin, (c) => c.json({ reports: db.prepare('SELECT r.*, p.name place_name FROM reports r LEFT JOIN places p ON p.id=r.place_id ORDER BY r.id DESC LIMIT 100').all() }))

  // ---------- áreas do criador (somente aprovados) ----------
  const cr = new Hono()
  cr.use('*', auth, approved)
  cr.get('/places', (c) => c.json({ places: db.prepare("SELECT * FROM places WHERE creator_id=? AND status!='removed' ORDER BY id DESC").all(c.get('cr').id).map(placeOut) }))
  cr.post('/posts', async (c) => {
    const creator = c.get('cr')
    const { posts } = await c.req.json().catch(() => ({}))
    if (!Array.isArray(posts) || !posts.length || posts.length > 30) return c.json({ error: 'posts_1_a_30' }, 400)
    const created = []
    const ins = db.prepare('INSERT INTO places(creator_id,name,address,category,post_url,post_id,posted_on,ad,rec,confidence,status,geo_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    for (const p of posts) {
      const url = String(p.url || '').slice(0, 300)
      const text = String(p.caption || '').slice(0, 4000)
      const tid = tiktokId(url)
      const date = /^\d{4}-\d{2}-\d{2}$/.test(p.date || '') ? p.date : tid ? dateFromTiktokId(tid) : null
      const e = extract(text)
      const rows = e.name && e.units.length ? e.units : e.name ? [{ address: null, label: null }] : [{ address: e.units[0]?.address || null, label: null }]
      for (const u of rows) {
        const name = e.name ? (u.label && e.nameSource === 'mention_handle' ? e.name : e.name) : null
        const status = name ? 'pending' : 'unresolved'
        const r = ins.run(creator.id, name, u.address, e.category, url, tid, date, e.ad ? 1 : 0, e.rec, e.confidence, status, u.address && cfg.geocode ? 'pending' : 'none')
        const id = Number(r.lastInsertRowid)
        if (u.address && cfg.geocode) enqueueGeocode(db, id, cfg.fetchImpl)
        created.push(id)
      }
    }
    return c.json({ created: created.length })
  })
  cr.patch('/places/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const p = db.prepare('SELECT * FROM places WHERE id=? AND creator_id=?').get(id, c.get('cr').id)
    if (!p) return c.json({ error: 'nao_encontrado' }, 404)
    const b = await c.req.json().catch(() => ({}))
    const name = 'name' in b ? String(b.name || '').slice(0, 80) : p.name
    const address = 'address' in b ? String(b.address || '').slice(0, 200) : p.address
    const category = 'category' in b ? String(b.category || p.category).slice(0, 20) : p.category
    let status = ['confirmed', 'pending', 'removed'].includes(b.status) ? b.status : p.status
    if (p.status === 'unresolved' && name && !('status' in b)) status = 'pending'
    if (status === 'confirmed' && !name) status = p.status
    db.prepare('UPDATE places SET name=?, address=?, category=?, note=?, ad=?, status=? WHERE id=?')
      .run(name, address || null, category, 'note' in b ? String(b.note || '').slice(0, 200) : p.note, 'ad' in b ? (b.ad ? 1 : 0) : p.ad, status, id)
    if (address && address !== p.address && cfg.geocode) {
      db.prepare("UPDATE places SET geo_status='pending', lat=NULL, lon=NULL WHERE id=?").run(id)
      enqueueGeocode(db, id, cfg.fetchImpl)
    }
    return c.json({ place: placeOut(db.prepare('SELECT * FROM places WHERE id=?').get(id)) })
  })
  cr.post('/places/confirm-high', (c) => {
    const r = db.prepare("UPDATE places SET status='confirmed' WHERE creator_id=? AND status='pending' AND confidence='high' AND geo_status='found' AND geo_quality='address_exact'").run(c.get('cr').id)
    return c.json({ confirmed: Number(r.changes) })
  })
  cr.put('/theme', async (c) => {
    const theme = sanitizeTheme(await c.req.json().catch(() => ({})))
    db.prepare('UPDATE creators SET theme=? WHERE id=?').run(JSON.stringify(theme), c.get('cr').id)
    return c.json({ theme })
  })
  cr.put('/links', async (c) => {
    const { links } = await c.req.json().catch(() => ({}))
    const clean = (Array.isArray(links) ? links : []).slice(0, 8).map((l) => ({ title: String(l.title || '').slice(0, 40), url: String(l.url || '').slice(0, 300) })).filter((l) => l.title && /^https?:\/\//i.test(l.url))
    db.prepare('UPDATE creators SET links=? WHERE id=?').run(JSON.stringify(clean), c.get('cr').id)
    return c.json({ links: clean })
  })
  cr.put('/slug', async (c) => {
    const { slug } = await c.req.json().catch(() => ({}))
    const s = String(slug || '').toLowerCase()
    if (!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(s) || RESERVED.has(s)) return c.json({ error: 'slug_invalido' }, 400)
    const other = db.prepare('SELECT id FROM creators WHERE slug=? AND id!=?').get(s, c.get('cr').id)
    if (other) return c.json({ error: 'slug_em_uso' }, 409)
    db.prepare('UPDATE creators SET slug=? WHERE id=?').run(s, c.get('cr').id)
    return c.json({ slug: s })
  })
  cr.put('/consents', async (c) => {
    const b = await c.req.json().catch(() => ({}))
    const prev = j(db.prepare('SELECT consents FROM creators WHERE id=?').get(c.get('cr').id).consents, {})
    const next = { ...prev, hosting: true, network: !!b.network, aggregatesForRestaurants: !!b.aggregatesForRestaurants, marketing: !!b.marketing, updatedAt: new Date().toISOString() }
    db.prepare('UPDATE creators SET consents=? WHERE id=?').run(JSON.stringify(next), c.get('cr').id)
    return c.json({ consents: next })
  })
  cr.post('/publish', async (c) => {
    const { published } = await c.req.json().catch(() => ({}))
    db.prepare('UPDATE creators SET published=? WHERE id=?').run(published ? 1 : 0, c.get('cr').id)
    return c.json({ published: !!published })
  })
  cr.get('/stats', (c) => {
    const id = c.get('cr').id
    const since = Date.now() - 30 * 86400000
    const n = (type) => db.prepare('SELECT COUNT(*) n FROM events WHERE creator_id=? AND type=? AND ts>?').get(id, type, since).n
    const searches = db.prepare("SELECT term, COUNT(*) n, SUM(CASE WHEN results=0 THEN 1 ELSE 0 END) empty FROM events WHERE creator_id=? AND type='search' AND ts>? AND term IS NOT NULL AND term!='' GROUP BY term ORDER BY n DESC LIMIT 15").all(id, since)
    const top = db.prepare("SELECT p.name, SUM(CASE WHEN e.type='place_open' THEN 1 ELSE 0 END) opens, SUM(CASE WHEN e.type='route_click' THEN 1 ELSE 0 END) routes FROM events e JOIN places p ON p.id=e.place_id WHERE e.creator_id=? AND e.ts>? GROUP BY p.id ORDER BY routes DESC, opens DESC LIMIT 10").all(id, since)
    const days = db.prepare("SELECT strftime('%Y-%m-%d', ts/1000, 'unixepoch') d, COUNT(DISTINCT sid) n FROM events WHERE creator_id=? AND ts>? GROUP BY d ORDER BY d").all(id, since)
    return c.json({
      sessions: db.prepare('SELECT COUNT(DISTINCT sid) n FROM events WHERE creator_id=? AND ts>?').get(id, since).n,
      placeOpens: n('place_open'), routeClicks: n('route_click'), postOpens: n('post_open') + n('video_open'),
      searches: searches.map((s) => ({ term: s.term, count: s.n, empty: s.empty })), topPlaces: top, days,
      note: 'Clique em rota indica interesse, não visita confirmada. Números são estimativas e nunca identificam pessoas.',
    })
  })
  app.route('/api/creator', cr)

  // ---------- público ----------
  app.get('/api/public/:slug', (c) => {
    const row = db.prepare("SELECT * FROM creators WHERE slug=? AND status='approved' AND published=1").get(c.req.param('slug').toLowerCase())
    if (!row) return c.json({ error: 'indisponivel' }, 404)
    const v = view(row)
    const places = db.prepare("SELECT * FROM places WHERE creator_id=? AND status='confirmed' AND geo_status='found' AND lat IS NOT NULL").all(row.id)
      .map((p) => ({ ...placeOut(p), tiktokId: p.post_id }))
    return c.json({ creator: { handle: v.handle, slug: v.slug, displayName: v.displayName, theme: v.theme, links: v.theme.showLinks ? v.links : [] }, places })
  })
  app.post('/api/e', async (c) => {
    const b = await c.req.json().catch(() => ({}))
    const row = db.prepare("SELECT id FROM creators WHERE slug=? AND status='approved' AND published=1").get(String(b.slug || '').toLowerCase())
    if (!row || !EVENTS.has(b.type)) return c.json({ ok: false }, 400)
    const term = b.term ? String(b.term).replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '').replace(/https?:\/\/\S+/g, '').replace(/\+?\d[\d\s().-]{8,}\d/g, '').trim().slice(0, 60) : null
    db.prepare('INSERT INTO events(creator_id,type,term,place_id,results,sid,ts) VALUES (?,?,?,?,?,?,?)')
      .run(row.id, b.type, term, Number.isInteger(b.placeId) ? b.placeId : null, Number.isInteger(b.results) ? b.results : null, String(b.sid || '').slice(0, 40), Date.now())
    return c.json({ ok: true })
  })
  app.post('/api/report', async (c) => {
    const b = await c.req.json().catch(() => ({}))
    const row = db.prepare('SELECT id FROM creators WHERE slug=?').get(String(b.slug || '').toLowerCase())
    if (!row || !String(b.reason || '').trim()) return c.json({ ok: false }, 400)
    const ip = c.req.header('x-forwarded-for') || 'local'
    db.prepare('INSERT INTO reports(creator_id,place_id,reason,details,ip_hash) VALUES (?,?,?,?,?)').run(row.id, Number.isInteger(b.placeId) ? b.placeId : null, String(b.reason).slice(0, 60), String(b.details || '').slice(0, 500), sha(`salt:${ip}`).slice(0, 16))
    return c.json({ ok: true })
  })

  // ---------- site (arquivos estáticos + SPA) ----------
  app.use('/*', serveStatic({ root: './web/dist' }))
  app.get('*', (c) => {
    if (c.req.path.startsWith('/api/')) return c.json({ error: 'not_found' }, 404)
    const f = 'web/dist/index.html'
    return existsSync(f) ? c.html(readFileSync(f, 'utf8')) : c.text('Rode "npm run build" primeiro.', 503)
  })
  return app
}

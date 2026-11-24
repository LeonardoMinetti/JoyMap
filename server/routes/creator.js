import { Hono } from 'hono'
import { randomBytes } from 'node:crypto'
import { extract, tiktokId, dateFromTiktokId } from '../extract.js'
import { enqueueGeocode, searchPlaces } from '../geocode.js'
import { sanitizeTheme, sanitizeSvg, accentProblem } from '../theme.js'
import { RESERVED, j, placeKey } from '../lib.js'
import { cleanGoogleUrl, cleanInstagramUrl } from '../placelinks.js'
import { cleanStops } from '../stops.js'
import { can, minTier } from '../plans.js'

const STEPS = ['start', 'instagram', 'tiktok', 'consents', 'plan', 'payment', 'welcome', 'done']
const CATEGORY = /^[a-z0-9_-]{1,20}$/
const DOMAIN = /^(?=.{4,100}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/

export default function creatorRoutes(app, x) {
  const { db, cfg } = x
  const cr = new Hono()
  cr.use('*', x.auth, x.approved)
  const me = (c) => c.get('cr')
  const fresh = (c) => db.prepare('SELECT * FROM creators WHERE id=?').get(me(c).id)
  const settingsOf = (id) => j(db.prepare('SELECT settings FROM creators WHERE id=?').get(id).settings, {})
  const saveSettings = (id, patch) => { const s = { ...settingsOf(id), ...patch }; db.prepare('UPDATE creators SET settings=? WHERE id=?').run(JSON.stringify(s), id); return s }

  // ---------- onboarding ----------
  cr.put('/onboarding', async (c) => {
    const { step } = await c.req.json().catch(() => ({}))
    if (!STEPS.includes(step)) return c.json({ error: 'etapa_invalida' }, 400)
    db.prepare('UPDATE creators SET onboarding=? WHERE id=?').run(step, me(c).id)
    return c.json({ onboarding: step })
  })
  // Conexão oficial por OAuth depende do app aprovado pela plataforma; sem credenciais configuradas, não finge conectar.
  cr.post('/connect/:network', (c) => {
    const n = c.req.param('network')
    if (!['instagram', 'tiktok'].includes(n)) return c.json({ error: 'rede' }, 400)
    const ready = n === 'instagram' ? cfg.metaConfigured : cfg.tiktokConfigured
    if (!ready) return c.json({ error: 'nao_configurado' }, 501)
    return c.json({ error: 'fluxo_oauth_pendente' }, 501)
  })
  cr.put('/accounts', async (c) => {
    const b = await c.req.json().catch(() => ({}))
    const col = { instagram: 'instagram_state', tiktok: 'tiktok_state' }[b.network]
    if (!col || !['none', 'skipped', 'revoked'].includes(b.state)) return c.json({ error: 'dados' }, 400)
    db.prepare(`UPDATE creators SET ${col}=? WHERE id=?`).run(b.state, me(c).id)
    return c.json({ ok: true })
  })
  cr.post('/trial', async (c) => {
    const { billing } = await c.req.json().catch(() => ({}))
    const end = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    db.prepare('UPDATE creators SET billing=?, trial_ends=COALESCE(trial_ends, ?), onboarding=CASE WHEN onboarding IN (\'start\',\'instagram\',\'tiktok\',\'consents\',\'plan\',\'payment\') THEN \'welcome\' ELSE onboarding END WHERE id=?')
      .run(billing === 'annual' ? 'annual' : 'monthly', end, me(c).id)
    return c.json({ trialEnds: fresh(c).trial_ends })
  })
  cr.put('/billing', async (c) => {
    const { billing } = await c.req.json().catch(() => ({}))
    db.prepare('UPDATE creators SET billing=? WHERE id=?').run(billing === 'annual' ? 'annual' : 'monthly', me(c).id)
    return c.json({ billing: billing === 'annual' ? 'annual' : 'monthly' })
  })

  // ---------- montagem do mapa ----------
  cr.get('/progress', (c) => {
    const id = me(c).id
    const n = (sql) => db.prepare(sql).get(id).n
    const posts = n("SELECT COUNT(DISTINCT COALESCE(post_key, id)) n FROM places WHERE creator_id=? AND status!='removed'")
    const places = n("SELECT COUNT(*) n FROM places WHERE creator_id=? AND status IN ('pending','confirmed')")
    const withAddress = n("SELECT COUNT(*) n FROM places WHERE creator_id=? AND status IN ('pending','confirmed') AND address IS NOT NULL")
    const located = n("SELECT COUNT(*) n FROM places WHERE creator_id=? AND status IN ('pending','confirmed') AND geo_status='found'")
    const pending = n("SELECT COUNT(*) n FROM places WHERE creator_id=? AND geo_status='pending'")
    return c.json({ posts, places, withAddress, located, pending, done: posts > 0 && pending === 0 })
  })
  cr.get('/places', (c) => c.json({ places: db.prepare("SELECT * FROM places WHERE creator_id=? AND status!='removed' ORDER BY id DESC").all(me(c).id).map(x.placeOut) }))
  cr.get('/search-place', async (c) => {
    const q = String(c.req.query('q') || '').trim().slice(0, 80)
    if (q.length < 3) return c.json({ results: [] })
    try { return c.json({ results: await searchPlaces(db, q, cfg.fetchImpl) }) } catch { return c.json({ results: [], error: 'busca_indisponivel' }) }
  })
  cr.post('/posts', async (c) => {
    const creator = me(c)
    const { posts } = await c.req.json().catch(() => ({}))
    if (!Array.isArray(posts) || !posts.length || posts.length > 30) return c.json({ error: 'posts_1_a_30' }, 400)
    const batch = randomBytes(4).toString('hex')
    const auto = !!settingsOf(creator.id).autoConfirmHigh
    const created = []
    const ins = db.prepare('INSERT INTO places(creator_id,name,address,category,post_url,post_id,posted_on,ad,rec,confidence,status,geo_status,name_src,post_key,snippet) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    posts.forEach((p, i) => {
      const url = String(p.url || '').slice(0, 300)
      const text = String(p.caption || '').slice(0, 4000)
      const tid = tiktokId(url)
      const date = /^\d{4}-\d{2}-\d{2}$/.test(p.date || '') ? p.date : tid ? dateFromTiktokId(tid) : null
      const e = extract(text)
      const rows = e.name && e.units.length ? e.units : e.name ? [{ address: null, label: null }] : [{ address: e.units[0]?.address || null, label: null }]
      for (const u of rows) {
        const status = e.name ? 'pending' : 'unresolved'
        const r = ins.run(creator.id, e.name || null, u.address, e.category, url, tid, date, e.ad ? 1 : 0, e.rec, e.confidence, status, u.address && cfg.geocode ? 'pending' : 'none', e.nameSource, `${batch}:${i}`, text.replace(/\s+/g, ' ').trim().slice(0, 140) || null)
        const id = Number(r.lastInsertRowid)
        if (u.address && cfg.geocode) {
          enqueueGeocode(db, id, cfg.fetchImpl).then(() => {
            if (!auto) return
            db.prepare("UPDATE places SET status='confirmed' WHERE id=? AND status='pending' AND confidence='high' AND geo_status='found' AND geo_quality='address_exact'").run(id)
          })
        }
        created.push(id)
      }
    })
    return c.json({ created: created.length })
  })
  // Adicionar lugar escolhido na busca (C5) ou informado manualmente
  cr.post('/places', async (c) => {
    const b = await c.req.json().catch(() => ({}))
    const name = String(b.name || '').trim().slice(0, 80)
    if (!name) return c.json({ error: 'nome' }, 400)
    const url = String(b.postUrl || '').slice(0, 300)
    const tid = tiktokId(url)
    const found = Number.isFinite(Number(b.lat)) && Number.isFinite(Number(b.lon)) && b.lat !== null && b.lat !== ''
    const address = b.address ? String(b.address).slice(0, 200) : null
    const category = CATEGORY.test(b.category || '') ? b.category : 'rest'
    const gUrl = cleanGoogleUrl(b.googleUrl), iUrl = cleanInstagramUrl(b.instagramUrl)
    if (gUrl === undefined) return c.json({ error: 'google_invalido' }, 400)
    if (iUrl === undefined) return c.json({ error: 'instagram_invalido' }, 400)
    const r = db.prepare('INSERT INTO places(creator_id,name,address,municipality,neighborhood,lat,lon,geo_status,geo_quality,category,post_url,post_id,posted_on,status,confidence,name_src,post_key) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(me(c).id, name, address, b.municipality || null, b.neighborhood || null, found ? Number(b.lat) : null, found ? Number(b.lon) : null,
        found ? 'found' : address && cfg.geocode ? 'pending' : 'none', found ? (b.quality === 'address_exact' ? 'address_exact' : 'street_approx') : null, category, url || null, tid, tid ? dateFromTiktokId(tid) : null,
        found ? 'confirmed' : 'pending', 'manual', 'manual', `m:${randomBytes(4).toString('hex')}`)
    const id = Number(r.lastInsertRowid)
    if (gUrl || iUrl) db.prepare('UPDATE places SET google_url=?, instagram_url=? WHERE id=?').run(gUrl, iUrl, id)
    if (!found && address && cfg.geocode) enqueueGeocode(db, id, cfg.fetchImpl)
    return c.json({ place: x.placeOut(db.prepare('SELECT * FROM places WHERE id=?').get(id)) })
  })
  cr.patch('/places/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const p = db.prepare('SELECT * FROM places WHERE id=? AND creator_id=?').get(id, me(c).id)
    if (!p) return c.json({ error: 'nao_encontrado' }, 404)
    const b = await c.req.json().catch(() => ({}))
    const name = 'name' in b ? String(b.name || '').slice(0, 80) : p.name
    const address = 'address' in b ? String(b.address || '').slice(0, 200) : p.address
    const category = 'category' in b && CATEGORY.test(b.category) ? b.category : p.category
    let status = ['confirmed', 'pending', 'removed'].includes(b.status) ? b.status : p.status
    if (p.status === 'unresolved' && name && !('status' in b)) status = 'pending'
    if (status === 'confirmed' && !name) status = p.status
    const gUrl = 'googleUrl' in b ? cleanGoogleUrl(b.googleUrl) : p.google_url
    const iUrl = 'instagramUrl' in b ? cleanInstagramUrl(b.instagramUrl) : p.instagram_url
    if (gUrl === undefined) return c.json({ error: 'google_invalido' }, 400)
    if (iUrl === undefined) return c.json({ error: 'instagram_invalido' }, 400)
    const cCode = 'couponCode' in b ? String(b.couponCode || '').trim().slice(0, 30) || null : p.coupon_code
    const cNote = 'couponNote' in b ? String(b.couponNote || '').trim().slice(0, 140) || null : p.coupon_note
    const postUrl = 'postUrl' in b ? String(b.postUrl || '').slice(0, 300) || null : p.post_url
    const tid = 'postUrl' in b ? tiktokId(postUrl) : p.post_id
    // corrigir o nome já resolve a dúvida sobre ele
    const nameSrc = 'name' in b && name !== p.name ? 'manual' : p.name_src
    db.prepare('UPDATE places SET name=?, address=?, category=?, note=?, ad=?, status=?, post_url=?, post_id=?, posted_on=COALESCE(?, posted_on), name_src=?, google_url=?, instagram_url=?, coupon_code=?, coupon_note=? WHERE id=?')
      .run(name, address || null, category, 'note' in b ? String(b.note || '').slice(0, 200) : p.note, 'ad' in b ? (b.ad ? 1 : 0) : p.ad, status, postUrl, tid, 'postUrl' in b && tid ? dateFromTiktokId(tid) : null, nameSrc, gUrl, iUrl, cCode, cNote, id)
    if (address && address !== p.address && cfg.geocode) {
      db.prepare("UPDATE places SET geo_status='pending', lat=NULL, lon=NULL, reviewed=0 WHERE id=?").run(id)
      enqueueGeocode(db, id, cfg.fetchImpl)
    }
    return c.json({ place: x.placeOut(db.prepare('SELECT * FROM places WHERE id=?').get(id)) })
  })
  cr.post('/places/confirm-high', (c) => {
    const r = db.prepare("UPDATE places SET status='confirmed' WHERE creator_id=? AND status='pending' AND confidence='high' AND geo_status='found' AND geo_quality='address_exact'").run(me(c).id)
    return c.json({ confirmed: Number(r.changes) })
  })
  cr.post('/places/merge', async (c) => {
    const { keep, drop } = await c.req.json().catch(() => ({}))
    const get = (id) => db.prepare('SELECT * FROM places WHERE id=? AND creator_id=?').get(Number(id), me(c).id)
    const a = get(keep), b = get(drop)
    if (!a || !b || a.id === b.id) return c.json({ error: 'dados' }, 400)
    db.prepare('UPDATE places SET post_url=COALESCE(post_url, ?), post_id=COALESCE(post_id, ?), posted_on=COALESCE(posted_on, ?), ad=MAX(ad, ?) WHERE id=?').run(b.post_url, b.post_id, b.posted_on, b.ad, a.id)
    db.prepare("UPDATE places SET status='removed' WHERE id=?").run(b.id)
    return c.json({ ok: true })
  })
  cr.post('/places/keep-separate', async (c) => {
    const { ids } = await c.req.json().catch(() => ({}))
    const list = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isInteger).slice(0, 10)
    for (const id of list) db.prepare('UPDATE places SET dup_ok=1 WHERE id=? AND creator_id=?').run(id, me(c).id)
    return c.json({ ok: true })
  })

  // ---------- estúdio ----------
  cr.put('/theme', async (c) => {
    const cur = fresh(c)
    const prev = (x.view(cur).theme.categories || []).filter((k) => k.custom)
    const allow = can(cur.plan_tier, 'customCategories')
    const body = await c.req.json().catch(() => ({}))
    const theme = sanitizeTheme(body, allow ? {} : { only: new Set(prev.map((k) => k.id)) })
    if (!allow && sanitizeTheme(body).categories.some((k) => k.custom && !prev.some((o) => o.id === k.id))) return c.json({ error: 'plano', need: minTier('customCategories') }, 403)
    const problem = accentProblem(theme)
    if (problem) return c.json({ error: problem }, 400)
    db.prepare('UPDATE creators SET theme=? WHERE id=?').run(JSON.stringify(theme), me(c).id)
    for (const k of prev) if (!theme.categories.some((n) => n.id === k.id)) db.prepare('UPDATE places SET category=? WHERE creator_id=? AND category=?').run(k.base || 'rest', me(c).id, k.id) // categoria removida: os lugares voltam para o tipo de base
    return c.json({ theme: x.view(fresh(c)).theme })
  })
  cr.put('/links', async (c) => {
    const { links } = await c.req.json().catch(() => ({}))
    const clean = (Array.isArray(links) ? links : []).slice(0, 8).map((l) => ({ title: String(l.title || '').slice(0, 40), url: String(l.url || '').slice(0, 300), on: l.on !== false })).filter((l) => l.title && /^https?:\/\//i.test(l.url))
    db.prepare('UPDATE creators SET links=? WHERE id=?').run(JSON.stringify(clean), me(c).id)
    return c.json({ links: clean })
  })
  cr.get('/slug-available', (c) => {
    const s = String(c.req.query('slug') || '').toLowerCase()
    if (!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(s) || RESERVED.has(s)) return c.json({ available: false, reason: 'invalido' })
    const other = db.prepare('SELECT id FROM creators WHERE slug=? AND id!=?').get(s, me(c).id)
    return c.json({ available: !other, reason: other ? 'em_uso' : null })
  })
  cr.put('/slug', async (c) => {
    const { slug } = await c.req.json().catch(() => ({}))
    const s = String(slug || '').toLowerCase()
    if (!/^[a-z0-9][a-z0-9_-]{2,29}$/.test(s) || RESERVED.has(s)) return c.json({ error: 'slug_invalido' }, 400)
    if (db.prepare('SELECT id FROM creators WHERE slug=? AND id!=?').get(s, me(c).id)) return c.json({ error: 'slug_em_uso' }, 409)
    db.prepare('UPDATE creators SET slug=? WHERE id=?').run(s, me(c).id)
    return c.json({ slug: s })
  })
  cr.get('/symbols', (c) => c.json({ symbols: x.symbolMap(me(c).id, false) }))
  cr.post('/symbols', async (c) => {
    const b = await c.req.json().catch(() => ({}))
    if (db.prepare('SELECT COUNT(*) n FROM symbols WHERE creator_id=?').get(me(c).id).n >= 20) return c.json({ error: 'limite_20' }, 400)
    try {
      const s = sanitizeSvg(b.svg)
      const r = db.prepare('INSERT INTO symbols(creator_id,name,d,vb,mode) VALUES (?,?,?,?,?)').run(me(c).id, String(b.name || 'Símbolo').slice(0, 30), s.d, s.vb, s.mode)
      return c.json({ id: Number(r.lastInsertRowid), status: 'pending' })
    } catch (e) { return c.json({ error: e.message }, 400) }
  })
  cr.delete('/symbols/:id', (c) => {
    const id = Number(c.req.param('id'))
    db.prepare('DELETE FROM symbols WHERE id=? AND creator_id=?').run(id, me(c).id)
    return c.json({ ok: true })
  })
  // foto do lugar (enviada pelo criador; o navegador já reduz a imagem antes)
  const mine = (c) => db.prepare('SELECT id FROM places WHERE id=? AND creator_id=?').get(Number(c.req.param('id')), me(c).id)
  cr.put('/places/:id/photo', async (c) => {
    if (!mine(c)) return c.json({ error: 'nao_encontrado' }, 404)
    const b = await c.req.json().catch(() => ({}))
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(b.mime)) return c.json({ error: 'formato' }, 400)
    const buf = Buffer.from(String(b.data || ''), 'base64')
    if (!buf.length || buf.length > 400 * 1024) return c.json({ error: 'tamanho' }, 400)
    const magic = buf.subarray(0, 4).toString('latin1'), jpg = buf[0] === 0xff && buf[1] === 0xd8, png = magic === '\x89PNG', webp = magic === 'RIFF'
    if (!(jpg || png || webp)) return c.json({ error: 'formato' }, 400)
    const id = Number(c.req.param('id')), v = Date.now()
    db.prepare('INSERT INTO place_media(place_id,creator_id,mime,data) VALUES (?,?,?,?) ON CONFLICT(place_id) DO UPDATE SET mime=excluded.mime, data=excluded.data').run(id, me(c).id, b.mime, buf)
    db.prepare('UPDATE places SET photo_v=? WHERE id=?').run(v, id)
    return c.json({ ok: true, photo: `/api/creator/places/${id}/photo?v=${v}` })
  })
  cr.get('/places/:id/photo', (c) => {
    const m = mine(c) && db.prepare('SELECT mime, data FROM place_media WHERE place_id=?').get(Number(c.req.param('id')))
    return m ? c.body(m.data, 200, { 'Content-Type': m.mime, 'Cache-Control': 'private, max-age=300' }) : c.body(null, 404)
  })
  cr.delete('/places/:id/photo', (c) => {
    if (!mine(c)) return c.json({ error: 'nao_encontrado' }, 404)
    const id = Number(c.req.param('id'))
    db.prepare('DELETE FROM place_media WHERE place_id=?').run(id); db.prepare('UPDATE places SET photo_v=NULL WHERE id=?').run(id)
    return c.json({ ok: true })
  })
  cr.put('/cover', async (c) => {
    const b = await c.req.json().catch(() => ({}))
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(b.mime)) return c.json({ error: 'formato' }, 400)
    const buf = Buffer.from(String(b.data || ''), 'base64')
    if (!buf.length || buf.length > 600 * 1024) return c.json({ error: 'tamanho' }, 400)
    db.prepare('INSERT INTO media(creator_id,mime,data) VALUES (?,?,?) ON CONFLICT(creator_id) DO UPDATE SET mime=excluded.mime, data=excluded.data').run(me(c).id, b.mime, buf)
    return c.json({ ok: true })
  })
  cr.get('/cover', (c) => {
    const m = db.prepare('SELECT mime, data FROM media WHERE creator_id=?').get(me(c).id)
    return m ? c.body(m.data, 200, { 'Content-Type': m.mime, 'Cache-Control': 'no-store' }) : c.body(null, 404)
  })
  cr.delete('/cover', (c) => { db.prepare('DELETE FROM media WHERE creator_id=?').run(me(c).id); return c.json({ ok: true }) })
  cr.get('/routes', (c) => c.json({ routes: db.prepare('SELECT id, name, note, color, place_ids, stops FROM routes WHERE creator_id=? ORDER BY pos, id').all(me(c).id).map((r) => ({ id: r.id, name: r.name, note: r.note, color: r.color || null, placeIds: j(r.place_ids, []), stops: j(r.stops, []) })) }))
  cr.put('/routes', async (c) => {
    const { routes } = await c.req.json().catch(() => ({}))
    const own = new Set(db.prepare("SELECT id FROM places WHERE creator_id=?").all(me(c).id).map((r) => r.id))
    db.prepare('DELETE FROM routes WHERE creator_id=?').run(me(c).id)
    ;(Array.isArray(routes) ? routes : []).slice(0, 12).forEach((r, i) => {
      const name = String(r.name || '').trim().slice(0, 40)
      if (!name) return
      const stops = cleanStops(r.stops, own)
      // com paradas, os lugares do roteiro saem delas (na ordem da história); sem paradas, vale a lista de lugares
      const ids = stops.length ? [...new Set(stops.map((s) => s.placeId).filter(Boolean))] : (Array.isArray(r.placeIds) ? r.placeIds : []).map(Number).filter((n) => own.has(n)).slice(0, 30)
      db.prepare('INSERT INTO routes(creator_id,name,note,color,place_ids,stops,pos) VALUES (?,?,?,?,?,?,?)').run(me(c).id, name, String(r.note || '').slice(0, 60), /^#[0-9a-fA-F]{6}$/.test(r.color || '') ? r.color : null, JSON.stringify(ids), JSON.stringify(stops), i)
    })
    return c.json({ ok: true })
  })
  cr.put('/domain', async (c) => {
    const { domain } = await c.req.json().catch(() => ({}))
    const d = String(domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (d && !can(fresh(c).plan_tier, 'customDomain')) return c.json({ error: 'plano', need: minTier('customDomain') }, 403)
    if (!d) { db.prepare("UPDATE creators SET domain=NULL, domain_status='none' WHERE id=?").run(me(c).id); return c.json({ domain: null }) }
    if (!DOMAIN.test(d) || d === new URL(cfg.baseUrl).hostname) return c.json({ error: 'dominio_invalido' }, 400)
    if (db.prepare('SELECT 1 FROM creators WHERE domain=? AND id!=?').get(d, me(c).id)) return c.json({ error: 'dominio_em_uso' }, 409)
    db.prepare("UPDATE creators SET domain=?, domain_status='pending' WHERE id=?").run(d, me(c).id)
    return c.json({ domain: d, status: 'pending', target: new URL(cfg.baseUrl).hostname })
  })
  cr.post('/domain/check', async (c) => {
    const row = fresh(c)
    if (!row.domain) return c.json({ error: 'sem_dominio' }, 400)
    const target = new URL(cfg.baseUrl).hostname.toLowerCase()
    let ok = false
    try { ok = (await cfg.resolveCname(row.domain)).some((h) => h.toLowerCase().replace(/\.$/, '') === target) } catch { ok = false }
    db.prepare('UPDATE creators SET domain_status=? WHERE id=?').run(ok ? 'active' : 'pending', row.id)
    return c.json({ status: ok ? 'active' : 'pending', target })
  })

  // ---------- consentimentos, plano, conta ----------
  cr.put('/consents', async (c) => {
    const b = await c.req.json().catch(() => ({}))
    const prev = j(fresh(c).consents, {})
    const next = { ...prev, hosting: true, network: !!b.network, aggregatesForRestaurants: !!b.aggregatesForRestaurants, marketing: !!b.marketing, updatedAt: new Date().toISOString() }
    for (const k of ['network', 'aggregatesForRestaurants', 'marketing']) if (!!prev[k] !== next[k]) x.logConsent(me(c).id, k, next[k])
    db.prepare('UPDATE creators SET consents=? WHERE id=?').run(JSON.stringify(next), me(c).id)
    return c.json({ consents: next })
  })
  cr.get('/consents/log', (c) => c.json({ log: db.prepare('SELECT key, value, terms_version, ts FROM consent_log WHERE creator_id=? ORDER BY id DESC LIMIT 30').all(me(c).id) }))
  cr.put('/settings', async (c) => {
    const b = await c.req.json().catch(() => ({}))
    const patch = {}
    for (const k of ['autoConfirmHigh', 'bioLinkIg', 'bioLinkTiktok']) if (k in b) patch[k] = !!b[k]
    return c.json({ settings: saveSettings(me(c).id, patch) })
  })
  cr.post('/publish', async (c) => {
    const { published } = await c.req.json().catch(() => ({}))
    const s = settingsOf(me(c).id)
    if (published && s.adminPaused) return c.json({ error: 'pausado_pela_equipe' }, 403)
    db.prepare('UPDATE creators SET published=? WHERE id=?').run(published ? 1 : 0, me(c).id)
    if (published) saveSettings(me(c).id, { paused: false })
    return c.json({ published: !!published })
  })
  cr.post('/pause', async (c) => {
    const { paused } = await c.req.json().catch(() => ({}))
    if (!paused && settingsOf(me(c).id).adminPaused) return c.json({ error: 'pausado_pela_equipe' }, 403)
    const cur = fresh(c)
    const was = !!settingsOf(cur.id).wasPublished
    saveSettings(cur.id, paused ? { paused: true, wasPublished: !!cur.published } : { paused: false, wasPublished: false })
    db.prepare('UPDATE creators SET published=? WHERE id=?').run(paused ? 0 : (was ? 1 : cur.published), cur.id)
    return c.json({ paused: !!paused })
  })
  cr.put('/account', async (c) => {
    const { displayName } = await c.req.json().catch(() => ({}))
    const n = String(displayName || '').trim().slice(0, 60)
    if (!n) return c.json({ error: 'nome' }, 400)
    db.prepare('UPDATE creators SET display_name=? WHERE id=?').run(n, me(c).id)
    return c.json({ displayName: n })
  })
  cr.post('/interest', async (c) => {
    const { kind } = await c.req.json().catch(() => ({}))
    if (kind !== 'listas') return c.json({ error: 'tipo' }, 400)
    db.prepare('INSERT OR IGNORE INTO interest(creator_id,kind) VALUES (?,?)').run(me(c).id, kind)
    return c.json({ ok: true })
  })
  cr.get('/interest', (c) => c.json({ listas: !!db.prepare("SELECT 1 FROM interest WHERE creator_id=? AND kind='listas'").get(me(c).id) }))
  cr.post('/notices/seen', (c) => { db.prepare('UPDATE notices SET seen=1 WHERE creator_id=?').run(me(c).id); return c.json({ ok: true }) })

  cr.get('/export', (c) => {
    const row = fresh(c)
    const places = db.prepare("SELECT * FROM places WHERE creator_id=? AND status!='removed'").all(row.id).map(x.placeOut)
    if (c.req.query('format') === 'csv') {
      const cols = ['name', 'address', 'municipality', 'neighborhood', 'lat', 'lon', 'category', 'googleUrl', 'instagramUrl', 'couponCode', 'couponNote', 'postUrl', 'postedOn', 'ad', 'status']
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const csv = [cols.join(','), ...places.map((p) => cols.map((k) => esc(p[k])).join(','))].join('\n')
      return c.body(csv, 200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="meus-lugares.csv"' })
    }
    const since = Date.now() - 30 * 86400000
    const data = {
      exportedAt: new Date().toISOString(), creator: x.view(row), places,
      routes: db.prepare('SELECT name, note, place_ids, stops FROM routes WHERE creator_id=?').all(row.id),
      consentHistory: db.prepare('SELECT key, value, terms_version, ts FROM consent_log WHERE creator_id=?').all(row.id),
      aggregateStats30d: {
        sessions: db.prepare('SELECT COUNT(DISTINCT sid) n FROM events WHERE creator_id=? AND ts>?').get(row.id, since).n,
        events: db.prepare('SELECT type, COUNT(*) n FROM events WHERE creator_id=? AND ts>? GROUP BY type').all(row.id, since),
      },
    }
    return c.body(JSON.stringify(data, null, 2), 200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="meus-dados.json"' })
  })
  cr.delete('/account', async (c) => {
    const { confirm } = await c.req.json().catch(() => ({}))
    if (confirm !== 'EXCLUIR') return c.json({ error: 'confirmacao' }, 400)
    const row = fresh(c)
    for (const t of ['places', 'events', 'routes', 'symbols', 'media', 'place_media', 'consent_log', 'notices', 'interest', 'reports']) db.prepare(`DELETE FROM ${t} WHERE creator_id=?`).run(row.id)
    db.prepare('DELETE FROM creators WHERE id=?').run(row.id)
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id)
    return c.json({ ok: true })
  })

  // ---------- estatísticas (agregadas; nunca identificam pessoas) ----------
  cr.get('/stats', (c) => {
    const id = me(c).id
    const days = c.req.query('days') === '7' ? 7 : 30
    const since = Date.now() - days * 86400000
    const n = (type) => db.prepare('SELECT COUNT(*) n FROM events WHERE creator_id=? AND type=? AND ts>?').get(id, type, since).n
    const searches = db.prepare("SELECT term, COUNT(*) n, SUM(CASE WHEN results=0 THEN 1 ELSE 0 END) empty FROM events WHERE creator_id=? AND type='search' AND ts>? AND term IS NOT NULL AND term!='' GROUP BY term ORDER BY n DESC LIMIT 15").all(id, since)
    const top = db.prepare("SELECT p.id, p.name, p.category, SUM(CASE WHEN e.type='place_open' THEN 1 ELSE 0 END) opens, SUM(CASE WHEN e.type='route_click' THEN 1 ELSE 0 END) routes FROM events e JOIN places p ON p.id=e.place_id WHERE e.creator_id=? AND e.ts>? GROUP BY p.id ORDER BY routes DESC, opens DESC LIMIT 20").all(id, since)
    const perDay = db.prepare("SELECT strftime('%Y-%m-%d', ts/1000, 'unixepoch') d, COUNT(DISTINCT sid) n FROM events WHERE creator_id=? AND ts>? GROUP BY d ORDER BY d").all(id, since)
    const sessions = db.prepare('SELECT COUNT(DISTINCT sid) n FROM events WHERE creator_id=? AND ts>?').get(id, since).n
    const sess = db.prepare("SELECT dev, ref, ret, ts FROM events WHERE creator_id=? AND type='session' AND ts>?").all(id, since)
    const enough = sess.length >= 5 // amostra mínima: abaixo disso não mostramos percentuais
    const pct = (k) => (sess.length ? Math.round((k / sess.length) * 100) : 0)
    const weekdays = [0, 0, 0, 0, 0, 0, 0]
    for (const s of sess) weekdays[new Date(s.ts - 3 * 3600000).getUTCDay()]++
    const origins = {}
    for (const s of sess) origins[s.ref || 'direto'] = (origins[s.ref || 'direto'] || 0) + 1
    const top1 = searches.find((s) => s.empty > 0)
    return c.json({
      days, sessions, placeOpens: n('place_open'), routeClicks: n('route_click'), postOpens: n('post_open') + n('video_open'), requests: n('request'),
      searches: searches.map((s) => ({ term: s.term, count: s.n, empty: s.empty, withResults: s.n - s.empty })), topPlaces: top, perDay,
      featured: top[0] && top[0].routes > 0 ? { name: top[0].name, routes: top[0].routes } : null,
      opportunity: top1 ? { term: top1.term, count: top1.n, empty: top1.empty } : null,
      audience: { enough, sample: sess.length, weekdays, mobilePct: enough ? pct(sess.filter((s) => s.dev === 'm').length) : null, returningPct: enough ? pct(sess.filter((s) => s.ret).length) : null,
        origins: enough ? Object.entries(origins).map(([ref, k]) => ({ ref, pct: pct(k) })).sort((a, b) => b.pct - a.pct) : [], cities: null },
      note: 'Clique em rota indica interesse, não visita confirmada. Números são estimativas e nunca identificam pessoas.',
    })
  })

  app.route('/api/creator', cr)
}

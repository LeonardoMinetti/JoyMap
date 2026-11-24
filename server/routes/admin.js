import { Hono } from 'hono'
import { DEFAULT_THEME } from '../theme.js'
import { TIERS } from '../plans.js'
import { j } from '../lib.js'

const SLA_DAYS = 5 // prazo interno de resposta a denúncias (premissa, ajustável)
const REASON_TEXT = (s) => s

export default function adminRoutes(app, x) {
  const { db } = x
  const ad = new Hono()
  ad.use('*', x.auth, x.admin)
  const one = (sql, ...a) => db.prepare(sql).get(...a)
  const all = (sql, ...a) => db.prepare(sql).all(...a)

  // ---------- I1 · candidaturas ----------
  ad.get('/creators', (c) => {
    const min = x.minFollowers()
    return c.json({
      minFollowers: min,
      creators: all('SELECT c.*, u.email FROM creators c JOIN users u ON u.id=c.user_id ORDER BY c.id DESC').map((r) => ({
        id: r.id, handle: r.handle, tiktok: r.tiktok, email: r.email, followers: r.followers, verified: !!r.verified, status: r.status, published: !!r.published, createdAt: r.created_at, decidedAt: r.decided_at,
        tier: r.plan_tier, criterion: r.followers > 0 ? (r.followers >= min ? 'met' : 'below') : 'unknown',
        places: one("SELECT COUNT(*) n FROM places WHERE creator_id=? AND status!='removed'", r.id).n,
      })),
    })
  })
  ad.put('/config', async (c) => {
    const { minFollowers } = await c.req.json().catch(() => ({}))
    const n = Math.max(0, Math.min(100000000, parseInt(minFollowers, 10) || 0))
    x.setSetting('minFollowers', n)
    return c.json({ minFollowers: n })
  })
  ad.post('/creators/:id/decision', async (c) => {
    const id = Number(c.req.param('id'))
    const b = await c.req.json().catch(() => ({}))
    const row = one('SELECT c.*, u.email FROM creators c JOIN users u ON u.id=c.user_id WHERE c.id=?', id)
    if (!row) return c.json({ error: 'nao_encontrado' }, 404)
    if (!['approved', 'rejected', 'waitlist', 'pending'].includes(b.status)) return c.json({ error: 'status' }, 400)
    const followers = 'followers' in b ? Math.max(0, parseInt(b.followers, 10) || 0) : row.followers
    const verified = 'verified' in b ? (b.verified ? 1 : 0) : row.verified
    if (b.status === 'approved' && followers < x.minFollowers() && !b.force) return c.json({ error: 'abaixo_do_criterio' }, 409)
    db.prepare('UPDATE creators SET status=?, followers=?, verified=?, decided_at=?, decided_by=? WHERE id=?').run(b.status, followers, verified, new Date().toISOString(), c.get('u').email, id)
    if (b.status !== 'approved') db.prepare('UPDATE creators SET published=0 WHERE id=?').run(id)
    const msg = { approved: ['Seu perfil foi aprovado', 'Seu perfil foi aprovado. Entre com o seu e-mail para montar o mapa.'], waitlist: ['Você está na lista de espera', 'Por enquanto atendemos perfis acima do mínimo de seguidores. Avisamos quando o critério mudar.'] }[b.status]
    if (msg) x.sendMail(row.email, msg[0], msg[1]).catch(() => {})
    return c.json({ ok: true })
  })

  // ---------- I2 · revisão de mapas ----------
  const issueOf = (p) => (p.geo_status === 'rejected' ? 'Município diverge' : p.geo_status === 'not_found' ? 'Endereço não encontrado' : p.geo_quality === 'street_approx' ? 'Endereço aproximado' : p.geo_quality === 'area' ? 'Localização por área' : p.confidence !== 'high' ? 'Confiança baixa' : null)
  ad.get('/review', (c) => {
    const only = Number(c.req.query('creator')) || null
    const queue = all("SELECT c.id, c.handle FROM creators c WHERE c.status='approved' ORDER BY c.id DESC").map((r) => ({
      id: r.id, handle: r.handle,
      places: one("SELECT COUNT(*) n FROM places WHERE creator_id=? AND status IN ('pending','confirmed')", r.id).n,
      pending: one("SELECT COUNT(*) n FROM places WHERE creator_id=? AND status='pending'", r.id).n,
    }))
    const rows = all(`SELECT p.*, c.handle FROM places p JOIN creators c ON c.id=p.creator_id WHERE p.status IN ('pending','confirmed') AND p.reviewed=0 ${only ? 'AND p.creator_id=?' : ''} ORDER BY p.id DESC LIMIT 200`, ...(only ? [only] : []))
    const low = rows.filter((p) => issueOf(p)).slice(0, 30).map((p) => ({ id: p.id, creatorId: p.creator_id, handle: p.handle, name: p.name, address: p.address, municipality: p.municipality, lat: p.lat, lon: p.lon, issue: issueOf(p), status: p.status }))
    const real = one("SELECT COUNT(*) n FROM places WHERE status IN ('pending','confirmed')").n
    const flagged = all("SELECT * FROM places WHERE status IN ('pending','confirmed')").filter((p) => issueOf(p) || p.status === 'pending').length
    const unresolved = one("SELECT COUNT(*) n FROM places WHERE status='unresolved'").n
    const rowsAll = one("SELECT COUNT(*) n FROM places WHERE status!='removed'").n
    return c.json({ queue, low, metrics: { places: real, reviewPct: real ? Math.round((flagged / real) * 100) : null, unresolvedPct: rowsAll ? Math.round((unresolved / rowsAll) * 100) : null } })
  })
  ad.post('/places/:id', async (c) => {
    const id = Number(c.req.param('id'))
    const b = await c.req.json().catch(() => ({}))
    const p = one('SELECT * FROM places WHERE id=?', id)
    if (!p) return c.json({ error: 'nao_encontrado' }, 404)
    db.prepare('UPDATE places SET name=?, address=?, reviewed=? WHERE id=?').run('name' in b ? String(b.name).slice(0, 80) : p.name, 'address' in b ? String(b.address).slice(0, 200) : p.address, 'reviewed' in b ? (b.reviewed ? 1 : 0) : p.reviewed, id)
    return c.json({ ok: true })
  })

  // ---------- I3 · moderação ----------
  ad.get('/reports', (c) => {
    const st = ['open', 'review', 'resolved'].includes(c.req.query('status')) ? c.req.query('status') : 'open'
    const counts = Object.fromEntries(['open', 'review', 'resolved'].map((s) => [s, one('SELECT COUNT(*) n FROM reports WHERE status=?', s).n]))
    const rows = all('SELECT r.*, p.name place_name, c.handle FROM reports r LEFT JOIN places p ON p.id=r.place_id LEFT JOIN creators c ON c.id=r.creator_id WHERE r.status=? ORDER BY r.id', st)
    const g = new Map()
    for (const r of rows) {
      const k = `${r.creator_id}|${r.place_id}|${r.reason}`
      if (!g.has(k)) g.set(k, { ids: [], placeName: r.place_name, placeId: r.place_id, handle: r.handle, creatorId: r.creator_id, reason: r.reason, details: [], count: 0, oldest: r.created_at })
      const e = g.get(k); e.ids.push(r.id); e.count++; if (r.details) e.details.push(r.details)
    }
    const groups = [...g.values()].map((e) => ({ ...e, daysLeft: Math.max(0, SLA_DAYS - Math.floor((Date.now() - new Date(`${e.oldest}Z`).getTime()) / 86400000)) }))
    return c.json({ status: st, counts, groups, slaDays: SLA_DAYS })
  })
  ad.post('/reports/act', async (c) => {
    const { ids, action } = await c.req.json().catch(() => ({}))
    const list = (Array.isArray(ids) ? ids : []).map(Number).filter(Number.isInteger).slice(0, 100)
    if (!list.length) return c.json({ error: 'ids' }, 400)
    const rep = one('SELECT * FROM reports WHERE id=?', list[0])
    if (!rep) return c.json({ error: 'nao_encontrado' }, 404)
    const setStatus = (s) => list.forEach((i) => db.prepare('UPDATE reports SET status=? WHERE id=?').run(s, i))
    const place = rep.place_id ? one('SELECT * FROM places WHERE id=?', rep.place_id) : null
    if (action === 'review' || action === 'correct') setStatus('review')
    else if (action === 'archive') setStatus('resolved')
    else if (action === 'hide_place' && place) {
      db.prepare('UPDATE places SET hidden=1 WHERE id=?').run(place.id)
      if (rep.creator_id) x.notice(rep.creator_id, `O lugar "${place.name}" foi ocultado do seu mapa após uma denúncia (${rep.reason}). Fale com a equipe para esclarecer.`)
      setStatus('resolved')
    } else if (action === 'pause_map' && rep.creator_id) {
      const cr = one('SELECT settings FROM creators WHERE id=?', rep.creator_id)
      db.prepare('UPDATE creators SET published=0, settings=? WHERE id=?').run(JSON.stringify({ ...j(cr.settings, {}), adminPaused: true }), rep.creator_id)
      x.notice(rep.creator_id, `Seu mapa foi pausado pela equipe após uma denúncia (${rep.reason}). Fale com a equipe para esclarecer.`)
      setStatus('resolved')
    } else if (action === 'notify' && rep.creator_id) {
      x.notice(rep.creator_id, `Recebemos uma denúncia${place ? ` sobre "${place.name}"` : ''}: ${rep.reason}. Confira as informações${place ? ' do lugar' : ' do mapa'}.`)
      setStatus('review')
    } else return c.json({ error: 'acao' }, 400)
    return c.json({ ok: true })
  })
  ad.post('/creators/:id/plan', async (c) => {
    const { tier } = await c.req.json().catch(() => ({}))
    if (!TIERS.includes(tier)) return c.json({ error: 'plano' }, 400)
    const r = db.prepare('UPDATE creators SET plan_tier=? WHERE id=?').run(tier, Number(c.req.param('id')))
    return r.changes ? c.json({ ok: true, tier }) : c.json({ error: 'nao_encontrado' }, 404)
  })
  ad.post('/creators/:id/unpause', (c) => {
    const id = Number(c.req.param('id'))
    const cr = one('SELECT settings FROM creators WHERE id=?', id)
    if (!cr) return c.json({ error: 'nao_encontrado' }, 404)
    db.prepare('UPDATE creators SET settings=? WHERE id=?').run(JSON.stringify({ ...j(cr.settings, {}), adminPaused: false }), id)
    return c.json({ ok: true })
  })
  ad.get('/symbols', (c) => c.json({ symbols: all("SELECT s.id, s.name, s.d, s.vb, s.mode, s.status, cr.handle FROM symbols s JOIN creators cr ON cr.id=s.creator_id WHERE s.status='pending' ORDER BY s.id") }))
  ad.post('/symbols/:id', async (c) => {
    const { status } = await c.req.json().catch(() => ({}))
    if (!['approved', 'rejected'].includes(status)) return c.json({ error: 'status' }, 400)
    db.prepare('UPDATE symbols SET status=? WHERE id=?').run(status, Number(c.req.param('id')))
    return c.json({ ok: true })
  })
  ad.get('/claims', (c) => c.json({ claims: all('SELECT cl.*, u.email FROM claims cl JOIN users u ON u.id=cl.user_id ORDER BY cl.id DESC LIMIT 50') }))
  ad.post('/claims/:id', async (c) => {
    const { status } = await c.req.json().catch(() => ({}))
    if (!['approved', 'rejected'].includes(status)) return c.json({ error: 'status' }, 400)
    db.prepare('UPDATE claims SET status=? WHERE id=?').run(status, Number(c.req.param('id')))
    return c.json({ ok: true })
  })

  // ---------- I4 · métricas do negócio (só o que existe de fato) ----------
  ad.get('/metrics', (c) => {
    const n = (sql) => one(sql).n
    const total = n('SELECT COUNT(*) n FROM creators')
    const ap = all("SELECT * FROM creators WHERE status='approved'")
    const changed = ap.filter((r) => { const t = j(r.theme, {}); return ['accent', 'bg', 'fg', 'font', 'tone', 'shape', 'radius'].some((k) => k in t && t[k] !== DEFAULT_THEME[k]) }).length
    const pct = (k) => (ap.length ? Math.round((k / ap.length) * 100) : null)
    return c.json({
      funnel: [
        ['Candidaturas', total], ['Aprovados', ap.length], ['Contas conectadas', n("SELECT COUNT(*) n FROM creators WHERE instagram_state='connected' OR tiktok_state='connected'")],
        ['Mapas publicados', n("SELECT COUNT(*) n FROM creators WHERE published=1")], ['Pagantes', 0],
      ],
      studio: { changedVisual: pct(changed), customSymbol: pct(n('SELECT COUNT(DISTINCT creator_id) n FROM symbols')), customDomain: pct(n("SELECT COUNT(*) n FROM creators WHERE domain IS NOT NULL")), network: pct(ap.filter((r) => j(r.consents, {}).network).length) },
      billing: { active: false },
    })
  })

  app.route('/api/admin', ad)
}

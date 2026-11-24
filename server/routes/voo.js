import { PERSONALITIES, XP_PER_VISIT, levelOf, nextOf } from '../../web/src/levels.js'

const DAILY_CAP = 10 // limite de "já fui" por dia: o registro é declarado pelo próprio usuário

export default function vooRoutes(app, x) {
  const { db } = x
  const KEYS = PERSONALITIES.map((p) => p[0])
  const state = (uid) => {
    const row = db.prepare('SELECT personality FROM voo WHERE user_id=?').get(uid)
    const n = db.prepare('SELECT COUNT(*) n FROM visits WHERE user_id=?').get(uid).n
    const xp = n * XP_PER_VISIT
    const lv = levelOf(xp), nx = nextOf(xp)
    const recent = db.prepare(`SELECT v.created_at at, p.name, c.slug, c.display_name creator FROM visits v JOIN places p ON p.id=v.place_id JOIN creators c ON c.id=v.creator_id WHERE v.user_id=? ORDER BY v.id DESC LIMIT 20`).all(uid)
    return { personality: row?.personality || 'brincalhona', xp, visits: n, level: lv.n, levelName: lv.name, next: nx ? { level: nx.n, name: nx.name, at: nx.min, missing: nx.min - xp } : null, recent }
  }
  const livePlace = (slug, id) => db.prepare(`SELECT p.id, p.creator_id FROM places p JOIN creators c ON c.id=p.creator_id WHERE c.slug=? AND c.status='approved' AND c.published=1 AND p.id=? AND p.status='confirmed' AND p.hidden=0`).get(String(slug || '').toLowerCase(), Number(id))

  app.get('/api/voo', x.auth, (c) => c.json(state(c.get('u').id)))
  app.put('/api/voo', x.auth, async (c) => {
    const { personality } = await c.req.json().catch(() => ({}))
    if (!KEYS.includes(personality)) return c.json({ error: 'personalidade_invalida' }, 400)
    db.prepare('INSERT INTO voo(user_id, personality) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET personality=excluded.personality').run(c.get('u').id, personality)
    return c.json(state(c.get('u').id))
  })
  app.get('/api/voo/visited/:slug', x.auth, (c) => {
    const rows = db.prepare('SELECT v.place_id FROM visits v JOIN creators c ON c.id=v.creator_id WHERE v.user_id=? AND c.slug=?').all(c.get('u').id, c.req.param('slug').toLowerCase())
    return c.json({ ids: rows.map((r) => r.place_id) })
  })
  app.post('/api/voo/visits', x.auth, async (c) => {
    const uid = c.get('u').id
    const { slug, placeId } = await c.req.json().catch(() => ({}))
    const p = livePlace(slug, placeId)
    if (!p) return c.json({ error: 'lugar_indisponivel' }, 404)
    const before = state(uid)
    const today = db.prepare("SELECT COUNT(*) n FROM visits WHERE user_id=? AND date(created_at)=date('now')").get(uid).n
    if (today >= DAILY_CAP) return c.json({ error: 'limite_diario', cap: DAILY_CAP }, 429)
    db.prepare('INSERT OR IGNORE INTO visits(user_id, creator_id, place_id) VALUES (?,?,?)').run(uid, p.creator_id, p.id)
    const after = state(uid)
    return c.json({ ...after, gained: after.xp - before.xp, leveledUp: after.level > before.level })
  })
  app.delete('/api/voo/visits', x.auth, async (c) => {
    const { slug, placeId } = await c.req.json().catch(() => ({}))
    const p = livePlace(slug, placeId)
    if (p) db.prepare('DELETE FROM visits WHERE user_id=? AND place_id=?').run(c.get('u').id, p.id)
    return c.json(state(c.get('u').id))
  })
}

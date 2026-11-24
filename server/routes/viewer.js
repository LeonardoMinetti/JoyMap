// Conta do espectador: quem não tem mapa entra com e-mail (link mágico) e guarda lugares de qualquer mapa.
// Os salvos só são vistos pela própria pessoa; o criador não sabe quem salvou (só existe como número, se um dia houver estatística).
export default function viewerRoutes(app, x) {
  const { db } = x
  const need = (c) => x.user(c)
  // lugar público de um mapa publicado (confirmado, localizado, visível)
  const pubPlace = (slug, id) => db.prepare("SELECT p.id, p.creator_id FROM places p JOIN creators cr ON cr.id=p.creator_id WHERE cr.slug=? AND cr.published=1 AND cr.status='approved' AND p.id=? AND p.status='confirmed' AND p.geo_status='found' AND p.hidden=0").get(String(slug || '').toLowerCase(), Number(id))

  app.get('/api/saved', (c) => {
    const u = need(c); if (!u) return c.json({ error: 'entrar' }, 401)
    const rows = db.prepare(`SELECT s.place_id, s.created_at, p.name, p.neighborhood, p.municipality, p.category, p.photo_v, cr.slug, cr.display_name, cr.handle
      FROM saved_places s JOIN places p ON p.id=s.place_id JOIN creators cr ON cr.id=s.creator_id
      WHERE s.user_id=? AND cr.published=1 AND p.status='confirmed' AND p.hidden=0 ORDER BY s.created_at DESC, s.place_id DESC`).all(u.id)
    return c.json({ saved: rows.map((r) => ({ placeId: r.place_id, slug: r.slug, creator: r.display_name, handle: r.handle, name: r.name, neighborhood: r.neighborhood, municipality: r.municipality, category: r.category, photo: r.photo_v ? `/api/public/${r.slug}/places/${r.place_id}/photo?v=${r.photo_v}` : null })) })
  })
  app.get('/api/saved/:slug', (c) => {
    const u = need(c); if (!u) return c.json({ error: 'entrar' }, 401)
    const ids = db.prepare('SELECT s.place_id FROM saved_places s JOIN creators cr ON cr.id=s.creator_id WHERE s.user_id=? AND cr.slug=?').all(u.id, c.req.param('slug').toLowerCase()).map((r) => r.place_id)
    return c.json({ ids })
  })
  app.post('/api/saved', async (c) => {
    const u = need(c); if (!u) return c.json({ error: 'entrar' }, 401)
    const { slug, placeId, saved } = await c.req.json().catch(() => ({}))
    const p = pubPlace(slug, placeId)
    if (!p) return c.json({ error: 'nao_encontrado' }, 404)
    if (saved === false) db.prepare('DELETE FROM saved_places WHERE user_id=? AND place_id=?').run(u.id, p.id)
    else db.prepare('INSERT OR IGNORE INTO saved_places(user_id, creator_id, place_id) VALUES (?,?,?)').run(u.id, p.creator_id, p.id)
    return c.json({ ok: true })
  })
  // leva para a conta os lugares que a pessoa já tinha salvo neste aparelho, antes de entrar
  app.post('/api/saved/merge', async (c) => {
    const u = need(c); if (!u) return c.json({ error: 'entrar' }, 401)
    const { slug, ids } = await c.req.json().catch(() => ({}))
    let n = 0
    for (const id of (Array.isArray(ids) ? ids : []).slice(0, 200)) {
      const p = pubPlace(slug, id)
      if (p) { db.prepare('INSERT OR IGNORE INTO saved_places(user_id, creator_id, place_id) VALUES (?,?,?)').run(u.id, p.creator_id, p.id); n++ }
    }
    return c.json({ merged: n })
  })
}

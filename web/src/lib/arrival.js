// Regras puras da tela de chegada: o que o criador mais indica, marcas e próximo evento. Os dados vêm do arquivo do mapa.
export const latest = (places, n = 4) => [...places].sort((a, b) => String(b.postedOn || '').localeCompare(String(a.postedOn || '')) || b.id - a.id).slice(0, n)

const top = (places, key, n) => Object.entries(places.reduce((m, p) => { const k = key(p); if (k) m[k] = (m[k] || 0) + 1; return m }, {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n)
export const highlights = (places, categories) => ({
  cats: top(places, (p) => p.category, 4).map(([id, n]) => ({ ...categories.find((c) => c.id === id), n })).filter((c) => c.id),
  hoods: top(places, (p) => p.neighborhood, 3).map(([name, n]) => ({ name, n })),
})

export const safeLink = (u) => (/^https:\/\/[^\s"'<>]+$/i.test(String(u || '')) ? u : null)
export const safeLogo = (u) => (/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(String(u || '')) ? u : null)
export const brandsOf = (creator) => (creator.brands || []).filter((b) => b && b.name).map((b) => ({ name: String(b.name).slice(0, 40), logo: safeLogo(b.logo), url: safeLink(b.url) }))
// evento passado some sozinho
export function nextEvent(creator, today = new Date().toISOString().slice(0, 10)) {
  const e = creator.event
  if (!e || !e.title || !/^\d{4}-\d{2}-\d{2}$/.test(e.date || '') || e.date < today) return null
  return { title: String(e.title).slice(0, 80), date: e.date, place: String(e.place || '').slice(0, 80), url: safeLink(e.url) }
}

// Utilidades sobre lugares do criador (revisão, duplicadas, unidades)
const strip = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
export const normName = (n) => strip(n).replace(/[^a-z0-9]+/g, ' ').trim()
export function normAddr(a) {
  let s = strip(a).replace(/\b(rua|r\.|av\.?|avenida|al\.?|alameda|praca|estrada)\b/g, (m) => ({ rua: 'r', 'r.': 'r', av: 'av', 'av.': 'av', avenida: 'av', al: 'al', 'al.': 'al', alameda: 'al', praca: 'pc', estrada: 'estr' }[m] || m))
  s = s.replace(/[^a-z0-9 ]/g, ' ')
  const m = s.match(/^\s*(?:(\w+)\s+)?(.*?)\s+(\d{1,5})\b/)
  return m ? `${m[1] || ''} ${m[2]} ${m[3]}`.replace(/\s+/g, ' ').trim() : ''
}
const live = (p) => p.status === 'pending' || p.status === 'confirmed'

// Possíveis duplicatas (mesmo endereço) e redes (mesmo nome, endereços diferentes)
export function findGroups(places) {
  const list = places.filter((p) => live(p) && p.name)
  const byAddr = new Map()
  for (const p of list) { const k = p.address ? normAddr(p.address) : ''; if (k) byAddr.set(k, [...(byAddr.get(k) || []), p]) }
  const dups = [...byAddr.values()].filter((g) => g.length > 1 && !g.every((p) => p.dupOk))
  const byName = new Map()
  for (const p of list) { const k = normName(p.name); if (k) byName.set(k, [...(byName.get(k) || []), p]) }
  const chains = [...byName.values()].filter((g) => new Set(g.map((p) => normAddr(p.address) || p.id)).size > 1)
  return { dups, chains }
}
export function unitCount(places, p) {
  const k = normName(p.name)
  if (!k) return 1
  return new Set(places.filter((q) => live(q) && normName(q.name) === k).map((q) => normAddr(q.address) || q.id)).size
}

// Motivo principal pelo qual o lugar pede revisão (texto da etiqueta e da linha de detalhe)
export function issueOf(p, places) {
  const hood = [p.address, p.neighborhood].filter(Boolean).join(' · ')
  if (p.geoStatus === 'pending') return { tag: 'Localizando…', k: 'wn', detail: p.address || 'Buscando coordenadas' }
  if (unitCount(places, p) > 1) return { tag: 'Ver unidades', k: 'ax', link: '/unidades', detail: `${unitCount(places, p)} unidades encontradas` }
  if (p.geoStatus === 'rejected') return { tag: 'Confirmar local', k: 'wn', detail: `Fora de São Paulo (${p.municipality || 'outro município'})` }
  if (p.nameSrc === 'mention_handle' && p.status === 'pending') return { tag: 'Confirmar nome', k: 'wn', detail: 'Nome vindo do @ do post' }
  if (p.geoStatus === 'not_found' || p.geoStatus === 'none') return { tag: 'Sem coordenadas', k: 'wn', detail: p.address || 'Informe o endereço' }
  if (p.geoQuality === 'street_approx' || p.geoQuality === 'area') return { tag: 'Endereço aproximado', k: 'wn', detail: hood || 'Localização aproximada' }
  if (p.status === 'confirmed') return { tag: 'Confirmado', k: 'ok', detail: hood }
  return { tag: 'Para revisar', k: 'wn', detail: hood }
}
export const isReliable = (p) => p.confidence === 'high' && p.geoQuality === 'address_exact'
export const hasCoords = (p) => p.lat != null && p.lon != null

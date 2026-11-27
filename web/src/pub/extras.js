// Ajudantes do mapa público: cidades, "abertos agora" e novidades.
import { openState, openLabel } from '../../../server/hours.js'
export { openState, openLabel }
export const cityOf = (p) => p.municipality || 'São Paulo'
export const citiesOf = (places) => Object.entries(places.reduce((m, p) => { const c = cityOf(p); m[c] = (m[c] || 0) + 1; return m }, {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
// Criador "viajante": a variedade de cidades é maior que a de bairros na cidade principal.
// Nesse caso a navegação "Bairros" vira "Cidades".
export const byCity = (places) => {
  const cities = citiesOf(places)
  if (cities.length < 2) return false
  const hoods = new Set(places.filter((p) => cityOf(p) === cities[0][0] && p.neighborhood).map((p) => p.neighborhood))
  return cities.length > hoods.size
}
// paradas que existem só no roteiro (não entram nos lugares do perfil)
export const withExtras = (list, route) => (route?.extraPlaces ? [...list, ...route.extraPlaces] : list)
export const routePath = (route) => (route.stops?.length ? route.stops : route.placeIds.map((placeId) => ({ placeId }))).map((s, i) => ({ id: s.placeId, n: i + 1 })).filter((s) => s.id != null)
// o Google Maps aceita origem, destino e até 9 paradas no meio
export const GMAPS_MAX = 11
export const gmapsRoute = (route, places) => {
  const pts = routePath(route).map((s) => places.find((p) => p.id === s.id)).filter((p) => p && p.lat != null).filter((p, i, a) => i === 0 || p.id !== a[i - 1].id).map((p) => `${p.lat},${p.lon}`)
  if (pts.length < 2) return null
  const used = pts.slice(0, GMAPS_MAX)
  const q = new URLSearchParams({ api: '1', origin: used[0], destination: used[used.length - 1] })
  if (used.length > 2) q.set('waypoints', used.slice(1, -1).join('|'))
  return { url: `https://www.google.com/maps/dir/?${q}`, cut: pts.length - used.length }
}
export const hasHours = (places) => places.some((p) => p.hours)
// os últimos lugares adicionados ao mapa (ids crescem a cada lugar novo)
export const newest = (places, n = 4) => (places.length >= 6 ? [...places].sort((a, b) => b.id - a.id).slice(0, n) : [])

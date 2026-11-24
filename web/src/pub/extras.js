// Ajudantes do mapa público: cidades, "abertos agora" e novidades.
import { openState, openLabel } from '../../../server/hours.js'
export { openState, openLabel }
export const cityOf = (p) => p.municipality || 'São Paulo'
export const citiesOf = (places) => Object.entries(places.reduce((m, p) => { const c = cityOf(p); m[c] = (m[c] || 0) + 1; return m }, {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
export const hasHours = (places) => places.some((p) => p.hours)
// os últimos lugares adicionados ao mapa (ids crescem a cada lugar novo)
export const newest = (places, n = 4) => (places.length >= 6 ? [...places].sort((a, b) => b.id - a.id).slice(0, n) : [])

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
export const hasHours = (places) => places.some((p) => p.hours)
// os últimos lugares adicionados ao mapa (ids crescem a cada lugar novo)
export const newest = (places, n = 4) => (places.length >= 6 ? [...places].sort((a, b) => b.id - a.id).slice(0, n) : [])

// Geocodificação via Nominatim (OSM, ODbL): 1 req/s, User-Agent genérico, cache em SQLite,
// rejeita logradouro homônimo em outro município e nunca marca "exato" sem número. Portado da PoC.
import { municipalityHint, strip } from './extract.js'

const UA = 'mapa-sp-mvp/0.1 (research prototype)'
let last = 0
let chain = Promise.resolve()

const ABBR = [[/\bR\./g, 'Rua'], [/\bAv\./g, 'Avenida'], [/\bAl\./g, 'Alameda'], [/\bGen\./g, 'General'], [/\bProf\.?(?=\s)/g, 'Professor'], [/\bMal\./g, 'Marechal'], [/\bEng\./g, 'Engenheiro'], [/\bDr\./g, 'Doutor']]

export function simplify(address, city) {
  let a = address
  for (const [re, rep] of ABBR) a = a.replace(re, rep)
  const m = a.match(/^(.*?\d{1,5})\b/)
  if (m) a = m[1]
  return `${a.replace(/ - /g, ' ')}, ${city}`
}

const muniOf = (r) => r.address?.city || r.address?.town || r.address?.municipality || r.address?.village
const hoodOf = (r) => r.address?.suburb || r.address?.neighbourhood || r.address?.city_district || null

export function pickResult(results, expected, address) {
  const ok = results.filter((r) => strip(muniOf(r) || '').toLowerCase() === strip(expected).toLowerCase())
  if (!ok.length) return { status: 'rejected', municipality: results[0] ? muniOf(results[0]) : null }
  const top = ok[0]
  const house = Boolean(top.address?.house_number) || (top.category === 'place' && top.type === 'house')
  const cat = `${top.category}/${top.type}`
  let quality = house ? 'address_exact' : /^(leisure|natural|boundary|place)\//.test(cat) ? 'area' : 'street_approx'
  if (quality === 'address_exact' && /sem número/i.test(address)) quality = 'street_approx'
  return { status: 'found', lat: Number(top.lat), lon: Number(top.lon), quality, municipality: muniOf(top), neighborhood: hoodOf(top) }
}

async function search(db, params, fetchImpl) {
  const qs = new URLSearchParams({ format: 'jsonv2', addressdetails: '1', limit: '3', countrycodes: 'br', 'accept-language': 'pt-BR', ...params })
  const key = qs.toString()
  const hit = db.prepare('SELECT json FROM geocache WHERE key=?').get(key)
  if (hit) return JSON.parse(hit.json)
  const wait = 1100 - (Date.now() - last)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  const res = await fetchImpl(`https://nominatim.openstreetmap.org/search?${key}`, { headers: { 'User-Agent': UA } })
  last = Date.now()
  const json = res.ok ? await res.json() : []
  if (res.ok) db.prepare('INSERT OR REPLACE INTO geocache(key,json) VALUES (?,?)').run(key, JSON.stringify(json))
  return json
}

export async function geocodeAddress(db, address, fetchImpl = fetch) {
  const hint = municipalityHint(address)
  const city = hint || 'São Paulo'
  const q = address.toLowerCase().includes(city.toLowerCase()) ? address : `${address}, ${city}`
  let results = await search(db, { q }, fetchImpl)
  if (!results.length) results = await search(db, { q: simplify(address, city) }, fetchImpl)
  if (!results.length) return { status: 'not_found' }
  return pickResult(results, city, address)
}

// Fila em série (respeita 1 req/s mesmo com vários pedidos simultâneos)
export function enqueueGeocode(db, placeId, fetchImpl = fetch) {
  chain = chain.then(async () => {
    const p = db.prepare('SELECT id, address FROM places WHERE id=?').get(placeId)
    if (!p || !p.address) return
    try {
      const g = await geocodeAddress(db, p.address, fetchImpl)
      db.prepare('UPDATE places SET geo_status=?, lat=?, lon=?, geo_quality=?, municipality=?, neighborhood=COALESCE(?, neighborhood) WHERE id=?')
        .run(g.status, g.lat ?? null, g.lon ?? null, g.quality ?? null, g.municipality ?? null, g.neighborhood ?? null, placeId)
    } catch {
      db.prepare("UPDATE places SET geo_status='not_found' WHERE id=?").run(placeId)
    }
  })
  return chain
}

// Busca de lugar por nome (tela "Adicionar lugar"): mesma fila de 1 req/s, resultados no estado de São Paulo.
export function searchPlaces(db, q, fetchImpl = fetch) {
  const run = chain.then(async () => {
    const res = await search(db, { q: `${q}, São Paulo`, limit: '6', viewbox: '-47.2,-22.9,-45.9,-24.2', bounded: '0' }, fetchImpl)
    return res.map((r) => {
      const a = r.address || {}
      const road = [a.road, a.house_number].filter(Boolean).join(', ')
      const muni = muniOf(r) || null
      return {
        name: r.name || String(r.display_name || '').split(',')[0],
        address: [road, hoodOf(r)].filter(Boolean).join(' - ') || String(r.display_name || '').split(',').slice(0, 3).join(',').trim(),
        lat: Number(r.lat), lon: Number(r.lon), municipality: muni, neighborhood: hoodOf(r),
        quality: a.house_number ? 'address_exact' : 'street_approx',
      }
    }).filter((r) => Number.isFinite(r.lat))
  })
  chain = run.catch(() => {})
  return run
}

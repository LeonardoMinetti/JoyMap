// Prepara um mapa publicado para usar o Google: grava só o identificador (place_id) de cada lugar.
// Nenhuma coordenada, endereço ou foto do Google é guardada. O ponto vem da nossa base (IBGE) quando o número é exato.
// Uso: node scripts/google-ids.mjs <usuario>
import fs from 'node:fs'
import { norm } from './lib/lugares.js'

const slug = process.argv[2]
if (!/^[a-z0-9_-]+$/i.test(slug || '')) throw new Error('uso: node scripts/google-ids.mjs <usuario>')
const key = fs.readFileSync('.env', 'utf8').match(/^GOOGLE_PLACES_KEY=(\S+)/m)?.[1]
if (!key) throw new Error('GOOGLE_PLACES_KEY ausente no .env')
const file = `web/public/maps/${slug}.json`
const data = JSON.parse(fs.readFileSync(file, 'utf8'))
const base = fs.existsSync('data/base/lugares.json') ? JSON.parse(fs.readFileSync('data/base/lugares.json', 'utf8')) : []

const GENERIC = new Set(['rua', 'r', 'avenida', 'av', 'prof', 'professor', 'dr', 'doutor', 'eng', 'de', 'da', 'do', 'dos', 'das'])
const street = (a) => norm((a || '').split(/[,-]/)[0]).split(' ').filter((w) => w && !GENERIC.has(w))
const sameStreet = (a, b) => { const x = street(a), y = new Set(street(b)); return x.length > 0 && x.every((w) => y.has(w)) }
const meters = (a, b) => { const p = Math.PI / 180; return 12742000 * Math.asin(Math.sqrt(Math.sin((b.latitude - a.lat) * p / 2) ** 2 + Math.cos(a.lat * p) * Math.cos(b.latitude * p) * Math.sin((b.longitude - a.lon) * p / 2) ** 2)) }

let moved = 0
const without = []
for (const p of data.places) {
  const name = p.name.split(' (')[0]
  const ours = base.find((b) => norm(b.nome) === norm(name) && b.ponto === 'IBGE, número exato')
  if (ours) { moved++; Object.assign(p, { lat: ours.lat, lon: ours.lon }) }
  const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.formattedAddress,places.location' },
    body: JSON.stringify({ textQuery: `${name}, ${p.municipality || 'São Paulo'}`, languageCode: 'pt-BR', pageSize: 1 }),
  })
  const j = await r.json()
  if (j.error) throw new Error(`Google ${r.status} ${j.error.status}`)
  const hit = j.places?.[0]
  // a resposta serve só para conferir se é o mesmo lugar
  delete p.googlePlaceId
  if (hit && (sameStreet(p.address, hit.formattedAddress) || meters(p, hit.location) < 150)) p.googlePlaceId = hit.id
  else without.push(p.name)
}
data.creator.theme.provider = 'google'
fs.writeFileSync(file, JSON.stringify(data))
console.log(`identificador: ${data.places.length - without.length} de ${data.places.length} · pontos atualizados pela nossa base: ${moved}`)
console.log(`sem foto do Google: ${without.join('; ') || 'nenhum'}`)

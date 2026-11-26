// Liga cada lugar do mapa a um post do próprio criador e publica a capa dele (com autorização do criador).
// Posts de outros perfis (colaborações) ficam de fora. Rode depois de coletar ou de aprovar lugares.
// Uso: node scripts/capas.mjs <usuario>
import fs from 'node:fs'
import { findInMap } from './lib/fluxo.js'

const handle = process.argv[2]
if (!/^[a-z0-9_.]{2,40}$/.test(handle || '')) throw new Error('uso: node scripts/capas.mjs <usuario>')
const c = JSON.parse(fs.readFileSync('data/base/coletas.json', 'utf8'))[handle]
if (!c) throw new Error(`não há coleta de @${handle}`)
const file = `web/public/maps/${handle}.json`
const map = JSON.parse(fs.readFileSync(file, 'utf8'))

const code = (url) => String(url || '').match(/\/(?:reel|p)\/([\w-]+)/)?.[1] || ''
const thumb = (url) => `data/base/thumbs/${handle}/${code(url)}.jpg`
const own = new Map(c.posts.filter((p) => p.autor.toLowerCase() === handle && code(p.url) && fs.existsSync(thumb(p.url))).map((p) => [code(p.url), p]))

const links = new Map() // id do lugar no mapa -> posts que o citam
for (const found of c.lugares || []) {
  const m = findInMap(found, map.places)
  if (m) links.set(m.id, [...(links.get(m.id) || []), ...found.posts.map((x) => own.get(code(x.url))).filter(Boolean)])
}

const out = `web/public/covers/${handle}`
fs.rmSync(out, { recursive: true, force: true })
fs.mkdirSync(out, { recursive: true })
let n = 0
for (const p of map.places) {
  const post = (links.get(p.id) || []).sort((a, b) => b.data.localeCompare(a.data))[0] || own.get(code(p.postUrl))
  delete p.cover
  if (!post) continue
  fs.copyFileSync(thumb(post.url), `${out}/${code(post.url)}.jpg`)
  Object.assign(p, { cover: `/covers/${handle}/${code(post.url)}.jpg`, postUrl: post.url, postedOn: post.data || null })
  n++
}
fs.writeFileSync(file, JSON.stringify(map))
console.log(`capas: ${n} de ${map.places.length} lugares · ${fs.readdirSync(out).length} imagens`)

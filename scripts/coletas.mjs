// Monta a visão por Reel de uma coleta e publica cifrada para o admin (tela Coletas).
// Uso: node scripts/coletas.mjs <coleta.json> <usuario> [data-da-coleta AAAA-MM-DD] [plano: Grátis|Criador|Pro]
// Guarda também uma miniatura de cada post (reduzida e cifrada). Usa o `sips`, do macOS.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { seal } from '../web/src/lib/vault.js'
import { norm } from './lib/lugares.js'
import { readCaptions, usage, KEY, MODEL } from './lib/gemini.mjs'

const [file, handle, collected = '', plan = 'Grátis'] = process.argv.slice(2)
if (!file || !/^[a-z0-9_.]{2,40}$/i.test(handle || '')) throw new Error('uso: node scripts/coletas.mjs <coleta.json> <usuario> [data]')
const password = fs.readFileSync('.env', 'utf8').match(/^BASE_SENHA=(\S+)/m)?.[1]
if (!KEY || !password) throw new Error('faltam GEMINI_API_KEY e BASE_SENHA no .env (a senha é criada por base-publicar.mjs)')

// O código do link guarda o instante da publicação; é uma estimativa, usada só quando a coleta não traz data.
const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const dateFromUrl = (url) => {
  const code = String(url).match(/\/(?:reel|p)\/([\w-]{5,15})/)?.[1]
  if (!code) return ''
  const id = [...code].reduce((n, c) => n * 64n + BigInt(ABC.indexOf(c)), 0n)
  const ms = Number(id >> 23n) + 1314220021721
  return ms > Date.UTC(2012, 0) && ms < Date.now() + 864e5 ? new Date(ms).toISOString().slice(0, 10) : ''
}
const names = (list) => (list || []).map((x) => x?.username || x?.name || x).filter((x) => typeof x === 'string')

const TYPES = { 1: 'Foto', 2: 'Reel', 8: 'Carrossel' }
const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
const posts = (raw.items || raw).map((x, i) => ({ i, url: x.url || '', caption: x.caption || '', data: (x.timestamp || x.takenAt || '').slice?.(0, 10) || '', tipo: TYPES[x.type] || (/\/reel\//.test(x.url) ? 'Reel' : 'Post'), autor: String(x.ownerUsername || ''), imagem: x.displayUrl || '', local: String(x.locationName || ''), marcados: names(x.taggedUsers), publi: !!x.paidPartnership, patrocinadores: names(x.sponsors), coautores: names(x.coauthorProducers), comentarios: x.commentsCount ?? null }))
const store = 'data/base/coletas.json'
const all = fs.existsSync(store) ? JSON.parse(fs.readFileSync(store, 'utf8')) : {}
// legenda já lida antes (mesmo link e mesmo texto) não é enviada de novo à IA
const before = new Map((all[handle.toLowerCase()]?.posts || []).map((p) => [p.url, p]))
const known = (p) => before.get(p.url)?.caption === p.caption
const withText = posts.filter((p) => p.caption.trim() && !known(p))
const found = []
for (let i = 0; i < withText.length; i += 12) {
  found.push(...(await readCaptions(withText.slice(i, i + 12))).lugares.filter((l) => l.indicacao && l.nome.trim()))
  process.stderr.write(`legendas ${Math.min(i + 12, withText.length)}/${withText.length}\n`)
}

const base = fs.existsSync('data/base/lugares.json') ? JSON.parse(fs.readFileSync('data/base/lugares.json', 'utf8')) : []
const key = (s) => norm(s).replace(/ /g, '')
const out = posts.map(({ i, ...p }) => {
  const ats = [...new Set([...p.caption.matchAll(/(?<![\w.])@([A-Za-z0-9_][A-Za-z0-9_.]{1,29})/g)].map((m) => '@' + m[1].toLowerCase().replace(/\.+$/, '')))]
  const lugares = (known(p) ? before.get(p.url).lugares : found.filter((l) => l.post === i)).map((l) => {
    const hit = base.find((b) => key(b.nome) === key(l.nome) || (b.instagram && ats.includes(b.instagram) && b.instagram.replace(/[@_.]/g, '').includes(key(l.nome).slice(0, 6))))
    return { nome: l.nome, rua: l.numero === undefined ? l.rua : [l.rua, l.numero].filter(Boolean).join(', '), bairro: l.bairro, cidade: l.cidade, publi: l.publi, naBase: hit?.nome || '' }
  })
  return { ...p, ...(p.data ? {} : { data: dateFromUrl(p.url), dataEstimada: true }), arrobas: ats.filter((a) => a !== '@' + handle.toLowerCase()), lugares }
})

// miniaturas: só do servidor de imagens do Instagram, reduzidas a 240 px
const code = (url) => url.match(/\/(?:reel|p)\/([\w-]+)/)?.[1] || ''
const dir = `data/base/thumbs/${handle.toLowerCase()}`
fs.mkdirSync(dir, { recursive: true })
const queue = out.filter((p) => code(p.url) && /^https:\/\/[\w.-]+\.(cdninstagram\.com|fbcdn\.net)\//.test(p.imagem) && !fs.existsSync(`${dir}/${code(p.url)}.jpg`))
let failed = 0
await Promise.all(Array.from({ length: 5 }, async () => {
  for (let p; (p = queue.shift());) {
    const target = `${dir}/${code(p.url)}.jpg`
    try {
      const res = await fetch(p.imagem, { redirect: 'error', signal: AbortSignal.timeout(30000) })
      const bytes = Buffer.from(await res.arrayBuffer())
      if (!res.ok || bytes.length > 4e6 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error('não é JPEG')
      fs.writeFileSync(target, bytes)
      execFileSync('sips', ['--resampleWidth', '240', '-s', 'formatOptions', '55', target], { stdio: 'ignore' })
    } catch { failed++; fs.rmSync(target, { force: true }) }
  }
}))

const sorted = out.sort((a, b) => b.data.localeCompare(a.data)).map(({ imagem, ...p }) => p)
const CHUNK = 60
const outDir = 'web/public/base/thumbs'
fs.mkdirSync(outDir, { recursive: true })
for (const f of fs.readdirSync(outDir)) if (f.startsWith(`${handle.toLowerCase()}~`)) fs.rmSync(`${outDir}/${f}`)
for (let i = 0; i < sorted.length; i += CHUNK) {
  const part = {}
  for (const p of sorted.slice(i, i + CHUNK)) {
    const img = `${dir}/${code(p.url)}.jpg`
    if (fs.existsSync(img)) { part[code(p.url)] = fs.readFileSync(img).toString('base64'); p.mini = i / CHUNK }
  }
  fs.writeFileSync(`${outDir}/${handle.toLowerCase()}~${i / CHUNK}.enc.json`, JSON.stringify(await seal(part, password)))
}

// cartão do criador: nome e foto vêm do mapa dele, quando existe
const mapFile = `web/public/maps/${handle.toLowerCase()}.json`
const creator = fs.existsSync(mapFile) ? JSON.parse(fs.readFileSync(mapFile, 'utf8')).creator : null
all[handle.toLowerCase()] = { usuario: handle, nome: creator?.displayName || handle, foto: creator?.avatarUrl || '', plano: plan, coletadoEm: collected, posts: sorted }
fs.mkdirSync('data/base', { recursive: true })
fs.writeFileSync(store, JSON.stringify(all))
fs.mkdirSync('web/public/base', { recursive: true })
fs.writeFileSync('web/public/base/coletas.enc.json', JSON.stringify(await seal(all, password)))
console.log(`@${handle}: ${sorted.length} postagens · ${sorted.filter((p) => p.lugares.length).length} com lugar · ${sorted.filter((p) => !p.lugares.length).length} sem lugar`)
console.log(`lidas agora pela IA: ${withText.length} · miniaturas: ${sorted.filter((p) => p.mini != null).length} (falharam ${failed})`)
console.log(`datas: ${sorted[sorted.length - 1]?.data} a ${sorted[0]?.data} · Gemini ${MODEL}: ${usage.entrada} tokens de entrada, ${usage.saida} de saída`)

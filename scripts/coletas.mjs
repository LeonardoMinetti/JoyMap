// Monta a visão por Reel de uma coleta e publica cifrada para o admin (tela Coletas).
// Uso: node scripts/coletas.mjs <coleta.json> <usuario> [data-da-coleta AAAA-MM-DD]
import fs from 'node:fs'
import { seal } from '../web/src/lib/vault.js'
import { norm } from './lib/lugares.js'
import { readCaptions, usage, KEY, MODEL } from './lib/gemini.mjs'

const [file, handle, collected = ''] = process.argv.slice(2)
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

const raw = JSON.parse(fs.readFileSync(file, 'utf8'))
const posts = (raw.items || raw).map((x, i) => ({ i, url: x.url || '', caption: x.caption || '', data: (x.timestamp || x.takenAt || '').slice?.(0, 10) || '', patrocinadores: names(x.sponsors), coautores: names(x.coauthorProducers), comentarios: x.commentsCount ?? null }))
const withText = posts.filter((p) => p.caption.trim())
const found = []
for (let i = 0; i < withText.length; i += 12) {
  found.push(...(await readCaptions(withText.slice(i, i + 12))).lugares.filter((l) => l.indicacao && l.nome.trim()))
  process.stderr.write(`legendas ${Math.min(i + 12, withText.length)}/${withText.length}\n`)
}

const base = fs.existsSync('data/base/lugares.json') ? JSON.parse(fs.readFileSync('data/base/lugares.json', 'utf8')) : []
const key = (s) => norm(s).replace(/ /g, '')
const out = posts.map(({ i, ...p }) => {
  const ats = [...new Set([...p.caption.matchAll(/(?<![\w.])@([A-Za-z0-9_][A-Za-z0-9_.]{1,29})/g)].map((m) => '@' + m[1].toLowerCase().replace(/\.+$/, '')))]
  const lugares = found.filter((l) => l.post === i).map((l) => {
    const hit = base.find((b) => key(b.nome) === key(l.nome) || (b.instagram && ats.includes(b.instagram) && b.instagram.replace(/[@_.]/g, '').includes(key(l.nome).slice(0, 6))))
    return { nome: l.nome, rua: [l.rua, l.numero].filter(Boolean).join(', '), bairro: l.bairro, cidade: l.cidade, publi: l.publi, naBase: hit?.nome || '' }
  })
  return { ...p, ...(p.data ? {} : { data: dateFromUrl(p.url), dataEstimada: true }), arrobas: ats.filter((a) => a !== '@' + handle.toLowerCase()), lugares }
})

const store = 'data/base/coletas.json'
const all = fs.existsSync(store) ? JSON.parse(fs.readFileSync(store, 'utf8')) : {}
all[handle.toLowerCase()] = { usuario: handle, coletadoEm: collected, posts: out.sort((a, b) => b.data.localeCompare(a.data)) }
fs.mkdirSync('data/base', { recursive: true })
fs.writeFileSync(store, JSON.stringify(all))
fs.mkdirSync('web/public/base', { recursive: true })
fs.writeFileSync('web/public/base/coletas.enc.json', JSON.stringify(await seal(all, password)))
console.log(`@${handle}: ${out.length} postagens · ${out.filter((p) => p.lugares.length).length} com lugar · ${out.filter((p) => !p.lugares.length).length} sem lugar`)
console.log(`datas: ${out[out.length - 1]?.data} a ${out[0]?.data} · Gemini ${MODEL}: ${usage.entrada} tokens de entrada, ${usage.saida} de saída`)

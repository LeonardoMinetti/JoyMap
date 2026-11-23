#!/usr/bin/env node
// Teste do caminho Apify: busca posts de UM perfil (que autorizou o teste), analisa as legendas com o extrator do app
// e, se quiser, envia ao app local para ver os lugares que viram pins.
//
//   export APIFY_TOKEN=...            (nunca no repositório; o script não imprime o token)
//   node scripts/apify-teste.mjs --usuario perfil --limite 20
//   node scripts/apify-teste.mjs --de-arquivo data/apify/perfil-XXXX.json        (reanalisa sem gastar créditos)
//   node scripts/apify-teste.mjs --usuario perfil --enviar                        (manda ao app local em :4300 e mostra os lugares)
//
// Opções: --ator apify/instagram-post-scraper   --entrada '{"username":["{{usuario}}"],"resultsLimit":{{limite}}}'
//         --app http://localhost:4300           --preco 2.30 (US$ por 1.000 resultados, conforme a listagem do ator)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { extract } from '../server/extract.js'

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1]?.startsWith('--') || process.argv[i + 1] == null ? true : process.argv[i + 1]) }
const usuario = String(arg('usuario', '')).replace(/^@/, '')
const limite = Math.min(100, Math.max(1, Number(arg('limite', 20)))) // perfis que misturam assuntos pedem amostra maior (ex.: 60 a 100)
const ator = String(arg('ator', 'apify/instagram-post-scraper'))
const modelo = String(arg('entrada', '{"username":["{{usuario}}"],"resultsLimit":{{limite}}}'))
const app = String(arg('app', 'http://localhost:4300'))
const preco = Number(arg('preco', 2.3))
const arquivoEntrada = arg('de-arquivo', null)
const enviar = arg('enviar', false) === true

const pick = (o, keys) => { for (const k of keys) { const v = k.split('.').reduce((a, p) => (a == null ? a : a[p]), o); if (v != null && v !== '') return v } return null }
const norm = (it) => {
  const ts = pick(it, ['timestamp', 'takenAtTimestamp', 'taken_at', 'createdAt', 'date'])
  const d = ts == null ? null : new Date(typeof ts === 'number' ? (ts < 1e12 ? ts * 1000 : ts) : ts)
  return {
    url: pick(it, ['url', 'postUrl', 'permalink', 'link']) || (it.shortCode ? `https://www.instagram.com/p/${it.shortCode}/` : ''),
    caption: String(pick(it, ['caption', 'text', 'description', 'edge_media_to_caption.edges.0.node.text']) || ''),
    date: d && !isNaN(d) ? d.toISOString().slice(0, 10) : null,
    local: pick(it, ['locationName', 'location.name', 'location', 'locationSlug']),
    tipo: pick(it, ['type', 'productType', 'mediaType']),
    patrocinado: !!pick(it, ['isSponsored', 'paidPartnership', 'isPaidPartnership']),
  }
}
const corta = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s).replace(/\s+/g, ' ')

async function buscar() {
  const token = process.env.APIFY_TOKEN
  if (!token) { console.error('Defina APIFY_TOKEN no ambiente (export APIFY_TOKEN=...). O token não deve ir para o repositório.'); process.exit(1) }
  if (!usuario) { console.error('Informe o perfil: --usuario nomedoperfil'); process.exit(1) }
  const body = modelo.replaceAll('{{usuario}}', usuario).replaceAll('{{limite}}', String(limite))
  const url = `https://api.apify.com/v2/acts/${ator.replace('/', '~')}/run-sync-get-dataset-items?format=json&clean=true`
  console.log(`Chamando o ator ${ator} para @${usuario} (limite ${limite})… pode levar até 5 minutos.`)
  const t0 = Date.now()
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body })
  const txt = await r.text()
  if (!r.ok) { console.error(`Falhou (${r.status}): ${txt.slice(0, 600)}\nSe for erro de entrada, confira os campos no schema do ator e use --entrada.`); process.exit(1) }
  const itens = JSON.parse(txt)
  console.log(`Recebidos ${itens.length} itens em ${Math.round((Date.now() - t0) / 1000)} s.`)
  mkdirSync('data/apify', { recursive: true })
  const f = `data/apify/${usuario}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`
  writeFileSync(f, JSON.stringify(itens, null, 1)); console.log(`Bruto salvo em ${f} (fica fora do git).`)
  return itens
}

const itens = arquivoEntrada ? JSON.parse(readFileSync(String(arquivoEntrada), 'utf8')) : await buscar()
if (!itens.length) { console.log('Nenhum item retornado.'); process.exit(0) }
console.log('\nCampos do primeiro item (para ajustar o mapeamento, se precisar):\n ', Object.keys(itens[0]).join(', '))

const posts = itens.map(norm)
const linhas = posts.map((p) => ({ p, e: extract(p.caption) }))
console.log('\n#  data        local marcado         nome extraído              categoria   end.  conf.   anúncio  legenda')
linhas.forEach(({ p, e }, i) => console.log(
  String(i + 1).padEnd(3) + (p.date || '-').padEnd(12) + corta(String(p.local || '-'), 20).padEnd(22) + corta(e.name || '-', 24).padEnd(27) +
  String(e.category || '-').padEnd(12) + (e.units.length ? 'sim' : 'não').padEnd(6) + String(e.confidence || '-').padEnd(8) + ((e.ad || p.patrocinado) ? 'sim' : 'não').padEnd(9) + corta(p.caption, 50)))

const n = posts.length, com = (f) => linhas.filter(f).length
console.log(`\nResumo (${n} posts)
  com local marcado no Instagram : ${com(({ p }) => p.local)}
  nome de lugar extraído         : ${com(({ e }) => e.name)}
  com endereço na legenda        : ${com(({ e }) => e.units.length)}
  confiança alta                 : ${com(({ e }) => e.confidence === 'high')}
  publicidade detectada          : ${com(({ e, p }) => e.ad || p.patrocinado)}
  sem lugar identificado         : ${com(({ e }) => !e.name)}
  custo estimado                 : US$ ${((n / 1000) * preco).toFixed(3)} (preço da listagem: US$ ${preco}/1.000 resultados; confira o uso real no painel do Apify)`)

// quem o perfil mais marca (ajuda a separar lugares de gastronomia de marcas e outros assuntos)
const marcas = {}
linhas.forEach(({ e }) => (e.handles || []).forEach((h) => { marcas[h] = (marcas[h] || 0) + 1 }))
const top = Object.entries(marcas).sort((x, y) => y[1] - x[1]).slice(0, 15)
if (top.length) console.log('\nPerfis mais marcados nas legendas (confira quais são restaurantes e quais são outras marcas):\n  ' + top.map(([h, c]) => `@${h} (${c})`).join('  '))
console.log('\nAtenção: a categoria do extrator assume "restaurante" quando não identifica outra; num perfil que mistura assuntos, use a coluna "nome extraído" e a revisão no app, não a categoria.')

if (enviar) {
  // modo desenvolvimento: entra como o criador de teste e usa o mesmo fluxo do "colar posts"
  const login = await fetch(`${app}/api/auth/demo`, { method: 'POST' })
  if (!login.ok) { console.error('\nNão consegui entrar no app local (ele precisa estar rodando em modo desenvolvimento).'); process.exit(1) }
  const cookie = (login.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).join('; ')
  for (let i = 0; i < posts.length; i += 30) { // o app aceita até 30 posts por envio
    const r = await fetch(`${app}/api/creator/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body: JSON.stringify({ posts: posts.slice(i, i + 30).map((p) => ({ url: p.url, caption: p.caption, date: p.date })) }) })
    console.log(`\nLote ${i / 30 + 1} enviado ao app: ${r.status} ${await r.text()}`)
  }
  console.log('Aguardando a geocodificação (até 40 s)…')
  let ps = []
  for (let i = 0; i < 10; i++) { await new Promise((s) => setTimeout(s, 4000)); ps = (await (await fetch(`${app}/api/creator/places`, { headers: { Cookie: cookie } })).json()).places; if (!ps.some((x) => x.geoStatus === 'pending' || x.geo_status === 'pending')) break }
  console.log('\nLugares no app:')
  ps.forEach((x) => console.log(`  ${corta(x.name || '(sem nome)', 28).padEnd(30)} ${String(x.status).padEnd(11)} geo: ${String(x.geoStatus ?? x.geo_status).padEnd(9)} ${corta(x.address || '', 50)}`))
  console.log(`  → ${ps.filter((x) => (x.lat ?? x.latitude) != null).length} de ${ps.length} com coordenadas. Abra ${app}/revisar para conferir.`)
}

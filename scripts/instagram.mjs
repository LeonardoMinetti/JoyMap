// Coleta oficial do Instagram. Uso:
//   node scripts/instagram.mjs descoberta <usuario> [desde AAAA-MM-DD]   (META_ACCESS_TOKEN e META_IG_USER_ID no .env)
//   node scripts/instagram.mjs autorizado <usuario> [desde AAAA-MM-DD]   (IG_ACCESS_TOKEN do criador no .env)
// Saída em saida/instagram/<usuario>.json, no formato que scripts/coletas.mjs lê.
import fs from 'node:fs'
import { collect } from './lib/instagram.js'

const [mode, handle, since = ''] = process.argv.slice(2)
if (!['descoberta', 'autorizado'].includes(mode) || !handle) throw new Error('uso: node scripts/instagram.mjs descoberta|autorizado <usuario> [desde]')
const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : ''
const read = (k) => env.match(new RegExp(`^${k}=(\\S+)`, 'm'))?.[1]
const token = read(mode === 'descoberta' ? 'META_ACCESS_TOKEN' : 'IG_ACCESS_TOKEN')
const igUserId = read('META_IG_USER_ID')
if (!token || (mode === 'descoberta' && !igUserId)) throw new Error('faltam as chaves da Meta no .env (veja o tutorial)')

const items = await collect({ mode, handle: handle.replace(/^@/, ''), token, igUserId, since })
fs.mkdirSync('saida/instagram', { recursive: true })
const file = `saida/instagram/${handle.replace(/^@/, '').toLowerCase()}.json`
fs.writeFileSync(file, JSON.stringify({ items }))
console.log(`${items.length} postagens · com legenda: ${items.filter((x) => x.caption).length} · com capa: ${items.filter((x) => x.displayUrl).length}`)
console.log(`próximo passo: node scripts/coletas.mjs ${file} ${handle} ${new Date().toISOString().slice(0, 10)} <plano>`)

// Cifra a base para publicar no painel de admin. A senha fica no .env (BASE_SENHA) e nunca vai para o repositório.
// Uso: node scripts/base-publicar.mjs [alteracoes.json exportado pelo painel]
import fs from 'node:fs'
import crypto from 'node:crypto'
import { seal } from '../web/src/lib/vault.js'
import { merge } from '../web/src/lib/placeEdits.js'

const FILE = 'data/base/lugares.json'
let env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : ''
let password = env.match(/^BASE_SENHA=(\S+)/m)?.[1]
if (!password) {
  password = crypto.randomBytes(18).toString('base64url')
  env = env.replace(/^BASE_SENHA=\s*\n?/m, '')
  fs.writeFileSync('.env', `${env}${env && !env.endsWith('\n') ? '\n' : ''}BASE_SENHA=${password}\n`)
  console.log('Senha nova gravada no .env (BASE_SENHA).')
}
if (password.length < 16) throw new Error('BASE_SENHA precisa de pelo menos 16 caracteres: o arquivo cifrado é público.')

let places = JSON.parse(fs.readFileSync(FILE, 'utf8'))
const used = new Set()
places = places.map((p) => {
  // identificador estável: não muda quando a base é reordenada
  let id = p.id || crypto.createHash('sha1').update(`${p.nome}|${p.endereco}|${p.cidade}`).digest('hex').slice(0, 10)
  while (used.has(id)) id += 'x'
  used.add(id)
  return { ...p, id }
})
if (process.argv[2]) {
  const edits = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).alteracoes
  places = merge(places, edits).map(({ editado, ...p }) => p)
  console.log(`${Object.keys(edits).length} alterações aplicadas à base.`)
}
fs.writeFileSync(FILE, JSON.stringify(places, null, 1))
fs.mkdirSync('web/public/base', { recursive: true })
fs.writeFileSync('web/public/base/lugares.enc.json', JSON.stringify(await seal(places, password)))
console.log(`${places.length} lugares cifrados em web/public/base/lugares.enc.json`)

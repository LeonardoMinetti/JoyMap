import test from 'node:test'
import assert from 'node:assert/strict'
import { publishToMap } from '../web/src/lib/publish.js'

const map = { creator: { theme: {} }, places: [{ id: 3, name: 'Já Está', address: 'Rua A, 1', municipality: 'São Paulo' }] }
const found = [
  { chave: 'a', nome: 'Café Ção', cidade: 'São Paulo', endereco: 'Rua B, 2', lat: -23.5, lon: -46.6, posts: [{ url: 'https://www.instagram.com/reel/abc/', data: '2026-01-01' }] },
  { chave: 'b', nome: 'Já Está', cidade: 'São Paulo', endereco: 'Rua A, 1', lat: -23.5, lon: -46.6, posts: [] },
  { chave: 'c', nome: 'Sem Ponto', cidade: 'São Paulo', endereco: '', posts: [] },
]
const reply = (status, body) => ({ ok: status < 300, status, json: async () => body })

test('publicar pelo painel grava só os novos com ponto, mantendo acentos', async () => {
  const calls = []
  const fetcher = async (url, init = {}) => {
    calls.push([url, init])
    return init.method === 'PUT' ? reply(200, {}) : reply(200, { sha: 's1', content: Buffer.from(JSON.stringify(map)).toString('base64') })
  }
  const r = await publishToMap({ token: 't', handle: 'eu', found, choices: { a: 'cafe', b: 'rest', c: 'rest' }, fetcher })
  assert.equal(r.added.length, 1)
  assert.equal(r.total, 2)
  const body = JSON.parse(calls[1][1].body)
  assert.equal(body.sha, 's1')
  const saved = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'))
  assert.equal(saved.places[1].name, 'Café Ção')
  assert.equal(saved.places[1].id, 4)
  assert.ok(calls.every(([u]) => u.startsWith('https://api.github.com/repos/LeonardoMinetti/JoyMap/contents/web/public/maps/eu.json')))
})
test('chave recusada vira mensagem clara e nada é gravado', async () => {
  let n = 0
  await assert.rejects(publishToMap({ token: 'x', handle: 'eu', found, choices: { a: 'cafe' }, fetcher: async () => { n++; return reply(401, {}) } }), /recusou a chave/)
  assert.equal(n, 1)
})

test('edição de lugar: valida categorias, limita as extras e só conta o que mudou', async () => {
  const { applyPlaceEdits } = await import('../web/src/lib/publish.js')
  const m = { creator: { theme: { categories: ['a', 'b', 'c', 'd'].map((id) => ({ id })) } }, places: [{ id: 1, category: 'a', tags: ['b'], about: 'x' }] }
  assert.equal(applyPlaceEdits(m, { 1: { about: 'x' } }).count, 0)
  const r = applyPlaceEdits(m, { 1: { category: 'b', tags: ['b', 'c', 'zz', 'd', 'a'] } })
  assert.equal(r.count, 1)
  assert.deepEqual([r.map.places[0].category, r.map.places[0].tags, r.map.places[0].about], ['b', ['c', 'd'], 'x'])
  assert.equal(applyPlaceEdits(m, { 1: { category: 'inexistente' } }).count, 0)
})

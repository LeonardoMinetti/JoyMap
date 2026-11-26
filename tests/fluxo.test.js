import test from 'node:test'
import assert from 'node:assert/strict'
import { triage, handleFor, gather, findInBase, sameAddress } from '../scripts/lib/fluxo.js'

test('triagem acha endereço e @ sem IA', () => {
  const t = triage('Pizza boa na Rua Augusto Tolle, 253 com a @bracabar.')
  assert.deepEqual(t.enderecos, ['Rua Augusto Tolle, 253'])
  assert.deepEqual(t.arrobas, ['@bracabar'])
  assert.equal(handleFor('Braca Bar', ['@mizunobr', '@bracabar']), '@bracabar')
})
test('repetidos viram um lugar e a base é consultada pelo @ antes do nome', () => {
  const posts = [
    { url: 'u1', data: '2026-01-02', caption: 'bar do @bracabar', lugares: [{ nome: 'Braça Bar' }] },
    { url: 'u2', data: '2026-01-01', caption: 'Braca Bar de novo', lugares: [{ nome: 'Braca Bar' }] },
  ]
  const [p, ...rest] = gather(posts, 'eu')
  assert.equal(rest.length, 0)
  assert.equal(p.posts.length, 2)
  const base = [{ nome: 'Outro nome', instagram: '@bracabar', cidade: 'São Paulo', endereco: '' }]
  assert.equal(findInBase(p, base).por, '@')
  assert.ok(sameAddress('R. Augusto Tolle, 253', 'Rua Augusto Tolle, 253'))
  assert.ok(!sameAddress('Rua Augusto Tolle, 253', 'Rua Augusto Tolle, 610'))
})

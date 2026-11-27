import test from 'node:test'
import assert from 'node:assert/strict'
import { latest, nextEvent, brandsOf, agendaOf } from '../web/src/lib/arrival.js'

test('chegada: últimos por data, evento passado some e link inseguro é ignorado', () => {
  const l = latest([{ id: 9 }, { id: 1, postedOn: '2026-02-01' }, { id: 2, postedOn: '2026-03-01' }], 2)
  assert.deepEqual(l.map((p) => p.id), [2, 1])
  assert.equal(nextEvent({ event: { title: 'x', date: '2020-01-01' } }, '2026-01-01'), null)
  assert.equal(nextEvent({ event: { title: 'x', date: '2027-01-01', url: 'javascript:alert(1)' } }, '2026-01-01').url, null)
  assert.deepEqual(brandsOf({ brands: [{ name: 'A', url: 'http://x', logo: 'https://y/z.png' }, {}] }), [{ name: 'A', logo: null, url: null }])
})

test('agenda: em ordem de data, sem o que passou, juntando o formato antigo', () => {
  const c = { agenda: [{ title: 'b', date: '2027-03-01' }, { title: 'velho', date: '2020-01-01' }], event: { title: 'a', date: '2027-02-01' } }
  assert.deepEqual(agendaOf(c, '2026-01-01').map((e) => e.title), ['a', 'b'])
  assert.equal(brandsOf({ brands: [{ name: 'S', logo: 'data:image/svg+xml;base64,PHN2Zz4=' }] })[0].logo, 'data:image/svg+xml;base64,PHN2Zz4=')
})

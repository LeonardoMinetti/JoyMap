import test from 'node:test'
import assert from 'node:assert/strict'
import { byCity, gmapsRoute } from '../web/src/pub/extras.js'

const p = (municipality, neighborhood) => ({ municipality, neighborhood })

test('viajante: mais cidades do que bairros troca a navegação para cidades', () => {
  assert.equal(byCity([p('Santos', 'Gonzaga'), p('Paraty', 'Centro'), p('Ouro Preto', 'Centro')]), true)
  // muitos bairros na cidade principal: continua por bairros, mesmo com outras cidades
  assert.equal(byCity([p('São Paulo', 'A'), p('São Paulo', 'B'), p('São Paulo', 'C'), p('Santos', 'D'), p('Campinas', 'E')]), false)
  assert.equal(byCity([p('São Paulo', 'A')]), false)
})

test('roteiro no Google Maps: ordem das paradas, no máximo 9 no meio', () => {
  const places = Array.from({ length: 14 }, (_, i) => ({ id: i + 1, lat: i, lon: i }))
  assert.equal(gmapsRoute({ placeIds: [1] }, places), null)
  const r = gmapsRoute({ placeIds: places.map((p) => p.id) }, places)
  const q = new URL(r.url).searchParams
  assert.equal(q.get('origin'), '0,0')
  assert.equal(q.get('destination'), '10,10')
  assert.equal(q.get('waypoints').split('|').length, 9)
  assert.equal(r.cut, 3)
})

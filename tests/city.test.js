import test from 'node:test'
import assert from 'node:assert/strict'
import { byCity } from '../web/src/pub/extras.js'

const p = (municipality, neighborhood) => ({ municipality, neighborhood })

test('viajante: mais cidades do que bairros troca a navegação para cidades', () => {
  assert.equal(byCity([p('Santos', 'Gonzaga'), p('Paraty', 'Centro'), p('Ouro Preto', 'Centro')]), true)
  // muitos bairros na cidade principal: continua por bairros, mesmo com outras cidades
  assert.equal(byCity([p('São Paulo', 'A'), p('São Paulo', 'B'), p('São Paulo', 'C'), p('Santos', 'D'), p('Campinas', 'E')]), false)
  assert.equal(byCity([p('São Paulo', 'A')]), false)
})

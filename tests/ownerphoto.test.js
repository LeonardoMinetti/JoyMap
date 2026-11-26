import test from 'node:test'
import assert from 'node:assert/strict'
import { isOwnerName, ownerPhoto } from '../web/src/lib/ownerPhoto.js'

test('só fotos creditadas ao próprio lugar', () => {
  assert.ok(isOwnerName('Kadoya boteco japonês', 'Kadoya Boteco'))
  assert.ok(isOwnerName('Salt & Pepe', 'Salt Pepe'))
  assert.ok(isOwnerName("Hamburgueria Vit's Burger", 'Vits'))
  assert.ok(isOwnerName('Estado Luso', 'Padaria Estado Luso'))
  assert.ok(isOwnerName('Panni Padaria Artesanal - Água Fria', 'Panni Padaria'))
  assert.ok(!isOwnerName('Vinicius Escobar', 'Padaria Delícia da Freguesia'))
  assert.ok(!isOwnerName('Maria Luiz', 'Bar do Luiz Fernandes'))
  assert.ok(!isOwnerName('', 'Chori'))
  assert.equal(ownerPhoto([{ authorAttributions: [{ displayName: 'Ana' }] }], 'Chori'), null)
})

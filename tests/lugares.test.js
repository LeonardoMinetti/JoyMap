import test from 'node:test'
import assert from 'node:assert/strict'
import { dedupe, decide, toCsv, fromCsv, apply } from '../scripts/lib/lugares.js'

test('lugares: junta repetidos e só aprova sozinho o endereço dado pelo criador', () => {
  const l = dedupe([{ nome: 'Braca Bar', cidade: 'São Paulo', rua: '', publi: true }, { nome: 'braca bar', cidade: 'Sao Paulo', rua: 'Rua A', publi: false }])
  assert.equal(l.length, 1)
  assert.deepEqual([l[0].rua, l[0].publi], ['Rua A', true])
  assert.equal(decide({ rua: 'Rua A', lat: 1, origem: 'legenda' }).status, 'ok')
  assert.equal(decide({ rua: 'Rua A', lat: 1, origem: 'busca' }).status, 'revisar')
  assert.match(decide({ rua: 'Rua A', lat: 1, origem: 'busca', bairro: 'Itaim', bairroLegenda: 'Santana' }).motivo, /Santana.*Itaim/)
  assert.equal(decide({ rua: '', lat: null }).status, 'sem-endereco')
})

test('lugares: planilha de revisão vai e volta, sem fórmulas, e só os aprovados entram no mapa', () => {
  const rows = [{ aprovar: 's', nome: '=HYPERLINK("x")', rua: 'Rua "B", 2', cidade: 'São Paulo', lat: -23.5, lon: -46.6, post: 'javascript:1' }, { aprovar: '', nome: 'Outro', cidade: 'São Paulo', lat: 1, lon: 1 }]
  const csv = toCsv(rows)
  assert.ok(!/,=HYPERLINK/.test(csv))
  const back = fromCsv(csv)
  assert.equal(back[0].rua, 'Rua "B", 2')
  assert.equal(back[0].lat, '-23.5')
  const { added } = apply({ places: [{ id: 7, name: 'Já tem', municipality: 'São Paulo' }] }, back)
  assert.deepEqual(added.map((p) => [p.id, p.postUrl]), [[8, null]])
  assert.equal(fromCsv('aprovar;nome\ns;X\n')[0].nome, 'X')
})

test('lugares: variações do mesmo nome viram um só', () => {
  assert.equal(dedupe([{ nome: 'Braca', cidade: 'São Paulo' }, { nome: 'Braca Bar', cidade: 'São Paulo' }, { nome: 'Salvi Cozinha', cidade: 'São Paulo' }, { nome: 'Salvi', cidade: 'São Paulo' }]).length, 2)
})

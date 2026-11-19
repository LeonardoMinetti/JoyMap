import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from '../server/db.js'
import { createApp, sanitizeTheme } from '../server/app.js'
import { extract, normalizeAddress, tiktokId, dateFromTiktokId } from '../server/extract.js'
import { pickResult, simplify } from '../server/geocode.js'

test('extração: @ do lugar + endereço, hashtags não viram nome', () => {
  const e = extract('Conhecemos o @carola.restobar e amamos! 📍Rua Fernando de Albuquerque, 77 - Consolação *Publi')
  assert.equal(e.handles[0], 'carola.restobar')
  assert.equal(e.confidence, 'high')
  assert.equal(e.ad, true)
  assert.equal(e.rec, 'recommendation')
  const h = extract('Apaixonada nesse lugar #restaurante #camarão')
  assert.equal(h.name, null)
})

test('extração: rede com duas unidades e rótulo de unidade', () => {
  const e = extract('🍔@cromaburguers📍CARRÃO - Av. Guilherme Giorgi, 417📍OSASCO - Av. Santo Antônio, 1719💳 Aceitam VR')
  assert.equal(e.units.length, 2)
  assert.equal(e.units[1].label, 'OSASCO')
  assert.equal(e.units[1].address, 'Av. Santo Antônio, 1719')
})

test('extração: crédito de foto não é o lugar; categoria por palavras', () => {
  const e = extract('Bar flutuante @sealounge.sp 📍 Praia de Pitangueiras 🎥 @gabriel_lima')
  assert.equal(e.handles[0], 'sealounge.sp')
  assert.equal(extract('Melhor pizza da cidade @pizzaria.x 📍Rua A, 10').category, 'pizza')
})

test('endereços equivalentes normalizam igual; data derivada do ID', () => {
  assert.equal(normalizeAddress('Rua Prof Pedreira de Freitas, 629 - Tatuape'), normalizeAddress('R. Prof. Pedreira de Freitas, 629 - Tatuapé'))
  assert.equal(tiktokId('https://www.tiktok.com/@x/video/7405595760361737477'), '7405595760361737477')
  assert.equal(dateFromTiktokId('7405595760361737477'), '2024-08-21')
})

test('geocodificação: rejeita município errado e "sem número" nunca é exato', () => {
  const other = [{ lat: '-23.2', lon: '-45.9', category: 'highway', type: 'secondary', address: { city: 'São José dos Campos' } }]
  assert.equal(pickResult(other, 'São Paulo', 'Av. do Imperador, 4424').status, 'rejected')
  const house = [{ lat: '-23.0', lon: '-46.0', category: 'place', type: 'house', address: { city: 'Atibaia', house_number: '1' } }]
  assert.equal(pickResult(house, 'Atibaia', 'Rua 20 de novembro, sem número').quality, 'street_approx')
  assert.equal(simplify('Rua Gen. Calado, 20 - Tatuapé', 'São Paulo'), 'Rua General Calado, 20, São Paulo')
})

test('tema: valida cores, fonte e categorias', () => {
  const t = sanitizeTheme({ accent: 'red', font: 'comic', radius: 999, categories: [{ id: 'Café!', name: 'Cafés', color: '#123456', icon: 'nada' }] })
  assert.equal(t.accent, '#ff4b2b')
  assert.equal(t.font, 'sans')
  assert.equal(t.radius, 32)
  assert.deepEqual(t.categories[0], { id: 'caf', name: 'Cafés', color: '#123456', icon: 'rest' })
})

// ---------- fluxo completo da API ----------
const nominatim = async (url) => {
  const body = String(url).includes('nominatim')
    ? [{ lat: '-23.5544', lon: '-46.6574', category: 'place', type: 'house', address: { city: 'São Paulo', house_number: '77', suburb: 'Consolação' } }]
    : {}
  return new Response(JSON.stringify(body), { status: 200 })
}

async function login(app, email) {
  const r = await (await app.request('/api/auth/request', { method: 'POST', body: JSON.stringify({ email }) })).json()
  const token = new URL(r.devLink).searchParams.get('token')
  const v = await app.request(`/api/auth/verify?token=${token}`)
  const cookie = v.headers.get('set-cookie').split(';')[0]
  return { cookie, token }
}
const call = (app, cookie, path, method = 'GET', body) => app.request(path, { method, headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })

test('fluxo: link mágico → candidatura → aprovação → posts → publicação → mapa público → métricas', async () => {
  const db = openDb(':memory:')
  const app = createApp(db, { minFollowers: 1000, adminEmail: 'admin@x.com', fetchImpl: nominatim })

  // link de uso único
  const a = await login(app, 'duda@x.com')
  const reuse = await app.request(`/api/auth/verify?token=${a.token}`)
  assert.match(reuse.headers.get('location'), /erro=link/)

  // sem aprovação não edita
  assert.equal((await call(app, a.cookie, "/api/creator/places")).status, 403)

  // abaixo do mínimo → lista de espera
  const low = await login(app, 'pequena@x.com')
  const w = await (await call(app, low.cookie, '/api/apply', 'POST', { handle: 'pequena', followers: 10, acceptTerms: true })).json()
  assert.equal(w.creator.status, 'waitlist')

  // atende → pendente; admin aprova
  const ap = await (await call(app, a.cookie, '/api/apply', 'POST', { handle: 'dudacomesp', displayName: 'Duda', followers: 5000, acceptTerms: true })).json()
  assert.equal(ap.creator.status, 'pending')
  assert.equal((await call(app, a.cookie, '/api/apply', 'POST', { handle: 'x', followers: 5000, acceptTerms: true })).status, 409)
  const adm = await login(app, 'admin@x.com')
  assert.equal((await call(app, a.cookie, '/api/admin/creators')).status, 403)
  await call(app, adm.cookie, `/api/admin/creators/${ap.creator.id}/decision`, 'POST', { status: 'approved' })

  // posts → lugares
  const posts = [
    { url: 'https://www.tiktok.com/@dudacomesp/video/7405595760361737477', caption: 'Conhecemos o @carola.restobar e amamos! 📍Rua Fernando de Albuquerque, 77 - Consolação' },
    { url: 'https://www.tiktok.com/@dudacomesp/video/7405595760361737478', caption: 'Só hashtags #restaurante' },
  ]
  const created = await (await call(app, a.cookie, '/api/creator/posts', 'POST', { posts })).json()
  assert.equal(created.created, 2)
  for (let i = 0; i < 30; i++) { // espera a fila de geocodificação
    const l = await (await call(app, a.cookie, '/api/creator/places')).json()
    if (l.places.some((p) => p.geoStatus === 'found')) break
    await new Promise((r) => setTimeout(r, 100))
  }
  const list = (await (await call(app, a.cookie, '/api/creator/places')).json()).places
  const carola = list.find((p) => p.name === 'Carola Restobar')
  const unresolved = list.find((p) => p.status === 'unresolved')
  assert.equal(carola.geoQuality, 'address_exact')
  assert.ok(unresolved)

  // não publicado → 404; confirma e publica
  assert.equal((await app.request('/api/public/dudacomesp')).status, 404)
  assert.equal((await (await call(app, a.cookie, '/api/creator/places/confirm-high', 'POST')).json()).confirmed, 1)
  await call(app, a.cookie, '/api/creator/publish', 'POST', { published: true })
  const pub = await (await app.request('/api/public/dudacomesp')).json()
  assert.equal(pub.places.length, 1)
  assert.equal(pub.places[0].tiktokId, '7405595760361737477')
  assert.equal(pub.creator.theme.categories.length, 8)

  // evento: termo é higienizado; estatísticas agregadas
  await app.request('/api/e', { method: 'POST', body: JSON.stringify({ slug: 'dudacomesp', type: 'search', term: 'vegetariano fale com a@b.com', results: 0, sid: 's1' }) })
  await app.request('/api/e', { method: 'POST', body: JSON.stringify({ slug: 'dudacomesp', type: 'route_click', placeId: carola.id, sid: 's1' }) })
  const stats = await (await call(app, a.cookie, '/api/creator/stats')).json()
  assert.equal(stats.sessions, 1)
  assert.equal(stats.routeClicks, 1)
  assert.equal(stats.searches[0].term, 'vegetariano fale com')
  assert.equal(stats.searches[0].empty, 1)

  // despublicar tira do ar; slug e consentimentos validados
  await call(app, a.cookie, '/api/creator/publish', 'POST', { published: false })
  assert.equal((await app.request('/api/public/dudacomesp')).status, 404)
  assert.equal((await call(app, a.cookie, '/api/creator/slug', 'PUT', { slug: 'admin' })).status, 400)
  const cons = await (await call(app, a.cookie, '/api/creator/consents', 'PUT', { network: true })).json()
  assert.equal(cons.consents.network, true)
  assert.equal(cons.consents.aggregatesForRestaurants, false)
})

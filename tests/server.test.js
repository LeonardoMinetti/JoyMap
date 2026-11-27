import { CATEGORIES as ALL_CATS } from '../server/categories.js'
const CATEGORY_COUNT = ALL_CATS.length
import test from 'node:test'
import assert from 'node:assert/strict'
import { openDb } from '../server/db.js'
import { createApp, sanitizeTheme, sanitizeSvg } from '../server/app.js'
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

test('tema: valida cores, fonte; categorias são fixas (só cor e símbolo mudam)', () => {
  const t = sanitizeTheme({ accent: 'red', font: 'comic', radius: 999, categories: [{ id: 'cafe', name: 'Renomeada', color: '#123456', icon: 'nada' }, { id: 'nova', name: 'Nova', color: '#111111', icon: 'rest' }] })
  assert.equal(t.accent, '#ff4b2b')
  assert.equal(t.font, 'sans')
  assert.equal(t.radius, 32)
  assert.equal(t.categories.length, CATEGORY_COUNT)
  assert.ok(!t.categories.some((c) => c.id === 'nova'))
  const cafe = t.categories.find((c) => c.id === 'cafe')
  assert.deepEqual(cafe, { id: 'cafe', name: 'Cafés', group: 'Cafés e doces', color: '#123456', icon: 'lib:fluent3d:hot-beverage' })
})

test('tema: layout, pins e links têm limites; cabeçalho nunca some; símbolo próprio só como path', () => {
  const t = sanitizeTheme({ pinSize: 999, selected: 'x', layout: { blocks: [{ id: 'map', on: true }, { id: 'header', on: false }, { id: 'zzz', on: true }], listStyle: 'rows' }, categories: [{ id: 'pizza', name: 'A', color: '#111111', icon: 'custom:7' }] })
  assert.equal(t.pinSize, 55) // o tamanho do pin não é mais editável
  assert.equal(t.selected, 'outline')
  assert.equal(t.layout.blocks[0].id, 'header') // layout fixo
  assert.equal(t.layout.blocks.find((b) => b.id === 'header').on, true)
  assert.equal(t.layout.blocks.length, 5)
  assert.equal(t.layout.listStyle, 'grid')
  assert.equal(t.categories.find((c) => c.id === 'pizza').icon, 'custom:7')
  assert.ok(!sanitizeTheme({}).layout.blocks.some((b) => b.id === 'links'))
  assert.deepEqual(sanitizeSvg('<svg viewBox="0 0 10 10"><path d="M1 1L9 9"/></svg>'), { d: 'M1 1L9 9', vb: '0 0 10 10', mode: 'fill' })
  assert.throws(() => sanitizeSvg('<svg><script>alert(1)</script><path d="M1 1"/></svg>'), /svg_inseguro/)
  assert.throws(() => sanitizeSvg('<svg><circle r="2"/></svg>'), /svg_sem_path/)
  assert.throws(() => sanitizeSvg(`<svg>${'x'.repeat(60000)}</svg>`), /svg_grande/)
})

// ---------- fluxo completo da API ----------
const nominatim = async (url) => {
  const body = String(url).includes('nominatim')
    ? [{ lat: '-23.5544', lon: '-46.6574', name: 'Brasa Demo', display_name: 'Brasa Demo, Rua X, Moema', category: 'place', type: 'house', address: { city: 'São Paulo', road: 'Rua X', house_number: '77', suburb: 'Consolação' } }]
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
const post = (app, path, body) => app.request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const waitGeo = async (app, cookie) => {
  for (let i = 0; i < 40; i++) {
    const l = (await (await call(app, cookie, '/api/creator/places')).json()).places
    if (!l.some((p) => p.geoStatus === 'pending')) return l
    await new Promise((r) => setTimeout(r, 100))
  }
}

test('fluxo: candidatura → análise → aprovação → onboarding → posts → publicação → mapa público → métricas', async () => {
  const db = openDb(':memory:')
  const app = createApp(db, { minFollowers: 1000, adminEmail: 'admin@x.com', fetchImpl: nominatim })

  // candidatura é pública e só cria cadastro em análise (sem seguidores ainda)
  assert.equal((await post(app, '/api/apply', { handle: 'dudacomesp', email: 'duda@x.com', acceptTerms: false })).status, 400)
  assert.equal((await post(app, '/api/apply', { handle: 'dudacomesp', email: 'duda@x.com', tiktok: '@duda.tt', acceptTerms: true })).status, 200)
  assert.equal((await post(app, '/api/apply', { handle: 'outra', email: 'duda@x.com', acceptTerms: true })).status, 409)
  assert.equal((await post(app, '/api/apply', { handle: 'dudacomesp', email: 'b@x.com', acceptTerms: true })).status, 409)
  await post(app, '/api/apply', { handle: 'pequena', email: 'pequena@x.com', acceptTerms: true })

  // link de uso único
  const a = await login(app, 'duda@x.com')
  const reuse = await app.request(`/api/auth/verify?token=${a.token}`)
  assert.match(reuse.headers.get('location'), /erro=link/)
  const meA = await (await call(app, a.cookie, '/api/me')).json()
  assert.equal(meA.creator.status, 'pending')
  assert.equal(meA.creator.tiktok, 'duda.tt')
  assert.equal((await call(app, a.cookie, '/api/creator/places')).status, 403) // sem aprovação não edita

  // admin informa seguidores; abaixo do mínimo não aprova (sem force) e vai para a lista de espera
  const adm = await login(app, 'admin@x.com')
  assert.equal((await call(app, a.cookie, '/api/admin/creators')).status, 403)
  const list = (await (await call(app, adm.cookie, '/api/admin/creators')).json()).creators
  const duda = list.find((k) => k.handle === 'dudacomesp'), peq = list.find((k) => k.handle === 'pequena')
  assert.equal(duda.criterion, 'unknown')
  assert.equal((await call(app, adm.cookie, `/api/admin/creators/${peq.id}/decision`, 'POST', { status: 'approved', followers: 10 })).status, 409)
  await call(app, adm.cookie, `/api/admin/creators/${peq.id}/decision`, 'POST', { status: 'waitlist', followers: 10 })
  assert.equal((await (await call(app, adm.cookie, '/api/admin/creators')).json()).creators.find((k) => k.handle === 'pequena').criterion, 'below')
  assert.equal((await call(app, adm.cookie, `/api/admin/creators/${duda.id}/decision`, 'POST', { status: 'approved', followers: 5000, verified: true })).status, 200)

  // onboarding: contas não são "conectadas" sem credenciais; trial de 30 dias sem cartão
  assert.equal((await call(app, a.cookie, '/api/creator/connect/instagram', 'POST')).status, 501)
  await call(app, a.cookie, '/api/creator/accounts', 'PUT', { network: 'instagram', state: 'skipped' })
  assert.equal((await call(app, a.cookie, '/api/creator/accounts', 'PUT', { network: 'instagram', state: 'connected' })).status, 400)
  const trial = await (await call(app, a.cookie, '/api/creator/trial', 'POST', { billing: 'annual' })).json()
  assert.match(trial.trialEnds, /^\d{4}-\d{2}-\d{2}$/)
  const me2 = await (await call(app, a.cookie, '/api/me')).json()
  assert.equal(me2.creator.onboarding, 'welcome')
  assert.equal(me2.creator.accounts.instagram, 'skipped')

  // posts → lugares
  const posts = [
    { url: 'https://www.tiktok.com/@dudacomesp/video/7405595760361737477', caption: 'Conhecemos o @carola.restobar e amamos! 📍Rua Fernando de Albuquerque, 77 - Consolação' },
    { url: 'https://www.tiktok.com/@dudacomesp/video/7405595760361737478', caption: 'Só hashtags #restaurante' },
  ]
  assert.equal((await (await call(app, a.cookie, '/api/creator/posts', 'POST', { posts })).json()).created, 2)
  const list1 = await waitGeo(app, a.cookie)
  const carola = list1.find((p) => p.name === 'Carola Restobar')
  const unresolved = list1.find((p) => p.status === 'unresolved')
  assert.equal(carola.geoQuality, 'address_exact')
  assert.equal(carola.nameSrc, 'mention_handle')
  assert.equal(carola.neighborhood, 'Consolação')
  assert.ok(unresolved)
  const prog = await (await call(app, a.cookie, '/api/creator/progress')).json()
  assert.deepEqual([prog.posts, prog.places, prog.located, prog.done], [2, 1, 1, true])

  // adicionar lugar pela busca, mesclar duplicata, manter separados
  const found = (await (await call(app, a.cookie, '/api/creator/search-place?q=Brasa+Demo')).json()).results
  assert.equal(found[0].name, 'Brasa Demo')
  const added = (await (await call(app, a.cookie, '/api/creator/places', 'POST', { ...found[0], postUrl: 'https://www.instagram.com/p/abc/', category: 'rest' })).json()).place
  assert.equal(added.status, 'confirmed')
  assert.equal((await call(app, a.cookie, '/api/creator/places/merge', 'POST', { keep: carola.id, drop: added.id })).status, 200)
  const afterMerge = (await (await call(app, a.cookie, '/api/creator/places')).json()).places
  assert.equal(afterMerge.some((p) => p.id === added.id), false)
  assert.equal(afterMerge.find((p) => p.id === carola.id).postUrl.includes('tiktok'), true)

  // não publicado → 404; confirma e publica
  assert.equal((await app.request('/api/public/dudacomesp')).status, 404)
  assert.equal((await (await call(app, a.cookie, '/api/creator/places/confirm-high', 'POST')).json()).confirmed, 1)
  await call(app, a.cookie, '/api/creator/publish', 'POST', { published: true })
  const pub = await (await app.request('/api/public/dudacomesp')).json()
  assert.equal(pub.places.length, 1)
  assert.equal(pub.places[0].tiktokId, '7405595760361737477')
  assert.equal('confidence' in pub.places[0], false) // dados internos não vazam
  assert.equal(pub.creator.theme.categories.length, CATEGORY_COUNT)

  // rotas (roteiros) só com lugares do próprio criador
  await call(app, a.cookie, '/api/creator/routes', 'PUT', { routes: [{ name: 'Domingo', placeIds: [carola.id, 99999] }] })
  const pub2 = await (await app.request('/api/public/dudacomesp')).json()
  assert.deepEqual(pub2.routes[0].placeIds, [carola.id])

  // miniguias: precisa da permissão do criador E da escolha da equipe; o id se mantém ao salvar de novo
  const guides = async () => (await (await app.request('/api/miniguias')).json()).guides
  const mine = async () => (await (await call(app, a.cookie, '/api/creator/routes')).json()).routes
  const rid = (await mine())[0].id
  assert.equal((await call(app, adm.cookie, `/api/admin/miniguias/${rid}`, 'POST', { featured: true })).status, 404) // sem permissão não entra
  const save = (share) => call(app, a.cookie, '/api/creator/routes', 'PUT', { routes: [{ name: 'Novo', placeIds: [carola.id] }, { id: rid, name: 'Domingo', placeIds: [carola.id], share }] })
  await save(true)
  assert.equal((await guides()).length, 0) // liberado, mas ainda não escolhido
  assert.equal((await call(app, a.cookie, `/api/admin/miniguias/${rid}`, 'POST', { featured: true })).status, 403)
  assert.equal((await call(app, adm.cookie, `/api/admin/miniguias/${rid}`, 'POST', { featured: true })).status, 200)
  await save(true)
  assert.deepEqual((await guides()).map((g) => [g.id, g.name, g.handle]), [[rid, 'Domingo', 'dudacomesp']])
  await save(false)
  assert.equal((await guides()).length, 0) // retirou a permissão: sai na hora

  // eventos: termo higienizado; agregados; amostra mínima para audiência
  const ev = (b) => post(app, '/api/e', { slug: 'dudacomesp', ...b })
  await ev({ type: 'session', sid: 's1', dev: 'm', ref: 'instagram', ret: false })
  await ev({ type: 'search', term: 'vegetariano fale com a@b.com', results: 0, sid: 's1' })
  await ev({ type: 'request', term: 'vegetariano', sid: 's1' })
  await ev({ type: 'route_click', placeId: carola.id, sid: 's1' })
  const stats = await (await call(app, a.cookie, '/api/creator/stats')).json()
  assert.equal(stats.sessions, 1)
  assert.equal(stats.routeClicks, 1)
  assert.equal(stats.requests, 1)
  assert.equal(stats.searches[0].term, 'vegetariano fale com')
  assert.equal(stats.opportunity.empty, 1)
  assert.equal(stats.audience.enough, false)
  assert.equal(stats.audience.mobilePct, null)
  assert.equal(stats.audience.cities, null)

  // denúncia → fila de moderação → ocultar lugar avisa o criador
  assert.equal((await post(app, '/api/report', { slug: 'dudacomesp', placeId: carola.id, reason: 'inventado' })).status, 400)
  await post(app, '/api/report', { slug: 'dudacomesp', placeId: carola.id, reason: 'Informação errada', details: 'fechou' })
  await post(app, '/api/report', { slug: 'dudacomesp', placeId: carola.id, reason: 'Informação errada' })
  const rep = await (await call(app, adm.cookie, '/api/admin/reports?status=open')).json()
  assert.equal(rep.groups.length, 1)
  assert.equal(rep.groups[0].count, 2)
  await call(app, adm.cookie, '/api/admin/reports/act', 'POST', { ids: rep.groups[0].ids, action: 'hide_place' })
  assert.equal((await (await app.request('/api/public/dudacomesp')).json()).places.length, 0)
  assert.equal((await (await call(app, a.cookie, '/api/me')).json()).notices.length, 1)
  assert.equal((await (await call(app, adm.cookie, '/api/admin/reports?status=resolved')).json()).groups.length, 1)

  // slug, consentimentos com histórico, pausa e exclusão
  assert.equal((await call(app, a.cookie, '/api/creator/slug', 'PUT', { slug: 'admin' })).status, 400)
  assert.equal((await call(app, a.cookie, '/api/creator/slug', 'PUT', { slug: 'estudio' })).status, 400)
  const cons = await (await call(app, a.cookie, '/api/creator/consents', 'PUT', { network: true })).json()
  assert.equal(cons.consents.network, true)
  assert.equal((await (await call(app, a.cookie, '/api/creator/consents/log')).json()).log[0].key, 'network')
  await call(app, a.cookie, '/api/creator/publish', 'POST', { published: false })
  assert.equal((await app.request('/api/public/dudacomesp')).status, 404)
  // o criador não baixa a base de lugares
  assert.equal((await call(app, a.cookie, '/api/creator/export')).status, 404)
  assert.equal((await call(app, a.cookie, '/api/creator/account', 'DELETE', { confirm: 'nao' })).status, 400)
  assert.equal((await call(app, a.cookie, '/api/creator/account', 'DELETE', { confirm: 'EXCLUIR' })).status, 200)
  assert.equal((await call(app, a.cookie, '/api/me')).status, 200)
  assert.equal((await (await call(app, a.cookie, '/api/me')).json()).user, null)
})

test('rede e restaurantes: só entra quem consentiu; reivindicação passa por aprovação', async () => {
  const db = openDb(':memory:')
  const app = createApp(db, { minFollowers: 0, adminEmail: 'admin@x.com', fetchImpl: nominatim })
  const adm = await login(app, 'admin@x.com')
  const mk = async (email, handle, consents) => {
    await post(app, '/api/apply', { handle, email, acceptTerms: true })
    const s = await login(app, email)
    const id = (await (await call(app, s.cookie, '/api/me')).json()).creator.id
    await call(app, adm.cookie, `/api/admin/creators/${id}/decision`, 'POST', { status: 'approved', followers: 10 })
    await call(app, s.cookie, '/api/creator/posts', 'POST', { posts: [{ caption: 'Amamos o @casa.mare 📍Rua Fernando de Albuquerque, 77 - Consolação' }] })
    await waitGeo(app, s.cookie)
    await call(app, s.cookie, '/api/creator/places/confirm-high', 'POST')
    await call(app, s.cookie, '/api/creator/consents', 'PUT', consents)
    await call(app, s.cookie, '/api/creator/publish', 'POST', { published: true })
    return s
  }
  await mk('a@x.com', 'criadora', { network: true, aggregatesForRestaurants: true })
  await mk('b@x.com', 'criador', { network: false, aggregatesForRestaurants: false })
  const net = await (await app.request('/api/network')).json()
  assert.equal(net.creators.length, 1)
  assert.equal(net.places[0].creators.length, 1)

  const found = (await (await app.request('/api/restaurants/search?q=casa')).json()).results[0]
  assert.equal(found.creators, 1) // só conta quem aceitou dados agregados
  const owner = await login(app, 'dono@x.com')
  assert.equal((await call(app, owner.cookie, '/api/claims', 'POST', { key: found.key, method: 'google' })).status, 400)
  assert.equal((await call(app, owner.cookie, '/api/claims', 'POST', { key: found.key, method: 'manual', contact: 'contato@casa.com' })).status, 200)
  assert.equal((await (await call(app, owner.cookie, '/api/restaurant/panel')).json()).places.length, 0)
  const claim = (await (await call(app, adm.cookie, '/api/admin/claims')).json()).claims[0]
  await call(app, adm.cookie, `/api/admin/claims/${claim.id}`, 'POST', { status: 'approved' })
  const panel = (await (await call(app, owner.cookie, '/api/restaurant/panel')).json()).places[0]
  assert.equal(panel.creators, 1)
  assert.equal(panel.perception.state, 'insufficient')
})

test('símbolo próprio passa por aprovação; domínio próprio só ativa com CNAME correto; capa limitada', async () => {
  const db = openDb(':memory:')
  let cname = []
  const app = createApp(db, { minFollowers: 0, adminEmail: 'admin@x.com', baseUrl: 'https://mapa.exemplo', resolveCname: async () => cname })
  await post(app, '/api/apply', { handle: 'estilo', email: 'e@x.com', acceptTerms: true })
  const s = await login(app, 'e@x.com'); const adm = await login(app, 'admin@x.com')
  await call(app, adm.cookie, `/api/admin/creators/${(await (await call(app, s.cookie, '/api/me')).json()).creator.id}/decision`, 'POST', { status: 'approved', followers: 1 })

  assert.equal((await call(app, s.cookie, '/api/creator/symbols', 'POST', { name: 'X', svg: '<svg><script/></svg>' })).status, 400)
  const up = await (await call(app, s.cookie, '/api/creator/symbols', 'POST', { name: 'Estrela', svg: '<svg viewBox="0 0 24 24"><path d="M12 3l3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1z"/></svg>' })).json()
  const pend = (await (await call(app, adm.cookie, '/api/admin/symbols')).json()).symbols
  assert.equal(pend.length, 1)
  await call(app, adm.cookie, `/api/admin/symbols/${up.id}`, 'POST', { status: 'approved' })

  // domínio personalizado é do plano Pro: no Criador o servidor recusa, mesmo que a tela seja burlada
  const cid = (await (await call(app, s.cookie, '/api/me')).json()).creator.id
  assert.equal((await call(app, s.cookie, '/api/creator/domain', 'PUT', { domain: 'mapa.dudacome.com.br' })).status, 403)
  assert.equal((await call(app, adm.cookie, `/api/admin/creators/${cid}/plan`, 'POST', { tier: 'pro' })).status, 200)
  assert.equal((await (await call(app, s.cookie, '/api/me')).json()).creator.plan.tier, 'pro')
  assert.equal((await call(app, s.cookie, '/api/creator/domain', 'PUT', { domain: 'sem ponto' })).status, 400)
  const d = await (await call(app, s.cookie, '/api/creator/domain', 'PUT', { domain: 'https://mapa.dudacome.com.br/x' })).json()
  assert.equal(d.domain, 'mapa.dudacome.com.br')
  assert.equal(d.target, 'mapa.exemplo')
  assert.equal((await (await call(app, s.cookie, '/api/creator/domain/check', 'POST')).json()).status, 'pending')
  cname = ['mapa.exemplo.']
  assert.equal((await (await call(app, s.cookie, '/api/creator/domain/check', 'POST')).json()).status, 'active')

  assert.equal((await call(app, s.cookie, '/api/creator/cover', 'PUT', { mime: 'text/html', data: 'AAAA' })).status, 400)
  assert.equal((await call(app, s.cookie, '/api/creator/cover', 'PUT', { mime: 'image/png', data: Buffer.alloc(700 * 1024).toString('base64') })).status, 400)
  assert.equal((await call(app, s.cookie, '/api/creator/cover', 'PUT', { mime: 'image/png', data: Buffer.from('png').toString('base64') })).status, 200)
})

test('mapa de demonstração: público, sem login, sem dados inventados sobre lugares e slug reservado', async () => {
  const db = openDb(':memory:')
  const app = createApp(db, { baseUrl: 'http://x.test', dev: true })
  const r = await app.request('/api/public/demo')
  assert.equal(r.status, 200)
  const d = await r.json()
  assert.equal(d.creator.demo, true)
  // lugares reais sem nada inventado sobre eles: nem nota, telefone ou cupom
  assert.ok(d.places.length >= 8 && d.places.every((p) => !p.rating && !p.phone && !p.couponCode))
  assert.ok(d.creator.theme.categories.some((c) => /^lib:fluent3d:/.test(c.icon)))
  assert.ok(d.routes.length >= 2 && d.routes.every((r) => r.placeIds.every((id) => d.places.some((p) => p.id === id))))
})

test('mapa de demonstração: eventos não geram métricas e não dão erro', async () => {
  const db = openDb(':memory:')
  const app = createApp(db, { baseUrl: 'http://x.test', dev: true })
  const r = await app.request('/api/e', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug: 'demo', type: 'session' }) })
  assert.equal(r.status, 200)
  assert.equal(db.prepare('SELECT COUNT(*) n FROM events').get().n, 0)
})

test('links do lugar: só Google Maps e perfil do Instagram', async () => {
  const { cleanGoogleUrl, cleanInstagramUrl, googleSearchUrl } = await import('../server/placelinks.js')
  assert.equal(cleanGoogleUrl(''), null)
  assert.equal(cleanGoogleUrl('maps.app.goo.gl/abc123'), 'https://maps.app.goo.gl/abc123')
  assert.equal(cleanGoogleUrl('https://www.google.com/maps/place/Bar+X'), 'https://www.google.com/maps/place/Bar+X')
  assert.equal(cleanGoogleUrl('https://evil.example/maps'), undefined)
  assert.equal(cleanGoogleUrl('http://www.google.com/maps/x'), undefined)
  assert.equal(cleanInstagramUrl('@bar.exemplo'), 'https://www.instagram.com/bar.exemplo/')
  assert.equal(cleanInstagramUrl('https://www.instagram.com/bar.exemplo/?hl=pt'), 'https://www.instagram.com/bar.exemplo/')
  assert.equal(cleanInstagramUrl('https://instagram.com/p/AbC123/'), undefined)
  assert.equal(cleanInstagramUrl('https://tiktok.com/@x'), undefined)
  assert.match(googleSearchUrl({ name: 'Bar X', address: 'Rua A, 1' }), /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=Bar%20X%20Rua%20A%2C%201$/)
})

test('tema: a cor do texto sai do fundo e sempre passa no contraste; cor principal não some no fundo', async () => {
  const { contrast, accentProblem } = await import('../server/theme.js')
  for (const bg of ['#ffffff', '#777777', '#808080', '#a0a0a0', '#343843', '#171717', '#ffc400', '#2d7ff9']) {
    const t = sanitizeTheme({ bg, fg: bg }) // tentativa de texto igual ao fundo é ignorada
    assert.ok(contrast(t.fg, t.bg) >= 4.5, `${bg} → ${t.fg}`)
  }
  assert.equal(sanitizeTheme({ bg: '#171717' }).fg, '#ffffff')
  assert.equal(accentProblem({ accent: '#fefefe', bg: '#ffffff' }), 'cor_principal_igual_ao_fundo')
  assert.equal(accentProblem({ accent: '#ffc400', bg: '#ffffff' }), null)
})

test('roteiro como história: paradas só com lugares do criador, limites e texto sem lugar', async () => {
  const { cleanStops } = await import('../server/stops.js')
  const own = new Set([1, 2])
  const r = cleanStops([
    { placeId: 1, title: 'A', when: 'Dia 1', text: 'História', tip: 'Dica' },
    { placeId: 99, title: '', text: 'Lugar de outro criador vira só texto' },
    { placeId: null, title: '', text: '' }, // vazia: descartada
    { placeId: 2, text: 'x'.repeat(900) },
  ], own)
  assert.equal(r.length, 3)
  assert.equal(r[0].placeId, 1)
  assert.equal(r[1].placeId, null)
  assert.equal(r[2].text.length, 600)
  assert.equal(cleanStops(new Array(50).fill({ placeId: 1 }), own).length, 30)
})

test('planos: permissões por plano e domínio personalizado só no Pro', async () => {
  const { can, minTier, planView, tierOf, CAPS } = await import('../server/plans.js')
  assert.equal(tierOf('qualquer'), 'creator') // quem já existia fica no Criador
  assert.equal(can('free', 'customCategories'), false)
  assert.equal(can('creator', 'customCategories'), false); assert.equal(can('pro', 'customCategories'), true)
  assert.equal(can('creator', 'customDomain'), false)
  assert.equal(can('pro', 'customDomain'), true)
  assert.equal(minTier('removeBrand'), 'pro')
  assert.equal(CAPS.creator.roteiroFee, 8)
  assert.equal(CAPS.pro.roteiroFee, 5)
  assert.equal(planView('free').tierName, 'Grátis')
})

test('categorias próprias: nome limpo, tipo de base, limite e sem criar novas fora do Pro', async () => {
  const { sanitizeTheme, EXTRA_MAX, DEFAULT_THEME } = await import('../server/theme.js')
  const mk = (id, name, extra = {}) => ({ id, name, base: 'cafe', color: '#123456', icon: 'cafe', ...extra })
  const ok = sanitizeTheme({ categories: [...DEFAULT_THEME.categories, mk('xabc123', '  Comida   de rua ')] })
  const k = ok.categories.find((c) => c.id === 'xabc123')
  assert.equal(k.name, 'Comida de rua'); assert.equal(k.custom, true); assert.equal(k.base, 'cafe'); assert.equal(ok.categories.length, DEFAULT_THEME.categories.length + 1)
  const bad = sanitizeTheme({ categories: [mk('xbad001', 'visite http://x.com'), mk('xbad002', 'a'), mk('xbad003', 'Pizza'), mk('rest', 'Outro'), mk('xdup001', 'Roda'), mk('xdup002', 'roda')] })
  assert.equal(bad.categories.length, DEFAULT_THEME.categories.length + 1); assert.equal(bad.categories.at(-1).id, 'xdup001')
  const many = sanitizeTheme({ categories: Array.from({ length: 12 }, (_, i) => mk('xm' + String(i).padStart(4, '0'), 'Cat ' + 'abcdefghijkl'[i])) })
  assert.equal(many.categories.length, DEFAULT_THEME.categories.length + EXTRA_MAX)
  const lapse = sanitizeTheme({ categories: [mk('xold001', 'Antiga'), mk('xnew001', 'Nova')] }, { only: new Set(['xold001']) })
  assert.deepEqual(lapse.categories.filter((c) => c.custom).map((c) => c.id), ['xold001'])
})

test('roteiro à venda e produtos: só nos planos certos, preço limitado, prévia trancada', async () => {
  const { cleanOffer, cleanProducts, lockRoute, netOf, logoUriFromSvg, cleanLogo } = await import('../server/offers.js')
  const LOGO = logoUriFromSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10z"/></svg>')
  assert.equal(cleanLogo(LOGO), LOGO)
  const bad = (t) => assert.throws(() => logoUriFromSvg(t))
  bad('<svg><script>alert(1)</script></svg>'); bad('<svg onload="x()"></svg>'); bad('<svg><image href="https://e.com/a.png"/></svg>'); bad('<svg><a href="https://e.com"/></svg>'); bad('não é svg')
  assert.equal(cleanLogo('data:image/png;base64,iVBORw0KGgo='), null)
  const r = { price: '19.4', products: [{ title: ' Guia ', url: 'https://x.com/a', price: 'R$ 9', image: '/photos/cafe.jpg' }, { title: 'Sem foto', url: 'https://x.com/b' }, { title: 'Ruim', url: 'javascript:alert(1)', image: '/photos/cafe.jpg' }, { title: '', url: 'https://x.com', image: '/photos/cafe.jpg' }, { title: 'Foto ruim', url: 'https://x.com/c', image: 'https://evil.com/a.jpg' }] }
  assert.deepEqual(cleanOffer(r, 'free'), { price: null, products: [], sponsor: null })
  const cr = cleanOffer({ ...r, sponsor: { brand: 'Marca', logo: LOGO } }, 'creator')
  assert.equal(cr.price, 19); assert.equal(cr.products.length, 1); assert.equal(cr.sponsor, null)
  const sp = cleanOffer({ sponsor: { brand: '  Marca  X ', logo: LOGO } }, 'pro').sponsor
  assert.deepEqual(sp, { brand: 'Marca X', logo: LOGO })
  assert.equal(cleanOffer({ sponsor: { brand: 'Marca sem logo' } }, 'pro').sponsor, null)
  assert.equal(cleanOffer({ sponsor: { brand: 'M', logo: 'data:image/png;base64,iVBORw0KGgo=' } }, 'pro').sponsor, null)
  assert.equal(cleanOffer({ sponsor: { brand: '  ' } }, 'pro').sponsor, null)
  const pro = cleanOffer(r, 'pro')
  assert.equal(pro.price, 19); assert.equal(pro.products.length, 1); assert.equal(pro.products[0].title, 'Guia')
  assert.equal(cleanOffer({ price: 2 }, 'pro').price, null); assert.equal(cleanOffer({ price: 900 }, 'pro').price, null)
  assert.equal(cleanProducts(Array(9).fill({ title: 'a', url: 'https://a.com', image: '/photos/cafe.jpg' })).length, 6)
  assert.equal(netOf(100, 'creator'), 92); assert.equal(netOf(100, 'pro'), 95)
  const route = { id: 1, price: 19, placeIds: [1, 2, 3], stops: [1, 2, 3, 4].map((n) => ({ placeId: n, text: 'história ' + n })) }
  const locked = lockRoute(route, false)
  assert.equal(locked.locked, true); assert.equal(locked.stops.length, 2); assert.equal(locked.stopCount, 4)
  assert.equal(lockRoute(route, true).stops.length, 4); assert.equal(lockRoute({ ...route, price: null }, false).locked, undefined)
})

test('plano Grátis: painel só com visitas totais e estúdio com visual básico', async () => {
  const { limitStats, can } = await import('../server/plans.js')
  const { freeTheme } = await import('../server/theme.js')
  const t = freeTheme({ accent: '#2d7ff9', bg: '#000000', bio: 'minha bio', shape: 'square' })
  assert.equal(t.accent, '#171717'); assert.equal(t.bg, '#ffffff'); assert.equal(t.shape, 'drop'); assert.equal(t.bio, 'minha bio')
  assert.equal(can('free', 'studioFull'), false); assert.equal(can('creator', 'studioFull'), true)
})

test('plano Grátis: até 20 lugares e sem roteiros', async () => {
  const { roomFor, can } = await import('../server/plans.js')
  assert.equal(roomFor('free', 0), 20); assert.equal(roomFor('free', 18), 2); assert.equal(roomFor('free', 25), 0)
  assert.equal(roomFor('creator', 500), Infinity); assert.equal(roomFor('pro', 500), Infinity)
  assert.equal(can('free', 'roteiros'), false); assert.equal(can('creator', 'roteiros'), true)
})

test('horário: aberto agora (com virada de meia-noite) e rótulos', async () => {
  const { cleanHours, openState, openLabel } = await import('../server/hours.js')
  assert.equal(cleanHours([null, null, null, null, null, null, null]), null)
  assert.equal(cleanHours([['09:00', '09:00'], null, null, null, null, null, null]), null)
  assert.equal(cleanHours('x'), null)
  const h = [null, ['09:00', '18:00'], ['09:00', '18:00'], ['09:00', '18:00'], ['09:00', '18:00'], ['18:00', '02:00'], ['18:00', '02:00']]
  const at = (iso) => new Date(iso) // UTC-3 em São Paulo
  assert.equal(openState(h, at('2026-11-25T15:00:00Z')).open, true) // quarta 12h
  assert.equal(openState(h, at('2026-11-24T23:00:00Z')).open, false) // terça 20h
  assert.equal(openState(h, at('2026-11-28T04:00:00Z')).open, true) // sábado 01h, ainda no turno de sexta
  assert.equal(openState(null), null)
  assert.equal(openLabel(h, at('2026-11-25T15:00:00Z')), 'Aberto agora · fecha às 18h')
  assert.equal(openLabel(h, at('2026-11-24T23:00:00Z')), 'Fechado · abre amanhã às 9h')
})

test('espectador: entra com e-mail, salva lugares de um mapa e os vê em todos os mapas', async () => {
  const db = openDb(':memory:')
  const app = createApp(db, { minFollowers: 0, adminEmail: 'admin@x.com', fetchImpl: nominatim })
  const adm = await login(app, 'admin@x.com')
  await post(app, '/api/apply', { handle: 'criadora', email: 'c@x.com', acceptTerms: true })
  const c = await login(app, 'c@x.com')
  const id = (await (await call(app, c.cookie, '/api/me')).json()).creator.id
  await call(app, adm.cookie, `/api/admin/creators/${id}/decision`, 'POST', { status: 'approved', followers: 10 })
  await call(app, c.cookie, '/api/creator/posts', 'POST', { posts: [{ caption: 'Amamos o @casa.mare 📍Rua Fernando de Albuquerque, 77 - Consolação' }] })
  await waitGeo(app, c.cookie)
  await call(app, c.cookie, '/api/creator/places/confirm-high', 'POST')
  await call(app, c.cookie, '/api/creator/publish', 'POST', { published: true })
  const slug = (await (await call(app, c.cookie, '/api/me')).json()).creator.slug
  const placeId = (await (await app.request(`/api/public/${slug}`)).json()).places[0].id

  assert.equal((await app.request('/api/saved')).status, 401) // sem conta não há salvos no servidor
  // login de espectador: volta só para páginas do site (nada de link externo)
  const r = await (await post(app, '/api/auth/request', { email: 'leitor@x.com', next: 'viewer', back: 'https://evil.com' })).json()
  assert.ok(!r.devLink.includes('evil'))
  const token = new URL(r.devLink).searchParams.get('token')
  const v = await app.request(`/api/auth/verify?token=${token}&next=viewer`)
  assert.equal(v.headers.get('location'), '/salvos')
  const cookie = v.headers.get('set-cookie').split(';')[0]
  assert.equal(db.prepare("SELECT role FROM users WHERE email='leitor@x.com'").get().role, 'viewer')

  assert.equal((await (await call(app, cookie, '/api/saved', 'POST', { slug, placeId, saved: true })).json()).ok, true)
  assert.equal((await call(app, cookie, '/api/saved', 'POST', { slug, placeId: 99999, saved: true })).status, 404)
  assert.deepEqual((await (await call(app, cookie, `/api/saved/${slug}`)).json()).ids, [placeId])
  const all = (await (await call(app, cookie, '/api/saved')).json()).saved
  assert.equal(all.length, 1); assert.equal(all[0].slug, slug)
  assert.equal((await (await call(app, cookie, '/api/saved/merge', 'POST', { slug, ids: [placeId, 123456] })).json()).merged, 1)
  await call(app, cookie, '/api/saved', 'POST', { slug, placeId, saved: false })
  assert.equal((await (await call(app, cookie, '/api/saved')).json()).saved.length, 0)
  // o criador não vê quem salvou: a conta do leitor não abre o painel
  assert.notEqual((await call(app, cookie, '/api/creator/places')).status, 200)
  // conta de restaurante: tipo próprio, entra no painel do restaurante
  const rr = await (await post(app, '/api/auth/request', { email: 'dono@rest.com', next: 'restaurante' })).json()
  const rv = await app.request(`/api/auth/verify?token=${new URL(rr.devLink).searchParams.get('token')}&next=restaurante`)
  assert.equal(rv.headers.get('location'), '/restaurante')
  assert.equal(db.prepare("SELECT role FROM users WHERE email='dono@rest.com'").get().role, 'restaurant')
})

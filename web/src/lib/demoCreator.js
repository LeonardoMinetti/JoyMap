// Painel do criador de demonstração (versão estática / GitHub Pages): sem servidor, sem dados reais.
// Um criador fictício já aprovado, com lugares fictícios. O que a pessoa muda fica só na aba do navegador
// (sessionStorage): fechar a aba, ou tocar em "Recomeçar", volta ao início. Nada é enviado a lugar nenhum.
import { sanitizeTheme, sanitizeSvg, accentProblem } from '../../../server/theme.js'
import { extract, tiktokId } from '../../../server/extract.js'
import { cleanGoogleUrl, cleanInstagramUrl } from '../../../server/placelinks.js'
import { cleanStops } from '../../../server/stops.js'
import { planView, TIERS } from '../../../server/plans.js'
import { DEMO_PLACES, DEMO_ROUTES, DEMO_SLUG } from '../demoData.js'
import { BASE, withBase } from './base.js'

const KEY = 'wagli_creator_demo_v1'
const FLAG = 'wagli_creator_demo_on'
const err = (m, status = 400) => Object.assign(new Error(m), { status, data: { error: m } })
const iso = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10)

// ---------- sessão de demonstração ----------
export const demoOn = () => { try { return sessionStorage.getItem(FLAG) === '1' } catch { return false } }
export const demoEnter = () => { try { sessionStorage.setItem(FLAG, '1') } catch { /* ok */ } }
export const demoLeave = () => { try { sessionStorage.removeItem(FLAG) } catch { /* ok */ } }
export const demoReset = () => { mem = null; try { sessionStorage.removeItem(KEY) } catch { /* ok */ } }
// rotas que só existem para quem está logado: abrir direto o endereço já entra na demonstração
const CREATOR_PATH = /^\/(painel|estudio|publicar|publicado|previa|revisar|adicionar|sem-lugar|unidades|colar-posts|montando|boas-vindas|consentimentos|plano|pagamento)(\/|$)/
export const isCreatorPath = (p) => CREATOR_PATH.test(p)

// ---------- estado inicial ----------
let mem
let demoJson
async function base() {
  if (!demoJson) { const r = await fetch(`${BASE}/demo.json`); demoJson = await r.json() }
  return demoJson
}
const mk = (o) => ({ name: null, address: null, municipality: 'São Paulo', neighborhood: null, lat: null, lon: null, geoStatus: 'none', geoQuality: null, category: 'rest', postUrl: null, postedOn: null, ad: false, rec: null, confidence: 'high', note: null, status: 'confirmed', nameSrc: 'mention', snippet: null, dupOk: false, hidden: false, reviewed: false, tiktokId: null, ...o })

function seed(d) {
  const photo = {}
  d.places.forEach((p) => { photo[p.id] = withBase(p.photo) })
  const places = DEMO_PLACES.map((p, i) => mk({ id: p.id, name: p.name, category: p.category, neighborhood: p.neighborhood, lat: p.lat, lon: p.lon, address: 'Endereço ilustrativo (demonstração)', geoStatus: 'found', geoQuality: i % 3 === 2 ? 'street_approx' : 'address_exact', postedOn: iso(-12 - i * 9), snippet: `Post de exemplo sobre ${p.name} (fictício).` }))
  places.push(
    mk({ id: 13, name: 'Sushi Exemplo', category: 'rest', neighborhood: 'Aclimação', address: 'Rua Exemplo, 100', lat: -23.5731, lon: -46.6342, geoStatus: 'found', geoQuality: 'street_approx', confidence: 'medium', status: 'pending', postedOn: iso(-3), snippet: 'Rodízio novo na Aclimação, vale a visita (post fictício).' }),
    mk({ id: 14, name: 'Hamburgueria Exemplo', category: 'burger', neighborhood: 'Pinheiros', address: 'Rua Exemplo, 250', lat: -23.5663, lon: -46.6838, geoStatus: 'found', geoQuality: 'address_exact', confidence: 'high', status: 'pending', postedOn: iso(-2), snippet: 'Smash burger com batata na brasa (post fictício).' }),
    mk({ id: 15, name: null, category: 'rest', confidence: 'low', status: 'unresolved', nameSrc: null, postedOn: iso(-1), snippet: 'Esse almoço foi demais, mas esqueci de marcar o lugar (post fictício).' }),
  )
  return {
    nextId: 100,
    creator: {
      id: 1, handle: 'criador_demo', tiktok: null, slug: DEMO_SLUG, displayName: 'Criador Demo', followers: 12000, status: 'approved', verified: true, published: true, onboarding: 'done',
      accounts: { instagram: 'none', tiktok: 'none' }, plan: { name: 'trial', billing: 'monthly', trialEnds: iso(21), ...planView('creator') },
      theme: sanitizeTheme(d.creator.theme), links: [{ title: 'Instagram do criador (exemplo)', url: 'https://example.com', on: true }],
      consents: { hosting: true, network: false, aggregatesForRestaurants: false, marketing: false },
      settings: { autoConfirmHigh: false, bioLinkIg: false, bioLinkTiktok: false, paused: false, adminPaused: false },
      domain: { name: null, status: 'none' }, hasCover: false, symbols: [], meta: { instagramReady: false, tiktokReady: false },
    },
    places, photo, routes: DEMO_ROUTES.map((r) => ({ ...r })), interest: false, consentLog: [], notices: [],
  }
}
async function S() {
  if (mem) return mem
  try { const r = sessionStorage.getItem(KEY); if (r) return (mem = JSON.parse(r)) } catch { /* sem armazenamento */ }
  return (mem = seed(await base()))
}
const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(mem)) } catch { /* ok */ } }
const out = (v) => { save(); return v }
const pub = (p) => ({ id: p.id, name: p.name, address: p.address, municipality: p.municipality, neighborhood: p.neighborhood, lat: p.lat, lon: p.lon, geoQuality: p.geoQuality, category: p.category, postUrl: p.postUrl, postedOn: p.postedOn, ad: p.ad, tiktokId: p.tiktokId, couponCode: p.couponCode || null, couponNote: p.couponNote || null, googleUrl: p.googleUrl || null, instagramUrl: p.instagramUrl || null, photo: undefined })

// ---------- estatísticas ilustrativas ----------
function stats(s, days) {
  const k = days === 7 ? 0.25 : 1
  const live = s.places.filter((p) => p.status === 'confirmed')
  const top = live.slice(0, 8).map((p, i) => ({ id: p.id, name: p.name, category: p.category, opens: Math.round((90 - i * 9) * k), routes: Math.round((34 - i * 4) * k) }))
  const perDay = Array.from({ length: days }, (_, i) => ({ d: iso(i - days + 1), n: Math.round((28 + ((i * 7) % 19) + (i % 7 === 5 || i % 7 === 6 ? 14 : 0)) * 1) }))
  const searches = [['pizza', 74, 0], ['café', 61, 4], ['brunch', 38, 2], ['ramen', 29, 0], ['vegano', 22, 22], ['rodízio', 17, 9]].map(([term, count, empty]) => ({ term, count: Math.round(count * k), empty: Math.round(empty * k), withResults: Math.round((count - empty) * k) }))
  const sessions = perDay.reduce((a, b) => a + b.n, 0)
  return {
    days, sessions, placeOpens: Math.round(sessions * 1.7), routeClicks: Math.round(sessions * 0.45), postOpens: Math.round(sessions * 0.6), requests: Math.round(sessions * 0.02),
    searches, topPlaces: top, perDay, featured: top[0] ? { name: top[0].name, routes: top[0].routes } : null,
    opportunity: { term: 'vegano', count: Math.round(22 * k), empty: Math.round(22 * k) },
    audience: { enough: true, sample: sessions, weekdays: [31, 22, 20, 24, 27, 38, 44].map((v) => Math.round(v * k)), mobilePct: 83, returningPct: 27, origins: [{ ref: 'instagram', pct: 62 }, { ref: 'direto', pct: 24 }, { ref: 'tiktok', pct: 9 }, { ref: 'outros', pct: 5 }], cities: null },
    note: 'DEMONSTRAÇÃO: estes números são ilustrativos, não vêm de visitas reais. No produto, só aparecem contagens agregadas de acessos ao seu mapa. Clique em rota indica interesse, não visita confirmada.',
  }
}

// ---------- API ----------
export async function demoCreatorApi(path, { method = 'GET', body = {} } = {}) {
  const s = await S()
  const [p, qs = ''] = path.split('?')
  const q = new URLSearchParams(qs)
  const cr = s.creator
  let m
  const find = (id) => { const x = s.places.find((v) => v.id === Number(id)); if (!x) throw err('nao_encontrado', 404); return x }

  if (p === '/me') return { user: { id: 1, email: 'criador.demo@wagli.local', role: 'user' }, creator: cr, claims: [], minFollowers: 10000, notices: s.notices.filter((n) => !n.seen).map(({ id, text, created_at }) => ({ id, text, created_at })) }
  if (p === '/auth/demo') { demoEnter(); return { ok: true } }
  if (p === '/auth/logout') { demoLeave(); return { ok: true } }

  // onboarding e conta
  if (p === '/creator/onboarding') { cr.onboarding = body.step; return out({ onboarding: cr.onboarding }) }
  if (p === '/creator/connect/instagram' || p === '/creator/connect/tiktok') throw err('nao_configurado', 501)
  if (p === '/creator/accounts') { cr.accounts[body.network] = body.state; return out({ ok: true }) }
  if (p === '/creator/trial') { cr.plan = { ...cr.plan, billing: body.billing === 'annual' ? 'annual' : 'monthly' }; if (cr.onboarding !== 'done') cr.onboarding = 'welcome'; return out({ trialEnds: cr.plan.trialEnds }) }
  if (p === '/creator/plan-demo') { if (!TIERS.includes(body.tier)) throw err('plano'); cr.plan = { ...cr.plan, ...planView(body.tier) }; return out({ ok: true }) }
  if (p === '/creator/billing') { cr.plan = { ...cr.plan, billing: body.billing === 'annual' ? 'annual' : 'monthly' }; return out({ billing: cr.plan.billing }) }
  if (p === '/creator/account' && method === 'PUT') { const n = String(body.displayName || '').trim().slice(0, 60); if (!n) throw err('nome'); cr.displayName = n; return out({ displayName: n }) }
  if (p === '/creator/account' && method === 'DELETE') { demoReset(); demoLeave(); return { ok: true } }
  if (p === '/creator/consents' && method === 'PUT') {
    for (const k of ['network', 'aggregatesForRestaurants', 'marketing']) if (!!cr.consents[k] !== !!body[k]) s.consentLog.unshift({ key: k, value: body[k] ? 1 : 0, terms_version: 'demo', ts: Date.now() })
    cr.consents = { ...cr.consents, hosting: true, network: !!body.network, aggregatesForRestaurants: !!body.aggregatesForRestaurants, marketing: !!body.marketing, updatedAt: new Date().toISOString() }
    return out({ consents: cr.consents })
  }
  if (p === '/creator/consents/log') return { log: s.consentLog }
  if (p === '/creator/settings') { for (const k of ['autoConfirmHigh', 'bioLinkIg', 'bioLinkTiktok']) if (k in body) cr.settings[k] = !!body[k]; return out({ settings: cr.settings }) }
  if (p === '/creator/publish') { cr.published = !!body.published; if (body.published) cr.settings.paused = false; return out({ published: cr.published }) }
  if (p === '/creator/pause') { cr.settings.paused = !!body.paused; if (body.paused) cr.published = false; else cr.published = true; return out({ paused: cr.settings.paused }) }
  if (p === '/creator/interest') { if (method === 'POST') { s.interest = true; return out({ ok: true }) } return { listas: s.interest } }
  if (p === '/creator/notices/seen') { s.notices.forEach((n) => { n.seen = true }); return out({ ok: true }) }

  // montagem do mapa
  if (p === '/creator/progress') {
    const act = s.places.filter((x) => x.status !== 'removed')
    const ok = act.filter((x) => x.status === 'pending' || x.status === 'confirmed')
    return { posts: act.length, places: ok.length, withAddress: ok.filter((x) => x.address).length, located: ok.filter((x) => x.geoStatus === 'found').length, pending: 0, done: act.length > 0 }
  }
  if (p === '/creator/places' && method === 'GET') return { places: s.places.filter((x) => x.status !== 'removed').slice().reverse().map((x) => ({ ...x, photo: s.photo[x.id] })) }
  if (p === '/creator/search-place') return { results: [], error: 'busca_indisponivel' } // sem servidor, a busca de endereços não existe nesta demonstração
  if (p === '/creator/posts') {
    const posts = Array.isArray(body.posts) ? body.posts : []
    if (!posts.length || posts.length > 30) throw err('posts_1_a_30')
    let created = 0
    posts.forEach((post) => {
      const text = String(post.caption || '').slice(0, 4000)
      const e = extract(text)
      const rows = e.name && e.units.length ? e.units : e.name ? [{ address: null }] : [{ address: e.units[0]?.address || null }]
      const url = String(post.url || '').slice(0, 300)
      for (const u of rows) {
        s.places.push(mk({ id: s.nextId++, name: e.name || null, address: u.address, category: e.category, postUrl: url || null, tiktokId: tiktokId(url), ad: !!e.ad, rec: e.rec, confidence: e.confidence, status: e.name ? 'pending' : 'unresolved', nameSrc: e.nameSource, snippet: text.replace(/\s+/g, ' ').trim().slice(0, 140) || null, postedOn: /^\d{4}-\d{2}-\d{2}$/.test(post.date || '') ? post.date : null }))
        created++
      }
    })
    return out({ created })
  }
  if (p === '/creator/places' && method === 'POST') {
    const name = String(body.name || '').trim().slice(0, 80); if (!name) throw err('nome')
    const found = body.lat !== null && body.lat !== '' && Number.isFinite(Number(body.lat)) && Number.isFinite(Number(body.lon))
    const pl = mk({ id: s.nextId++, name, address: body.address ? String(body.address).slice(0, 200) : null, municipality: body.municipality || null, neighborhood: body.neighborhood || null, lat: found ? Number(body.lat) : null, lon: found ? Number(body.lon) : null, geoStatus: found ? 'found' : 'none', geoQuality: found ? 'street_approx' : null, category: body.category || 'rest', postUrl: body.postUrl || null, status: found ? 'confirmed' : 'pending', confidence: 'high', nameSrc: 'manual' })
    s.places.push(pl); return out({ place: pl })
  }
  if (p === '/creator/places/confirm-high') { let n = 0; s.places.forEach((x) => { if (x.status === 'pending' && x.confidence === 'high' && x.geoStatus === 'found' && x.geoQuality === 'address_exact') { x.status = 'confirmed'; n++ } }); return out({ confirmed: n }) }
  if (p === '/creator/places/merge') { const a = find(body.keep), b = find(body.drop); if (a.id === b.id) throw err('dados'); a.postUrl = a.postUrl || b.postUrl; b.status = 'removed'; return out({ ok: true }) }
  if (p === '/creator/places/keep-separate') { (body.ids || []).forEach((id) => { const x = s.places.find((v) => v.id === Number(id)); if (x) x.dupOk = true }); return out({ ok: true }) }
  if ((m = p.match(/^\/creator\/places\/(\d+)\/photo$/))) {
    const x = find(m[1])
    if (method === 'DELETE') { delete s.photo[x.id]; return out({ ok: true }) }
    if (method === 'PUT') {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(body.mime)) throw err('formato')
      if (String(body.data || '').length > 540 * 1024) throw err('tamanho')
      s.photo[x.id] = `data:${body.mime};base64,${body.data}`
      return out({ ok: true, photo: s.photo[x.id] })
    }
  }
  if ((m = p.match(/^\/creator\/places\/(\d+)$/)) && method === 'PATCH') {
    const x = find(m[1])
    const name = 'name' in body ? String(body.name || '').slice(0, 80) : x.name
    let status = ['confirmed', 'pending', 'removed'].includes(body.status) ? body.status : x.status
    if (x.status === 'unresolved' && name && !('status' in body)) status = 'pending'
    if (status === 'confirmed' && !name) status = x.status
    if ('name' in body && name !== x.name) x.nameSrc = 'manual'
    if ('address' in body && body.address !== x.address) { x.lat = null; x.lon = null; x.geoStatus = 'none'; x.geoQuality = null }
    const gUrl = 'googleUrl' in body ? cleanGoogleUrl(body.googleUrl) : (x.googleUrl ?? null), iUrl = 'instagramUrl' in body ? cleanInstagramUrl(body.instagramUrl) : (x.instagramUrl ?? null)
    if (gUrl === undefined) throw err('google_invalido')
    if (iUrl === undefined) throw err('instagram_invalido')
    x.googleUrl = gUrl; x.instagramUrl = iUrl
    if ('couponCode' in body) x.couponCode = String(body.couponCode || '').trim().slice(0, 30) || null
    if ('couponNote' in body) x.couponNote = String(body.couponNote || '').trim().slice(0, 140) || null
    Object.assign(x, { name, status }, 'address' in body ? { address: String(body.address || '').slice(0, 200) || null } : {}, 'category' in body ? { category: body.category } : {}, 'note' in body ? { note: String(body.note || '').slice(0, 200) } : {}, 'ad' in body ? { ad: !!body.ad } : {}, 'postUrl' in body ? { postUrl: String(body.postUrl || '').slice(0, 300) || null } : {})
    return out({ place: x })
  }

  // estúdio
  if (p === '/creator/theme') { const t = sanitizeTheme(body); const bad = accentProblem(t); if (bad) throw err(bad); cr.theme = t; return out({ theme: cr.theme }) }
  if (p === '/creator/links') { cr.links = (Array.isArray(body.links) ? body.links : []).slice(0, 8).map((l) => ({ title: String(l.title || '').slice(0, 40), url: String(l.url || '').slice(0, 300), on: l.on !== false })).filter((l) => l.title && /^https?:\/\//i.test(l.url)); return out({ links: cr.links }) }
  // o endereço do mapa de demonstração é fixo: o endereço público é o único que existe nesta versão
  if (p === '/creator/slug-available') return { available: String(q.get('slug') || '').toLowerCase() === cr.slug, reason: String(q.get('slug') || '').toLowerCase() === cr.slug ? null : 'em_uso' }
  if (p === '/creator/slug') throw err('estatico', 503)
  if (p === '/creator/symbols' && method === 'GET') return { symbols: cr.symbols }
  if (p === '/creator/symbols' && method === 'POST') {
    if (cr.symbols.length >= 20) throw err('limite_20')
    try { const v = sanitizeSvg(body.svg); const id = s.nextId++; cr.symbols.push({ id, name: String(body.name || 'Símbolo').slice(0, 30), d: v.d, vb: v.vb, mode: v.mode, status: 'pending' }); return out({ id, status: 'pending' }) } catch (e) { throw err(e.message) }
  }
  if ((m = p.match(/^\/creator\/symbols\/(\d+)$/)) && method === 'DELETE') { cr.symbols = cr.symbols.filter((v) => v.id !== Number(m[1])); return out({ ok: true }) }
  if (p === '/creator/cover') throw err('estatico', 503)
  if (p === '/creator/routes' && method === 'GET') return { routes: s.routes }
  if (p === '/creator/routes' && method === 'PUT') {
    const own = new Set(s.places.map((v) => v.id))
    s.routes = (Array.isArray(body.routes) ? body.routes : []).slice(0, 12).map((r, i) => { const stops = cleanStops(r.stops, own); const ids = stops.length ? [...new Set(stops.map((v) => v.placeId).filter(Boolean))] : (r.placeIds || []).map(Number).filter((n) => own.has(n)).slice(0, 30); return { id: r.id || s.nextId++ + i, name: String(r.name || '').trim().slice(0, 40), note: String(r.note || '').slice(0, 60), color: /^#[0-9a-fA-F]{6}$/.test(r.color || '') ? r.color : null, placeIds: ids, stops } }).filter((r) => r.name)
    return out({ ok: true })
  }
  if (p === '/creator/domain') throw err('estatico', 503)
  if (p === '/creator/domain/check') throw err('sem_dominio')
  if (p === '/creator/stats') return stats(s, q.get('days') === '7' ? 7 : 30)

  // o mesmo mapa público do site, mas refletindo o que a pessoa mudou aqui
  if (p === `/public/${DEMO_SLUG}`) {
    const live = s.places.filter((x) => x.status === 'confirmed' && x.geoStatus === 'found' && x.lat != null && !x.hidden)
    const ids = new Set(live.map((x) => x.id))
    return {
      creator: { handle: cr.handle, tiktok: null, slug: cr.slug, displayName: cr.displayName, theme: cr.theme, showBrand: !cr.plan.can.removeBrand, links: [], cover: false, symbols: Object.fromEntries(cr.symbols.filter((v) => v.status === 'approved').map((v) => [v.id, { d: v.d, vb: v.vb, mode: v.mode }])), demo: true },
      places: live.map((x) => ({ ...pub(x), photo: s.photo[x.id] })), routes: s.routes.map((r) => ({ ...r, placeIds: r.placeIds.filter((i) => ids.has(i)), stops: (r.stops || []).map((v) => ({ ...v, placeId: ids.has(v.placeId) ? v.placeId : null })).filter((v) => v.placeId || v.title || v.text) })).filter((r) => r.placeIds.length || r.stops.length),
    }
  }
  return null // não é do painel: quem chamou segue o caminho padrão
}

// exportação dos dados da demonstração (mesmo conteúdo que o servidor entregaria), gerada no navegador
export async function demoExport(format) {
  const s = await S()
  const places = s.places.filter((x) => x.status !== 'removed')
  let text, type, name
  if (format === 'csv') {
    const cols = ['name', 'address', 'municipality', 'neighborhood', 'lat', 'lon', 'category', 'postUrl', 'postedOn', 'ad', 'status']
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    text = [cols.join(','), ...places.map((x) => cols.map((k) => esc(x[k])).join(','))].join('\n'); type = 'text/csv;charset=utf-8'; name = 'meus-lugares.csv'
  } else {
    text = JSON.stringify({ exportedAt: new Date().toISOString(), demonstracao: true, creator: s.creator, places, routes: s.routes, consentHistory: s.consentLog }, null, 2); type = 'application/json;charset=utf-8'; name = 'meus-dados.json'
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); a.remove()
}

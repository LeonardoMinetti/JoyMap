import { BASE, STATIC, withBase, stripBase } from './lib/base.js'
import { demoCreatorApi, demoOn, demoEnter, isCreatorPath } from './lib/demoCreator.js'

// Versão estática (GitHub Pages): sem servidor. Só o mapa de demonstração existe, lido de um JSON gerado no build.
const NO_SERVER = () => Object.assign(new Error('Disponível apenas na versão com servidor'), { status: 503, data: { error: 'estatico' } })
async function staticApi(path, opts) {
  // painel do criador de demonstração (fictício, só no navegador): ver lib/demoCreator.js
  if (path === '/auth/demo' || path === '/auth/logout') return demoCreatorApi(path, opts)
  if (path === '/me' && !demoOn() && isCreatorPath(stripBase(location.pathname))) demoEnter()
  if (demoOn()) { const r = await demoCreatorApi(path, opts); if (r) return r }
  if (path === '/me') return { user: null, creator: null, claims: [], notices: [] }
  if (path === '/public/demo') { const r = await fetch(`${BASE}/demo.json`); if (!r.ok) throw NO_SERVER(); const d = await r.json(); return { ...d, places: d.places.map((p) => (p.photo ? { ...p, photo: withBase(p.photo) } : p)) } }
  throw NO_SERVER()
}

export async function api(path, { method = 'GET', body } = {}) {
  if (STATIC) return staticApi(path, { method, body })
  const res = await fetch(`/api${path}`, {
    method, credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status, data })
  return data
}

// Eventos de uso do mapa público (primeira parte, sem IP, sem identificar pessoas).
let sid
let ctx
function context(slug) {
  if (ctx) return ctx
  let ret = false
  try {
    const k = `wagli_seen_${slug}`
    ret = !!localStorage.getItem(k)
    localStorage.setItem(k, '1')
  } catch { /* sem armazenamento: conta como visita nova */ }
  const r = document.referrer ? new URL(document.referrer).hostname : ''
  const ref = !r ? 'direto' : /instagram\.com$|l\.instagram\.com$/.test(r) ? 'instagram' : /tiktok\.com$/.test(r) ? 'tiktok' : r === location.hostname ? 'direto' : 'outros'
  ctx = { dev: innerWidth <= 700 ? 'm' : 'd', ref, ret }
  return ctx
}
export function track(slug, type, extra = {}) {
  try {
    sid = sid || sessionStorage.getItem('sid') || Math.random().toString(36).slice(2, 14)
    sessionStorage.setItem('sid', sid)
  } catch { sid = sid || Math.random().toString(36).slice(2, 14) }
  if (STATIC) return // sem servidor: nenhum evento é enviado
  const meta = type === 'session' ? context(slug) : {}
  fetch('/api/e', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, type, sid, ...meta, ...extra }), keepalive: true }).catch(() => {})
}

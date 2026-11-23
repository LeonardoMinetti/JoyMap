// Admin de demonstração (versão estática / GitHub Pages): sem servidor, sem dados reais.
// Tudo aqui é fictício e fica só na aba do navegador (sessionStorage); fechar a aba volta ao início.
const KEY = 'wagli_admin_demo_v1'
const SLA_DAYS = 5

const seed = () => ({
  minFollowers: 10000,
  creators: [
    { id: 1, handle: 'biaecaio', tiktok: 'biaecaio', email: 'contato@exemplo.test', followers: 48200, verified: true, status: 'pending' },
    { id: 2, handle: 'duda.e.lu', tiktok: '', email: 'duda@exemplo.test', followers: 15400, verified: false, status: 'pending' },
    { id: 3, handle: 'rafaamesa', tiktok: 'rafaamesa', email: 'rafa@exemplo.test', followers: 7300, verified: true, status: 'pending' },
    { id: 4, handle: 'perfil.sem.numero', tiktok: '', email: 'novo@exemplo.test', followers: 0, verified: false, status: 'pending' },
    { id: 5, handle: 'comerbem.sp', tiktok: '', email: 'comerbem@exemplo.test', followers: 92000, verified: true, status: 'approved' },
  ],
  places: [
    { id: 1, creatorId: 5, handle: 'comerbem.sp', name: 'Padaria da Esquina', address: 'Rua Augusta, 1200', municipality: 'São Paulo', lat: -23.5568, lon: -46.6606, issue: 'Endereço aproximado', status: 'pending', reviewed: false },
    { id: 2, creatorId: 5, handle: 'comerbem.sp', name: 'Cantina Nona', address: 'Bela Vista', municipality: 'São Paulo', lat: -23.5617, lon: -46.6479, issue: 'Localização por área', status: 'pending', reviewed: false },
    { id: 3, creatorId: 5, handle: 'comerbem.sp', name: 'Bar do Zé', address: 'Rua dos Pinheiros, 700', municipality: 'Osasco', lat: -23.5329, lon: -46.7917, issue: 'Município diverge', status: 'pending', reviewed: false },
    { id: 4, creatorId: 5, handle: 'comerbem.sp', name: 'Sorveteria Polar', address: '', municipality: '', lat: null, lon: null, issue: 'Endereço não encontrado', status: 'pending', reviewed: false },
    { id: 5, creatorId: 5, handle: 'comerbem.sp', name: 'Café Pequeno', address: 'Rua Oscar Freire, 50', municipality: 'São Paulo', lat: -23.5622, lon: -46.6712, issue: 'Confiança baixa', status: 'confirmed', reviewed: false },
  ],
  reports: [
    { ids: [1], placeName: 'Padaria da Esquina', placeId: 1, handle: 'comerbem.sp', creatorId: 5, reason: 'Endereço incorreto', details: ['A padaria fechou e agora é outra loja.'], count: 1, daysAgo: 1, status: 'open' },
    { ids: [2, 3], placeName: 'Bar do Zé', placeId: 3, handle: 'comerbem.sp', creatorId: 5, reason: 'Estabelecimento fechado', details: ['Fechou em setembro.', 'Está fechado há meses.'], count: 2, daysAgo: 3, status: 'open' },
    { ids: [4], placeName: null, placeId: null, handle: 'comerbem.sp', creatorId: 5, reason: 'Conteúdo inadequado', details: [], count: 1, daysAgo: 5, status: 'open' },
    { ids: [5], placeName: 'Cantina Nona', placeId: 2, handle: 'comerbem.sp', creatorId: 5, reason: 'Dado do lugar desatualizado', details: ['O horário mudou.'], count: 1, daysAgo: 2, status: 'review' },
  ],
  symbols: [{ id: 1, name: 'Pastel em chamas', handle: 'comerbem.sp', d: 'M12 2c3 4 6 6 6 10a6 6 0 0 1-12 0c0-4 3-6 6-10z', vb: '0 0 24 24', mode: 'fill', status: 'pending' }],
  claims: [
    { id: 1, place_name: 'Cantina Nona', email: 'dono@cantinanona.example', method: 'email', contact: '(11) 5555-0100', status: 'pending' },
    { id: 2, place_name: 'Sorveteria Polar', email: 'maria@exemplo.test', method: 'manual', contact: '(11) 5555-0199', status: 'pending' },
  ],
})

let mem
function load() {
  if (mem) return mem
  try { const r = sessionStorage.getItem(KEY); if (r) return (mem = JSON.parse(r)) } catch { /* sem armazenamento */ }
  return (mem = seed())
}
function save() { try { sessionStorage.setItem(KEY, JSON.stringify(mem)) } catch { /* ok */ } }
const err = (m, status = 400) => Object.assign(new Error(m), { status, data: { error: m } })

export const ADMIN_ME = { user: { id: 0, email: 'equipe@exemplo.test', role: 'admin' }, creator: null, claims: [], notices: [] }

export function demoAdminApi(path, { method = 'GET', body } = {}) {
  const s = load()
  const [p, qs = ''] = path.split('?')
  const q = new URLSearchParams(qs)
  const out = (v) => { save(); return v }
  let m

  if (p === '/admin/creators' && method === 'GET') {
    return {
      minFollowers: s.minFollowers,
      creators: [...s.creators].reverse().map((c) => ({
        ...c, published: c.status === 'approved', createdAt: '2026-11-10', decidedAt: null,
        criterion: c.followers > 0 ? (c.followers >= s.minFollowers ? 'met' : 'below') : 'unknown',
        places: c.id === 5 ? s.places.length : 0,
      })),
    }
  }
  if (p === '/admin/config' && method === 'PUT') { s.minFollowers = Math.max(0, parseInt(body?.minFollowers, 10) || 0); return out({ minFollowers: s.minFollowers }) }
  if ((m = p.match(/^\/admin\/creators\/(\d+)\/decision$/))) {
    const c = s.creators.find((x) => x.id === Number(m[1])); if (!c) throw err('nao_encontrado', 404)
    const followers = 'followers' in body ? Math.max(0, parseInt(body.followers, 10) || 0) : c.followers
    if (body.status === 'approved' && followers < s.minFollowers && !body.force) throw err('abaixo_do_criterio', 409)
    c.followers = followers
    if ('verified' in body) c.verified = !!body.verified
    c.status = body.status
    return out({ ok: true })
  }
  if (p === '/admin/review') {
    const only = Number(q.get('creator')) || null
    const ap = s.creators.filter((c) => c.status === 'approved')
    const open = s.places.filter((x) => !x.reviewed)
    return {
      queue: ap.map((c) => ({ id: c.id, handle: c.handle, places: s.places.filter((x) => x.creatorId === c.id).length, pending: s.places.filter((x) => x.creatorId === c.id && x.status === 'pending').length })),
      low: open.filter((x) => !only || x.creatorId === only).map(({ reviewed, ...x }) => x),
      metrics: { places: s.places.length, reviewPct: 60, unresolvedPct: 20 },
    }
  }
  if ((m = p.match(/^\/admin\/places\/(\d+)$/))) {
    const x = s.places.find((v) => v.id === Number(m[1])); if (!x) throw err('nao_encontrado', 404)
    if ('name' in body) x.name = String(body.name).slice(0, 80)
    if ('address' in body) { x.address = String(body.address).slice(0, 200); x.issue = 'Endereço corrigido'; x.reviewed = true }
    if ('reviewed' in body) x.reviewed = !!body.reviewed
    return out({ ok: true })
  }
  if (p === '/admin/reports' && method === 'GET') {
    const st = ['open', 'review', 'resolved'].includes(q.get('status')) ? q.get('status') : 'open'
    const counts = Object.fromEntries(['open', 'review', 'resolved'].map((k) => [k, s.reports.filter((r) => r.status === k).length]))
    const groups = s.reports.filter((r) => r.status === st).map((r) => ({ ...r, daysLeft: Math.max(0, SLA_DAYS - r.daysAgo) }))
    return { status: st, counts, groups, slaDays: SLA_DAYS }
  }
  if (p === '/admin/reports/act') {
    const r = s.reports.find((v) => v.ids[0] === body.ids?.[0]); if (!r) throw err('nao_encontrado', 404)
    if (['review', 'correct', 'notify'].includes(body.action)) r.status = 'review'
    else if (['archive', 'hide_place', 'pause_map'].includes(body.action)) r.status = 'resolved'
    else throw err('acao')
    return out({ ok: true })
  }
  if (p === '/admin/symbols' && method === 'GET') return { symbols: s.symbols.filter((x) => x.status === 'pending') }
  if ((m = p.match(/^\/admin\/symbols\/(\d+)$/))) { const x = s.symbols.find((v) => v.id === Number(m[1])); if (x) x.status = body.status; return out({ ok: true }) }
  if (p === '/admin/claims' && method === 'GET') return { claims: s.claims }
  if ((m = p.match(/^\/admin\/claims\/(\d+)$/))) { const x = s.claims.find((v) => v.id === Number(m[1])); if (x) x.status = body.status; return out({ ok: true }) }
  if (p === '/admin/metrics') {
    const ap = s.creators.filter((c) => c.status === 'approved').length
    return { funnel: [['Candidaturas', s.creators.length], ['Aprovados', ap], ['Contas conectadas', ap], ['Mapas publicados', ap], ['Pagantes', 0]], studio: { changedVisual: 60, customSymbol: 20, customDomain: 0, network: 40 }, billing: { active: false } }
  }
  throw err('nao_encontrado', 404)
}

export const resetAdminDemo = () => { mem = null; try { sessionStorage.removeItem(KEY) } catch { /* ok */ } }

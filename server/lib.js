import { planView, can } from './plans.js'
import { getCookie } from 'hono/cookie'
import { createHash } from 'node:crypto'
import { normalizeAddress, strip } from './extract.js'
import { sanitizeTheme, freeTheme } from './theme.js'

export const TERMS_VERSION = '0.1'
export const sha = (s) => createHash('sha256').update(s).digest('hex')
export const j = (s, fb) => { try { return JSON.parse(s) } catch { return fb } }
export const RESERVED = new Set(['demo', 'admin', 'api', 'painel', 'entrar', 'candidatura', 'assets', 'termos', 'privacidade', 'mapa', 'app', 'www', 'planos', 'exemplos', 'perguntas', 'indisponivel', 'conectar', 'consentimentos', 'plano', 'pagamento', 'boas-vindas', 'montando', 'previa', 'revisar', 'adicionar', 'sem-lugar', 'unidades', 'publicar', 'publicado', 'colar-posts', 'estudio', 'rede', 'restaurantes', 'restaurante', 'aguardando'])

// Chave estável de um lugar entre criadores: endereço normalizado (ou nome, sem endereço).
export function placeKey(p) {
  const a = p.address ? normalizeAddress(p.address) : ''
  return a || strip(String(p.name || '')).toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export function makeCtx(db, opts = {}) {
  const cfg = {
    minFollowers: Number(opts.minFollowers ?? process.env.MIN_FOLLOWERS ?? 10000),
    adminEmail: (opts.adminEmail ?? process.env.ADMIN_EMAIL ?? '').toLowerCase(),
    dev: opts.dev ?? process.env.NODE_ENV !== 'production',
    baseUrl: opts.baseUrl ?? process.env.BASE_URL ?? 'http://localhost:4300',
    fetchImpl: opts.fetchImpl ?? fetch,
    geocode: opts.geocode ?? true,
    resolveCname: opts.resolveCname ?? (async (host) => (await import('node:dns/promises')).resolveCname(host)),
    metaConfigured: !!(process.env.META_APP_ID && process.env.META_APP_SECRET),
    tiktokConfigured: !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET),
  }
  const getSetting = (key, fb = null) => { const r = db.prepare('SELECT value FROM settings WHERE key=?').get(key); return r ? r.value : fb }
  const setSetting = (key, value) => db.prepare('INSERT INTO settings(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, String(value))
  const minFollowers = () => Number(getSetting('minFollowers', cfg.minFollowers))

  const user = (c) => {
    const sid = getCookie(c, 'sid')
    if (!sid) return null
    return db.prepare('SELECT u.id, u.email, u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires_at>?').get(sha(sid), Date.now()) || null
  }
  const creatorOf = (uid) => db.prepare('SELECT * FROM creators WHERE user_id=?').get(uid)

  const links = (cr) => j(cr.links, []).map((l) => ({ title: l.title, url: l.url, on: l.on !== false }))
  const symbolMap = (creatorId, onlyApproved) => {
    const rows = db.prepare(`SELECT id, name, d, vb, mode, status FROM symbols WHERE creator_id=?${onlyApproved ? " AND status='approved'" : ''} ORDER BY id`).all(creatorId)
    return rows
  }
  const view = (cr) => {
    if (!cr) return null
    const s = j(cr.settings, {})
    const hasCover = !!db.prepare('SELECT 1 FROM media WHERE creator_id=?').get(cr.id)
    let theme = sanitizeTheme(j(cr.theme, {}))
    if (!can(cr.plan_tier, 'studioFull')) theme = freeTheme(theme)
    theme.layout.cover = theme.layout.cover && hasCover
    return {
      id: cr.id, handle: cr.handle, tiktok: cr.tiktok, slug: cr.slug, displayName: cr.display_name, followers: cr.followers, status: cr.status, verified: !!cr.verified,
      published: !!cr.published, onboarding: cr.onboarding, accounts: { instagram: cr.instagram_state, tiktok: cr.tiktok_state },
      plan: { name: 'trial', billing: cr.billing, trialEnds: cr.trial_ends, ...planView(cr.plan_tier) },
      theme,
      links: links(cr), consents: j(cr.consents, {}),
      settings: { autoConfirmHigh: !!s.autoConfirmHigh, bioLinkIg: !!s.bioLinkIg, bioLinkTiktok: !!s.bioLinkTiktok, paused: !!s.paused, adminPaused: !!s.adminPaused },
      domain: { name: cr.domain, status: cr.domain_status },
      hasCover,
      symbols: symbolMap(cr.id, false),
      meta: { instagramReady: cfg.metaConfigured, tiktokReady: cfg.tiktokConfigured },
    }
  }
  const auth = async (c, next) => { const u = user(c); if (!u) return c.json({ error: 'auth' }, 401); c.set('u', u); await next() }
  const approved = async (c, next) => {
    const cr = creatorOf(c.get('u').id)
    if (!cr) return c.json({ error: 'no_creator' }, 403)
    if (cr.status !== 'approved') return c.json({ error: 'not_approved', status: cr.status }, 403)
    c.set('cr', cr); await next()
  }
  const admin = async (c, next) => { if (c.get('u').role !== 'admin') return c.json({ error: 'forbidden' }, 403); await next() }
  const placeOut = (p) => ({
    id: p.id, name: p.name, address: p.address, municipality: p.municipality, neighborhood: p.neighborhood, lat: p.lat, lon: p.lon, geoStatus: p.geo_status, geoQuality: p.geo_quality,
    category: p.category, postUrl: p.post_url, postedOn: p.posted_on, ad: !!p.ad, rec: p.rec, confidence: p.confidence, note: p.note, status: p.status,
    nameSrc: p.name_src, snippet: p.snippet, dupOk: !!p.dup_ok, hidden: !!p.hidden, reviewed: !!p.reviewed, tiktokId: p.post_id,
    couponCode: p.coupon_code || null, couponNote: p.coupon_note || null, googleUrl: p.google_url || null, instagramUrl: p.instagram_url || null, hours: j(p.hours, null), photo: p.photo_v ? `/api/creator/places/${p.id}/photo?v=${p.photo_v}` : null,
  })
  const notice = (creatorId, text) => db.prepare('INSERT INTO notices(creator_id,text) VALUES (?,?)').run(creatorId, text)
  const logConsent = (creatorId, key, value) => db.prepare('INSERT INTO consent_log(creator_id,key,value,terms_version) VALUES (?,?,?,?)').run(creatorId, key, value ? 1 : 0, TERMS_VERSION)

  async function sendMail(to, subject, text) {
    if (!(process.env.RESEND_API_KEY && !cfg.dev)) return false
    await cfg.fetchImpl('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to, subject, text }),
    })
    return true
  }
  return { db, cfg, getSetting, setSetting, minFollowers, user, creatorOf, view, auth, approved, admin, placeOut, notice, logConsent, sendMail, symbolMap }
}

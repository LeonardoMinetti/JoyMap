// Roteiro à venda e produtos do roteiro. Puro: o servidor e a demonstração usam as mesmas regras.
import { can, CAPS, tierOf } from './plans.js'

export const PREVIEW_STOPS = 2 // paradas que qualquer seguidor vê antes de comprar
export const PRICE_MIN = 5
export const PRICE_MAX = 500
export const MAX_PRODUCTS = 6

// vídeo ou postagem que explica o roteiro: só links de Instagram, TikTok ou YouTube
export const cleanVideoUrl = (v) => {
  try {
    const u = new URL(String(v || '').trim())
    return u.protocol === 'https:' && /(^|\.)(instagram\.com|tiktok\.com|youtube\.com|youtu\.be)$/.test(u.hostname) ? u.href.slice(0, 300) : null
  } catch { return null }
}
export const cleanPrice = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= PRICE_MIN && n <= PRICE_MAX ? n : null }

const txt = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
// Foto do produto: obrigatória (sem foto ninguém compra). Imagem reduzida enviada como data URI, ou uma foto do próprio site (/photos/...).
const IMG = /^(data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}|\/photos\/[a-z0-9-]{1,40}\.jpg)$/
export const cleanImage = (v, max = 120000) => (typeof v === 'string' && v.length <= max && IMG.test(v) ? v : null)
export function cleanProducts(input) {
  const out = []
  for (const p of (Array.isArray(input) ? input : []).slice(0, MAX_PRODUCTS)) {
    const title = txt(p?.title, 60)
    const image = cleanImage(p?.image)
    let url = ''
    try { const u = new URL(String(p?.url || '').trim()); if (u.protocol === 'https:' || u.protocol === 'http:') url = u.href.slice(0, 300) } catch { /* link inválido */ }
    if (title && url && image) out.push({ title, url, image, price: txt(p?.price, 20) })
  }
  return out
}

// Roteiro patrocinado (Pro): marca parceira com nome e logo em SVG de fundo transparente (obrigatórios).
// O SVG é mostrado só dentro de <img> (sem scripts), e mesmo assim removemos tudo que possa executar ou buscar algo de fora.
const SVG_PREFIX = 'data:image/svg+xml;base64,'
const b64enc = (t) => { const bytes = new TextEncoder().encode(t); let bin = ''; for (const b of bytes) bin += String.fromCharCode(b); return btoa(bin) }
const b64dec = (x) => new TextDecoder().decode(Uint8Array.from(atob(x), (c) => c.charCodeAt(0)))
export function cleanLogoSvg(src) {
  const t = String(src || '').trim()
  if (t.length > 60000 || !/<svg[\s>]/i.test(t)) return null
  if (/<\s*(script|foreignObject|image|iframe|object|embed|audio|video|animate|set)\b|\son\w+\s*=|javascript:|<!ENTITY|<!DOCTYPE|@import|url\(\s*['"]?\s*(https?:|\/\/|data:)|(xlink:)?href\s*=\s*['"]\s*(?!#)/i.test(t)) return null
  return /xmlns\s*=/.test(t) ? t : t.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"')
}
export const logoUriFromSvg = (text) => { const c = cleanLogoSvg(text); if (!c) throw new Error('svg_invalido'); return SVG_PREFIX + b64enc(c) }
export function cleanLogo(v) {
  if (typeof v !== 'string' || !v.startsWith(SVG_PREFIX) || v.length > 90000) return null
  try { const c = cleanLogoSvg(b64dec(v.slice(SVG_PREFIX.length))); return c ? SVG_PREFIX + b64enc(c) : null } catch { return null }
}
export function cleanSponsor(v) {
  const brand = txt(v?.brand, 40)
  const logo = cleanLogo(v?.logo)
  return brand && logo ? { brand, logo } : null // sem nome e logo da marca o patrocínio não vai ao ar
}

// o que o plano permite: sem permissão, preço e produtos simplesmente não valem
export const cleanOffer = (r, tier) => ({
  price: can(tier, 'sellRoteiros') ? cleanPrice(r?.price) : null,
  products: can(tier, 'products') ? cleanProducts(r?.products) : [],
  sponsor: can(tier, 'sponsoredRoteiros') ? cleanSponsor(r?.sponsor) : null,
})

// quanto fica para o criador depois da taxa do plano
export const netOf = (price, tier) => { const fee = CAPS[tierOf(tier)].roteiroFee; return fee == null ? null : Math.round(price * (100 - fee)) / 100 }

// Roteiro pago, visto por quem ainda não comprou: só as primeiras paradas saem do servidor.
export function lockRoute(route, unlocked) {
  if (!route.price || unlocked) return route
  const all = route.stops?.length ? route.stops : route.placeIds.map((placeId) => ({ placeId }))
  const keep = all.slice(0, PREVIEW_STOPS)
  return { ...route, video: null, locked: true, stopCount: all.length, stops: keep, placeIds: [...new Set(keep.map((s) => s.placeId).filter(Boolean))] }
}

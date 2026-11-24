// Roteiro à venda e produtos do roteiro. Puro: o servidor e a demonstração usam as mesmas regras.
import { can, CAPS, tierOf } from './plans.js'

export const PREVIEW_STOPS = 2 // paradas que qualquer seguidor vê antes de comprar
export const PRICE_MIN = 5
export const PRICE_MAX = 500
export const MAX_PRODUCTS = 6

export const cleanPrice = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= PRICE_MIN && n <= PRICE_MAX ? n : null }

const txt = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
export function cleanProducts(input) {
  const out = []
  for (const p of (Array.isArray(input) ? input : []).slice(0, MAX_PRODUCTS)) {
    const title = txt(p?.title, 60)
    let url = ''
    try { const u = new URL(String(p?.url || '').trim()); if (u.protocol === 'https:' || u.protocol === 'http:') url = u.href.slice(0, 300) } catch { /* link inválido */ }
    if (title && url) out.push({ title, url, price: txt(p?.price, 20) })
  }
  return out
}

// Roteiro patrocinado (Pro): marca parceira com nome e, se quiser, logo (imagem pequena, enviada como data URI). Sempre identificado como patrocinado.
const LOGO = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/
export function cleanSponsor(v) {
  const brand = txt(v?.brand, 40)
  if (!brand) return null
  const logo = typeof v?.logo === 'string' && v.logo.length <= 60000 && LOGO.test(v.logo) ? v.logo : null
  return { brand, logo }
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
  return { ...route, locked: true, stopCount: all.length, stops: keep, placeIds: [...new Set(keep.map((s) => s.placeId).filter(Boolean))] }
}

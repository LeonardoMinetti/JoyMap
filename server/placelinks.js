// Links de cada lugar: página do comércio no Google Maps e Instagram do local. Só aceitamos endereços dessas plataformas.
const s0 = (v) => String(v ?? '').trim()

// Devolve a URL limpa, null se vazio, undefined se não for um link do Google Maps.
export function cleanGoogleUrl(v) {
  const s = s0(v)
  if (!s) return null
  let u
  try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`) } catch { return undefined }
  const h = u.hostname.toLowerCase().replace(/^www\./, '')
  const ok = u.protocol === 'https:' && (h === 'maps.app.goo.gl' || h === 'g.page' || (h === 'goo.gl' && u.pathname.startsWith('/maps')) || /^maps\.google\.[a-z.]+$/.test(h) || (/^google\.[a-z.]+$/.test(h) && u.pathname.startsWith('/maps')))
  return ok && u.href.length <= 300 ? u.href : undefined
}

// Aceita "@perfil", "perfil" ou a URL do perfil. Posts, reels e stories não valem. Devolve null se vazio, undefined se inválido.
export function cleanInstagramUrl(v) {
  let s = s0(v)
  if (!s) return null
  s = s.replace(/^@/, '')
  if (/instagram\.com/i.test(s)) {
    let u
    try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`) } catch { return undefined }
    if (!/^(www\.)?instagram\.com$/i.test(u.hostname)) return undefined
    s = u.pathname.split('/').filter(Boolean)[0] || ''
    if (['p', 'reel', 'reels', 'stories', 'explore', 'tv'].includes(s.toLowerCase())) return undefined
  }
  return /^[A-Za-z0-9._]{1,30}$/.test(s) ? `https://www.instagram.com/${s}/` : undefined
}

// Sem link do Google informado, o seguidor ainda chega ao lugar: busca no Google Maps por nome e endereço (formato oficial de URL, sem chave).
export const googleSearchUrl = (p) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.name, p.address || p.neighborhood || p.municipality || 'São Paulo'].filter(Boolean).join(' '))}`

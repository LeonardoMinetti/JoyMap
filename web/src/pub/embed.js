// Player oficial de cada plataforma: o vídeo é transmitido por ela, nada é baixado nem guardado aqui.
export function embedOf(url) {
  let u
  try { u = new URL(url) } catch { return null }
  const host = u.hostname.replace(/^www\./, ''), path = u.pathname
  let m
  if (host === 'instagram.com' && (m = path.match(/\/(p|reel|reels)\/([\w-]{5,})/))) return { net: 'Instagram', src: `https://www.instagram.com/${m[1] === 'p' ? 'p' : 'reel'}/${m[2]}/embed/` }
  if (host === 'tiktok.com' && (m = path.match(/\/video\/(\d{5,})/))) return { net: 'TikTok', src: `https://www.tiktok.com/player/v1/${m[1]}?autoplay=1&music_info=1&description=1` }
  const yt = host === 'youtu.be' ? path.slice(1) : host === 'youtube.com' ? u.searchParams.get('v') || path.match(/^\/(?:shorts|embed)\/([\w-]+)/)?.[1] : null
  if (yt && /^[\w-]{6,}$/.test(yt)) return { net: 'YouTube', src: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&playsinline=1` }
  return null
}

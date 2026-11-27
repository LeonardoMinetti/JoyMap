// Nos mapas públicos, o ícone da aba é a foto de perfil do dono, recortada em círculo.
// Sem foto, fica o ícone do JoyMap; ao sair do mapa, ele volta.
import { useEffect } from 'react'

function round(img) {
  const c = document.createElement('canvas')
  c.width = c.height = 180
  const g = c.getContext('2d')
  g.beginPath(); g.arc(90, 90, 90, 0, Math.PI * 2); g.clip()
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  g.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 180, 180)
  return c.toDataURL('image/png')
}

export function useOwnerIcon(url) {
  useEffect(() => {
    if (!url) return
    const links = [...document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')]
    const before = links.map((l) => [l, l.getAttribute('href'), l.getAttribute('type')])
    const set = (href) => links.forEach((l) => { l.removeAttribute('type'); l.setAttribute('href', href) })
    let on = true
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => { if (!on) return; try { set(round(img)) } catch { set(url) } }
    img.onerror = () => { if (on) set(url) } // foto de outro domínio sem permissão de recorte: usa como está
    img.src = url
    return () => {
      on = false
      for (const [l, href, type] of before) { l.setAttribute('href', href); if (type) l.setAttribute('type', type) }
    }
  }, [url])
}

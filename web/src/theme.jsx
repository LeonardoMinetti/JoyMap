import React from 'react'

export const ICON_PATHS = {
  rest: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-3 5-3 8h3v10',
  cafe: 'M4 8h13v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8zM17 9h2a2 2 0 0 1 0 4h-2M7 3v2M11 3v2',
  bar: 'M4 4h16l-8 9-8-9zM12 13v7M8 20h8',
  bread: 'M5 10a4 4 0 0 1 0-6h14a4 4 0 0 1 0 6v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8z',
  cake: 'M4 20h16M5 20v-7h14v7M12 13V8M12 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  pizza: 'M12 3 3 19a14 14 0 0 0 18 0L12 3zM9 12h.01M14 14h.01M12 8h.01',
  fish: 'M3 12c3-5 8-6 12-3l6-2-1 5 1 5-6-2c-4 3-9 2-12-3zM16 11h.01',
  burger: 'M4 11a8 8 0 0 1 16 0H4zM3 15h18M5 15c0 3 1 4 3 4h8c2 0 3-1 3-4',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  flag: 'M5 21V4h12l-2 4 2 4H5',
  store: 'M4 9l1-5h14l1 5M4 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 4 0M5 12v8h14v-8',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  search: 'M21 21l-4.3-4.3M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z',
  share: 'M12 3v13M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5',
  route: 'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 17h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6',
  play: 'M8 5v14l11-7z',
  ext: 'M14 4h6v6M20 4 10 14M18 14v5H5V6h5',
  back: 'M15 18l-6-6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  check: 'M20 6 9 17l-5-5',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11zM12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  flagx: 'M12 4l9 16H3L12 4zM12 10v4M12 17h.01',
}

export function Icon({ n, s = 18, c = 'currentColor' }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', fill: 'none', stroke: c, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <path d={ICON_PATHS[n] || ICON_PATHS.pin} />
    </svg>
  )
}

export const FONTS = {
  sans: { label: 'Sem serifa', css: 'Archivo, Arial, sans-serif', title: '' },
  disp: { label: 'Condensada', css: '"Sofia Sans Condensed", "Arial Narrow", Arial, sans-serif', title: 'uppercase' },
  serif: { label: 'Com serifa', css: 'Georgia, "Times New Roman", serif', title: '' },
  mono: { label: 'Monoespaçada', css: '"Courier New", monospace', title: '' },
}
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas'
export const TONES = {
  light: { label: 'Claro', layer: 'World_Light_Gray_Base', tint: '#ffffff', filter: 'none' },
  dark: { label: 'Escuro', layer: 'World_Dark_Gray_Base', tint: '#ffffff', filter: 'none' },
  sepia: { label: 'Papel', layer: 'World_Light_Gray_Base', tint: '#f1e3c6', filter: 'sepia(.7) saturate(1.2) brightness(.98) contrast(1.1)' },
  mint: { label: 'Menta', layer: 'World_Light_Gray_Base', tint: '#cdeade', filter: 'sepia(1) hue-rotate(100deg) saturate(.7) brightness(.95) contrast(1.2)' },
  blue: { label: 'Maré', layer: 'World_Light_Gray_Base', tint: '#cfdcf7', filter: 'sepia(1) hue-rotate(185deg) saturate(.8) brightness(.95) contrast(1.2)' },
}
export const tileUrl = (tone) => `${ESRI}/${(TONES[tone] || TONES.light).layer}/MapServer/tile/{z}/{y}/{x}`
export const SHAPES = { drop: 'Gota', circle: 'Círculo', square: 'Quadrado', hex: 'Hexágono' }
export const ACCENTS = ['#ff4b2b', '#2d7ff9', '#12b76a', '#9b5cff', '#ff5c8a', '#171717', '#e03bb0', '#a16207']

export function pinHtml(color, shape, icon, selected) {
  const z = selected ? 40 : 30
  const base = `width:${z}px;height:${z}px;background:${color};display:grid;place-items:center;`
  const svg = `<svg width="${selected ? 20 : 15}" height="${selected ? 20 : 15}" viewBox="0 0 24 24" style="display:block;fill:none;stroke:#fff;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"><path d="${ICON_PATHS[icon] || ICON_PATHS.rest}"/></svg>`
  const ring = selected ? 'outline:3px solid #171717;outline-offset:2px;' : ''
  const sh = '0 2px 6px rgba(0,0,0,.3)'
  if (shape === 'drop') return `<div style="${base}margin:${-z - 4}px 0 0 ${-z / 2}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:${sh};${ring}"><span style="display:grid;transform:rotate(45deg)">${svg}</span></div>`
  if (shape === 'square') return `<div style="${base}margin:${-z / 2}px 0 0 ${-z / 2}px;border-radius:9px;border:3px solid #fff;box-shadow:${sh};${ring}">${svg}</div>`
  if (shape === 'hex') return `<div style="${base}margin:${-z / 2}px 0 0 ${-z / 2}px;clip-path:polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0 50%)">${svg}</div>`
  return `<div style="${base}margin:${-z / 2}px 0 0 ${-z / 2}px;border-radius:50%;border:3px solid #fff;box-shadow:${sh};${ring}">${svg}</div>`
}

export const catOf = (theme, id) => theme.categories.find((c) => c.id === id) || { id, name: 'Outros', color: theme.accent, icon: 'rest' }

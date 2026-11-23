import { ICON_PATHS } from './lib/icons.jsx'
import { isLib, libHtml, libIcon } from './iconlib.js'

export const FONTS = {
  sans: { label: 'Sem serifa', css: 'Archivo, Arial, sans-serif', upper: false, weight: 700, size: 16 },
  disp: { label: 'Condensada', css: '"Sofia Sans Condensed", "Arial Narrow", Arial, sans-serif', upper: true, weight: 700, size: 20 },
  serif: { label: 'Com serifa', css: 'Georgia, "Times New Roman", serif', upper: false, weight: 700, size: 17 },
  fraunces: { label: 'Editorial suave', css: 'Fraunces, Georgia, serif', upper: false, weight: 700, size: 18 },
  playfair: { label: 'Clássica', css: '"Playfair Display", Georgia, serif', upper: false, weight: 700, size: 18 },
  mono: { label: 'Monoespaçada', css: '"Courier New", monospace', upper: false, weight: 700, size: 15 },
}
// Cada tom é um estilo nativo do OpenFreeMap (ver basemap.js). `tint` = cor de fundo enquanto o mapa carrega.
export const TONES = {
  light: { label: 'Claro', tint: '#f3f3f1' },
  bright: { label: 'Vivo', tint: '#f6f1e6' },
  fiord: { label: 'Azul-noite', tint: '#4a5a7c' },
  dark: { label: 'Escuro', tint: '#161616' },
}
export const SHAPES = { drop: 'Gota', circle: 'Círculo', square: 'Quadrado', hex: 'Hexágono' }
export const ACCENTS = ['#ff4b2b', '#2d7ff9', '#12b76a', '#9b5cff', '#ff5c8a', '#171717']
export const CAT_COLORS = ['#e03bb0', '#ff5c8a', '#36c5a0', '#2aa6f5', '#ff8a3d']
export const RADIUS_MODES = { retos: { label: 'Retos', r: 4 }, suaves: { label: 'Suaves', r: 14 }, redondos: { label: 'Redondos', r: 24 } }
export const radiusMode = (r) => Object.entries(RADIUS_MODES).reduce((best, [k, v]) => (Math.abs(v.r - r) < Math.abs(RADIUS_MODES[best].r - r) ? k : best), 'suaves')
export const BUILTIN_ICONS = ['rest', 'cafe', 'bar', 'bread', 'cake', 'pizza', 'fish', 'burger', 'heart', 'star', 'flag', 'store', 'clock', 'spark']
export const SYMBOL_LIBRARY = [
  ['rest', 'Restaurante', 'Comida'], ['cafe', 'Café', 'Comida'], ['bar', 'Drinks', 'Bebidas'], ['bread', 'Padaria', 'Comida'], ['cake', 'Doces', 'Comida'], ['pizza', 'Pizza', 'Comida'],
  ['fish', 'Japonês', 'Comida'], ['burger', 'Hambúrguer', 'Comida'], ['heart', 'Favorito', 'Formas'], ['star', 'Destaque', 'Formas'], ['flag', 'Imperdível', 'Passeios'],
  ['store', 'Loja', 'Compras'], ['clock', 'Aberto tarde', 'Passeios'], ['spark', 'Novo', 'Formas'], ['image', 'Cenário', 'Viagem'],
]
export const PALETTES = {
  warm: { rest: '#ff4b2b', cafe: '#a16207', bar: '#7c3aed', bread: '#f59e0b', cake: '#ec4899', pizza: '#dc2626', tour: '#0e9f8e', ice: '#2aa6f5', burger: '#ea580c' },
  cool: { rest: '#2d7ff9', cafe: '#0e7490', bar: '#6d28d9', bread: '#0891b2', cake: '#db2777', pizza: '#4f46e5', tour: '#0f766e', ice: '#0284c7', burger: '#1d4ed8' },
  candy: { rest: '#ff5c8a', cafe: '#d98a00', bar: '#9b5cff', bread: '#ff8a3d', cake: '#e03bb0', pizza: '#16a085', tour: '#36c5a0', ice: '#2aa6f5', burger: '#ff6b6b' },
  mono: null,
}
export const TEMPLATES = [
  { id: 'solar', name: 'Solar', t: { accent: '#ff4b2b', bg: '#ffffff', fg: '#171717', tone: 'light', shape: 'drop', font: 'sans', radius: 14 }, pal: 'warm' },
  { id: 'noite', name: 'Noite', t: { accent: '#a78bfa', bg: '#343843', fg: '#f6f6f8', tone: 'fiord', shape: 'circle', font: 'disp', radius: 14 }, pal: 'candy' },
  { id: 'mare', name: 'Maré', t: { accent: '#2d7ff9', bg: '#f4f8ff', fg: '#171717', tone: 'bright', shape: 'hex', font: 'sans', radius: 14 }, pal: 'cool' },
  { id: 'doce', name: 'Doce', t: { accent: '#e03bb0', bg: '#fff5fb', fg: '#171717', tone: 'bright', shape: 'circle', font: 'disp', radius: 22 }, pal: 'candy' },
  { id: 'mono', name: 'Mono', t: { accent: '#171717', bg: '#ffffff', fg: '#171717', tone: 'light', shape: 'square', font: 'mono', radius: 2 }, pal: 'mono' },
]
export function applyTemplate(theme, tpl) {
  const p = PALETTES[tpl.pal]
  return { ...theme, ...tpl.t, categories: theme.categories.map((c) => ({ ...c, color: p ? p[c.id] || c.color : tpl.t.accent })) }
}

// ---------- contraste (WCAG) ----------
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
export const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255) }
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
export const onColor = (bg) => (contrast('#ffffff', bg) >= contrast('#171717', bg) ? '#ffffff' : '#171717')
export const onAccent = (theme) => (theme.contrastAuto ? onColor(theme.accent) : '#ffffff')

export const catOf = (theme, id) => theme.categories.find((c) => c.id === id) || { id, name: 'Outros', color: theme.accent, icon: 'rest' }
// símbolo da categoria: ícone do conjunto ou desenho próprio aprovado
export function symOf(cat, symbols) {
  if (isLib(cat.icon)) return { n: 'rest', sym: { lib: cat.icon } } // ícone das bibliotecas (3D, emoji, contorno)
  const m = /^custom:(\d+)$/.exec(cat.icon || '')
  if (!m) return { n: cat.icon in ICON_PATHS ? cat.icon : 'rest', sym: null }
  const list = Array.isArray(symbols) ? symbols : Object.entries(symbols || {}).map(([id, s]) => ({ id: Number(id), ...s }))
  const s = list.find((x) => x.id === Number(m[1]) && (!x.status || x.status === 'approved'))
  return s ? { n: 'rest', sym: s } : { n: 'rest', sym: null }
}

export function pinHtml({ color, shape, n, sym: sym0, selected, size = 55, border = true, selStyle = 'outline' }) {
  const base = Math.round(20 + size * 0.18) // 55% ≈ 30px
  const grow = selected && selStyle !== 'color'
  const z = grow ? base + 10 : base
  const bg0 = selected && selStyle === 'color' ? '#171717' : color
  const is = Math.round(z * 0.5)
  const lib = sym0 && sym0.lib ? libIcon(sym0.lib) : null
  const bg = lib && lib.color ? '#fff' : bg0 // emojis coloridos ficam sobre fundo branco, com a cor da categoria no contorno
  const sym = sym0 && sym0.d ? sym0 : null
  const fill = sym && sym.mode === 'fill'
  const svg = lib ? libHtml(lib, lib.color ? Math.round(z * 0.66) : is) : `<svg width="${is}" height="${is}" viewBox="${sym ? sym.vb : '0 0 24 24'}" style="display:block;fill:${fill ? '#fff' : 'none'};stroke:${fill ? 'none' : '#fff'};stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"><path d="${sym ? sym.d : ICON_PATHS[n] || ICON_PATHS.rest}"/></svg>`
  const ring = selected && selStyle === 'outline' ? 'outline:3px solid #171717;outline-offset:2px;' : ''
  const cls = selected && selStyle === 'pulse' ? ' pin-pulse' : ''
  const b = border ? `3px solid ${lib && lib.color ? bg0 : '#fff'}` : '0'
  const sh = '0 2px 6px rgba(0,0,0,.3)'
  const box = `width:${z}px;height:${z}px;background:${bg};display:grid;place-items:center;`
  if (shape === 'drop') return `<div class="pinshape${cls}" style="${box}margin:${-z - 4}px 0 0 ${-z / 2}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:${b};box-shadow:${sh};${ring}"><span style="display:grid;transform:rotate(45deg)">${svg}</span></div>`
  if (shape === 'square') return `<div class="pinshape${cls}" style="${box}margin:${-z / 2}px 0 0 ${-z / 2}px;border-radius:9px;border:${b};box-shadow:${sh};${ring}">${svg}</div>`
  if (shape === 'hex') return `<div class="pinshape${cls}" style="${box}margin:${-z / 2}px 0 0 ${-z / 2}px;clip-path:polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0 50%)">${svg}</div>`
  return `<div class="pinshape${cls}" style="${box}margin:${-z / 2}px 0 0 ${-z / 2}px;border-radius:50%;border:${b};box-shadow:${sh};${ring}">${svg}</div>`
}

export const fmtDate = (d) => (d ? d.split('-').reverse().join('/') : '')
export const fmtDM = (d) => (d ? d.split('-').reverse().slice(0, 2).join('/') : '')
export const initial = (s) => String(s || '?').trim().slice(0, 1).toUpperCase()
export const num = (n) => Number(n || 0).toLocaleString('pt-BR')

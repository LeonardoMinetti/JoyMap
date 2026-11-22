// Tema visual do criador: validação de tudo que vem do cliente + saneamento de SVG enviado.
export const ICONS = ['rest', 'cafe', 'bar', 'bread', 'cake', 'pizza', 'fish', 'burger', 'heart', 'star', 'flag', 'store', 'clock', 'spark']
export const BLOCKS = ['header', 'links', 'filters', 'map', 'list', 'routes']
const FONTS = ['sans', 'disp', 'serif', 'fraunces', 'playfair', 'mono']
const TONES = ['light', 'bright', 'liberty', 'fiord', 'dark']
const TONE_LEGACY = { sepia: 'liberty', mint: 'bright', blue: 'fiord' } // estilos antigos (Snazzy) viram os equivalentes do OpenFreeMap
const SHAPES = ['drop', 'circle', 'square', 'hex']
const SELECTED = ['outline', 'pulse', 'color']
const LINK_STYLES = ['fill', 'line', 'soft']
const HEIGHTS = ['sm', 'md', 'lg']
const LISTS = ['grid', 'rows']
const HEX = /^#[0-9a-fA-F]{6}$/

export const DEFAULT_LAYOUT = {
  blocks: [{ id: 'header', on: true }, { id: 'links', on: true }, { id: 'filters', on: true }, { id: 'map', on: true }, { id: 'list', on: true }, { id: 'routes', on: false }],
  mapHeight: 'md', listStyle: 'grid', cover: false,
}

export const DEFAULT_THEME = {
  accent: '#ff4b2b', bg: '#ffffff', fg: '#171717', font: 'sans', radius: 14, contrastAuto: true,
  tone: 'light', shape: 'drop', pinSize: 55, pinBorder: true, cluster: true, selected: 'outline',
  mapLabels: true, labelDensity: 40, start: 'all', startView: null,
  linkStyle: 'fill', social: { instagram: true, tiktok: false }, bio: '', layout: DEFAULT_LAYOUT,
  categories: [
    { id: 'rest', name: 'Restaurantes', color: '#ff4b2b', icon: 'rest' }, { id: 'cafe', name: 'Cafés', color: '#a16207', icon: 'cafe' },
    { id: 'bar', name: 'Drinks', color: '#7c3aed', icon: 'bar' }, { id: 'bread', name: 'Padarias', color: '#f59e0b', icon: 'bread' },
    { id: 'cake', name: 'Doces', color: '#ec4899', icon: 'cake' }, { id: 'pizza', name: 'Pizza', color: '#dc2626', icon: 'pizza' },
    { id: 'fish', name: 'Japonês', color: '#2d7ff9', icon: 'fish' }, { id: 'burger', name: 'Lanches', color: '#ea580c', icon: 'burger' },
  ],
}

const pick = (list, v, fb) => (list.includes(v) ? v : fb)
const num = (v, lo, hi, fb) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fb }

function sanitizeLayout(input, legacy) {
  const l = input && typeof input === 'object' ? input : {}
  const given = Array.isArray(l.blocks) ? l.blocks : []
  const seen = new Set()
  const blocks = []
  for (const b of given) { // respeita a ordem escolhida; ignora ids desconhecidos
    if (BLOCKS.includes(b?.id) && !seen.has(b.id)) { seen.add(b.id); blocks.push({ id: b.id, on: !!b.on }) }
  }
  for (const d of DEFAULT_LAYOUT.blocks) if (!seen.has(d.id)) blocks.push({ ...d })
  if (!given.length) { // temas antigos: showLinks/showFilters
    if (legacy.showLinks === false) blocks.find((b) => b.id === 'links').on = false
    if (legacy.showFilters === false) blocks.find((b) => b.id === 'filters').on = false
  }
  const hdr = blocks.find((b) => b.id === 'header')
  hdr.on = true // cabeçalho (nome e foto) é obrigatório: é a identificação do criador
  return { blocks, mapHeight: pick(HEIGHTS, l.mapHeight, 'md'), listStyle: pick(LISTS, l.listStyle, 'grid'), cover: !!l.cover }
}

export function sanitizeTheme(input = {}) {
  const t = { ...DEFAULT_THEME, ...(input || {}) }
  const out = {
    accent: HEX.test(t.accent) ? t.accent : DEFAULT_THEME.accent, bg: HEX.test(t.bg) ? t.bg : DEFAULT_THEME.bg, fg: HEX.test(t.fg) ? t.fg : DEFAULT_THEME.fg,
    font: pick(FONTS, t.font, 'sans'), radius: Math.max(0, Math.min(32, parseInt(t.radius, 10) || 0)), contrastAuto: t.contrastAuto !== false,
    tone: pick(TONES, TONE_LEGACY[t.tone] || t.tone, 'light'), shape: pick(SHAPES, t.shape, 'drop'), pinSize: num(t.pinSize, 0, 100, 55), pinBorder: t.pinBorder !== false,
    cluster: t.cluster !== false, selected: pick(SELECTED, t.selected, 'outline'), mapLabels: t.mapLabels !== false, labelDensity: num(t.labelDensity, 0, 100, 40),
    start: 'all', startView: null, // o ponto inicial do mapa não é mais configurável: sempre enquadra todos os lugares
    linkStyle: pick(LINK_STYLES, t.linkStyle, 'fill'),
    social: { instagram: t.social?.instagram !== false, tiktok: !!t.social?.tiktok },
    bio: String(t.bio || '').slice(0, 160),
    layout: sanitizeLayout(input?.layout, input || {}),
  }
  const seen = new Set()
  out.categories = (Array.isArray(t.categories) ? t.categories : DEFAULT_THEME.categories).slice(0, 16).map((c) => ({
    id: String(c.id || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20), name: String(c.name || '').slice(0, 30),
    color: HEX.test(c.color) ? c.color : '#ff4b2b', icon: ICONS.includes(c.icon) || /^custom:\d{1,9}$/.test(String(c.icon)) || /^lib:(fluent3d|noto|lucide):[a-z0-9-]{1,48}$/.test(String(c.icon)) ? c.icon : 'rest',
  })).filter((c) => c.id && c.name && !seen.has(c.id) && seen.add(c.id))
  if (!out.categories.length) out.categories = DEFAULT_THEME.categories
  return out
}

// SVG enviado pelo criador: aceitamos só <path d="..."> (sem script, estilo, imagem ou link) e guardamos apenas o desenho.
export function sanitizeSvg(src) {
  const s = String(src || '')
  if (s.length > 50 * 1024) throw new Error('svg_grande')
  if (!/<svg[\s>]/i.test(s)) throw new Error('svg_invalido')
  if (/<\s*(script|foreignObject|image|style|use|a|animate|set)\b|\son\w+\s*=|javascript:|href\s*=|<!ENTITY|<!DOCTYPE/i.test(s)) throw new Error('svg_inseguro')
  const vbm = s.match(/viewBox\s*=\s*["']([\d.\s,-]+)["']/i)
  const vb = vbm ? vbm[1].trim().replace(/,/g, ' ').replace(/\s+/g, ' ') : '0 0 24 24'
  const p = vb.split(' ').map(Number)
  if (p.length !== 4 || p.some((n) => !Number.isFinite(n)) || p[2] <= 0 || p[3] <= 0) throw new Error('svg_invalido')
  const ds = [...s.matchAll(/<path\b[^>]*?\sd\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1])
  if (!ds.length) throw new Error('svg_sem_path')
  const d = ds.join(' ')
  if (d.length > 20000 || !/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]+$/.test(d)) throw new Error('svg_invalido')
  const mode = /fill\s*=\s*["']none["']/i.test(s) && /stroke\s*=\s*["']/i.test(s) ? 'stroke' : 'fill'
  return { d, vb, mode }
}

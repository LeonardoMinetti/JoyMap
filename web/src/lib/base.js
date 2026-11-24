// Publicação em subcaminho (ex.: GitHub Pages em /mapa-sp-mvp/) e modo estático (sem servidor).
export const BASE = ((import.meta.env && import.meta.env.BASE_URL) || '/').replace(/\/$/, '')
export const STATIC = !!(import.meta.env && import.meta.env.VITE_STATIC === '1')
export const withBase = (p) => (BASE && typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && p !== BASE && !p.startsWith(BASE + '/') ? BASE + p : p)
export const stripBase = (p) => (BASE && (p === BASE || p.startsWith(BASE + '/')) ? p.slice(BASE.length) || '/' : p)
// dados de demonstração (compartilhados com o servidor) montam os caminhos das fotos com este prefixo
if (typeof globalThis !== 'undefined') globalThis.__WAGLI_BASE__ = BASE

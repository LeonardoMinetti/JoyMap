import { useSyncExternalStore } from 'react'
import { LIBS, LIB_ID } from './iconcat.js'

// Bibliotecas de símbolos (carregadas sob demanda, uma por estilo). Id do símbolo: "lib:<estilo>:<nome>".
const loaders = { fluent3d: () => import('./iconlib/fluent3d.json'), noto: () => import('./iconlib/noto.json'), lucide: () => import('./iconlib/lucide.json') }
const data = {}, pending = {}
let version = 0
const subs = new Set()
const bump = () => { version++; subs.forEach((f) => f()) }

export function loadLib(set) {
  if (data[set] || !loaders[set]) return Promise.resolve()
  return (pending[set] ||= loaders[set]().then((m) => { data[set] = m.default || m; bump() }).catch(() => { delete pending[set] }))
}
export const useLibVersion = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => version)

// Resolve "lib:noto:pizza" -> { set, name, color, vb, body } (ou null enquanto carrega / se não existir).
export function libIcon(id) {
  const m = LIB_ID.exec(id || '')
  if (!m) return null
  const [, set, name] = m
  loadLib(set)
  const body = data[set]?.[name]
  return body ? { set, name, color: LIBS[set].color, vb: LIBS[set].vb, body } : null
}
export const isLib = (id) => LIB_ID.test(id || '')

const uri = (vb, body) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`)
// HTML do símbolo da biblioteca no tamanho `s`; `c` = cor do traço dos ícones de contorno.
export function libHtml(ic, s, c = '#fff', sw = 2.2) {
  if (ic.color) return `<img src="${uri(ic.vb, ic.body)}" width="${s}" height="${s}" alt="" draggable="false" style="display:block"/>`
  return `<svg width="${s}" height="${s}" viewBox="${ic.vb}" style="display:block;fill:none;stroke:${c};stroke-width:${sw};stroke-linecap:round;stroke-linejoin:round">${ic.body}</svg>`
}

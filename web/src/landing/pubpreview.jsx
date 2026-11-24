import React, { useMemo } from 'react'
import MapSheet from '../pub/MapSheet.jsx'
import { pubVars, useFilters } from '../pub/shared.jsx'
import { applyTemplate, TEMPLATES } from '../theme.jsx'
import { DEMO_IDENTITIES, DEMO_ROUTES, demoPlaces } from '../demoData.js'

// A mesma tela pública que os seguidores abrem no celular (mapa + folha inferior, componente real do app), alimentada com dados de demonstração.
const LAYOUT = { blocks: [{ id: 'header', on: true }, { id: 'links', on: false }, { id: 'filters', on: true }, { id: 'map', on: true }, { id: 'list', on: true }, { id: 'routes', on: false }], mapHeight: 'lg', listStyle: 'grid', cover: false }
const BASE = { accent: '#FFC400', bg: '#FFFFFF', fg: '#171713', font: 'sans', radius: 16, contrastAuto: true, tone: 'light', shape: 'circle', pinSize: 90, pinBorder: true, cluster: false, selected: 'pulse', mapLabels: false, labelDensity: 40, start: 'pick', startView: { lat: -23.5614, lon: -46.6559, zoom: 12.5 }, linkStyle: 'fill', social: { instagram: false, tiktok: false }, bio: '', layout: LAYOUT, categories: [] }
export const makeTheme = (p) => ({ ...BASE, ...p, layout: { ...LAYOUT, ...(p.layout || {}) } })
export const DEMO_CATS = [
  { id: 'rest', name: 'Restaurantes', color: '#FF4B2B', icon: 'lib:fluent3d:fork-and-knife-with-plate' }, { id: 'cafe', name: 'Cafés', color: '#A16207', icon: 'lib:fluent3d:hot-beverage' }, { id: 'bar', name: 'Drinks', color: '#7C3AED', icon: 'lib:fluent3d:cocktail-glass' },
  { id: 'bread', name: 'Padarias', color: '#F59E0B', icon: 'lib:fluent3d:croissant' }, { id: 'cake', name: 'Doces', color: '#EC4899', icon: 'lib:fluent3d:birthday-cake' }, { id: 'pizza', name: 'Pizza', color: '#DC2626', icon: 'lib:fluent3d:pizza' },
  { id: 'fish', name: 'Japonês', color: '#2D7FF9', icon: 'lib:fluent3d:sushi' }, { id: 'burger', name: 'Lanches', color: '#EA580C', icon: 'lib:fluent3d:hamburger' },
]
export const DEMO_THEME = makeTheme({ categories: DEMO_CATS, bio: 'Restaurantes, cafés e achados de São Paulo.' })
// tema de cada identidade de demonstração
// Modelo do estúdio + o que o criador edita (bio e, se quiser, a cor principal). Nada fora do que o painel oferece.
export const identityTheme = (id) => makeTheme({ ...applyTemplate(DEMO_THEME, TEMPLATES.find((x) => x.id === id.tpl)), bio: id.tagline, ...(id.accent ? { accent: id.accent } : {}) })
export const PLACES = demoPlaces()

export function PubPreview({ name = 'Mapa de demonstração', handle = 'mapa_demo', avatarUrl, theme = DEMO_THEME, places = PLACES, shown, selectedId = null, snap = 'half' }) {
  const data = useMemo(() => ({ creator: { displayName: name, handle, avatarUrl, slug: 'demo', theme, links: [], symbols: {}, cover: false, tiktok: null, demo: true }, places, routes: DEMO_ROUTES }), [name, handle, avatarUrl, theme, places])
  const f = useFilters(places, { preview: true })
  return <div className="pub preview lpv" style={pubVars(theme)}><MapSheet data={data} shown={shown || places} f={f} selectedId={selectedId} preview snap={snap} /></div>
}
export { DEMO_IDENTITIES }

export const PLACES6 = [9, 5, 3, 6, 7, 1].map((id) => PLACES.find((q) => q.id === id))
const VIEW = { lat: -23.572, lon: -46.65, zoom: 12.6 }
export const MAP_THEME = makeTheme({ ...DEMO_THEME, start: 'pick', startView: VIEW, pinSize: 100 })
export const withView = (t) => makeTheme({ ...t, start: 'pick', startView: VIEW, pinSize: 100 })

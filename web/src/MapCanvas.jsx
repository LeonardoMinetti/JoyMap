import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import { TONES, catOf, pinHtml, symOf } from './theme.jsx'
import { addBasemap } from './basemap.js'
import { useLibVersion } from './iconlib.js'

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)] }

// Mapa real (Leaflet + base vetorial nativa do OpenFreeMap) com o visual do criador: tom, rótulos, formato/tamanho do pin, agrupamento e pin selecionado.
export default function MapCanvas({ places, theme, symbols, selectedId, onSelect, className = '', style, interactive = true, gentle = false, pop = 0, dim = false, fitPad, zoomPos = 'bottomright', extra, onMove }) {
  const libV = useLibVersion()
  const el = useRef(null)
  const map = useRef(null)
  const layer = useRef(null)
  const extraLayer = useRef(null)
  const fitted = useRef('')
  const draw = useRef(() => {})
  const cache = useRef(new Map()) // marcadores já desenhados (evita piscar quando chega um lugar novo)
  const sig = useRef('')
  const first = useRef(true)

  useEffect(() => {
    const m = L.map(el.current, { zoomControl: false, maxZoom: 16, zoomSnap: 0.25, attributionControl: true, dragging: interactive && !(gentle && L.Browser.mobile), scrollWheelZoom: interactive && !gentle, doubleClickZoom: interactive, touchZoom: interactive, boxZoom: interactive, keyboard: interactive }).setView([-23.56, -46.64], 11)
    map.current = m
    if (interactive) L.control.zoom({ position: zoomPos }).addTo(m)
    m.attributionControl.setPrefix(false)
    layer.current = L.layerGroup().addTo(m)
    extraLayer.current = L.layerGroup().addTo(m)
    m.on('zoomend', () => draw.current())
    m.on('moveend', () => onMove?.({ lat: m.getCenter().lat, lon: m.getCenter().lng, zoom: m.getZoom() }))
    return () => m.remove()
  }, [])

  // base vetorial estilizada: tom, rótulos (ligar/desligar) e densidade de rótulos
  useEffect(() => addBasemap(map.current, theme.tone, { labels: theme.mapLabels, labelOpacity: 0.25 + (theme.labelDensity / 100) * 0.75 }), [theme.tone, theme.mapLabels, theme.labelDensity])

  draw.current = () => {
    const m = map.current
    if (!m || !layer.current) return
    const mine = cache.current
    // mudou o visual (tema, símbolos, zoom de agrupamento): refaz tudo; senão só entram/saem os que mudaram
    const zoom = m.getZoom()
    const clustering = theme.cluster && zoom < 14 && places.length > 3
    const style = JSON.stringify([theme.categories, theme.shape, theme.pinSize, theme.pinBorder, theme.selected, symbols, libV, dim, clustering ? Math.round(zoom) : 'x'])
    if (sig.current !== style) { layer.current.clearLayers(); mine.clear(); sig.current = style }
    const want = new Map()
    const fresh = !first.current
    const mk = (p, selected) => {
      const k = `p${p.id}${selected ? 's' : ''}${dim && selectedId != null && p.id !== selectedId ? 'd' : ''}`
      want.set(k, () => {
        const cat = catOf(theme, p.category)
        const { n, sym } = symOf(cat, symbols)
        const icon = L.divIcon({ className: 'pinwrap' + (fresh ? ' pinnew' : '') + (dim && selectedId != null && p.id !== selectedId ? ' dim' : ''), html: pinHtml({ color: cat.color, shape: theme.shape, n, sym, selected, size: theme.pinSize, border: theme.pinBorder, selStyle: theme.selected }), iconSize: [0, 0] })
        const marker = L.marker([p.lat, p.lon], { icon, zIndexOffset: selected ? 1000 : 0 }).addTo(layer.current)
        marker.bindTooltip(p.name, { direction: 'top', offset: [0, theme.shape === 'drop' ? -36 : -18] })
        marker.on('click', () => onSelect?.(p.id))
        return marker
      })
    }
    if (clustering) {
      const cell = 56, cells = new Map()
      for (const p of places) {
        if (p.id === selectedId) continue
        const pt = m.project([p.lat, p.lon], zoom)
        const k = `${Math.floor(pt.x / cell)}:${Math.floor(pt.y / cell)}`
        if (!cells.has(k)) cells.set(k, [])
        cells.get(k).push(p)
      }
      for (const group of cells.values()) {
        if (group.length === 1) { mk(group[0], false); continue }
        const lat = group.reduce((s, p) => s + p.lat, 0) / group.length, lon = group.reduce((s, p) => s + p.lon, 0) / group.length
        const size = group.length > 9 ? 40 : 34
        want.set(`c${group.map((p) => p.id).join('-')}`, () => {
          const icon = L.divIcon({ className: 'pinwrap', html: `<div class="clu" style="width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px">${group.length}</div>`, iconSize: [0, 0] })
          return L.marker([lat, lon], { icon }).addTo(layer.current).on('click', () => m.fitBounds(L.latLngBounds(group.map((p) => [p.lat, p.lon])), { padding: [60, 60], maxZoom: 15 }))
        })
      }
      const sel = places.find((p) => p.id === selectedId)
      if (sel) mk(sel, true)
    } else places.forEach((p) => mk(p, p.id === selectedId))
    for (const [k, mk2] of [...mine]) if (!want.has(k)) { layer.current.removeLayer(mk2); mine.delete(k) }
    for (const [k, make] of want) if (!mine.has(k)) mine.set(k, make())
    if (places.length) first.current = false
  }

  // transição curta dos pins quando o visitante troca símbolo, formato ou paleta (escala + opacidade)
  useEffect(() => { if (!pop || !el.current) return; el.current.classList.add('repop'); const h = setTimeout(() => el.current?.classList.remove('repop'), 420); return () => clearTimeout(h) }, [pop])
  useEffect(() => { draw.current() }, [places, theme.categories, theme.shape, theme.pinSize, theme.pinBorder, theme.cluster, theme.selected, symbols, selectedId, libV, dim])

  // enquadramento inicial conforme o "ponto inicial" escolhido
  useEffect(() => {
    const m = map.current
    if (!places.length) return
    const key = `${places.length}:${theme.start}:${theme.startView?.lat}`
    if (fitted.current === key) return
    fitted.current = key
    if (theme.start === 'pick' && theme.startView) { m.setView([theme.startView.lat, theme.startView.lon], theme.startView.zoom); if (fitPad) m.panBy([0, (fitPad.bottom - fitPad.top) / 2], { animate: false }) }
    else if (theme.start === 'hood') m.setView([median(places.map((p) => p.lat)), median(places.map((p) => p.lon))], 14)
    else m.fitBounds(L.latLngBounds(places.map((p) => [p.lat, p.lon])), fitPad ? { paddingTopLeft: [40, fitPad.top], paddingBottomRight: [40, fitPad.bottom], maxZoom: 14 } : { padding: [40, 40], maxZoom: 14 })
  }, [places, theme.start, theme.startView])

  useEffect(() => {
    const p = places.find((x) => x.id === selectedId)
    if (p) map.current.flyTo([p.lat, p.lon], Math.min(16, Math.max(map.current.getZoom(), 14)), { duration: 0.5 })
  }, [selectedId])

  // camada extra (ex.: "perto de mim")
  useEffect(() => {
    extraLayer.current.clearLayers()
    if (extra) L.circleMarker([extra.lat, extra.lon], { radius: 8, color: '#fff', weight: 3, fillColor: '#2d7ff9', fillOpacity: 1 }).addTo(extraLayer.current)
  }, [extra])

  useEffect(() => { const h = setTimeout(() => map.current?.invalidateSize(), 60); return () => clearTimeout(h) })
  return <div ref={el} className={`mapcanvas ${className}`} style={style} role="application" aria-label="Mapa de lugares" />
}

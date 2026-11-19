import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import { TONES, catOf, pinHtml, tileUrl } from './theme.jsx'

// Mapa com o visual do criador: base clara/escura (Esri), tom por multiplicação de cor, pins por categoria.
export default function MapCanvas({ places, theme, selectedId, onSelect, height = '100%' }) {
  const el = useRef(null)
  const map = useRef(null)
  const tiles = useRef(null)
  const layer = useRef(null)
  const fitted = useRef(0)

  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: false, maxZoom: 16, attributionControl: true }).setView([-23.56, -46.64], 11)
    L.control.zoom({ position: 'bottomright' }).addTo(map.current)
    layer.current = L.layerGroup().addTo(map.current)
    map.current.attributionControl.setPrefix(false)
    return () => map.current.remove()
  }, [])

  useEffect(() => {
    if (tiles.current) tiles.current.remove()
    tiles.current = L.tileLayer(tileUrl(theme.tone), { maxZoom: 16, attribution: 'Base: Esri, HERE, Garmin, © colaboradores do OpenStreetMap' }).addTo(map.current)
    tiles.current.bringToBack()
    map.current.getPane('tilePane').style.filter = (TONES[theme.tone] || TONES.light).filter
  }, [theme.tone])

  useEffect(() => {
    layer.current.clearLayers()
    places.forEach((p) => {
      const cat = catOf(theme, p.category)
      const icon = L.divIcon({ className: 'pinwrap', html: pinHtml(cat.color, theme.shape, cat.icon, p.id === selectedId), iconSize: [0, 0] })
      const m = L.marker([p.lat, p.lon], { icon, zIndexOffset: p.id === selectedId ? 1000 : 0 }).addTo(layer.current)
      m.bindTooltip(p.name, { direction: 'top', offset: [0, theme.shape === 'drop' ? -36 : -18] })
      m.on('click', () => onSelect?.(p.id))
    })
    if (places.length && fitted.current !== places.length) {
      fitted.current = places.length
      map.current.fitBounds(L.latLngBounds(places.map((p) => [p.lat, p.lon])), { padding: [40, 40], maxZoom: 14 })
    }
  }, [places, theme.categories, theme.shape, selectedId])

  useEffect(() => {
    const p = places.find((x) => x.id === selectedId)
    if (p) map.current.flyTo([p.lat, p.lon], Math.min(16, Math.max(map.current.getZoom(), 14)), { duration: 0.5 })
  }, [selectedId])

  useEffect(() => { setTimeout(() => map.current?.invalidateSize(), 50) })
  return <div ref={el} className="mapcanvas" style={{ height }} role="application" aria-label="Mapa de lugares" />
}

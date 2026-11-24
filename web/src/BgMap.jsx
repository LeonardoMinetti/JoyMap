import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import { addBasemap } from './basemap.js'

// Mapa real de São Paulo como fundo decorativo (sem interação, sem pins), em baixa opacidade.
export default function BgMap({ tone = 'light', opacity = 0.3, center = [-23.5614, -46.6559], zoom = 12.5, blend, style }) {
  const el = useRef(null)
  useEffect(() => {
    const m = L.map(el.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false, zoomSnap: 0.25 }).setView(center, zoom)
    const rm = addBasemap(m, tone, { labels: false, attribution: false })
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(el.current)
    return () => { ro.disconnect(); rm(); m.remove() }
  }, [tone, center[0], center[1], zoom])
  return <div ref={el} aria-hidden="true" style={{ position: 'absolute', inset: 0, opacity, mixBlendMode: blend, pointerEvents: 'none', ...style }} />
}

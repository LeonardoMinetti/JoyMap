import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import { PALETTES, TONES, pinHtml } from './theme.jsx'
import { addBasemap } from './basemap.js'
import { loadLib } from './iconlib.js'
import { SAMPLE_ICON } from './iconcat.js'

// Pontos ilustrativos em bairros reais de São Paulo (não são lugares de verdade).
const SP = [
  [-23.5667, -46.6917, 'cafe', 'Pinheiros'], [-23.5546, -46.6911, 'bar', 'Vila Madalena'], [-23.5505, -46.6333, 'rest', 'Centro'], [-23.5588, -46.6354, 'fish', 'Liberdade'],
  [-23.5614, -46.6559, 'burger', 'Paulista'], [-23.5995, -46.6665, 'pizza', 'Moema'], [-23.5841, -46.6788, 'cake', 'Itaim'], [-23.5604, -46.5988, 'bread', 'Mooca'],
  [-23.5403, -46.576, 'rest', 'Tatuapé'], [-23.5893, -46.6345, 'cafe', 'Vila Mariana'], [-23.57, -46.662, 'bar', 'Jardins'], [-23.537, -46.649, 'cake', 'Santa Cecília'],
  [-23.618, -46.693, 'burger', 'Brooklin'], [-23.5874, -46.6576, 'fish', 'Ibirapuera'],
]

// Mapa real de São Paulo, sem interação, com pins que surgem crescendo e um que se destaca em loop.
export default function MotionMap({ h = 360, tone = 'light', shape = 'drop', pal = 'warm', acc = '#ff4b2b', n = 10, size = 55, labels = false, pack = 'base', style }) {
  const el = useRef(null)
  useEffect(() => {
    const m = L.map(el.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, boxZoom: false, keyboard: false, zoomSnap: 0.25 })
    const pts = SP.slice(0, n)
    m.fitBounds(L.latLngBounds(pts.map((p) => [p[0], p[1]])), { padding: [34, 34], maxZoom: 13 })
    const rmBase = addBasemap(m, tone, { labels, attribution: false })
    const colors = PALETTES[pal]
    const timers = []
    const markers = []
    const html = (p, sel, delay) => `<div class="pinpop" style="animation-delay:${delay}ms">${pinHtml({ color: colors ? colors[p[2]] : acc, shape, n: p[2], sym: SAMPLE_ICON[pack] ? { lib: `lib:${pack}:${SAMPLE_ICON[pack][p[2]]}` } : undefined, selected: sel, size, selStyle: 'pulse' })}</div>`
    let cur = -1
    const run = () => {
      markers.forEach((k) => k.remove()); markers.length = 0; cur = -1
      pts.forEach((p, i) => timers.push(setTimeout(() => {
        const k = L.marker([p[0], p[1]], { icon: L.divIcon({ className: 'pinwrap', html: html(p, false, 0), iconSize: [0, 0] }), interactive: false }).addTo(m)
        markers.push(k)
      }, 350 + i * 260)))
      const start = 350 + pts.length * 260 + 500
      for (let r = 0; r < 4; r++) timers.push(setTimeout(() => { // destaca um pin por vez: cresce e pulsa
        if (cur >= 0 && markers[cur]) markers[cur].setIcon(L.divIcon({ className: 'pinwrap', html: html(pts[cur], false, 0).replace('pinpop', 'pinstill'), iconSize: [0, 0] }))
        cur = (r * 3 + 2) % pts.length
        if (markers[cur]) { markers[cur].setIcon(L.divIcon({ className: 'pinwrap', html: html(pts[cur], true, 0).replace('pinpop', 'pinstill'), iconSize: [0, 0] })); markers[cur].setZIndexOffset(1000) }
      }, start + r * 1800))
      timers.push(setTimeout(run, start + 4 * 1800 + 1200))
    }
    let started = false, dead = false
    const ready = SAMPLE_ICON[pack] ? loadLib(pack) : Promise.resolve()
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { started = true; m.invalidateSize(); ready.then(() => { if (!dead) run() }) } }, { threshold: 0.2 })
    io.observe(el.current)
    return () => { dead = true; io.disconnect(); timers.forEach(clearTimeout); rmBase(); m.remove() }
  }, [tone, shape, pal, acc, n, size, labels, pack])
  const tint = (TONES[tone] || TONES.light).tint
  return (
    <div style={{ position: 'relative', width: '100%', height: h, background: tint, ...style }} aria-hidden="true">
      <div ref={el} style={{ position: 'absolute', inset: 0 }} />
    </div>
  )
}

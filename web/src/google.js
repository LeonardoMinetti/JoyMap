// Mapa do Google: só liga quando o build recebe VITE_GOOGLE_MAPS_KEY e o mapa pede provider "google".
export const GKEY = import.meta.env?.VITE_GOOGLE_MAPS_KEY || ''

let loading = null
export function loadGoogle() {
  return (loading ||= new Promise((ok, fail) => {
    window.__gmok = () => ok(window.google.maps)
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GKEY}&loading=async&callback=__gmok&language=pt-BR&region=BR`
    s.onerror = () => { loading = null; fail(new Error('google')) }
    document.head.appendChild(s)
  }))
}

const DARK = [
  { elementType: 'geometry', stylers: [{ color: '#212121' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9a9a9a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3a3a3a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#101820' }] },
]
// esconde os pontos comerciais do próprio Google, para só os pins do criador aparecerem
const stylesFor = (tone, labels) => [
  ...(tone === 'dark' ? DARK : []),
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  ...(labels ? [] : [{ elementType: 'labels', stylers: [{ visibility: 'off' }] }]),
]

// Desenha o mapa do Google atrás do Leaflet (pins, agrupamento e roteiros continuam os mesmos) e acompanha o movimento.
export function addGoogleBase(map, { tone, labels = true, covered = () => 0 } = {}) {
  let dead = false, off = () => {}
  const host = document.createElement('div')
  host.className = 'gbase'
  const box = map.getContainer()
  box.prepend(host)
  box.classList.add('has-gbase')
  loadGoogle().then((maps) => {
    if (dead) return
    // o que cobre o mapa embaixo (a lista no celular) fica fora da camada do Google, para o logo dele continuar visível
    const at = () => {
      const { x, y } = map.getSize()
      const h = Math.max(140, y - covered())
      host.style.bottom = `${y - Math.min(y, h)}px`
      const c = map.containerPointToLatLng([x / 2, Math.min(y, h) / 2])
      return { center: { lat: c.lat, lng: c.lng }, zoom: map.getZoom() }
    }
    const g = new maps.Map(host, { center: { lat: -23.56, lng: -46.64 }, zoom: 11, disableDefaultUI: true, keyboardShortcuts: false, gestureHandling: 'none', isFractionalZoomEnabled: true, clickableIcons: false, styles: stylesFor(tone, labels) })
    const sync = () => { if (map._loaded) g.moveCamera(at()) }
    map.on('move zoom viewreset resize gbase', sync)
    off = () => map.off('move zoom viewreset resize gbase', sync)
    sync()
  }).catch(() => {})
  return () => { dead = true; off(); host.remove(); box.classList.remove('has-gbase') }
}

// Foto do Google pedida na hora de exibir (não é guardada), com o crédito de quem enviou.
const photos = new Map()
export function googlePhoto(placeId) {
  if (!photos.has(placeId)) photos.set(placeId, loadGoogle().then(async (maps) => {
    const { Place } = await maps.importLibrary('places')
    const place = new Place({ id: placeId })
    await place.fetchFields({ fields: ['photos'] })
    const ph = place.photos?.[0]
    return ph ? { url: ph.getURI({ maxWidth: 900 }), by: ph.authorAttributions?.[0]?.displayName || '', href: ph.authorAttributions?.[0]?.uri || '' } : null
  }).catch(() => { photos.delete(placeId); return null }))
  return photos.get(placeId)
}

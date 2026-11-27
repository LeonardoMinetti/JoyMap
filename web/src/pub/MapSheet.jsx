import { catsOf } from '../../../server/categories.js'
import React, { useEffect, useRef, useState } from 'react'
import { Link } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import MapCanvas from '../MapCanvas.jsx'
import Arrival from './Arrival.jsx'
import FakeMap from '../FakeMap.jsx'
import { initial, catOf, symOf, onColor } from '../theme.jsx'
import { PlacePhoto, sub, useMemoColors, NoResult, RouteBody, SponsorMark, SponsorTag, OpenTag, NoneOpen, SavedNote, AccountBtn, BrandMark, BRAND_LINE, InstaLink, RouteEmojis } from './shared.jsx'
import { cityOf, citiesOf, byCity, routePath, hasHours, newest } from './extras.js'

// Mapa individual no celular, no padrão do Viver SP: o mapa ocupa a tela toda e a lista fica numa folha
// inferior arrastável (peek / meia / cheia). Tocar em um pin destaca o lugar e mostra um cartão flutuante.
export const BRAND = 40, HEAD = 56, TAB = 56, SAFE = 24, PEEK = 112, CHIPS_BOTTOM = 108 // SAFE: faixa do indicador de início do iPhone, para as abas não ficarem cortadas
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

export const NAV_TABS = [['sobre', 'Sobre', 'user'], ['lugares', 'Lugares', 'pin'], ['roteiros', 'Roteiros', 'route'], ['busca', 'Busca', 'search']]
const KEY = { '/roteiros': 'roteiros' }
// Abas inferiores (Sobre, Lugares, Roteiros, Busca); Bairros e Categorias abrem dentro de Lugares; no mapa, Sobre fica marcada na chegada. Na tela do mapa abrem painéis; nas demais páginas voltam ao mapa.
export function PubTabs({ cur, href, onOpen, preview, navRef, noRoutes, cityNav }) {
  const c = KEY[cur] || cur
  return (
    <nav ref={navRef} className="ms-tabs" aria-label="Navegação do mapa">
      {NAV_TABS.filter(([k]) => !(noRoutes && k === 'roteiros')).map(([k, label, icon]) => {
        const inner = <><Icon n={icon} s={22} c="currentColor" />{label}</>
        const on = c === k
        if (onOpen || preview) return <button key={k} type="button" className={on ? 'on' : ''} aria-current={on ? 'page' : undefined} tabIndex={preview ? -1 : 0} onClick={() => onOpen?.(k)}>{inner}</button>
        return <Link key={k} to={href(`/?p=${k}`)} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>{inner}</Link>
      })}
    </nav>
  )
}

// Painel que sobe da base (Bairros, Categorias, Roteiros, Salvos)
function Panel({ title, onClose, children, tall, full, bottom = TAB }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  return (
    <>
      <div className="ms-ovl" onClick={onClose} aria-hidden="true" />
      <section className={'ms-panel' + (tall ? ' tall' : '') + (full ? ' full' : '')} style={{ bottom }} role="dialog" aria-label={title}>
        <div className="ms-ph"><b className="pt">{title}</b><button type="button" className="ms-ib" aria-label="Fechar" onClick={onClose}><Icon n="close" s={20} c="currentColor" /></button></div>
        <div className="ms-pb">{children}</div>
      </section>
    </>
  )
}

export default function MapSheet({ data, shown: shown0, f, selectedId, onSelect, openFicha, href, saved, preview, fake, snap: snap0 = 'half', tabs = true, openPanel: panel0 = null, onShare, onRequest, requested, near }) {
  const { creator } = data
  const brand = creator.showBrand !== false
  const head = HEAD + (brand ? BRAND : 0) // com a marca, o cabeçalho ganha uma linha
  const theme = creator.theme
  const places = data.places
  const colors = useMemoColors(theme)
  const root = useRef(null)
  const [hc, setHc] = useState(preview ? 840 : 700)
  const [snap, setSnap] = useState(snap0)
  const [y, setY] = useState(0)
  const [ready, setReady] = useState(false)
  const [all, setAll] = useState(() => !preview && new URLSearchParams(location.search).get('p') === 'lugares') // lista de lugares (fora da chegada)
  const [drag, setDrag] = useState(false)
  const tabRef = useRef(null)
  const [tabH, setTabH] = useState(TAB + (preview ? SAFE : 0))
  const [panel, setPanel] = useState(panel0)
  const [routeId, setRouteId] = useState(null)
  const route = routeId != null ? data.routes?.find((r) => r.id === routeId) : null
  const shown = route ? shown0.filter((p) => route.placeIds.includes(p.id)) : shown0
  const sel = shown.find((p) => p.id === selectedId)
  const hs = Math.max(200, hc - head - (tabs ? tabH : 0))
  const offs = { full: 0, half: Math.round(hs * 0.5), low: Math.round(hs * 0.64), peek: hs - PEEK }

  useEffect(() => {
    const el = root.current
    if (!el) return
    const f2 = () => { setHc(el.clientHeight || 700); setReady(true) }
    f2()
    const ro = new ResizeObserver(f2); ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const el = tabRef.current
    if (!el) return
    const m = () => setTabH(el.offsetHeight || TAB)
    m()
    const ro = new ResizeObserver(m); ro.observe(el)
    return () => ro.disconnect()
  }, [tabs, panel])
  useEffect(() => { setSnap(snap0) }, [snap0])
  useEffect(() => { if (!drag) setY(offs[snap]) }, [snap, hs, drag])
  useEffect(() => { if (!preview && selectedId != null) setSnap('peek') }, [selectedId])

  // arrastar a folha pela alça
  const grab = useRef(null)
  const down = (e) => { if (preview) return; grab.current = { y0: y, p0: e.clientY, moved: false }; setDrag(true); e.currentTarget.setPointerCapture(e.pointerId) }
  const move = (e) => { const g = grab.current; if (!g) return; const dy = e.clientY - g.p0; if (Math.abs(dy) > 4) g.moved = true; setY(clamp(g.y0 + dy, 0, offs.peek)) }
  const up = (e) => {
    const g = grab.current; if (!g) return
    grab.current = null; setDrag(false)
    if (!g.moved) { setSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'half'); return }
    const v = clamp(g.y0 + (e.clientY - g.p0), 0, offs.peek)
    setSnap(Object.entries(offs).filter(([k]) => k !== 'low').sort((a, b) => Math.abs(a[1] - v) - Math.abs(b[1] - v))[0][0])
  }

  const usedCats = theme.categories.filter((c) => places.some((p) => catsOf(p).includes(c.id))).sort((a, b) => a.name.localeCompare(b.name))
  const hoods = Object.entries(places.filter((p) => !f.cities?.length || f.cities.includes(cityOf(p))).reduce((m, p) => { const h = p.neighborhood || p.municipality || 'São Paulo'; m[h] = (m[h] || 0) + 1; return m }, {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const cities = citiesOf(places)
  const multiCity = cities.length > 1
  const cityNav = byCity(places)
  const city = f.cities?.length === 1 ? f.cities[0] : null
  const anyHours = hasHours(places)
  const news = !f.active && !route ? newest(places) : []
  const catCount = (id) => places.filter((p) => catsOf(p).includes(id)).length
  const hood = f.hoods?.length === 1 ? f.hoods[0] : null
  // chegada: nada filtrado ainda (as prévias do site continuam mostrando a lista)
  const arriving = !preview && !all && !route && !f.active && !f.openNow && !f.near && !f.q && !f.cats.length && !hood && !city
  const pick = (fn) => { fn(); setPanel(null); setSnap('half') }
  // voltar à chegada: tocar no nome do criador
  // lista completa com um toque
  const showAll = () => { setAll(true); setPanel(null); setRouteId(null); f.clear?.(); f.setHoods?.([]); f.setCities?.([]); f.setQ?.(''); f.setOpenNow?.(false); if (f.near) f.toggleNear?.(false); setSnap('full') }
  const home = (to = 'half') => { setAll(false); setPanel(null); setRouteId(null); f.clear?.(); f.setHoods?.([]); f.setCities?.([]); f.setQ?.(''); f.setOpenNow?.(false); if (f.near) f.toggleNear?.(false); setSnap(to) }
  const filtered = !!(f.active || f.openNow || f.near || f.q || f.cats.length || f.hoods?.length === 1 || f.cities?.length === 1)
  useEffect(() => { if (filtered) setAll(true) }, [filtered])
  const found = f.q?.trim() ? shown0 : []
  const visible = hs - y
  const fitPad = { top: CHIPS_BOTTOM + head - HEAD, bottom: Math.max(40, hc - head - (drag ? y : offs[snap])) }
  const isSaved = (id) => saved?.ids.includes(id)
  const row = (p) => {
    const cat = catOf(theme, p.category)
    const { n, sym } = symOf(cat, creator.symbols)
    return (
      <div key={p.id} className="ms-row" role="button" tabIndex={preview ? -1 : 0} onClick={() => !preview && openFicha(p.id)} onKeyDown={(e) => e.key === 'Enter' && !preview && openFicha(p.id)}>
        <div className="sp">
          <b className="ms-n">{p.name}</b>
          {p.about ? <p className="pl-about">{p.about}</p> : <span className="ms-s">{p.neighborhood || p.municipality || 'São Paulo'}</span>}
          <span className="ms-tags"><i style={{ background: cat.color, color: '#fff' }}>{cat.name}</i>{(p.neighborhood || p.municipality) && <i>{p.neighborhood || p.municipality}</i>}<OpenTag place={p} /></span>
        </div>
        <span className="ms-th"><PlacePhoto place={p} theme={theme} size={88} />
          <button type="button" className={'ms-bm' + (isSaved(p.id) ? ' on' : '')} aria-label={isSaved(p.id) ? 'Remover dos salvos' : 'Salvar'} aria-pressed={!!isSaved(p.id)} tabIndex={preview ? -1 : 0} onClick={(e) => { e.stopPropagation(); !preview && saved?.toggle(p.id) }}><Icon n="heart" s={16} c="currentColor" /></button></span>
      </div>
    )
  }
  return (
    <div className={'ms' + (preview ? ' ms-prev' : '')} ref={root}>
      <div className="ms-map">
        {!ready ? null : fake || !places.length
          ? <FakeMap h="100%" tone={theme.tone} shape={theme.shape} colors={colors} acc={theme.accent} n={9} sel={2} lab={false} />
          : <MapCanvas places={shown} follow={preview ? undefined : places} followZoom={f.cities?.length === 1 && f.hoods?.length !== 1 ? 12 : 14} path={route ? routePath(route) : undefined} theme={theme} symbols={creator.symbols} selectedId={selectedId} onSelect={preview ? undefined : onSelect} extra={near} interactive={!preview} dim fitPad={fitPad} zoomPos="topright" style={{ height: '100%' }} />}
      </div>
      <header className={'ms-top' + (brand ? ' has-brand' : '')}>
        {brand && <div className="jm-strip"><BrandMark preview={preview} /><span className="jm-tag">{BRAND_LINE}</span></div>}
        <InstaLink creator={creator} preview={preview} className="ig-av">{creator.avatarUrl ? <img className="pav" src={creator.avatarUrl} alt="" /> : <span className="pav">{initial(creator.displayName)}</span>}</InstaLink><button type="button" className="sp ms-who" tabIndex={preview ? -1 : 0} onClick={() => !preview && home()}><b className="pt">{creator.displayName}</b><span className="ms-hs">@{creator.handle}</span></button>
        <button type="button" className="ms-ib" aria-label="Salvos" tabIndex={preview ? -1 : 0} onClick={() => !preview && setPanel(panel === 'salvos' ? null : 'salvos')}><Icon n="heart" s={20} c="currentColor" /></button>
        <button type="button" className="ms-ib" aria-label="Compartilhar" tabIndex={preview ? -1 : 0} onClick={() => !preview && onShare?.()}><Icon n="share" s={20} c="currentColor" /></button>
        <AccountBtn slug={creator.slug} preview={preview} />
      </header>
      <div style={brand ? { top: 66 + BRAND } : undefined} className="ms-chips" role="group" aria-label="Filtros">
        {route && <button type="button" className="ms-chip on" onClick={() => setRouteId(null)} aria-label={`Remover o roteiro ${route.name}`}><Icon n="route" s={14} c="currentColor" />{route.name}<Icon n="close" s={14} c="currentColor" /></button>}
        {hood && <button type="button" className="ms-chip on" onClick={() => f.setHoods([])} aria-label={`Remover o bairro ${hood}`}><Icon n="pin" s={14} c="currentColor" />{hood}<Icon n="close" s={14} c="currentColor" /></button>}
        {city && <button type="button" className="ms-chip on" onClick={() => f.setCities([])} aria-label={`Remover a cidade ${city}`}><Icon n="globe" s={14} c="currentColor" />{city}<Icon n="close" s={14} c="currentColor" /></button>}
        {multiCity && !cityNav && !city && <button type="button" className="ms-chip" tabIndex={preview ? -1 : 0} onClick={() => !preview && setPanel('cidades')}><Icon n="globe" s={14} c="currentColor" />Cidades</button>}
        {anyHours && <button type="button" className={'ms-chip' + (f.openNow ? ' on' : '')} aria-pressed={!!f.openNow} tabIndex={preview ? -1 : 0} onClick={() => !preview && f.setOpenNow(!f.openNow)}><span className="opn"><i aria-hidden="true" />Abertos agora</span></button>}
        {f.toggleNear && <button type="button" className={'ms-chip' + (f.near ? ' on' : '')} aria-pressed={!!f.near} tabIndex={preview ? -1 : 0} onClick={() => !preview && f.toggleNear(!f.near)}><Icon n="route" s={14} c="currentColor" />Ao meu redor</button>}
        <button type="button" className={'ms-chip' + (!f.cats.length && !arriving ? ' on' : '')} tabIndex={preview ? -1 : 0} onClick={() => { f.setCats([]); setAll(true) }}>Todos</button>
        {usedCats.map((c) => <button key={c.id} type="button" className={'ms-chip' + (f.cats.length === 1 && f.cats[0] === c.id ? ' on' : '')} tabIndex={preview ? -1 : 0} onClick={() => f.setCats([c.id])}><span className="ms-dot" style={{ background: c.color }} />{c.name}</button>)}
      </div>
      {sel && snap !== 'full' && (
        <div className="ms-card" style={{ bottom: (tabs ? tabH : 0) + visible + 10 }} role="button" tabIndex={preview ? -1 : 0} onClick={() => !preview && openFicha?.(sel.id)} onKeyDown={(e) => e.key === 'Enter' && !preview && openFicha?.(sel.id)}>
          <PlacePhoto place={sel} theme={theme} size={56} />
          <div className="sp"><b className="ms-n">{sel.name}</b><span className="ms-s">{sub(sel, theme)}</span></div>
          <button type="button" className={'ms-bm solo' + (isSaved(sel.id) ? ' on' : '')} aria-label={isSaved(sel.id) ? 'Remover dos salvos' : 'Salvar'} onClick={(e) => { e.stopPropagation(); !preview && saved?.toggle(sel.id) }}><Icon n="heart" s={18} c="currentColor" /></button>
        </div>)}
      <section className={'ms-sheet' + (drag ? ' drag' : '')} style={{ top: head, height: hs, transform: `translateY(${y}px)` }} aria-label="Lugares do mapa">
        <div className="ms-grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="button" tabIndex={preview ? -1 : 0} aria-label="Arrastar para abrir ou fechar a lista" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek') }}>
          <i className="ms-bar" />
          <div className="ms-sh">{!(arriving && snap === 'full') && <><b className="pt">{route ? route.name : hood || 'Lugares'}</b><span className="ms-count">{shown.length}</span></>}<span className="sp" /><span className="ms-hint">{snap === 'full' ? 'Ver mapa' : 'Ver lista'}</span></div>
        </div>
        {!preview && !arriving && !route && <div className="ms-subnav" role="group" aria-label="Filtrar lugares">
          {[['bairros', cityNav ? city || 'Cidades' : hood || 'Bairros', cityNav ? 'globe' : 'map', cityNav ? !!city : !!hood], ['categorias', (f.cats.length === 1 && theme.categories.find((c) => c.id === f.cats[0])?.name) || 'Categorias', 'grid', f.cats.length === 1]].map(([k, label, icon, on]) => <button key={k} type="button" className={on ? 'on' : ''} aria-haspopup="dialog" onClick={() => setPanel(k)}><Icon n={icon} s={15} c="currentColor" /><span>{label}</span><i aria-hidden="true">▾</i></button>)}
        </div>}
        <div className="ms-scroll">
          {arriving ? <Arrival data={data} theme={theme} onOpen={openFicha} onAll={() => { setAll(true); setSnap('full') }} onHood={(h) => { f.setHoods([h]); setSnap('half') }} /> : route ? <RouteBody creator={data.creator} key={route.id} route={route} places={places} theme={theme} openFicha={openFicha} preview={preview} onMap={() => setSnap('peek')} renderList={() => <div className="ms-list">{shown.map(row)}</div>} /> : <>
          {preview && theme.bio && <p className="ms-bio">{theme.bio}</p>}
          {preview && news.length > 0 && <section className="ms-new" aria-label="Últimos lugares"><div className="ms-sec" style={{ marginTop: 0 }}>Últimos lugares</div><div className="ms-newrow">{news.map((p) => <button key={p.id} type="button" className="ms-nc" tabIndex={preview ? -1 : 0} onClick={() => !preview && openFicha(p.id)}><PlacePhoto place={p} theme={theme} aspect="4/3" style={{ width: '100%', borderRadius: 'var(--r)' }} /><b className="pt" style={{ '--fs': '16px' }}>{p.name}</b><span className="ms-s">{p.neighborhood || p.municipality || 'São Paulo'}</span></button>)}</div></section>}
          {shown.length === 0 && !preview && f.openNow ? <NoneOpen onClear={() => f.setOpenNow(false)} /> : shown.length === 0 && !preview
            ? <NoResult term={f.q?.trim()} cats={usedCats.slice(0, 4)} onPick={(id) => { f.clear(); f.setCats([id]) }} onRequest={f.q?.trim() ? onRequest : null} requested={requested} />
            : <div className="ms-list">{shown.map(row)}</div>}</>}
          {!preview && creator.showBrand !== false && <div className="pfoot">Mapa feito com <b>JoyMap</b></div>}
        </div>
      </section>
      {panel === 'bairros' && !cityNav && (
        <Panel bottom={tabs ? tabH : 0} title="Bairros" onClose={() => setPanel(null)}>
          <button type="button" className={'ms-opt' + (!hood ? ' on' : '')} onClick={showAll}><span className="sp">Todos os bairros</span><i>{places.length}</i></button>
          {hoods.map(([h, n]) => <button key={h} type="button" className={'ms-opt' + (hood === h ? ' on' : '')} onClick={() => pick(() => f.setHoods([h]))}><span className="sp">{h}</span><i>{n}</i></button>)}
        </Panel>)}
      {(panel === 'cidades' || (panel === 'bairros' && cityNav)) && (
        <Panel bottom={tabs ? tabH : 0} title="Cidades" onClose={() => setPanel(null)}>
          <button type="button" className={'ms-opt' + (!city ? ' on' : '')} onClick={showAll}><span className="sp">Todas as cidades</span><i>{places.length}</i></button>
          {cities.map(([c, n]) => <button key={c} type="button" className={'ms-opt' + (city === c ? ' on' : '')} onClick={() => pick(() => { f.setCities([c]); f.setHoods?.([]) })}><span className="sp">{c}</span><i>{n}</i></button>)}
        </Panel>)}
      {panel === 'categorias' && (
        <Panel bottom={tabs ? tabH : 0} title="Categorias" onClose={() => setPanel(null)}>
          <button type="button" className={'ms-opt' + (!f.cats.length ? ' on' : '')} onClick={showAll}><span className="sp">Todas as categorias</span><i>{places.length}</i></button>
          {usedCats.map((c) => { const { n, sym } = symOf(c, creator.symbols); return <button key={c.id} type="button" className={'ms-opt' + (f.cats.length === 1 && f.cats[0] === c.id ? ' on' : '')} onClick={() => pick(() => f.setCats([c.id]))}><span className="ms-oi" style={{ background: c.color }}><Icon n={n} sym={sym} s={16} c="#fff" /></span><span className="sp">{c.name}</span><i>{catCount(c.id)}</i></button> })}
        </Panel>)}
      {panel === 'busca' && (
        <Panel bottom={tabs ? tabH : 0} title="Busca" onClose={() => setPanel(null)} tall>
          <label className="psearch"><Icon n="search" s={18} c="currentColor" /><input autoFocus value={f.q} onChange={(e) => f.setQ?.(e.target.value)} placeholder="Buscar restaurante, bairro ou rua" aria-label="Buscar neste mapa" /></label>
          {found.slice(0, 30).map((p) => <button key={p.id} type="button" className="ms-opt" onClick={() => { setPanel(null); openFicha?.(p.id) }}><PlacePhoto place={p} theme={theme} size={40} /><span className="sp">{p.name}</span></button>)}
          {f.q?.trim() && !found.length && <p className="ms-empty">Nada encontrado.</p>}
          {f.q && <button type="button" className="ms-opt" onClick={() => f.setQ?.('')}><span className="sp">Limpar a busca</span></button>}
        </Panel>)}
      {panel === 'roteiros' && (
        <Panel bottom={tabs ? tabH : 0} title="Roteiros" onClose={() => setPanel(null)} full>
          {(data.routes || []).length === 0 && <p className="ms-empty">Este criador ainda não montou roteiros.</p>}
          {(data.routes || []).map((r) => { const rp = r.placeIds.map((id) => places.find((p) => p.id === id)).filter(Boolean); return (
            <button key={r.id} type="button" className={'ms-route' + (r.sponsor ? ' has-sp' : '')} style={r.color && !r.sponsor ? { background: r.color, color: onColor(r.color) } : undefined} onClick={() => pick(() => setRouteId(r.id))}>
              {r.sponsor && <span className="rc-top"><SponsorTag s={r.sponsor} /><SponsorMark s={r.sponsor} /></span>}
              <span className="rc-head"><b className="pt">{r.name}</b><span className="ms-stack"><RouteEmojis places={rp} theme={theme} /><Icon n="next" s={20} c="currentColor" /></span></span>
              {r.note && <><hr /><p className="rc-note">{r.note}</p></>}
            </button>) })}
        </Panel>)}
      {panel === 'salvos' && (
        <Panel bottom={tabs ? tabH : 0} title="Salvos" onClose={() => setPanel(null)} tall>
          <div className="ms-sec">{saved?.logged ? 'Na sua conta' : 'Neste aparelho'} ({places.filter((p) => isSaved(p.id)).length})</div>
          {places.filter((p) => isSaved(p.id)).map((p) => <button key={p.id} type="button" className="ms-opt" onClick={() => { setPanel(null); openFicha?.(p.id) }}><PlacePhoto place={p} theme={theme} size={40} /><span className="sp">{p.name}</span></button>)}
          {!places.some((p) => isSaved(p.id)) && <p className="ms-empty">Toque no coração de um lugar para salvar.</p>}
          {saved && <SavedNote saved={saved} slug={creator.slug} />}
          {creator.showBrand !== false && <div className="pfoot">Mapa feito com <b>JoyMap</b></div>}
        </Panel>)}
      {tabs && <PubTabs cityNav={cityNav} noRoutes={data.creator.routesOn === false} navRef={tabRef} cur={panel === 'busca' || panel === 'roteiros' ? panel : route ? 'roteiros' : arriving ? 'sobre' : 'lugares'} href={href || ((q) => q)} preview={preview} onOpen={preview ? undefined : (k) => (k === 'sobre' ? home('full') : k === 'lugares' ? showAll() : setPanel(panel === k ? null : k))} />}
    </div>
  )
}

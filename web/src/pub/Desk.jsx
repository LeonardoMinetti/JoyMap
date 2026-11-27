import { catsOf } from '../../../server/categories.js'
import React, { useEffect, useMemo, useState } from 'react'
import { Icon } from '../lib/icons.jsx'
import MapCanvas from '../MapCanvas.jsx'
import Arrival from './Arrival.jsx'
import PlaceFicha from './PlaceFicha.jsx'
import { catOf, fmtDate, initial, onColor, symOf } from '../theme.jsx'
import { PlacePhoto, NoResult, RouteBody, SponsorMark, SponsorTag, OpenTag, HoursBlock, NoneOpen, SavedNote, AccountBtn, BrandMark, BRAND_LINE, InstaLink, sub, PostLink, RouteEmojis } from './shared.jsx'
import { cityOf, citiesOf, byCity, routePath, hasHours, newest, withExtras } from './extras.js'
import VisitButton from './VisitButton.jsx'
import { googleSearchUrl } from '../../../server/placelinks.js'

// Mapa no computador: painel largo com o conteúdo à esquerda e o mapa à direita (organização inspirada em guias como o Viver SP),
// com o mesmo design do celular: cores, fonte, cantos, chips e cartões do criador.

function Card({ p, theme, saved, onOpen, preview }) {
  const cat = catOf(theme, p.category)
  const on = saved?.ids.includes(p.id)
  return (
    <article className="dk-card" role="button" tabIndex={0} onClick={() => onOpen(p.id)} onKeyDown={(e) => e.key === 'Enter' && onOpen(p.id)}>
      <div className="dk-ph">
        <PlacePhoto place={p} theme={theme} aspect="4/3" style={{ width: '100%', borderRadius: 'var(--r)' }} />
        <button type="button" className={'ms-bm' + (on ? ' on' : '')} aria-label={on ? 'Remover dos salvos' : 'Salvar'} aria-pressed={!!on} onClick={(e) => { e.stopPropagation(); saved?.toggle(p.id) }}><Icon n="heart" s={16} c="currentColor" /></button>
      </div>
      <b className="pt dk-t">{p.name}</b>
      {p.about && <p className="pl-about">{p.about}</p>}
      <span className="ms-s">{p.neighborhood || p.municipality || 'São Paulo'}{p.km != null ? ` · ${p.km.toFixed(1).replace('.', ',')} km` : ''}</span>
      <span className="ms-tags"><i style={{ background: cat.color, color: '#fff' }}>{cat.name}</i>{(p.couponNote || p.couponCode) && <i>Cupom</i>}<OpenTag place={p} /></span>
    </article>
  )
}

function DeskFicha({ place, data, ctx, others, onOpen, onBack }) {
  const theme = data.creator.theme
  const hood = place.neighborhood || place.municipality
  return (
    <div className="dk-fi">
      <button type="button" className="pb sm sec dk-back" onClick={onBack}><Icon n="back" s={14} c="currentColor" />Voltar</button>
      <PlaceFicha place={place} data={data} ctx={ctx} />
      {others.length > 0 && <section className="dk-sec2"><div className="dk-sech"><b className="pt" style={{ '--fs': '24px' }}>Outros lugares{hood ? ` em ${hood}` : ''}</b></div><div className="dk-grid">{others.map((p) => <Card key={p.id} p={p} theme={theme} saved={ctx.saved} onOpen={onOpen} />)}</div></section>}
    </div>
  )
}

export default function DeskMap({ data, f, shown, openFicha, go, saved, ctx, fichaPlace, onShare, onRequest, requested, initialView = 'home', initialRouteId = null }) {
  const { creator } = data
  const theme = creator.theme
  const places = data.places
  const [view, setView] = useState(initialRouteId != null ? 'route' : initialView)
  const [routeId, setRouteId] = useState(initialRouteId)
  const [dw, setDw] = useState(() => Math.round(Math.min(860, Math.max(560, innerWidth * 0.54))))
  useEffect(() => { const r = () => setDw(Math.round(Math.min(860, Math.max(560, innerWidth * 0.54)))); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r) }, [])
  const [pop, setPop] = useState(null) // menu aberto: 'bairros' | 'categorias' | 'busca'
  const closeT = React.useRef(null)
  const openPop = (k) => { clearTimeout(closeT.current); setPop(k) }
  const closePop = () => { clearTimeout(closeT.current); closeT.current = setTimeout(() => setPop((k) => (k === 'busca' ? k : null)), 220) }
  useEffect(() => { if (!pop) return; const k = (e) => e.key === 'Escape' && setPop(null); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [pop])
  const pickMenu = (fn) => { fn(); setPop(null); setView('home'); setRouteId(null); if (fichaPlace) go('/') }
  const scroller = React.useRef(null)
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }) }, [fichaPlace?.id, view, routeId])
  const route = routeId != null ? data.routes.find((r) => r.id === routeId) : null
  const list = route && view === 'route' ? withExtras(shown, route).filter((p) => route.placeIds.includes(p.id)) : shown
  const usedCats = theme.categories.filter((c) => places.some((p) => catsOf(p).includes(c.id))).sort((a, b) => a.name.localeCompare(b.name))
  const cities = useMemo(() => citiesOf(places), [places])
  const multiCity = cities.length > 1
  const cityNav = byCity(places)
  const pickCity = (c) => { f.setCities(c ? [c] : []); f.setHoods?.([]); setView('home'); setRouteId(null); if (fichaPlace) go('/') }
  const city = f.cities?.length === 1 ? f.cities[0] : null
  const anyHours = hasHours(places)
  const [cityMenu, setCityMenu] = useState(false)
  const cityT = React.useRef(null)
  const openCities = () => { clearTimeout(cityT.current); setCityMenu(true) }
  const closeCities = () => { clearTimeout(cityT.current); cityT.current = setTimeout(() => setCityMenu(false), 220) }
  useEffect(() => { if (!cityMenu) return; const k = (e) => e.key === 'Escape' && setCityMenu(false); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [cityMenu])
  const hoods = useMemo(() => Object.entries(places.filter((p) => !city || cityOf(p) === city).reduce((m, p) => { const h = p.neighborhood || p.municipality || 'São Paulo'; m[h] = (m[h] || 0) + 1; return m }, {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])), [places, city])
  const news = [] // os últimos lugares agora abrem a tela de chegada
  const newIds = new Set(news.map((p) => p.id))
  const hood = f.hoods?.length === 1 ? f.hoods[0] : null
  const savedPlaces = places.filter((p) => saved.ids.includes(p.id))
  const [all, setAll] = useState(() => new URLSearchParams(location.search).get('p') === 'lugares') // lista de lugares (fora da chegada)
  const nav = (v) => { setView(v); setRouteId(null); if (fichaPlace) go('/') }
  // voltar à chegada: tocar no nome do criador
  const home = () => { setPop(null); setAll(false); nav('home'); f.clear?.(); f.setHoods?.([]); f.setCities?.([]); f.setQ?.(''); f.setOpenNow?.(false); if (f.near) f.toggleNear?.(false) }
  // lista completa com um toque: sai do roteiro e limpa filtros e busca
  const showAll = () => { setPop(null); setAll(true); nav('home'); f.clear?.(); f.setHoods?.([]); f.setCities?.([]); f.setQ?.(''); f.setOpenNow?.(false); if (f.near) f.toggleNear?.(false) }
  const filtered = !!(f.active || f.openNow || f.near || f.q || f.cats.length || hood || city)
  // depois de qualquer filtro, tirar o filtro volta à lista de lugares; o Sobre abre pelo menu ou pelo nome
  useEffect(() => { if (filtered) setAll(true) }, [filtered])
  const about = view === 'home' && !all && !filtered && !fichaPlace
  const listing = view === 'home' && !about && !fichaPlace // aba Lugares: mostra Bairros e Categorias logo abaixo
  const routing = (view === 'roteiros' || view === 'route') && !fichaPlace
  const catName = f.cats.length === 1 ? theme.categories.find((c) => c.id === f.cats[0])?.name : null
  const sub2 = [['bairros', cityNav ? city || 'Cidades' : hood || 'Bairros', cityNav ? 'globe' : 'map', cityNav ? !!city : !!hood], ['categorias', catName || 'Categorias', 'grid', !!catName]]
  const tab = (on, icon, label, click) => <button type="button" className={on ? 'on' : ''} aria-current={on ? 'page' : undefined} onMouseEnter={() => closePop()} onClick={click}><Icon n={icon} s={16} c="currentColor" />{label}</button>
  const others = fichaPlace ? places.filter((p) => p.id !== fichaPlace.id && (p.neighborhood || p.municipality) === (fichaPlace.neighborhood || fichaPlace.municipality)).concat(places.filter((p) => p.id !== fichaPlace.id && (p.neighborhood || p.municipality) !== (fichaPlace.neighborhood || fichaPlace.municipality) && p.category === fichaPlace.category)).slice(0, 4) : []
  const grid = (arr) => <div className="dk-grid">{arr.map((p) => <Card key={p.id} p={p} theme={theme} saved={saved} onOpen={openFicha} />)}</div>
  const sechead = (title, count, right) => <div className="dk-sech"><b className="pt" style={{ '--fs': '24px' }}>{title}</b>{count != null && <span className="ms-count">{count}</span>}<span className="sp" />{right}</div>

  let body
  if (fichaPlace) body = <DeskFicha place={fichaPlace} data={data} ctx={ctx} others={others} onOpen={openFicha} onBack={() => go('/')} />
  else if (view === 'roteiros') body = <>{(data.routes || []).length === 0 && <p className="ms-empty">Este criador ainda não montou roteiros.</p>}<div className="dk-routes">{(data.routes || []).map((r) => { const rp = r.placeIds.map((id) => withExtras(places, r).find((p) => p.id === id)).filter(Boolean); return (
    <button key={r.id} type="button" className={'ms-route' + (r.sponsor ? ' has-sp' : '')} style={r.color && !r.sponsor ? { background: r.color, color: onColor(r.color) } : undefined} onClick={() => { setRouteId(r.id); setView('route') }}>
      {r.sponsor && <span className="rc-top"><SponsorTag s={r.sponsor} /><SponsorMark s={r.sponsor} /></span>}
      <span className="rc-head"><b className="pt">{r.name}</b><span className="ms-stack"><RouteEmojis places={rp} theme={theme} /><Icon n="next" s={20} c="currentColor" /></span></span>
      {r.note && <><hr /><p className="rc-note">{r.note}</p></>}
    </button>) })}</div></>
  else if (view === 'route' && route) body = <><h2 className="pt" style={{ '--fs': '34px', margin: '6px 0 0' }}>{route.name}</h2><RouteBody creator={data.creator} key={route.id} route={route} places={withExtras(places, route)} theme={theme} openFicha={openFicha} renderList={() => grid(list)} /></>
  else if (view === 'salvos') body = <>{sechead(saved.logged ? 'Salvos na sua conta' : 'Salvos neste aparelho', savedPlaces.length)}{savedPlaces.length ? grid(savedPlaces) : <p className="ms-empty">Toque no coração de um lugar para salvar.</p>}<SavedNote saved={saved} slug={creator.slug} /></>
  else if (!all && !filtered) body = <Arrival data={data} theme={theme} onOpen={openFicha} onAll={() => setAll(true)} onHood={(h) => f.setHoods([h])} />
  else body = (
    <>
      {f.cats.length > 0 && (
        <div className="dk-chips" role="group" aria-label="Filtro ativo">
          {usedCats.filter((c) => f.cats.includes(c.id)).map((c) => <button key={c.id} type="button" className="ms-chip on" aria-label={`Tirar filtro ${c.name}`} onClick={() => f.setCats([])}><span className="ms-dot" style={{ background: c.color }} />{c.name} ×</button>)}
        </div>
      )}
      {news.length > 0 && <>
        {sechead('Últimos lugares', null, anyHours && <button type="button" className="ms-chip" aria-pressed={f.openNow} onClick={() => f.setOpenNow(true)}><span className="opn"><i aria-hidden="true" />Abertos agora</span></button>)}
        {grid(news)}
      </>}
      {f.openNow && <div className="dk-chips" role="group" aria-label="Filtro ativo"><button type="button" className="ms-chip on" onClick={() => f.setOpenNow(false)} aria-label="Tirar filtro Abertos agora"><span className="opn"><i aria-hidden="true" />Abertos agora</span> ×</button></div>}
      {sechead(hood || city || (news.length ? 'Mais lugares' : 'Lugares'), list.length - (news.length ? news.length : 0), cityNav && city ? <button type="button" className="ms-chip on" onClick={() => f.setCities([])} aria-label={`Remover a cidade ${city}`}><Icon n="globe" s={14} c="currentColor" />{city}<Icon n="close" s={14} c="currentColor" /></button> : hood && <button type="button" className="ms-chip on" onClick={() => f.setHoods([])} aria-label={`Remover o bairro ${hood}`}><Icon n="pin" s={14} c="currentColor" />{hood}<Icon n="close" s={14} c="currentColor" /></button>)}
      {list.length === 0 && f.openNow ? <NoneOpen onClear={() => f.setOpenNow(false)} /> : list.length === 0 ? <NoResult term={f.q?.trim()} cats={usedCats.slice(0, 4)} onPick={(id) => { f.clear(); f.setCats([id]) }} onRequest={f.q?.trim() ? onRequest : null} requested={requested} /> : grid(news.length ? list.filter((p) => !newIds.has(p.id)) : list)}
    </>
  )

  return (
    <div className="dkroot" style={{ '--dw': `${dw}px` }}>
      <section className="dk-side" aria-label="Lugares do mapa">
        <header className="dk-head">
          {creator.showBrand !== false && <div className="jm-row">
            <div className="jm-col"><BrandMark /><span className="jm-tag">{BRAND_LINE}</span></div>
            <div className="jm-own"><div><h1 className="pt jm-home" role="button" tabIndex={0} onClick={home} onKeyDown={(e) => e.key === 'Enter' && home()}>{creator.displayName}</h1><span className="ms-hs">@{creator.handle}</span><InstaLink creator={creator} className="ig-link" /></div>{creator.avatarUrl ? <img className="pav" src={creator.avatarUrl} alt="" /> : <span className="pav">{initial(creator.displayName)}</span>}</div>
          </div>}
          <div className={'dk-id' + (creator.showBrand !== false ? ' dk-tools' : '')}>
            {creator.showBrand !== false ? <span className="sp" /> : <>{creator.avatarUrl ? <img className="pav" src={creator.avatarUrl} alt="" /> : <span className="pav">{initial(creator.displayName)}</span>}
            <div className="sp"><h1 className="pt jm-home" style={{ '--fs': '28px' }} role="button" tabIndex={0} onClick={home} onKeyDown={(e) => e.key === 'Enter' && home()}>{creator.displayName}</h1><span className="ms-hs">@{creator.handle}</span><InstaLink creator={creator} className="ig-link" /></div></>}
            <button type="button" className="ms-ib" aria-label="Salvos" onClick={() => nav('salvos')}><Icon n="heart" s={20} c="currentColor" /></button>
            <button type="button" className="ms-ib" aria-label="Compartilhar" onClick={onShare}><Icon n="share" s={20} c="currentColor" /></button>
            <AccountBtn slug={creator.slug} />
          </div>
          <div className="dk-navwrap">
            <nav className="dk-nav" aria-label="Navegação do mapa">
              {tab(about, 'user', 'Sobre', home)}
              {tab(listing, 'pin', 'Lugares', showAll)}
              {data.creator.routesOn !== false && tab(routing, 'route', 'Roteiros', () => { setPop(null); nav('roteiros') })}
              <button type="button" className={'dk-lupa' + (pop === 'busca' || f.q ? ' open' : '')} aria-label="Busca" aria-haspopup="true" aria-expanded={pop === 'busca'} onMouseEnter={() => clearTimeout(closeT.current)} onClick={() => (pop === 'busca' ? setPop(null) : openPop('busca'))}><Icon n="search" s={16} c="currentColor" />Busca</button>
            </nav>
            {listing && <div className="dk-subnav" role="group" aria-label="Filtrar lugares">
              {sub2.map(([k, label, icon, on]) => <button key={k} type="button" className={(on ? 'on' : '') + (pop === k ? ' open' : '')} aria-haspopup="true" aria-expanded={pop === k} onMouseEnter={() => openPop(k)} onMouseLeave={closePop} onFocus={() => openPop(k)} onClick={() => (pop === k ? setPop(null) : openPop(k))}><Icon n={icon} s={15} c="currentColor" />{label}<span aria-hidden="true">▾</span></button>)}
            </div>}
            {pop === 'busca' && <div className="dk-pop dk-find">
              <label className="dk-search"><Icon n="search" s={16} c="currentColor" /><input autoFocus value={f.q} onChange={(e) => { f.setQ?.(e.target.value); if (view !== 'home') { setView('home'); setRouteId(null) } if (fichaPlace) go('/') }} onKeyDown={(e) => e.key === 'Enter' && setPop(null)} placeholder="Buscar restaurante, bairro ou rua" aria-label="Buscar neste mapa" /></label>
              {f.q && <button type="button" className="all" onClick={() => { f.setQ?.(''); setPop(null) }}>Limpar</button>}
            </div>}
            {pop && pop !== 'busca' && <div className="dk-pop" onMouseEnter={() => clearTimeout(closeT.current)} onMouseLeave={closePop} role="menu" aria-label={pop === 'bairros' ? (cityNav ? 'Cidades' : 'Bairros') : 'Categorias'}>
              <button type="button" role="menuitem" className={'all' + ((pop === 'bairros' ? (cityNav ? !city : !f.hoods?.length) : !f.cats.length) ? ' on' : '')} onClick={showAll}>{pop === 'bairros' ? (cityNav ? 'Todas as cidades' : 'Todos os bairros') : 'Todas as categorias'}</button>
              {pop === 'bairros' && cityNav
                ? <>{cities.map(([c, n]) => <button key={c} type="button" role="menuitem" className={city === c ? 'on' : ''} onClick={() => { setPop(null); pickCity(c) }}>{c}<i>{n}</i></button>)}</>
                : pop === 'bairros'
                ? <>{hoods.map(([h, n]) => <button key={h} type="button" role="menuitem" className={f.hoods?.length === 1 && f.hoods[0] === h ? 'on' : ''} onClick={() => pickMenu(() => f.setHoods([h]))}>{h}<i>{n}</i></button>)}</>
                : <>{usedCats.map((c) => <button key={c.id} type="button" role="menuitem" className={f.cats.length === 1 && f.cats[0] === c.id ? 'on' : ''} onClick={() => pickMenu(() => f.setCats([c.id]))}>{c.name}<i>{places.filter((p) => catsOf(p).includes(c.id)).length}</i></button>)}</>}
            </div>}
          </div>
        </header>
        <div className="dk-scroll" ref={scroller}>
          {body}
          {creator.showBrand !== false && <div className="pfoot">Mapa feito com <b>JoyMap</b></div>}
        </div>
      </section>
      <div className="dk-map">
        <MapCanvas places={list} follow={places} followZoom={city && !hood ? 12 : 14} path={route && view === 'route' ? routePath(route) : undefined} theme={theme} symbols={creator.symbols} selectedId={fichaPlace ? fichaPlace.id : null} onSelect={(id) => openFicha(id)} extra={f.near} zoomPos="topright" fitPad={{ top: 50, bottom: 50 }} style={{ height: '100%', position: 'absolute', inset: 0 }} />
        {multiCity && !cityNav && (
          <div className="dk-cities" onMouseEnter={() => clearTimeout(cityT.current)} onMouseLeave={closeCities}>
            <button type="button" className={'ms-chip' + (city ? ' sel' : '')} aria-haspopup="true" aria-expanded={cityMenu} onMouseEnter={openCities} onClick={openCities}><Icon n="globe" s={16} c="currentColor" />{city || 'Cidades'}<span aria-hidden="true">▾</span></button>
            {cityMenu && <div className="dk-pop dk-citypop" role="menu" aria-label="Cidades">
              <button type="button" role="menuitem" className={'all' + (city ? '' : ' on')} onClick={() => { setCityMenu(false); showAll() }}>Todas as cidades<i>{places.length}</i></button>
              {cities.map(([c, n]) => <button key={c} type="button" role="menuitem" className={city === c ? 'on' : ''} onClick={() => { setCityMenu(false); pickCity(c) }}>{c}<i>{n}</i></button>)}
            </div>}
          </div>)}
        <div className="dk-pills">
          {anyHours && <button type="button" className={'ms-chip' + (f.openNow ? ' on' : '')} aria-pressed={!!f.openNow} onClick={() => { f.setOpenNow(!f.openNow); setView('home'); setRouteId(null); if (fichaPlace) go('/') }}><span className="opn"><i aria-hidden="true" />Abertos agora</span></button>}
          {f.toggleNear && <button type="button" className={'ms-chip' + (f.near ? ' on' : '')} aria-pressed={!!f.near} onClick={() => f.toggleNear(!f.near)}><Icon n="route" s={14} c="currentColor" />Ao meu redor</button>}
        </div>
      </div>
    </div>
  )
}

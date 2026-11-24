import React, { useEffect, useMemo, useState } from 'react'
import { Icon } from '../lib/icons.jsx'
import MapCanvas from '../MapCanvas.jsx'
import { catOf, fmtDate, initial, onColor, symOf } from '../theme.jsx'
import { PlacePhoto, NoResult, RouteBody, SponsorMark, SponsorTag, OpenTag, HoursBlock, NoneOpen, SavedNote, sub } from './shared.jsx'
import { cityOf, citiesOf, hasHours, newest } from './extras.js'
import VisitButton from './VisitButton.jsx'
import { googleSearchUrl } from '../../../server/placelinks.js'

// Mapa no computador: painel largo com o conteúdo à esquerda e o mapa à direita (organização inspirada em guias como o Viver SP),
// com o mesmo design do celular: cores, fonte, cantos, chips e cartões do criador.
const NAV = [['home', 'Início', 'store'], ['bairros', 'Bairros', 'map', true], ['categorias', 'Categorias', 'grid', true], ['roteiros', 'Roteiros', 'route']]

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
      <span className="ms-s">{p.neighborhood || p.municipality || 'São Paulo'}{p.km != null ? ` · ${p.km.toFixed(1).replace('.', ',')} km` : ''}</span>
      <span className="ms-tags"><i style={{ background: cat.color, color: '#fff' }}>{cat.name}</i>{(p.couponNote || p.couponCode) && <i>Cupom</i>}<OpenTag place={p} /></span>
    </article>
  )
}

function DeskFicha({ place, data, ctx, others, onOpen, onBack }) {
  const { creator } = data
  const theme = creator.theme
  const cat = catOf(theme, place.category)
  const exact = place.geoQuality === 'address_exact'
  const isSaved = ctx.saved.ids.includes(place.id)
  const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`
  const hood = place.neighborhood || place.municipality
  return (
    <div className="dk-fi">
      <button type="button" className="pb sm sec dk-back" onClick={onBack}><Icon n="back" s={14} c="currentColor" />Voltar</button>
      <div className="dk-fi-top">
        <PlacePhoto place={place} theme={theme} aspect="1/1" style={{ width: '100%', borderRadius: 'var(--r)' }} label="Foto do lugar" />
        <div className="dk-fi-info">
          <h1 className="pt" style={{ '--fs': '38px' }}>{place.name}</h1>
          <div className="ms-tags" style={{ marginTop: 0 }}><i style={{ background: cat.color, color: '#fff' }}>{cat.name}</i>{hood && <i>{hood}</i>}<i>@{creator.handle}</i>{place.ad && <i>Publi</i>}</div>
          <div><span className="ms-sec" style={{ marginTop: 0 }}>Endereço</span><p className="dk-p">{place.address || 'Endereço não informado'}</p><span className="xs mut">{exact ? 'Endereço exato' : 'Localização aproximada (a confirmar)'}</span></div>
          <div className="prow">
            <a className="pb sp" href={routeUrl} target="_blank" rel="noopener noreferrer" onClick={() => ctx.track('route_click', { placeId: place.id })}><Icon n="route" s={18} c="currentColor" />Abrir rota</a>
            <button className="pb sec" aria-pressed={isSaved} onClick={() => ctx.saved.toggle(place.id)}><Icon n="heart" s={16} c={isSaved ? '#d93a1c' : 'currentColor'} />{isSaved ? 'Salvo' : 'Salvar'}</button>
            <button className="pb sec" aria-label="Compartilhar" onClick={() => ctx.share(place)}><Icon n="share" s={18} c="currentColor" /></button>
          </div>
          <div className="prow"><a className="pb sm sec sp" href={place.googleUrl || googleSearchUrl(place)} target="_blank" rel="noopener noreferrer"><Icon n="ext" s={14} c="currentColor" />{place.googleUrl ? 'Ver no Google' : 'Buscar no Google'}</a>{place.instagramUrl && <a className="pb sm sec sp" href={place.instagramUrl} target="_blank" rel="noopener noreferrer"><Icon n="insta" s={14} c="currentColor" />Instagram do lugar</a>}</div>
        </div>
      </div>
      <HoursBlock place={place} />
      {(place.couponNote || place.couponCode) && <div className="box" style={{ gap: 4 }}><span className="xs mut" style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>Cupom ou desconto</span>{place.couponNote && <b className="sm">{place.couponNote}</b>}{place.couponCode && <span className="sm">Código: <b style={{ letterSpacing: '.04em' }}>{place.couponCode}</b></span>}<span className="xs mut">Confirme com o estabelecimento antes de ir.</span></div>}
      <div className="box">
        <span className="ms-sec" style={{ marginTop: 0 }}>Quem indicou</span>
        <div className="prow"><div className="pav" style={{ width: 36, height: 36, fontSize: 16 }}>{initial(creator.displayName)}</div><div className="sp"><b className="sm">{creator.displayName}</b><div className="xs mut">{place.postedOn ? fmtDate(place.postedOn) : 'Indicado pelo criador'}</div></div></div>
        {place.note && <p className="dk-p">“{place.note}”</p>}
        {(place.tiktokId || place.postUrl) && <div className="prow">{place.tiktokId && <button className="pb sm sp" onClick={() => ctx.video(place.id)}><Icon n="play" s={14} c="currentColor" />Ver vídeo</button>}{place.postUrl && <a className={'pb sm sp' + (place.tiktokId ? ' sec' : '')} href={place.postUrl} target="_blank" rel="noopener noreferrer" onClick={() => ctx.track('post_open', { placeId: place.id })}>Abrir post</a>}</div>}
      </div>
      <div className="prow">{!creator.demo && <VisitButton slug={creator.slug} placeId={place.id} />}<button className="pb sm sec" onClick={() => ctx.report(place)}>Informar erro</button><span className="xs mut sp">Informações podem estar desatualizadas. Confirme com o estabelecimento.</span></div>
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
  const [pop, setPop] = useState(null) // menu aberto: 'bairros' | 'categorias'
  const closeT = React.useRef(null)
  const openPop = (k) => { clearTimeout(closeT.current); setPop(k) }
  const closePop = () => { clearTimeout(closeT.current); closeT.current = setTimeout(() => setPop(null), 160) }
  useEffect(() => { if (!pop) return; const k = (e) => e.key === 'Escape' && setPop(null); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [pop])
  const pickMenu = (fn) => { fn(); setPop(null); setView('home'); setRouteId(null); if (fichaPlace) go('/') }
  const scroller = React.useRef(null)
  useEffect(() => { scroller.current?.scrollTo({ top: 0 }) }, [fichaPlace?.id, view, routeId])
  const route = routeId != null ? data.routes.find((r) => r.id === routeId) : null
  const list = route && view === 'route' ? shown.filter((p) => route.placeIds.includes(p.id)) : shown
  const usedCats = theme.categories.filter((c) => places.some((p) => p.category === c.id))
  const cities = useMemo(() => citiesOf(places), [places])
  const multiCity = cities.length > 1
  const city = f.cities?.length === 1 ? f.cities[0] : null
  const anyHours = hasHours(places)
  const [cityMenu, setCityMenu] = useState(false)
  const hoods = useMemo(() => Object.entries(places.filter((p) => !city || cityOf(p) === city).reduce((m, p) => { const h = p.neighborhood || p.municipality || 'São Paulo'; m[h] = (m[h] || 0) + 1; return m }, {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])), [places, city])
  const news = !f.active && view === 'home' ? newest(places) : []
  const newIds = new Set(news.map((p) => p.id))
  const hood = f.hoods?.length === 1 ? f.hoods[0] : null
  const savedPlaces = places.filter((p) => saved.ids.includes(p.id))
  const nav = (v) => { setView(v); setRouteId(null); if (fichaPlace) go('/') }
  const others = fichaPlace ? places.filter((p) => p.id !== fichaPlace.id && (p.neighborhood || p.municipality) === (fichaPlace.neighborhood || fichaPlace.municipality)).concat(places.filter((p) => p.id !== fichaPlace.id && (p.neighborhood || p.municipality) !== (fichaPlace.neighborhood || fichaPlace.municipality) && p.category === fichaPlace.category)).slice(0, 4) : []
  const grid = (arr) => <div className="dk-grid">{arr.map((p) => <Card key={p.id} p={p} theme={theme} saved={saved} onOpen={openFicha} />)}</div>
  const sechead = (title, count, right) => <div className="dk-sech"><b className="pt" style={{ '--fs': '24px' }}>{title}</b>{count != null && <span className="ms-count">{count}</span>}<span className="sp" />{right}</div>

  let body
  if (fichaPlace) body = <DeskFicha place={fichaPlace} data={data} ctx={ctx} others={others} onOpen={openFicha} onBack={() => go('/')} />
  else if (view === 'roteiros') body = <>{(data.routes || []).length === 0 && <p className="ms-empty">Este criador ainda não montou roteiros.</p>}<div className="dk-routes">{(data.routes || []).map((r) => { const rp = r.placeIds.map((id) => places.find((p) => p.id === id)).filter(Boolean); return (
    <button key={r.id} type="button" className={'ms-route' + (r.sponsor ? ' has-sp' : '')} style={r.color && !r.sponsor ? { background: r.color, color: onColor(r.color) } : undefined} onClick={() => { setRouteId(r.id); setView('route') }}>
      {r.sponsor && <span className="rc-top"><SponsorTag s={r.sponsor} /><SponsorMark s={r.sponsor} /></span>}
      <span className="rc-head"><b className="pt">{r.name}</b><span className="ms-stack">{rp.slice(0, 4).map((p) => <PlacePhoto key={p.id} place={p} theme={theme} size={44} />)}{rp.length > 4 && <em>+{rp.length - 4}</em>}<Icon n="next" s={20} c="currentColor" /></span></span>
      {r.note && <><hr /><p className="rc-note">{r.note}</p></>}
    </button>) })}</div></>
  else if (view === 'route' && route) body = <><button type="button" className="pb sm sec dk-back" onClick={() => { setView('roteiros'); setRouteId(null) }}><Icon n="back" s={14} c="currentColor" />Roteiros</button><h2 className="pt" style={{ '--fs': '34px', margin: '6px 0 0' }}>{route.name}</h2><RouteBody key={route.id} route={route} places={places} theme={theme} openFicha={openFicha} renderList={() => grid(list)} /></>
  else if (view === 'salvos') body = <>{sechead(saved.logged ? 'Salvos na sua conta' : 'Salvos neste aparelho', savedPlaces.length)}{savedPlaces.length ? grid(savedPlaces) : <p className="ms-empty">Toque no coração de um lugar para salvar.</p>}<SavedNote saved={saved} slug={creator.slug} /></>
  else body = (
    <>
      {theme.bio && <p className="dk-lead">{theme.bio}</p>}
      {f.cats.length > 0 && (
        <div className="dk-chips" role="group" aria-label="Filtro ativo">
          {usedCats.filter((c) => f.cats.includes(c.id)).map((c) => <button key={c.id} type="button" className="ms-chip on" aria-label={`Tirar filtro ${c.name}`} onClick={() => f.setCats([])}><span className="ms-dot" style={{ background: c.color }} />{c.name} ×</button>)}
        </div>
      )}
      {news.length > 0 && <>
        {sechead('Novidades', null, anyHours && <button type="button" className="ms-chip" aria-pressed={f.openNow} onClick={() => f.setOpenNow(true)}><span className="opn"><i aria-hidden="true" />Abertos agora</span></button>)}
        {grid(news)}
      </>}
      {f.openNow && <div className="dk-chips" role="group" aria-label="Filtro ativo"><button type="button" className="ms-chip on" onClick={() => f.setOpenNow(false)} aria-label="Tirar filtro Abertos agora"><span className="opn"><i aria-hidden="true" />Abertos agora</span> ×</button></div>}
      {sechead(hood || city || (news.length ? 'Mais lugares' : 'Lugares'), list.length - (news.length ? news.length : 0), hood && <button type="button" className="ms-chip on" onClick={() => f.setHoods([])} aria-label={`Remover o bairro ${hood}`}><Icon n="pin" s={14} c="currentColor" />{hood}<Icon n="close" s={14} c="currentColor" /></button>)}
      {list.length === 0 && f.openNow ? <NoneOpen onClear={() => f.setOpenNow(false)} /> : list.length === 0 ? <NoResult term={f.q?.trim()} cats={usedCats.slice(0, 4)} onPick={(id) => { f.clear(); f.setCats([id]) }} onRequest={f.q?.trim() ? onRequest : null} requested={requested} /> : grid(news.length ? list.filter((p) => !newIds.has(p.id)) : list)}
    </>
  )

  return (
    <div className="dkroot" style={{ '--dw': `${dw}px` }}>
      <section className="dk-side" aria-label="Lugares do mapa">
        <header className="dk-head">
          <div className="dk-id">{creator.avatarUrl ? <img className="pav" src={creator.avatarUrl} alt="" /> : <span className="pav">{initial(creator.displayName)}</span>}
            <div className="sp"><h1 className="pt" style={{ '--fs': '28px' }}>{creator.displayName}</h1><span className="ms-hs">@{creator.handle} · {places.length} lugares</span></div>
            <button type="button" className="ms-ib" aria-label="Salvos" onClick={() => nav('salvos')}><Icon n="heart" s={20} c="currentColor" /></button>
            <button type="button" className="ms-ib" aria-label="Compartilhar" onClick={onShare}><Icon n="share" s={20} c="currentColor" /></button>
          </div>
          <div className="dk-navwrap" onMouseLeave={closePop} onMouseEnter={() => clearTimeout(closeT.current)}>
            <nav className="dk-nav" aria-label="Navegação do mapa">
              {NAV.filter(([k]) => !(k === 'roteiros' && data.creator.routesOn === false)).map(([k, l, ic, menu]) => menu
                ? <button key={k} type="button" className={pop === k ? 'open' : ''} aria-haspopup="true" aria-expanded={pop === k} onMouseEnter={() => openPop(k)} onFocus={() => openPop(k)} onClick={() => (pop === k ? setPop(null) : openPop(k))}><Icon n={ic} s={16} c="currentColor" />{l}</button>
                : <button key={k} type="button" className={(view === k || (view === 'route' && k === 'roteiros')) && !fichaPlace ? 'on' : ''} aria-current={view === k && !fichaPlace ? 'page' : undefined} onMouseEnter={() => closePop()} onClick={() => { setPop(null); nav(k); if (k === 'home') { f.clear?.(); f.setHoods?.([]) } }}><Icon n={ic} s={16} c="currentColor" />{l}</button>)}
              <label className="dk-search"><Icon n="search" s={16} c="currentColor" /><input value={f.q} onChange={(e) => { f.setQ?.(e.target.value); if (view !== 'home') { setView('home'); setRouteId(null) } if (fichaPlace) go('/') }} placeholder="Buscar restaurante, bairro ou rua" aria-label="Buscar neste mapa" /></label>
            </nav>
            {pop && <div className="dk-pop" role="menu" aria-label={pop === 'bairros' ? 'Bairros' : 'Categorias'}>
              {pop === 'bairros'
                ? <>{hoods.map(([h, n]) => <button key={h} type="button" role="menuitem" className={f.hoods?.length === 1 && f.hoods[0] === h ? 'on' : ''} onClick={() => pickMenu(() => f.setHoods([h]))}>{h}<i>{n}</i></button>)}</>
                : <>{usedCats.map((c) => <button key={c.id} type="button" role="menuitem" className={f.cats.length === 1 && f.cats[0] === c.id ? 'on' : ''} onClick={() => pickMenu(() => f.setCats([c.id]))}>{c.name}<i>{places.filter((p) => p.category === c.id).length}</i></button>)}</>}
              <button type="button" role="menuitem" className="all" onClick={() => pickMenu(() => (pop === 'bairros' ? f.setHoods([]) : f.setCats([])))}>{pop === 'bairros' ? 'Todos os bairros' : 'Todas as categorias'}</button>
            </div>}
          </div>
        </header>
        <div className="dk-scroll" ref={scroller}>
          {body}
          {creator.showBrand !== false && <div className="pfoot">Mapa feito com <b>wagli</b></div>}
        </div>
      </section>
      <div className="dk-map">
        <MapCanvas places={list} theme={theme} symbols={creator.symbols} selectedId={fichaPlace ? fichaPlace.id : null} onSelect={(id) => openFicha(id)} extra={f.near} zoomPos="topright" fitPad={{ top: 50, bottom: 50 }} style={{ height: '100%', position: 'absolute', inset: 0 }} />
        {multiCity && (
          <div className="dk-cities" onMouseLeave={() => setCityMenu(false)}>
            <button type="button" className="ms-chip" aria-haspopup="true" aria-expanded={cityMenu} onClick={() => setCityMenu(!cityMenu)}><Icon n="globe" s={16} c="currentColor" />{city || 'Cidades'}</button>
            {cityMenu && <div className="dk-pop dk-citypop" role="menu" aria-label="Cidades">
              {cities.map(([c, n]) => <button key={c} type="button" role="menuitem" className={city === c ? 'on' : ''} onClick={() => { f.setCities([c]); f.setHoods?.([]); setCityMenu(false); setView('home'); setRouteId(null); if (fichaPlace) go('/') }}>{c}<i>{n}</i></button>)}
              <button type="button" role="menuitem" className="all" onClick={() => { f.setCities([]); setCityMenu(false) }}>Todas as cidades</button>
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

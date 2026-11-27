// Roteiro por dias (card e página). As paradas podem ser lugares do mapa, lugares só deste roteiro ou pontos de passagem.
import React, { useEffect, useState } from 'react'
import { Icon } from '../lib/icons.jsx'
import { toast } from '../lib/router.jsx'
import { withBase, BASE } from '../lib/base.js'
import { libIcon, libHtml, useLibVersion } from '../iconlib.js'
import { catOf } from '../theme.jsx'
import { track } from '../api.js'
import { sponsorOf } from '../lib/sponsor.js'
import { gmapsRoute } from './extras.js'

export const isGuided = (r) => !!r?.days?.length

// todas as paradas, numeradas em sequência; passagem (sem lugar) ganha um id negativo
export function guidedStops(route, places) {
  const byId = new Map([...places, ...(route.extraPlaces || [])].map((p) => [p.id, p]))
  let n = 0
  return route.days.flatMap((d, di) => d.stops.map((s) => {
    n++
    const place = s.placeId != null ? byId.get(s.placeId) : null
    return { ...s, n, day: di, place, id: place ? place.id : -n, name: place?.name || s.name, lat: place?.lat ?? s.lat, lon: place?.lon ?? s.lon }
  }))
}
// pinos e linha do mapa para o dia escolhido (null = todos)
export function guidedMap(route, places, day) {
  const stops = guidedStops(route, places).filter((s) => day == null || s.day === day)
  const pins = [...new Map(stops.map((s) => [s.id, s.place || { id: s.id, name: s.name, lat: s.lat, lon: s.lon, category: 'tour' }])).values()]
  return { pins, path: stops.map((s) => ({ id: s.id, n: s.n })) }
}

// o dia escolhido sobrevive à ida e volta da ficha (no celular a ficha é outra tela)
const memory = new Map()
export const lastRoute = (slug) => memory.get(slug) || null
export function useDay(slug, route) {
  const [, set] = useState(0)
  const m = memory.get(slug)
  const day = route && m?.id === route.id ? m.day : null
  return [day, (d) => { if (route) memory.set(slug, { id: route.id, day: d }); set((x) => x + 1) }]
}
export const forgetRoute = (slug) => memory.delete(slug)

function Emoji({ id, size = 20 }) {
  useLibVersion()
  const ic = id && libIcon(`lib:fluent3d:${id}`)
  return ic ? <i className="gr-emo" aria-hidden="true" dangerouslySetInnerHTML={{ __html: libHtml(ic, size) }} /> : null
}
const count = (route) => route.days.reduce((n, d) => n + d.stops.length, 0)
const Presented = ({ s }) => <span className="gr-by"><span>Apresentado por</span><span className="gr-logo" style={{ background: s.color }}>{s.logo ? <img src={withBase(s.logo)} alt={s.name} /> : <b>{s.name}</b>}</span></span>

export function GuidedCard({ route, onClick }) {
  const s = sponsorOf(route)
  return (
    <button type="button" className="gr-card" onClick={onClick}>
      {route.cover && <span className="gr-cover"><img src={withBase(route.cover.url)} alt="" loading="lazy" />{s && <em>Roteiro patrocinado</em>}</span>}
      <span className="gr-card-tx">
        <b className="pt">{route.name}</b>
        <span className="gr-sub">{route.subtitle || route.note}</span>
        <span className="gr-meta">{route.days.length} dias · {count(route)} paradas<span className="gr-icons">{(route.themes || []).map((t) => <Emoji key={t.label} id={t.icon} />)}</span></span>
        {s && <Presented s={s} />}
        {s?.status === 'demo' && <span className="gr-demo">Demonstração, sem parceria contratada</span>}
      </span>
    </button>
  )
}

const SAVED = 'joymap:roteiros-salvos'
const readSaved = () => { try { return JSON.parse(localStorage.getItem(SAVED)) || [] } catch { return [] } }

export default function GuidedRoute({ route, places, theme, creator, day, onDay, openFicha, onFocus, focusId }) {
  const slug = creator.slug
  const ev = (type, extra) => track(slug, type, { term: `roteiro:${route.id}`, ...extra })
  const s = sponsorOf(route)
  const [saved, setSaved] = useState(() => readSaved().includes(`${slug}:${route.id}`))
  useEffect(() => { ev('route_view') }, [route.id])
  const stops = guidedStops(route, places)
  const shownDays = route.days.map((d, i) => ({ ...d, i })).filter((d) => day == null || d.i === day)
  const toggleSave = () => {
    const k = `${slug}:${route.id}`
    const next = saved ? readSaved().filter((x) => x !== k) : [...readSaved(), k]
    try { localStorage.setItem(SAVED, JSON.stringify(next)) } catch { toast('Este navegador não deixou guardar.'); return }
    setSaved(!saved); if (!saved) ev('route_save'); toast(saved ? 'Removido dos salvos' : 'Roteiro salvo neste aparelho')
  }
  const share = () => {
    const url = `${location.origin}${BASE}/@${slug}/roteiros/${route.id}`
    ev('route_share')
    const copy = () => navigator.clipboard?.writeText(url).then(() => toast('Link copiado')).catch(() => toast(url))
    if (navigator.share) navigator.share({ title: route.name, url }).catch(() => {}); else copy()
  }
  const pickDay = (d) => { onDay(d); onFocus?.(null); ev('route_day', { results: d == null ? 0 : d + 1 }) }
  const open = (st) => { if (!st.place) return; ev('route_place', { placeId: st.place.id }); openFicha?.(st.place.id) }
  const gm = day != null ? gmapsRoute({ stops: stops.filter((x) => x.day === day).map((x) => ({ placeId: x.id })) }, stops) : null
  return (
    <div className="gr">
      {route.cover && <figure className="gr-hero"><img src={withBase(route.cover.url)} alt={route.name} /><figcaption>Foto: <a href={route.cover.source} target="_blank" rel="noopener noreferrer">{route.cover.credit}</a>, {route.cover.license}, Wikimedia Commons</figcaption></figure>}
      <header>
        {s && <span className="sp-tag gr-tag">Roteiro patrocinado</span>}
        <h2 className="pt gr-title">{route.name}</h2>
        {route.subtitle && <p className="gr-subtitle">{route.subtitle}</p>}
        <div className="gr-creator">{creator.avatarUrl && <img src={creator.avatarUrl} alt="" />}<span>Roteiro de <b>{creator.displayName}</b></span></div>
      </header>
      <p className="gr-note">{route.note}</p>
      <dl className="gr-facts">
        <div><dt>Duração</dt><dd>{route.days.length} dias</dd></div>
        <div><dt>Saída</dt><dd>{route.origin}</dd></div>
        <div><dt>Destinos</dt><dd>{route.destinations?.join(', ')}</dd></div>
        <div><dt>Modalidade</dt><dd>{route.mode}</dd></div>
      </dl>
      <ul className="gr-themes">{(route.themes || []).map((t) => <li key={t.label}><Emoji id={t.icon} size={16} />{t.label}</li>)}</ul>
      {s && <section className="gr-sponsor" style={{ '--sp': s.color }} aria-label={`Apresentado por ${s.name}`}>
        <Presented s={s} />
        {s.description && <p>{s.description}</p>}
        {s.website ? <a className="pb sm" href={s.website} target="_blank" rel="noopener noreferrer sponsored" onClick={() => ev('sponsor_click')}>{s.cta}</a> : <span className="gr-pending">Site oficial a definir</span>}
        {s.coupon?.code && <button type="button" className="pb sec sm" onClick={() => { navigator.clipboard?.writeText(s.coupon.code); ev('coupon_copy'); toast('Cupom copiado') }}>Copiar cupom {s.coupon.code}</button>}
      </section>}
      <div className="gr-acts">
        <button type="button" className="pb sec sm" aria-pressed={saved} onClick={toggleSave}><Icon n="heart" s={16} c={saved ? '#d93a1c' : 'currentColor'} />{saved ? 'Salvo' : 'Salvar'}</button>
        <button type="button" className="pb sec sm" onClick={share}><Icon n="share" s={16} c="currentColor" />Compartilhar</button>
      </div>
      <div className="gr-days" role="group" aria-label="Escolher o dia">
        <button type="button" className={day == null ? 'on' : ''} aria-pressed={day == null} onClick={() => pickDay(null)}>Todos os dias</button>
        {route.days.map((d, i) => <button key={i} type="button" className={day === i ? 'on' : ''} aria-pressed={day === i} onClick={() => pickDay(i)}>Dia {i + 1}</button>)}
      </div>
      {shownDays.map((d) => <section key={d.i} className="gr-day" aria-label={`Dia ${d.i + 1}`}>
        <h3 className="pt">Dia {d.i + 1}: {d.title}</h3>
        <ol>{stops.filter((x) => x.day === d.i).map((st) => <li key={st.n} className={focusId === st.id ? 'on' : ''}>
          <button type="button" className="gr-n" onClick={() => onFocus?.(st.id)} aria-label={`Mostrar ${st.name} no mapa`}>{st.n}</button>
          <div className="gr-stop">
            {st.place
              ? <button type="button" className="gr-name" onClick={() => open(st)}><Emoji id={String(catOf(theme, st.place.category).icon).split(':').pop()} /><span><b>{st.name}</b><small>{st.place.municipality}</small></span><Icon n="next" s={16} c="currentColor" /></button>
              : <span className="gr-name pass"><span><b>{st.name}</b><small>Ponto de passagem</small></span></span>}
            {st.status && <span className={'gr-status ' + st.status}>{st.status === 'confirmado' ? `Visitado por ${creator.displayName.split(' ')[0]}` : 'Visita a confirmar'}</span>}
            {st.image && <figure><img src={st.image.url} alt={st.name} loading="lazy" onClick={() => open(st)} /><figcaption><a href={st.image.source} target="_blank" rel="noopener noreferrer">{st.image.credit}, {st.image.license}</a></figcaption></figure>}
          </div>
        </li>)}</ol>
      </section>)}
      {gm && <a className="pb sec sm gr-maps" href={gm.url} target="_blank" rel="noopener noreferrer"><Icon n="route" s={16} c="currentColor" />Abrir o dia no Google Maps</a>}
      <p className="gr-small">A linha pontilhada do mapa só liga as paradas na ordem: não é o trajeto pela estrada.</p>
      {s?.products.length > 0 && <section className="gr-gear" aria-label="Equipamentos da viagem">
        <h3 className="pt">Equipamentos da viagem</h3>
        <ul>{s.products.map((p) => <li key={p.url}><a href={p.url} target="_blank" rel="noopener noreferrer sponsored" onClick={() => ev('product_click')}>{p.image && <img src={withBase(p.image)} alt="" loading="lazy" />}<span><b>{p.name}</b><small>{p.category}</small><span>{p.description}</span></span></a></li>)}</ul>
      </section>}
      {route.disclaimer && <p className="gr-small gr-disc">{route.disclaimer}</p>}
    </div>
  )
}

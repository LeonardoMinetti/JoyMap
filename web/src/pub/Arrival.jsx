// Chegada ao mapa, antes de qualquer filtro: últimos lugares, quem é o criador, marcas e próximo evento.
import React from 'react'
import { PlacePhoto } from './shared.jsx'
import { Icon } from '../lib/icons.jsx'
import { latest, highlights, brandsOf, nextEvent } from '../lib/arrival.js'

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export default function Arrival({ data, theme, onOpen, onCategory, onHood, onAll }) {
  const { creator, places } = data
  const h = highlights(places, theme.categories)
  const brands = brandsOf(creator)
  const event = nextEvent(creator)
  const first = String(creator.displayName || '').split(' ')[0]
  return (
    <div className="arr">
      <section aria-label={`Sobre ${creator.displayName}`}>
        <h2 className="arr-h">{creator.demo ? 'Sobre este mapa' : `Sobre ${first}`}</h2>
        {theme.bio && <p className="arr-bio">{theme.bio}</p>}
      </section>

      <section aria-label="Últimos lugares">
        <h2 className="arr-h">Últimos lugares</h2>
        <div className="arr-last">
          {latest(places).map((p) => (
            <button key={p.id} type="button" className="arr-pl" onClick={() => onOpen(p.id)}>
              <PlacePhoto place={p} theme={theme} aspect="4/3" style={{ width: '100%', borderRadius: 'var(--r)' }} />
              <b>{p.name}</b><span>{p.neighborhood || p.municipality || 'São Paulo'}</span>
            </button>))}
        </div>
        <button type="button" className="pb arr-all" onClick={onAll}>Ver todos os {places.length} lugares<Icon n="next" s={16} c="currentColor" /></button>
      </section>

      <section aria-label="Onde mais vai">
        {h.hoods.length > 1 && <>
          <h2 className="arr-h">Onde mais vai</h2>
          <div className="arr-chips">{h.hoods.map((b) => <button key={b.name} type="button" className="arr-chip" onClick={() => onHood(b.name)}><Icon n="pin" s={13} c="currentColor" />{b.name}<em>{b.n}</em></button>)}</div>
        </>}
        <span className="arr-sub">O que mais indica</span>
        <div className="arr-chips">{h.cats.map((c) => <button key={c.id} type="button" className="arr-chip" style={{ '--c': c.color }} onClick={() => onCategory(c.id)}><i />{c.name}<em>{c.n}</em></button>)}</div>
      </section>

      {brands.length > 0 && <section aria-label="Marcas parceiras">
        <h2 className="arr-h">Já trabalhou com</h2>
        <ul className="arr-brands">{brands.map((b) => {
          const inner = b.logo ? <img src={b.logo} alt={b.name} /> : <b>{b.name}</b>
          return <li key={b.name}>{b.url ? <a href={b.url} target="_blank" rel="noopener noreferrer sponsored" title={b.name}>{inner}</a> : <span>{inner}</span>}</li>
        })}</ul>
      </section>}

      {event && <section className="arr-event" aria-label="Próximo evento">
        <div className="arr-date"><b>{Number(event.date.slice(8))}</b><span>{MONTHS[Number(event.date.slice(5, 7)) - 1]}</span></div>
        <div className="sp"><span className="arr-sub">Próximo evento</span><b>{event.title}</b>{event.place && <span className="arr-where">{event.place}</span>}</div>
        {event.url && <a className="pb sm" href={event.url} target="_blank" rel="noopener noreferrer">Saber mais</a>}
      </section>}
    </div>
  )
}

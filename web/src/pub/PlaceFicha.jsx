// Ficha do lugar, igual no computador e no celular: imagem à esquerda e informações à direita; descrição e categorias embaixo.
import React from 'react'
import { PlacePhoto, PostLink, OpenTag } from './shared.jsx'
import VisitButton from './VisitButton.jsx'
import { Icon } from '../lib/icons.jsx'
import { catOf } from '../theme.jsx'
import { catsOf } from '../../../server/categories.js'
import { googleSearchUrl } from '../../../server/placelinks.js'
import { DAYS, ratingOf, reviewsText, phoneLink, httpsLink, todayText } from '../lib/placeInfo.js'

const Label = ({ children }) => <span className="fx-label">{children}</span>
const Out = ({ href, children, onClick }) => <a className="fx-link" href={href} target="_blank" rel="noopener noreferrer" onClick={onClick}>{children}<Icon n="ext" s={13} c="currentColor" /></a>

export default function PlaceFicha({ place, data, ctx }) {
  const { creator } = data
  const theme = creator.theme
  const isSaved = ctx.saved.ids.includes(place.id)
  const rating = ratingOf(place)
  const routeUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}`
  const cats = [...new Set(catsOf(place))].map((id) => catOf(theme, id))
  const tel = phoneLink(place.phone), site = httpsLink(place.website)
  const hasHours = Array.isArray(place.hours) && place.hours.length === 7
  const today = new Date().getDay()
  return (
    <article className="fx">
      <div className="fx-top">
        <div className="fx-media">
          <PlacePhoto watch={creator} place={place} theme={theme} aspect="1/1" style={{ width: '100%', borderRadius: 'var(--r)' }} label="Foto do lugar" />
          {place.postUrl && <PostLink url={place.postUrl} creator={creator} className="pb ficha-post" onOpen={() => ctx.track('post_open', { placeId: place.id })} />}
        </div>
        <div className="fx-info">
          <h1 className="pt fx-name">{place.name}</h1>
          {rating && <div className="fx-rating">
            <>
              <span className="fx-star" aria-hidden="true">★</span><b>{rating.value}</b>
              <span>({rating.reviews ? `${reviewsText(rating.reviews)} no Google` : 'no Google'})</span>
              <span className="fx-tip"><button type="button" aria-label={`Nota vista no Google em ${rating.date}`}>i</button><span role="tooltip">Nota vista no Google em {rating.date}. Pode ter mudado.</span></span>
            </>
          </div>}
          <div className="fx-actions">
            <button type="button" className="pb sec" aria-pressed={isSaved} onClick={() => ctx.saved.toggle(place.id)}><Icon n="heart" s={16} c={isSaved ? '#d93a1c' : 'currentColor'} />{isSaved ? 'Salvo' : 'Salvar'}</button>
            <button type="button" className="pb sec" aria-label="Compartilhar" onClick={() => ctx.share(place)}><Icon n="share" s={18} c="currentColor" /></button>
            {!creator.demo && !creator.noVisit && <VisitButton slug={creator.slug} placeId={place.id} />}
          </div>
          <section>
            <Label>Endereço</Label>
            <p>{place.address || 'Endereço não informado'}{place.neighborhood ? ` - ${place.neighborhood}` : ''}{place.municipality ? `, ${place.municipality}` : ''} · <Out href={routeUrl} onClick={() => ctx.track('route_click', { placeId: place.id })}>Abrir rota</Out></p>
            {place.geoQuality !== 'address_exact' && <span className="fx-note">Localização aproximada (a confirmar)</span>}
          </section>
          {hasHours && <section>
            <Label>Horário de funcionamento</Label>
            <p>{todayText(place.hours)} <OpenTag place={place} /></p>
            <details><summary>Ver horários</summary><ul className="hrs">{place.hours.map((h, i) => <li key={i} className={i === today ? 'on' : ''}><span>{DAYS[i]}</span><span>{h ? `${h[0]} às ${h[1]}` : 'Fechado'}</span></li>)}</ul></details>
          </section>}
          <section>
            <Label>Contato</Label>
            <p className="fx-contacts">
              {tel && <a className="fx-link" href={tel}>{place.phone}</a>}
              {site && <Out href={site}>Site oficial</Out>}
              {place.instagramUrl && <Out href={place.instagramUrl}>Instagram</Out>}
              <Out href={place.googleUrl || googleSearchUrl(place)}>{place.googleUrl ? 'Ver no Google' : 'Buscar no Google'}</Out>
            </p>
          </section>
        </div>
      </div>

      {place.about && <p className="fx-about">{place.about}</p>}
      <div className="fx-cats">{cats.map((c) => <span key={c.id}>{c.name}</span>)}</div>

      {place.note && <p className="fx-quote">“{place.note}”</p>}
      {(place.couponNote || place.couponCode) && <div className="box" style={{ gap: 4 }}><Label>Cupom ou desconto</Label>{place.couponNote && <b className="sm">{place.couponNote}</b>}{place.couponCode && <span className="sm">Código: <b style={{ letterSpacing: '.04em' }}>{place.couponCode}</b></span>}<span className="xs mut">Confirme com o estabelecimento antes de ir.</span></div>}
      {place.tiktokId && <button type="button" className="pb sm" style={{ alignSelf: 'flex-start' }} onClick={() => ctx.video(place.id)}><Icon n="play" s={14} c="currentColor" />Ver vídeo</button>}
      <p className="fx-foot">Informações podem estar desatualizadas. Confirme com o estabelecimento. <button type="button" onClick={() => ctx.report(place)}>Informar erro</button></p>
    </article>
  )
}

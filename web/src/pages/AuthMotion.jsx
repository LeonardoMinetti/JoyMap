import React from 'react'
import { Icon } from '../lib/icons.jsx'
import { Phone, Native } from '../landing/device.jsx'
import { PubPreview, MAP_THEME, PLACES6 } from '../landing/pubpreview.jsx'
import { ph } from '../landing/social.jsx'
import { useCycle, useEver, useScene } from '../landing/motion.jsx'

// Ilustrações em movimento das telas de entrada (celular de mockup, o mesmo das páginas de divulgação).
const PH = 676

// Criador: as indicações viram pins no mapa público
export function MapMotion() {
  const { on, rm, paused } = useScene()
  const ever = useEver(on)
  const f = useCycle([900, 520, 520, 520, 520, 520, 520, 3200], { on, rm, paused })
  const n = Math.min(f, 6)
  return (
    <Phone h={PH} label="Ilustração: pins aparecendo no mapa do criador">
      <Native h={PH}>{ever && <PubPreview theme={MAP_THEME} places={PLACES6} shown={PLACES6.slice(0, n)} />}</Native>
      <div className="mk-toast2"><i className={f >= 7 ? 'ok' : ''} />{f >= 7 ? 'Mapa pronto' : 'Montando o mapa…'}<b>{n} {n === 1 ? 'lugar' : 'lugares'}</b></div>
    </Phone>
  )
}

const SAVED = [['latte', 'Grão & Pausa', 'Pinheiros · @duda.lu'], ['pizza', 'Forno do Beco', 'Bela Vista · @bia.caio'], ['sushi', 'Casa Maré', 'Liberdade · @saborpaulista']]
const Tabs3 = ({ on }) => <div className="am-tabs">{['Salvos', 'Criadores', 'Conta'].map((t) => <span key={t} className={t === on ? 'on' : ''}>{t}</span>)}</div>

// Explorador: toca no coração de um lugar e ele aparece em Meus salvos
export function SaveMotion() {
  const { on, rm, paused } = useScene()
  const f = useCycle([1700, 650, 1500, 4300], { on, rm, paused, rmFrame: 3 })
  return (
    <Phone h={PH} label="Ilustração: um lugar sendo salvo e aparecendo em Meus salvos">
      <Native h={PH}>
        <div className="am-ficha">
          <div className="am-ph" style={{ backgroundImage: `url(${ph('croissant')})` }} />
          <div className="am-row">
            <div className="sp"><b>Padaria Alvorada</b><span>Vila Madalena · @duda.lu</span></div>
            <i className={'am-heart' + (f >= 1 ? ' on' : '') + (f === 1 ? ' pop' : '')}><Icon n="heart" s={22} c="currentColor" /></i>
          </div>
          <div className="am-lines"><i /><i /></div>
        </div>
        <div className={'am-toast' + (f === 2 ? ' show' : '')}><Icon n="check" s={14} c="#5be584" />Salvo em Meus salvos</div>
      </Native>
      <div className={'sheet-up' + (f === 3 ? ' open' : '')}>
        <Native h={PH} top={34}>
          <div className="am-saved">
            <b className="am-h">Meus salvos</b>
            <Tabs3 on="Salvos" />
            <div className={'am-it' + (f === 3 ? ' am-in' : '')}><span className="am-th" style={{ backgroundImage: `url(${ph('croissant')})` }} /><div><b>Padaria Alvorada</b><em>Vila Madalena · @duda.lu</em></div><Icon n="heart" s={18} c="#d93a1c" /></div>
            {SAVED.map(([k, a, b]) => <div key={k} className="am-it"><span className="am-th" style={{ backgroundImage: `url(${ph(k)})` }} /><div><b>{a}</b><em>{b}</em></div><Icon n="heart" s={18} c="#d93a1c" /></div>)}
          </div>
        </Native>
      </div>
    </Phone>
  )
}

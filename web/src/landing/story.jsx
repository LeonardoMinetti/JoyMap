import React from 'react'
import { Icon } from '../lib/icons.jsx'
import { Phone, Native } from './device.jsx'
import { PubPreview, DEMO_THEME } from './pubpreview.jsx'
import { SocialFeed, Avatar, ph } from './social.jsx'
import { Scene, useCycle, useEver, useScene } from './motion.jsx'

const em = (n) => ({ lib: `lib:fluent3d:${n}` })
const hl = { background: 'linear-gradient(transparent 60%, var(--hl, var(--acc)) 60%)', padding: '0 4px' }

// Feed x mapa: o feed rola sem fim de um lado; do outro, o mesmo conteúdo na tela pública real do wagli.
const FEED = [
  { photo: 'pizza', user: '@sabordacidade', caption: 'A melhor pizza do bairro, anota aí.', age: 'há 2 meses' }, { photo: 'sushi', user: '@sabordacidade', caption: 'Combinado na Liberdade.', age: 'há 5 meses' },
  { photo: 'latte', user: '@sabordacidade', caption: 'Café para ficar mais um pouco.', age: 'há 1 ano' }, { photo: 'burger', user: '@sabordacidade', caption: 'Smash burger de sexta.', age: 'há 3 meses' },
  { photo: 'bolo', user: '@sabordacidade', caption: 'Tiramisù que vale a fila.', age: 'há 8 meses' }, { photo: 'tacos', user: '@sabordacidade', caption: 'Tacos al pastor.', age: 'há 1 ano' },
]
const SEM = ['Recomendações espalhadas entre publicações.', 'Conteúdos antigos difíceis de recuperar.', 'Descoberta dependente do feed.', 'Organização manual.', 'Pouca visibilidade sobre o que a audiência procura.']
const COM = ['Recomendações centralizadas.', 'Conteúdo consultável sempre que necessário.', 'Um destino digital com a identidade do criador.', 'Organização automatizada, quando disponível.', 'Inteligência sobre os interesses da audiência.']
// Sem wagli: a pessoa rola o perfil para cima e para baixo, tenta buscar e não acha. Com um rosto expressivo reagindo.
const FRUST = [
  { d: 2300, y: 760, say: 'Onde era mesmo?', e: 'thinking-face' },
  { d: 1300, y: 160, say: 'Já passei por aqui…', e: 'unamused-face' },
  { d: 2100, y: 160, q: 'pizza no Itaim', say: 'Deve ter aqui…', e: 'face-with-monocle' },
  { d: 1600, y: 160, q: 'pizza no Itaim', none: true, say: 'Nada. De novo.', e: 'pouting-face' },
  { d: 2500, y: 1560, say: 'Eu salvei, cadê?', e: 'person-shrugging' },
  { d: 1000, y: 420, say: '…', e: 'weary-face' },
  { d: 2100, y: 420, q: 'café perto de mim', say: 'Um café, só um café.', e: 'confused-face' },
  { d: 1600, y: 420, q: 'café perto de mim', none: true, say: 'Sério?', e: 'person-facepalming' },
  { d: 2700, y: 2380, say: 'Esse era onde?', e: 'thinking-face' },
  { d: 1500, y: 0, say: 'Desisto.', e: 'person-facepalming' },
]
const FRUST_MS = FRUST.map((f) => f.d)
function SemPhone({ on, rm, paused }) {
  const i = useCycle(FRUST_MS, { on, rm, paused, rmFrame: 3 })
  const f = FRUST[i]
  return (
    <div className="fr">
      <Phone h={590} label="Perfil de um criador em uma rede social: a pessoa rola, busca e não encontra a indicação">
        <Native h={590}>
          <div className="fd-wrap">
            <div className="fr-head"><Avatar k="latte" s={34} /><div className="sp"><b>@sabordacidade</b><span>Publicações</span></div><span className={'fr-ic' + (f.q ? ' on' : '')}><Icon n="search" s={20} c="currentColor" /></span></div>
            <div className="fr-list" style={{ transform: `translateY(${-f.y}px)`, transitionDuration: rm ? '0ms' : `${Math.round(f.d * 0.8)}ms` }}><SocialFeed items={FEED} bare /></div>
            <div className={'fr-search' + (f.q ? ' on' : '')}>
              <div className="fr-bar"><Icon n="search" s={18} c="currentColor" /><span className="ins-ty fr-ty" key={i}>{f.q || ''}</span></div>
              {f.none && <div className="fr-none"><Icon n="close" s={22} /><b>Nenhum resultado</b><span>Tente buscar por outro termo.</span></div>}
            </div>
          </div>
        </Native>
      </Phone>
      <div className="fr-em" key={i} aria-hidden="true"><span className="fr-say">{f.say}</span><span className="fr-face"><Icon s={104} sym={em(f.e)} /></span></div>
    </div>
  )
}
function FvmPhones() {
  const { on, rm, paused } = useScene()
  const ever = useEver(on)
  return (
    <>
      <div className="fvm-box off">
        <span className="fvm-lb off">Sem wagli</span>
        <SemPhone on={on} rm={rm} paused={paused} />
        <ul className="fvm-ul off">{SEM.map((t) => <li key={t}><i aria-hidden="true">✕</i>{t}</li>)}</ul>
      </div>
      <div className="fvm-box on">
        <span className="fvm-lb on">Com wagli</span>
        <Phone h={590} label="Tela pública do mapa de um criador, com as mesmas indicações organizadas em pins">
          <Native h={590}>{ever && <PubPreview theme={DEMO_THEME} />}</Native>
        </Phone>
        <ul className="fvm-ul on">{COM.map((t) => <li key={t}><i aria-hidden="true">✓</i>{t}</li>)}</ul>
      </div>
    </>
  )
}
export function FeedVsMap() {
  return (
    <section className="sec" aria-labelledby="comparativo" style={{ background: 'var(--cream)' }}>
      <div className="w col" style={{ gap: 40 }}>
        <div className="sec-h c"><span className="eb">Do feed para um lugar próprio</span><h2 id="comparativo" className="d h-sec">O mesmo conteúdo. <span style={hl}>Muito mais possibilidades.</span></h2></div>
        <Scene className="fvm" threshold={0.25}><FvmPhones /></Scene>
        <p className="xs mut c">Perfil e publicações de demonstração, com fotos de bancos livres (créditos em /creditos-fotos.txt).</p>
      </div>
    </section>
  )
}

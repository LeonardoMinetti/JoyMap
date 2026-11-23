import React, { useState } from 'react'
import { Link } from '../lib/router.jsx'
import { withBase } from '../lib/base.js'
import { Icon } from '../lib/icons.jsx'
import { num } from '../theme.jsx'
import { Switch } from '../lib/ui.jsx'
import { Scene } from './motion.jsx'
import { Floaters } from './doodles.jsx'
import { FAQ } from './faq.js'

const em = (n) => ({ lib: `lib:fluent3d:${n}` })
const hl = { background: 'linear-gradient(transparent 60%, var(--hl, var(--acc)) 60%)', padding: '0 4px' }

// Seção 09 · Controle e confiança
const PRINCIPLES = [
  'Você revisa e aprova cada recomendação antes de publicar.', 'Não é necessário compartilhar a senha das suas redes sociais.',
  'O wagli não lê mensagens, listas de seguidores nem comentários.', 'O painel usa informações agregadas, sem identificar pessoas.',
  'Você decide se quer participar do mapa geral.', 'Você decide, separadamente, se quer compartilhar informações com restaurantes.',
  'Consentimentos são independentes e revogáveis.', 'Participações adicionais ficam desativadas por padrão.',
]
export function Trust() {
  const [geral, setGeral] = useState(false)
  const [rest, setRest] = useState(false)
  return (
    <section className="sec" aria-labelledby="conf" style={{ background: 'var(--cream)' }}>
      <div className="w split" style={{ gap: 56, alignItems: 'center' }}>
        <div className="col" style={{ flex: 1.1, gap: 22, minWidth: 0 }}>
          <div className="sec-h"><span className="eb">Controle e confiança</span><h2 id="conf" className="d h-sec">Seu conteúdo. Sua marca. <span style={hl}>Suas decisões.</span></h2></div>
          <ul className="tr-l">{PRINCIPLES.map((t) => <li key={t}><i aria-hidden="true"><Icon n="check" s={12} c="#171713" /></i>{t}</li>)}</ul>
          <p className="xs mut">Os textos legais (termos e privacidade) ainda passam por revisão jurídica.</p>
        </div>
        <div className="tr-card" style={{ flex: 1 }}>
          <div className="row jb"><b className="d s20">Privacidade e consentimentos</b><span className="tag wn">Demonstração</span></div>
          <div className="tr-row"><div className="sp"><b>Aprovar cada recomendação</b><span>Nada é publicado sem a sua revisão.</span></div><span className="tr-always">Sempre</span></div>
          <div className="tr-row"><div className="sp"><b>Participar do mapa geral</b><span>Opcional e independente. Desativado por padrão.</span></div><Switch on={geral} onChange={setGeral} label="Participar do mapa geral" /></div>
          <div className="tr-row"><div className="sp"><b>Compartilhar dados agregados com restaurantes</b><span>Decisão separada e revogável. Desativado por padrão.</span></div><Switch on={rest} onChange={setRest} label="Compartilhar dados agregados com restaurantes" /></div>
          <p className="xs mut">Experimente: cada opção muda sozinha e pode ser desfeita a qualquer momento.</p>
        </div>
      </div>
    </section>
  )
}

// Seção 10 · Monetização (visão futura): cartas de roteiros, sobrepostas como um baralho
const GUIDES = [
  { t: 'Izakayas da Liberdade', d: 'Roteiro a pé pelos melhores izakayas do bairro, com o que pedir em cada parada.', bg: 'var(--acc)', fg: 'var(--ink)', photos: ['sushi', 'sushi2', 'ramen'], more: 7, r: -5 },
  { t: 'Fim de semana na serra', d: 'Onde ficar, o que ver e onde comer em dois dias de estrada, organizado por dia.', bg: 'var(--ink)', fg: '#fff', icons: ['mountain', 'tent', 'automobile'], more: 6, r: 2.5 },
  { t: 'Trilhas e passeios perto de SP', d: 'Trilhas, mirantes e passeios ao ar livre, com o ponto de partida e a duração de cada um.', bg: '#E4E4E4', fg: 'var(--ink)', icons: ['bicycle', 'compass', 'beach-with-umbrella'], more: 5, r: -2 },
  { t: 'Um bairro, um roteiro', d: 'Roteiro por determinado bairro, em blocos para fazer a pé.', bg: '#A5DFCA', fg: 'var(--ink)', photos: ['pizza', 'burger', 'tacos'], more: 8, r: 4 },
]
export function Monetize() {
  return (
    <section className="sec" aria-labelledby="mon" style={{ background: '#fff', overflow: 'hidden' }}>
      <div className="w col" style={{ gap: 36 }}>
        <div className="sec-h"><span className="tag wn" style={{ alignSelf: 'flex-start' }}>Em desenvolvimento</span><h2 id="mon" className="d h-sec">Suas recomendações também podem virar um negócio.</h2>
          <p className="lead">Transforme seu repertório de lugares em roteiros exclusivos, guias digitais e seleções que sua audiência poderá adquirir diretamente de você.</p></div>
        <Scene className="gd" threshold={0.3}>
          {GUIDES.map((g, i) => (
            <article key={g.t} className="gd-c" style={{ '--i': i, '--r': `${g.r}deg`, background: g.bg, color: g.fg }}>
              <span className="gd-ex">Exemplo</span>
              <div className="gd-top"><h3>{g.t}</h3><Icon n="next" s={22} c="currentColor" /></div>
              <div className="gd-av" aria-hidden="true">{g.photos ? g.photos.map((k) => <img key={k} src={withBase(`/photos/${k}.jpg`)} alt="" loading="lazy" decoding="async" />) : g.icons.map((k) => <span key={k} className="gd-em"><Icon s={32} sym={em(k)} /></span>)}<b>+{g.more}</b></div>
              <hr />
              <p>{g.d}</p>
            </article>))}
        </Scene>
        <p className="xs mut">Visão futura, ainda não disponível. Roteiros, nomes e quantidades são exemplos, sem valores definidos.</p>
      </div>
    </section>
  )
}

// Seção 11 · Planos e condições de entrada
export function PlansBlock({ min, compact }) {
  const [annual, setAnnual] = useState(false)
  return (
    <section id="planos" className="sec" aria-labelledby="planos-h" style={{ background: 'var(--cream)' }}>
      <div className="w col" style={{ gap: 32 }}>
        <div className="sec-h c"><span className="eb">Planos e condições de entrada</span><h2 id="planos-h" className="d h-sec">Comece pelo seu <span style={hl}>mapa.</span></h2></div>
        <div className="pl">
          <div className="pl-main">
            <span className="tag" style={{ background: 'var(--acc)', alignSelf: 'flex-start' }}>Para criadores aprovados</span>
            <b className="d" style={{ fontSize: 'clamp(40px,5vw,64px)' }}>30 dias grátis</b>
            <p>após o lançamento, para todos os criadores aprovados. Depois, você escolhe a periodicidade da assinatura.</p>
            <div className="pl-per" role="group" aria-label="Periodicidade da assinatura"><button type="button" aria-pressed={!annual} className={'chip' + (!annual ? ' on' : '')} onClick={() => setAnnual(false)}>Mensal</button><button type="button" aria-pressed={annual} className={'chip' + (annual ? ' on' : '')} onClick={() => setAnnual(true)}>Anual</button></div>
            <p className="sm" style={{ opacity: 0.8 }}>{annual ? 'Assinatura anual: uma cobrança por ano.' : 'Assinatura mensal: uma cobrança por mês.'} Os valores ainda não foram definidos e nenhuma cobrança está ativa.</p>
          </div>
          <div className="pl-side">
            <div className="pl-i"><b>Entrada mediante análise de perfil</b><span>Há um número mínimo de seguidores{min != null ? ` (hoje: ${num(min)})` : ''}, ainda em definição.</span></div>
            <div className="pl-i"><b>Plano Agência, sob consulta</b><span>Para empresas e redes que administram vários criadores. Em definição.</span></div>
            <Link className="btn dk btn-lg" to="/candidatura">Quero meu mapa</Link>
            <span className="xs mut">Acesso antecipado: sem cobrança nesta etapa.</span>
            <Link className="link sm" to="/perguntas">Ver as perguntas frequentes</Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// Seção 12 · FAQ (accordion acessível)
const FAQ_COLORS = ['#FF6A4D', '#7FB0FF', '#4FD8B0', '#B79CFF', '#FF8FB1', '#FFC400']
export function Accordion({ items = FAQ }) {
  const [open, setOpen] = useState(0)
  const refs = React.useRef([])
  // setas, Home e End percorrem as perguntas
  const key = (e, i) => {
    const n = items.length
    const to = e.key === 'ArrowDown' ? (i + 1) % n : e.key === 'ArrowUp' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1
    if (to >= 0) { e.preventDefault(); refs.current[to]?.focus() }
  }
  return (
    <div className="faq">{items.map(([q, a], i) => (
      <div key={q} className={'faq-i' + (open === i ? ' open' : '')} style={{ '--c': FAQ_COLORS[i % FAQ_COLORS.length] }}>
        <h3><button type="button" ref={(el) => { refs.current[i] = el }} id={`fq-b${i}`} aria-expanded={open === i} aria-controls={`fq-p${i}`} onClick={() => setOpen(open === i ? -1 : i)} onKeyDown={(e) => key(e, i)}>
          <span className="faq-n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span><span className="faq-q">{q}</span><span className="faq-pm" aria-hidden="true" /></button></h3>
        <div id={`fq-p${i}`} role="region" aria-labelledby={`fq-b${i}`} className="faq-p"><div><p>{a}</p></div></div>
      </div>))}</div>
  )
}
// Prévia das perguntas na página inicial: leva à página completa
export function FaqTeaser() {
  return (
    <section id="perguntas" className="sec fqt" aria-labelledby="faq-h">
      <div className="w fqt-g">
        <div className="fqt-l">
          <span className="eb">Perguntas frequentes</span>
          <h2 id="faq-h" className="d h-sec">Ainda tem dúvidas? <span style={hl}>A gente responde.</span></h2>
          <p className="lead">As perguntas que todo criador faz antes de começar: integrações, privacidade, personalização e planos.</p>
          <Link className="btn dk btn-lg fqt-btn" to="/perguntas">Ver todas as {FAQ.length} perguntas<Icon n="back" s={16} c="currentColor" /></Link>
        </div>
        <Accordion items={FAQ.slice(0, 5)} />
      </div>
    </section>
  )
}

// Seção 13 · CTA final com rota animada
export function FinalCta() {
  return (
    <section className="sec fc" aria-labelledby="fim" style={{ overflow: 'hidden', paddingBottom: 110 }}>
      <Floaters set="g" />
      <div className="w col" style={{ alignItems: 'center', textAlign: 'center', gap: 22, position: 'relative' }}>
        <span className="tag" style={{ background: 'var(--cream)' }}>Seu jeito. Seu voo.</span>
        <h2 id="fim" className="d h-sec" style={{ maxWidth: 760 }}>Você já tem o conteúdo. Falta o mapa.</h2>
        <p className="lead" style={{ maxWidth: 560 }}>Dê um novo destino às suas recomendações e descubra até onde elas podem levar sua audiência.</p>
        <div className="row wrap" style={{ gap: 12, justifyContent: 'center' }}><Link className="btn dk btn-lg" to="/candidatura">Quero meu mapa</Link><Link className="btn ln btn-lg" to="/@demo">Explorar um mapa</Link></div>
      </div>
    </section>
  )
}

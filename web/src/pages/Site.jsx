import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Link, useLocation } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import { Top, SiteFooter, Toggle, useTitle } from '../lib/ui.jsx'
import MotionMap from '../MotionMap.jsx'
import BgMap from '../BgMap.jsx'
import { Hero } from '../landing/hero.jsx'
import { FeedVsMap } from '../landing/story.jsx'
import { HowItWorks } from '../landing/flow.jsx'
import { Gallery } from '../landing/showcase.jsx'
import { Insights } from '../landing/insights.jsx'
import { Monetize, PlansBlock, FaqTeaser, FinalCta } from '../landing/trust.jsx'
import { FaqPage } from '../landing/faqpage.jsx'
import { PauseCtx } from '../landing/motion.jsx'
import { InsightsControl } from '../landing/panel.jsx'
import { Floaters, DoodleDefs } from '../landing/doodles.jsx'
const Deco = ({ set, children }) => <div className="fl-host">{children}<Floaters set={set} /></div>
import { SHAPES, TONES, num } from '../theme.jsx'
import { SAMPLE_ICON, EMOJI } from '../iconcat.js'

const useMin = () => { const [n, setN] = useState(null); useEffect(() => { api('/config').then((c) => setN(c.minFollowers)).catch(() => {}) }, []); return n }
const Soon = ({ children }) => <span className="xs mut">{children}</span>

// A1 · Página inicial
// Carrossel infinito de emojis (duas fileiras em sentidos opostos)
const ROW_A = ['pizza', 'hamburger', 'sushi', 'taco', 'hot-beverage', 'cocktail-glass', 'birthday-cake', 'croissant', 'ice-cream', 'green-salad', 'beer-mug', 'doughnut', 'spaghetti', 'bubble-tea']
const ROW_B = ['steaming-bowl', 'cooked-rice', 'french-fries', 'wine-glass', 'cupcake', 'bread', 'tropical-drink', 'fish', 'pancakes', 'cut-of-meat', 'shaved-ice', 'bento-box', 'cookie', 'mate']
function Marquee({ names, pack, rev }) {
  const items = [...names, ...names]
  return (
    <div className={'marq' + (rev ? ' rev' : '')} aria-hidden="true"><div className="marq-track">
      {items.map((n, i) => <span key={i} className="marq-i"><Icon s={88} sym={{ lib: `lib:${pack}:${n}` }} /></span>)}
    </div></div>
  )
}
export function Landing() {
  const min = useMin()
  const [paused, setPaused] = useState(false)
  const { hash } = useLocation()
  useEffect(() => { if (!hash) return; const h = setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 120); return () => clearTimeout(h) }, [hash])
  useTitle('')
  return (
    <PauseCtx.Provider value={{ paused, setPaused }}>
      <div className={'page lp' + (paused ? ' nomo' : '')}>
        <Top active={-1} overlay dark />
        <DoodleDefs />
        <Deco set="hero"><Hero /></Deco>
        <Deco set="a"><FeedVsMap /></Deco>
        <Deco set="b"><HowItWorks /></Deco>
        <Deco set="c"><Gallery /></Deco>
        <Deco set="d"><InsightsControl /></Deco>
        <Monetize />
        <Deco set="f"><PlansBlock min={min} /></Deco>
        <FaqTeaser />
        <FinalCta />
        <SiteFooter />
        <button type="button" className="mo-toggle" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? 'Retomar animações' : 'Pausar animações'}</button>
      </div>
    </PauseCtx.Provider>
  )
}

// A2 · Planos e preços (mesmo bloco da landing)
export function Plans() {
  useTitle('Planos')
  const min = useMin()
  return (
    <div className="page lp">
      <Top active={3} />
      <PlansBlock min={min} />
      <SiteFooter />
    </div>
  )
}

const EXAMPLES = [
  { n: 'Duda Come SP', h: '@dudacomesp', k: 24, tone: 'bright', pal: 'candy', shape: 'circle', pins: 9, cat: 'Doces', av: {} },
  { n: 'Noite Boa', h: '@noiteboa', k: 18, tone: 'dark', pal: 'cool', shape: 'square', pins: 10, cat: 'Bares', av: { background: '#262626', color: '#fff' } },
  { n: 'Padoca Lab', h: '@padocalab', k: 12, tone: 'liberty', pal: 'warm', shape: 'drop', pins: 7, cat: 'Cafés', av: { background: '#f1e7d3', color: '#8a5a14' } },
  { n: 'Mar e Mesa', h: '@maremesa', k: 31, tone: 'fiord', pal: 'mono', acc: '#2d7ff9', shape: 'hex', pins: 11, cat: 'Restaurantes', av: { background: '#e4ebf7', color: '#1d4ed8' } },
  { n: 'Café com Roteiro', h: '@cafecomroteiro', k: 15, tone: 'light', pal: 'warm', shape: 'circle', pins: 12, cat: 'Cafés', av: {} },
  { n: 'Verde Prato', h: '@verdeprato', k: 9, tone: 'bright', pal: 'cool', shape: 'drop', pins: 6, cat: 'Viagem', av: { background: '#cde8da', color: '#0b6b4d' } },
]
export function Examples() {
  useTitle('Exemplos')
  const [f, setF] = useState('Todos')
  const list = EXAMPLES.filter((e) => f === 'Todos' || e.cat === f)
  return (
    <div className="page">
      <Top active={1} />
      <div className="w col" style={{ paddingTop: 48, paddingBottom: 56, gap: 28 }}>
        <div className="col" style={{ gap: 10 }}><h1 className="d s56">Mapas de criadores</h1><p className="mut" style={{ maxWidth: 560 }}>Cada criador escolhe o próprio visual. Exemplos fictícios para mostrar a variedade de estilos.</p></div>
        <div className="row wrap">{['Todos', 'Restaurantes', 'Cafés', 'Bares', 'Doces', 'Viagem'].map((c) => <button key={c} className={'chip' + (f === c ? ' on' : '')} onClick={() => setF(c)}>{c}</button>)}</div>
        <div className="g3" style={{ gap: 24 }}>
          {list.map((e) => (
            <div key={e.n} className="card col" style={{ padding: 12 }}>
              <div style={{ borderRadius: 14, overflow: 'hidden' }}><MotionMap h={240} tone={e.tone} pal={e.pal} acc={e.acc} shape={e.shape} n={Math.min(14, e.pins)} /></div>
              <div className="row"><div className="av" style={e.av}>{e.n[0]}</div><div className="sp"><div className="b">{e.n}</div><div className="xs mut">{e.h} · exemplo</div></div><span className="tag">{e.k} lugares</span></div>
            </div>))}
          {!list.length && <p className="mut">Sem exemplos nesta categoria.</p>}
        </div>
        <div className="hero row jb wrap" style={{ padding: '32px 40px' }}><div><h2 className="d s32">O seu pode ser diferente de todos</h2><p className="mut sm">Veja o Estúdio de estilo em ação.</p></div><Link className="btn" to="/candidatura">Quero meu mapa</Link></div>
      </div>
      <SiteFooter />
    </div>
  )
}

// A4 · Termos e privacidade (estrutura; redação final depende de revisão jurídica)
const TERMS = ['Aceitação e escopo', 'Conta e acesso', 'Conteúdo e publicação', 'Dados de terceiros', 'Consentimentos opcionais', 'Planos e cobrança', 'Encerramento']
export function Terms() {
  useTitle('Termos e privacidade')
  return (
    <div className="page">
      <Top active={-1} />
      <div className="w split" style={{ paddingTop: 40, paddingBottom: 48, alignItems: 'flex-start' }}>
        <div className="col" style={{ width: 260, gap: 4, position: 'sticky', top: 90 }}><span className="eb" style={{ marginBottom: 6 }}>Nesta página</span>
          {TERMS.map((t, i) => <a key={t} className="ix" href={`#s${i + 1}`}><b>{String(i + 1).padStart(2, '0')}</b><span>{t}</span></a>)}</div>
        <div className="col" style={{ flex: 1, gap: 18, maxWidth: 700 }}>
          <div className="row"><span className="tag">Versão 0.1</span><span className="tag">Atualizado em [data]</span></div>
          <h1 className="d s56">Termos de uso e privacidade</h1>
          <div className="g3"><div className="card soft col" style={{ gap: 4 }}><b>Seu conteúdo é seu</b><span className="sm mut">Licença só para hospedar e exibir o mapa.</span></div><div className="card soft col" style={{ gap: 4 }}><b>Sem senha</b><span className="sm mut">Acesso por autorização oficial da plataforma.</span></div><div className="card soft col" style={{ gap: 4 }}><b>Você decide</b><span className="sm mut">Usos extras são opcionais e revogáveis.</span></div></div>
          {TERMS.map((t, i) => (
            <div key={t} id={`s${i + 1}`} className="col" style={{ gap: 10, scrollMarginTop: 90 }}>
              <h2 className="d s26">{String(i + 1).padStart(2, '0')} · {t}</h2>
              {i === 4 ? (
                <div className="card col"><div className="row"><div className="sp"><b>Aparecer no mapa geral</b><div className="sm mut">Seu mapa pode entrar na descoberta em rede.</div></div><span className="sw" /></div><div className="sep" /><div className="row"><div className="sp"><b>Dados agregados para restaurantes</b><div className="sm mut">Contagens sem dados de pessoas.</div></div><span className="sw" /></div></div>
              ) : <p className="mut">[Texto jurídico a ser redigido com apoio de advogado.]{i === 2 ? ' Esta tela mostra a estrutura: títulos numerados à esquerda, resumo em três cartões e seções em linguagem direta.' : ''}</p>}
            </div>))}
          <p className="xs mut">Texto ilustrativo. A redação final depende de revisão jurídica (LGPD e termos das plataformas).</p>
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}

// A5 · Perguntas frequentes
export function Faq() {
  useTitle('Perguntas')
  return <FaqPage />
}

// Versão estática de demonstração (GitHub Pages): telas que dependem do servidor mostram este aviso.
export function StaticNotice() {
  useTitle('Versão de demonstração')
  return (
    <div className="page">
      <Top active={-1} />
      <div className="w col" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 96, gap: 18, maxWidth: 560 }}>
        <div className="sq" style={{ width: 72, height: 72, background: 'var(--soft)', display: 'grid', placeItems: 'center' }}><Icon n="pin" s={32} c="#6b6b6b" /></div>
        <h1 className="d s56">Esta tela ainda não está aberta</h1>
        <p className="mut">Esta é uma versão de demonstração para testar a experiência no celular: a página inicial, os planos, as perguntas e o mapa de exemplo funcionam. Candidatura, login, painel e estúdio dependem do servidor da wagli e ainda não estão abertos ao público.</p>
        <Link className="btn" to="/@demo">Abrir o mapa de exemplo</Link>
        <Link className="btn sec" to="/">Voltar ao início</Link>
      </div>
    </div>
  )
}

export function Unavailable() {
  useTitle('Mapa indisponível')
  return (
    <div className="page">
      <Top active={-1} />
      <div className="w col" style={{ alignItems: 'center', textAlign: 'center', paddingTop: 96, gap: 18, maxWidth: 560 }}>
        <div className="sq" style={{ width: 72, height: 72, background: 'var(--soft)', display: 'grid', placeItems: 'center' }}><Icon n="pin" s={32} c="#6b6b6b" /></div>
        <h1 className="d s56">Este mapa não está disponível</h1>
        <p className="mut">O criador pausou ou retirou o mapa. Se você acha que é um engano, avise o criador.</p>
        <Link className="btn" to="/exemplos">Ver outros mapas</Link>
        <p className="xs mut">Mostrado também quando o período de teste terminou e o mapa saiu do ar.</p>
      </div>
    </div>
  )
}

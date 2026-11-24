import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { Link, toast } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import { AdminPage, Loading, SiteFooter, Top, useTitle } from '../lib/ui.jsx'
import { Floaters, DoodleDefs } from '../landing/doodles.jsx'
import { withBase } from '../lib/base.js'

const COLORS = ['#FF4B2B', '#2D7FF9', '#36C5A0', '#FF5C8A', '#8B5CF6', '#FFC400']

function Card({ g, i }) {
  return (
    <a className="mg-card" href={withBase(g.href)} style={{ '--c': g.color || COLORS[i % COLORS.length] }}>
      <div className="mg-ph" style={g.photo ? { backgroundImage: `url("${g.photo}")` } : undefined}>
        <span className="mg-tag">RoteiroJoy</span>{g.city && <span className="mg-city">{g.city}</span>}
        <h2>{g.name}</h2>
      </div>
      <div className="mg-body">
        {g.note && <p>{g.note}</p>}
        <div className="mg-by">
          {g.avatar ? <img src={g.avatar} alt="" /> : <i aria-hidden="true">{(g.by || g.handle).charAt(0).toUpperCase()}</i>}
          <span><small>Por</small><b>{g.by}</b><small>@{g.handle}</small></span>
          <em>{g.count} {g.count === 1 ? 'parada' : 'paradas'}<Icon n="next" s={14} c="currentColor" /></em>
        </div>
      </div>
    </a>
  )
}

export function Guides() {
  useTitle('RoteirosJoy')
  const [d, setD] = useState(null)
  const [city, setCity] = useState('')
  useEffect(() => { api('/miniguias').then(setD).catch(() => setD({ guides: [] })) }, [])
  const all = d?.guides || []
  const cities = [...new Set(all.map((g) => g.city).filter(Boolean))]
  const list = city ? all.filter((g) => g.city === city) : all
  return (
    <div className="page lp">
      <DoodleDefs />
      <Top overlay dark />
      <header className="mg-hero fl-host">
        <div className="w">
          <span className="tag">Escolhidos pela equipe JoyMap</span>
          <h1 className="d">RoteirosJoy</h1>
          <p>Roteiros curtos de quem vive indicando lugares. Escolha um, abra no mapa e siga parada por parada.</p>
        </div>
        <Floaters set="hero" />
      </header>
      <main className="w mg-main">
        {!d ? <Loading /> : <>
          {d.demo && <p className="xs mut">Exemplos de demonstração: criadores, lugares e roteiros são fictícios.</p>}
          {cities.length > 1 && <div className="mg-chips" role="group" aria-label="Filtrar por cidade">{['', ...cities].map((c) => <button key={c} type="button" className={'chip' + (city === c ? ' on' : '')} aria-pressed={city === c} onClick={() => setCity(c)}>{c || 'Todas as cidades'}</button>)}</div>}
          <div className="mg-grid">{list.map((g, i) => <Card key={g.id} g={g} i={i} />)}</div>
          {!list.length && <p className="mut">Os primeiros RoteirosJoy estão sendo escolhidos.</p>}
          <div className="mg-cta"><div><h3 className="d">Você cria roteiros?</h3><p>Marque, no seu painel, os roteiros que o JoyMap pode divulgar.</p></div><Link className="btn" to="/entrar?criar=1">Quero meu mapa</Link></div>
        </>}
      </main>
      <SiteFooter />
    </div>
  )
}

export function AdminGuides() {
  useTitle('RoteirosJoy')
  const [d, setD] = useState(null)
  const load = useCallback(() => api('/admin/miniguias').then(setD), [])
  useEffect(() => { load() }, [load])
  const pick = async (g) => { try { await api(`/admin/miniguias/${g.id}`, { method: 'POST', body: { featured: !g.featured } }); toast(g.featured ? 'Saiu dos RoteirosJoy' : 'Entrou nos RoteirosJoy'); load() } catch { toast('Não foi possível salvar.') } }
  return (
    <AdminPage active="miniguias">
      <div className="row jb wrap"><h1 className="d s44">RoteirosJoy</h1><a className="btn ln sm" href={withBase('/roteirosjoy')} target="_blank" rel="noopener noreferrer">Ver a página</a></div>
      <p className="sm mut">Aqui só aparecem roteiros que o criador liberou para divulgação. Entra na página apenas o que a equipe escolher.</p>
      {!d ? <Loading /> : <div className="col" style={{ gap: 10 }}>
        {d.guides.map((g) => <div key={g.id} className="card row wrap" style={{ gap: 12 }}>
          <div className="sp" style={{ minWidth: 200 }}><b>{g.name}</b><div className="xs mut">@{g.handle}{g.published ? '' : ' · mapa não publicado'}</div><div className="sm">{g.note}</div></div>
          {g.featured && <span className="tag ok">Na página</span>}
          <a className="btn ln sm" href={withBase(g.href)} target="_blank" rel="noopener noreferrer">Abrir</a>
          <button type="button" className={'btn sm' + (g.featured ? ' sec' : '')} onClick={() => pick(g)}>{g.featured ? 'Tirar' : 'Colocar nos RoteirosJoy'}</button>
        </div>)}
        {!d.guides.length && <p className="sm mut">Nenhum roteiro liberado pelos criadores ainda.</p>}
      </div>}
    </AdminPage>
  )
}

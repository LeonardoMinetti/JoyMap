import React, { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'
import { Icon, catOf } from './theme.jsx'
import { Logo } from './App.jsx'
import Studio from './Studio.jsx'

const TABS = [['', 'Visão geral', 'spark'], ['lugares', 'Lugares', 'pin'], ['estudio', 'Estúdio', 'star'], ['links', 'Links', 'share'], ['conta', 'Conta', 'flag']]

export default function Dashboard({ me, reload, sub }) {
  const c = me.creator
  if (!c) { location.hash = '#/candidatura'; return null }
  const publicUrl = `${location.origin}/@${c.slug}`
  return (
    <div className="dash">
      <aside className="dside">
        <Logo />
        <div className="who"><div className="av">{c.displayName.slice(0, 1).toUpperCase()}</div><div><b className="sm">@{c.handle}</b><div className="xs mut">{c.status === 'approved' ? 'Aprovado' : c.status}</div></div></div>
        {TABS.map(([k, l, i]) => <a key={k} className={'dit' + (sub === k ? ' on' : '')} href={`#/painel${k ? '/' + k : ''}`}><Icon n={i} s={18} />{l}</a>)}
        {me.user.role === 'admin' && <a className="dit" href="#/admin">Administração</a>}
      </aside>
      <main className="dmain">
        {c.status !== 'approved' ? <Status c={c} /> : (<>
          <div className="dbar">
            <div className="row"><span className={'tag ' + (c.published ? 'ok' : 'wn')}>{c.published ? 'No ar' : 'Rascunho'}</span>{c.published && <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="sm">{publicUrl}</a>}</div>
            <button className="btn sm" onClick={async () => { await api('/creator/publish', { method: 'POST', body: { published: !c.published } }); reload() }}>{c.published ? 'Despublicar' : 'Publicar mapa'}</button>
          </div>
          {sub === '' && <Overview />}
          {sub === 'lugares' && <Places theme={c.theme} />}
          {sub === 'estudio' && <Studio c={c} reload={reload} />}
          {sub === 'links' && <Links c={c} reload={reload} />}
          {sub === 'conta' && <Account c={c} reload={reload} />}
        </>)}
      </main>
    </div>
  )
}

function Status({ c }) {
  const t = { pending: ['Candidatura em análise', 'Conferimos o perfil e o critério de seguidores. Avisamos por e-mail.'], waitlist: ['Você está na lista de espera', 'O perfil ainda não atinge o mínimo de seguidores. Avisamos se o critério mudar.'], rejected: ['Candidatura não aprovada', 'Por enquanto não conseguimos atender este perfil.'] }[c.status]
  return <div className="card formcard" style={{ margin: '60px auto' }}><h1 className="d s44">{t[0]}</h1><p className="mut">{t[1]}</p></div>
}

function Overview() {
  const [s, setS] = useState(null)
  useEffect(() => { api('/creator/stats').then(setS) }, [])
  if (!s) return <p>Carregando…</p>
  const max = Math.max(1, ...s.days.map((d) => d.n))
  return (
    <div className="col" style={{ gap: 18 }}>
      <h1 className="d s44">Visão geral <span className="mut s16" style={{ fontFamily: 'var(--body)', textTransform: 'none' }}>últimos 30 dias</span></h1>
      <div className="g4"><div className="kpi"><b>{s.sessions}</b><span>sessões</span></div><div className="kpi"><b>{s.placeOpens}</b><span>lugares abertos</span></div><div className="kpi"><b>{s.routeClicks}</b><span>cliques em rota</span></div><div className="kpi"><b>{s.postOpens}</b><span>voltas aos seus posts</span></div></div>
      {s.days.length > 0 && <div className="card"><b>Sessões por dia</b><div className="bars">{s.days.map((d) => <i key={d.d} title={`${d.d}: ${d.n}`} style={{ height: `${(d.n / max) * 100}%` }} />)}</div></div>}
      <div className="g2">
        <div className="card"><b>O que procuram</b>
          {s.searches.length === 0 ? <p className="mut sm">Ainda sem buscas.</p> : <table className="tbl"><thead><tr><th>Termo</th><th>Buscas</th><th>Sem resultado</th></tr></thead><tbody>{s.searches.map((x) => <tr key={x.term}><td>{x.term}</td><td>{x.count}</td><td>{x.empty ? <span className="tag wn">{x.empty}</span> : 0}</td></tr>)}</tbody></table>}</div>
        <div className="card"><b>Lugares mais vistos</b>
          {s.topPlaces.length === 0 ? <p className="mut sm">Ainda sem interações.</p> : <table className="tbl"><thead><tr><th>Lugar</th><th>Aberturas</th><th>Rotas</th></tr></thead><tbody>{s.topPlaces.map((x) => <tr key={x.name}><td>{x.name}</td><td>{x.opens}</td><td>{x.routes}</td></tr>)}</tbody></table>}</div>
      </div>
      <p className="xs mut">{s.note}</p>
    </div>
  )
}

const GEO = { pending: ['Localizando…', 'wn'], found: ['Localizado', 'ok'], not_found: ['Não achamos o endereço', 'wn'], rejected: ['Município diverge', 'bd2'], none: ['Sem endereço', 'wn'] }

function Places({ theme }) {
  const [places, setPlaces] = useState([])
  const [tab, setTab] = useState('pending')
  const [rows, setRows] = useState([{ url: '', caption: '' }])
  const [msg, setMsg] = useState('')
  const load = useCallback(() => api('/creator/places').then((d) => setPlaces(d.places)), [])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (places.some((p) => p.geoStatus === 'pending')) { const h = setTimeout(load, 2500); return () => clearTimeout(h) } }, [places, load])
  const patch = async (id, body) => { await api(`/creator/places/${id}`, { method: 'PATCH', body }); load() }
  const add = async () => {
    const posts = rows.filter((r) => r.caption.trim() || r.url.trim())
    if (!posts.length) return
    const r = await api('/creator/posts', { method: 'POST', body: { posts } })
    setMsg(`${r.created} lugar(es) criado(s). Revise abaixo.`); setRows([{ url: '', caption: '' }]); setTab('pending'); load()
  }
  const list = places.filter((p) => (tab === 'unresolved' ? p.status === 'unresolved' : p.status === tab))
  const count = (s) => places.filter((p) => p.status === s).length
  return (
    <div className="col" style={{ gap: 18 }}>
      <h1 className="d s44">Lugares</h1>
      <div className="card col">
        <b>Adicionar a partir de posts</b>
        <p className="sm mut">Cole o link do post e a legenda. Identificamos o lugar e o endereço automaticamente; você revisa antes de publicar. Posts do TikTok trazem a data e o vídeo.</p>
        {rows.map((r, i) => (
          <div key={i} className="g2" style={{ gridTemplateColumns: '1fr 2fr' }}>
            <input className="in" placeholder="Link do post (opcional)" aria-label="Link do post" value={r.url} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
            <textarea className="in" rows="3" placeholder="Legenda do post (com @ e 📍 endereço, se tiver)" aria-label="Legenda" value={r.caption} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} />
          </div>))}
        <div className="row"><button className="btn ln sm" onClick={() => setRows([...rows, { url: '', caption: '' }])}><Icon n="plus" s={16} />Mais um post</button><button className="btn sm" onClick={add}>Identificar lugares</button><button className="btn sec sm" disabled title="Em breve: exige aprovação do app pela plataforma">Importar do Instagram (em breve)</button></div>
        {msg && <p className="ok2">{msg}</p>}
      </div>
      <div className="row wrap">
        {[['pending', 'Para revisar'], ['confirmed', 'Confirmados'], ['unresolved', 'Posts sem lugar']].map(([k, l]) => <button key={k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l} ({count(k)})</button>)}
        {tab === 'pending' && <button className="btn sm" onClick={async () => { const r = await api('/creator/places/confirm-high', { method: 'POST' }); setMsg(`${r.confirmed} confirmado(s) de confiança alta.`); load() }}>Confirmar os de confiança alta</button>}
      </div>
      {list.length === 0 && <p className="mut">Nada nesta lista.</p>}
      {list.map((p) => <PlaceRow key={p.id + (p.name || '')} p={p} theme={theme} onPatch={patch} />)}
    </div>
  )
}

function PlaceRow({ p, theme, onPatch }) {
  const [f, setF] = useState({ name: p.name || '', address: p.address || '', category: p.category })
  const geo = GEO[p.geoStatus] || GEO.none
  const dirty = f.name !== (p.name || '') || f.address !== (p.address || '') || f.category !== p.category
  return (
    <div className="card col" style={{ gap: 10 }}>
      <div className="row wrap">
        <span className={'tag ' + geo[1]}>{geo[0]}</span>
        {p.geoQuality && <span className="tag">{p.geoQuality === 'address_exact' ? 'Endereço exato' : p.geoQuality === 'street_approx' ? 'Aproximado (rua)' : 'Área'}</span>}
        {p.confidence && <span className="tag">Confiança {p.confidence === 'high' ? 'alta' : p.confidence === 'medium' ? 'média' : 'baixa'}</span>}
        {p.ad && <span className="tag ax">Publi</span>}
        {p.postUrl && <a className="sm" href={p.postUrl} target="_blank" rel="noopener noreferrer">post ↗</a>}
      </div>
      <div className="g3" style={{ gridTemplateColumns: '1.2fr 1.6fr 1fr' }}>
        <input className="in" aria-label="Nome" placeholder="Nome do lugar" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="in" aria-label="Endereço" placeholder="Endereço" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
        <select className="in" aria-label="Categoria" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{theme.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      </div>
      <div className="row wrap">
        {dirty && <button className="btn sm" onClick={() => onPatch(p.id, f)}>Salvar correção</button>}
        {p.status !== 'confirmed' && <button className="btn sm" disabled={!f.name} onClick={() => onPatch(p.id, { ...f, status: 'confirmed' })}><Icon n="check" s={16} />Confirmar</button>}
        {p.status === 'confirmed' && <button className="btn sec sm" onClick={() => onPatch(p.id, { status: 'pending' })}>Voltar para revisão</button>}
        <button className="btn sec sm" onClick={() => onPatch(p.id, { ad: !p.ad })}>{p.ad ? 'Tirar marca de publi' : 'Marcar como publi'}</button>
        <button className="btn ln sm" onClick={() => onPatch(p.id, { status: 'removed' })}><Icon n="trash" s={16} />Remover</button>
      </div>
      <span className="xs mut">Categoria: {catOf(theme, p.category).name}</span>
    </div>
  )
}

function Links({ c, reload }) {
  const [links, setLinks] = useState(c.links.length ? c.links : [{ title: '', url: '' }])
  const [saved, setSaved] = useState(false)
  return (
    <div className="col" style={{ gap: 14 }}>
      <h1 className="d s44">Links da bio</h1>
      <p className="mut sm">Os botões que aparecem acima do mapa, no lugar do seu link atual. Até 8 links.</p>
      {links.map((l, i) => (
        <div key={i} className="row">
          <input className="in sp" aria-label="Título" placeholder="Título" value={l.title} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
          <input className="in sp" aria-label="Endereço do link" placeholder="https://" value={l.url} onChange={(e) => setLinks(links.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
          <button className="btn ln sm" aria-label="Remover link" onClick={() => setLinks(links.filter((_, j) => j !== i))}><Icon n="trash" s={16} /></button>
        </div>))}
      <div className="row"><button className="btn ln sm" disabled={links.length >= 8} onClick={() => setLinks([...links, { title: '', url: '' }])}><Icon n="plus" s={16} />Adicionar link</button>
        <button className="btn sm" onClick={async () => { await api('/creator/links', { method: 'PUT', body: { links } }); setSaved(true); reload() }}>Salvar links</button>{saved && <span className="ok2">Salvo.</span>}</div>
    </div>
  )
}

function Account({ c, reload }) {
  const [cons, setCons] = useState({ network: !!c.consents.network, aggregatesForRestaurants: !!c.consents.aggregatesForRestaurants, marketing: !!c.consents.marketing })
  const [slug, setSlug] = useState(c.slug)
  const [msg, setMsg] = useState('')
  const T = ({ k, title, desc }) => (
    <label className="row switchrow"><div className="sp"><b className="sm">{title}</b><div className="xs mut">{desc}</div></div><input type="checkbox" checked={cons[k]} onChange={async (e) => { const next = { ...cons, [k]: e.target.checked }; setCons(next); await api('/creator/consents', { method: 'PUT', body: next }) }} /></label>)
  return (
    <div className="col" style={{ gap: 16 }}>
      <h1 className="d s44">Conta e privacidade</h1>
      <div className="card col"><b>Endereço do mapa</b>
        <div className="row"><span className="mut sm">{location.origin}/@</span><input className="in sp" aria-label="Endereço" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} /><button className="btn sm" onClick={async () => { try { await api('/creator/slug', { method: 'PUT', body: { slug } }); setMsg('Endereço salvo.'); reload() } catch (x) { setMsg(x.message === 'slug_em_uso' ? 'Este endereço já está em uso.' : 'Use 3 a 30 letras, números, - ou _.') } }}>Salvar</button></div>{msg && <span className="xs">{msg}</span>}</div>
      <div className="card col"><b>Seus consentimentos</b>
        <div className="note">Hospedar e exibir o seu mapa é necessário para o serviço. Os usos abaixo são opcionais, ficam desligados por padrão e valem só a partir de agora.</div>
        <T k="network" title="Aparecer no mapa geral" desc="Seu mapa pode entrar na descoberta com outros criadores (recurso ainda não lançado)." />
        <T k="aggregatesForRestaurants" title="Dados agregados para restaurantes" desc="Contagens de indicações e interesse, sem dados de pessoas (recurso ainda não lançado)." />
        <T k="marketing" title="Divulgação e cases" desc="Usar o seu mapa como exemplo." />
      </div>
      <div className="card row"><div className="sp"><b>Plano</b><div className="sm mut">Teste sem cobrança. A cobrança ainda não está ativa neste MVP.</div></div>
        <button className="btn ln sm" onClick={async () => { await api('/auth/logout', { method: 'POST' }); await reload(); location.hash = '#/' }}>Sair</button></div>
    </div>
  )
}

// Administração. A ordem do menu segue o trabalho: Início (pendências), Criadores, Lugares, Denúncias; Vitrine e Métricas por último.
import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { Link, toast, useLocation } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import { AdminPage, Loading, Note, PageHead, Tabs, useTitle } from '../lib/ui.jsx'
import { num } from '../theme.jsx'
import { PlacesBase } from './AdminPlaces.jsx'
import { Collected } from './AdminCollections.jsx'
import { NetworkView } from './Network.jsx'

// guarda de qual endereço veio a resposta: ao trocar mostra "carregando", ao recarregar a lista não pisca
function useApi(path) {
  const [r, setR] = useState(null)
  const load = useCallback(() => api(path).then((data) => setR({ path, data })), [path])
  useEffect(() => { load() }, [load])
  return [r?.path === path ? r.data : null, load]
}
const Chips = ({ items, value, onChange, label }) => <div className="row wrap" role="group" aria-label={label} style={{ gap: 8 }}>{items.map(([k, l, n]) => <button key={k} type="button" className={'chip' + (value === k ? ' on' : '')} aria-pressed={value === k} onClick={() => onChange(k)}>{l}{n == null ? '' : ` · ${n}`}</button>)}</div>

// ---------- Início: o que está esperando alguém ----------
export function Home() {
  useTitle('Início')
  const [creators] = useApi('/admin/creators')
  const [review] = useApi('/admin/review')
  const [reports] = useApi('/admin/reports?status=open')
  const [claims] = useApi('/admin/claims')
  const [symbols, loadSymbols] = useApi('/admin/symbols')
  const ready = creators && review && reports && claims && symbols
  const urgent = reports?.groups.filter((g) => g.daysLeft <= 1).length || 0
  const todo = ready ? [
    [reports.counts.open, urgent ? `denúncias abertas, ${urgent} no fim do prazo` : 'denúncias abertas', '/admin/denuncias'],
    [creators.creators.filter((c) => c.status === 'pending').length, 'candidaturas aguardando decisão', '/admin/criadores'],
    [review.low.length, 'lugares a revisar nos mapas', '/admin/lugares?aba=revisar'],
    [claims.claims.filter((c) => c.status === 'pending').length, 'pedidos de restaurantes', '/admin/lugares?aba=restaurantes'],
  ] : []
  const decide = async (id, status) => { await api(`/admin/symbols/${id}`, { method: 'POST', body: { status } }); toast('Feito'); loadSymbols() }
  return (
    <AdminPage active="inicio">
      <PageHead title="Início" sub="O que está esperando uma decisão da equipe." />
      {!ready ? <Loading /> : <>
        <div className="g4">{todo.map(([n, l, to]) => <Link key={to} className={'kpi' + (n ? '' : ' zero')} to={to}><b>{n}</b><span>{l}</span></Link>)}</div>
        <div className="adm-list"><span className="eb">Símbolos enviados por criadores</span>
          {symbols.symbols.map((s) => <div key={s.id} className="card adm-row">
            <span style={{ width: 36, height: 36, borderRadius: '50%', background: '#171717', display: 'grid', placeItems: 'center' }}><Icon sym={s} s={20} c="#fff" /></span>
            <div className="adm-id"><b className="sm">{s.name}</b><span className="xs mut">@{s.handle}</span></div>
            <div className="adm-acts"><button className="btn sm" onClick={() => decide(s.id, 'approved')}>Liberar</button><button className="btn sm danger" onClick={() => decide(s.id, 'rejected')}>Recusar</button></div></div>)}
          {!symbols.symbols.length && <p className="sm mut">Nenhum símbolo na fila.</p>}</div>
      </>}
    </AdminPage>
  )
}

// ---------- Criadores ----------
const STATUS = { approved: ['ok', 'Aprovado'], pending: ['wn', 'Aguardando decisão'], waitlist: ['', 'Lista de espera'], rejected: ['bd2', 'Recusado'] }

function CreatorRow({ c, min, decide, open }) {
  const [f, setF] = useState(c.followers || '')
  const dirty = Number(f || 0) !== c.followers
  const blocked = c.criterion === 'unknown' ? 'Informe os seguidores para aprovar' : c.criterion === 'below' ? `Abaixo de ${num(min)} seguidores` : !c.verified ? 'Confirme o titular para aprovar' : ''
  const [tone, label] = STATUS[c.status]
  return (
    <div className="card adm-row adm-creator">
      <div className="adm-id">
        <div className="row wrap" style={{ gap: 8 }}><b>@{c.handle}</b><span className={`tag ${tone}`}>{label}</span></div>
        <span className="xs mut">{c.email}{c.tiktok ? ` · TikTok @${c.tiktok}` : ''}</span>
        <span className="xs"><a className="link" href={`https://instagram.com/${c.handle}`} target="_blank" rel="noopener noreferrer">Abrir Instagram ↗</a></span>
      </div>
      <form className="adm-acts" onSubmit={(e) => { e.preventDefault(); decide(c.id, { status: c.status, followers: f }) }}>
        <input className="in adm-in" type="number" min="0" placeholder="Seguidores" aria-label={`Seguidores de ${c.handle}`} value={f} onChange={(e) => setF(e.target.value)} />
        {dirty && <button className="btn sm">Salvar</button>}
        <button type="button" className={'tag ' + (c.verified ? 'ok' : 'wn')} style={{ border: 0, cursor: 'pointer' }} onClick={() => decide(c.id, { status: c.status, verified: !c.verified })}>{c.verified ? 'Titular confirmado' : 'Confirmar titular'}</button>
      </form>
      <div className="adm-acts">
        {c.status === 'approved'
          ? <select className="selbox" aria-label={`Plano de ${c.handle}`} value={c.tier || 'creator'} onChange={(e) => decide(c.id, null, e.target.value)}><option value="free">Plano Grátis</option><option value="creator">Plano Criador</option><option value="pro">Plano Pro</option></select>
          : <button className="btn sm" disabled={!!blocked} onClick={() => decide(c.id, { status: 'approved' })}>Aprovar</button>}
        {c.status !== 'waitlist' && c.status !== 'approved' && <button className="btn sm sec" onClick={() => decide(c.id, { status: 'waitlist' })}>Lista de espera</button>}
        {c.status !== 'rejected' && <button className="btn sm danger" onClick={() => (c.status !== 'approved' || confirm(`Recusar @${c.handle}? O mapa sai do ar.`)) && decide(c.id, { status: 'rejected' })}>Recusar</button>}
        {open && c.status === 'approved' && <button className="btn sm ln" onClick={open}>Abrir</button>}
      </div>
      {c.status !== 'approved' && blocked && <span className="xs mut" style={{ flexBasis: '100%' }}>{blocked}.</span>}
    </div>
  )
}

function Applications() {
  const [d, load] = useApi('/admin/creators')
  const [filter, setFilter] = useState('todos')
  const [openId, setOpen] = useState(null)
  const [min, setMin] = useState(null) // null = critério fechado para edição
  const decide = async (id, body, tier) => { try { if (tier) await api(`/admin/creators/${id}/plan`, { method: 'POST', body: { tier } }); else await api(`/admin/creators/${id}/decision`, { method: 'POST', body }); load() } catch (x) { toast(x.message === 'abaixo_do_criterio' ? 'Abaixo do mínimo de seguidores: use a lista de espera.' : 'Não foi possível salvar.') } }
  const saveMin = async (e) => { e.preventDefault(); await api('/admin/config', { method: 'PUT', body: { minFollowers: min } }); setMin(null); load() }
  if (!d) return <Loading />
  const opened = d.creators.find((c) => c.id === openId)
  if (opened) return <>
    <button type="button" className="pb-back row sm mut" onClick={() => setOpen(null)}><Icon n="back" s={18} />Todos os criadores</button>
    <div className="adm-list"><span className="eb">Perfil e plano</span><CreatorRow c={opened} min={d.minFollowers} decide={decide} /></div>
    <ReviewList creator={opened.id} title="Lugares deste mapa a revisar" />
  </>
  const shown = d.creators.filter((c) => filter === 'todos' || c.status === filter)
  const count = (s) => d.creators.filter((c) => c.status === s).length
  return <>
    <div className="row jb wrap" style={{ gap: 12 }}>
      <Chips label="Situação" value={filter} onChange={setFilter} items={[['todos', 'Todos', d.creators.length], ['pending', 'Aguardando', count('pending')], ['approved', 'Aprovados', count('approved')], ['waitlist', 'Lista de espera', count('waitlist')], ['rejected', 'Recusados', count('rejected')]]} />
      {min == null
        ? <button type="button" className="btn sm ln" onClick={() => setMin(d.minFollowers)}>Mínimo: {num(d.minFollowers)} seguidores · ajustar</button>
        : <form className="adm-acts" onSubmit={saveMin}><input className="in adm-in" type="number" min="0" autoFocus aria-label="Mínimo de seguidores" value={min} onChange={(e) => setMin(e.target.value)} /><button className="btn sm">Salvar</button><button type="button" className="btn sm sec" onClick={() => setMin(null)}>Cancelar</button></form>}
    </div>
    <div className="adm-list">{shown.map((c) => <CreatorRow key={c.id} c={c} min={d.minFollowers} decide={decide} open={() => setOpen(c.id)} />)}{!shown.length && <p className="sm mut">Ninguém nesta situação.</p>}</div>
    <Note>Antes de aprovar: perfil ativo, conteúdo de indicação de lugares e sem sinais de perfil falso. A decisão fica registrada com data e responsável.</Note>
  </>
}

export function Creators() {
  useTitle('Criadores')
  const tab = useLocation().search.get('aba') === 'coletados' ? 'coletados' : 'candidaturas'
  const [inside, setInside] = useState(false) // dentro de um criador coletado, o título passa a ser o dele
  return (
    <AdminPage active="criadores">
      {!inside && <>
        <PageHead title="Criadores" sub="Quem pediu entrada, quem está no ar e o que foi coletado de cada um." />
        <Tabs label="Criadores" active={tab} items={[['candidaturas', 'Candidaturas e planos', 'user', '/admin/criadores'], ['coletados', 'Coletados', 'link', '/admin/criadores?aba=coletados']]} />
      </>}
      {tab === 'coletados' ? <Collected onOpen={setInside} /> : <Applications />}
    </AdminPage>
  )
}

// ---------- Lugares ----------
function ReviewRow({ p, act }) {
  const [address, setAddress] = useState(null)
  return (
    <div className="card adm-row">
      <div className="adm-id">
        <div className="row wrap" style={{ gap: 8 }}><b>{p.name || 'Sem nome'}</b><span className="tag wn">{p.issue}</span></div>
        <span className="xs mut">@{p.handle} · {p.address || 'sem endereço'}{p.municipality ? ` · município encontrado: ${p.municipality}` : ''}</span>
      </div>
      {address == null
        ? <div className="adm-acts"><button className="btn sm" onClick={() => setAddress(p.address || '')}>Corrigir endereço</button><button className="btn sm sec" onClick={() => act(p.id, { reviewed: true })}>Está certo</button></div>
        : <form className="adm-acts" style={{ flex: '1 1 360px' }} onSubmit={(e) => { e.preventDefault(); if (address.trim()) { act(p.id, { address: address.trim() }); setAddress(null) } }}><input className="in adm-in wide" autoFocus aria-label={`Endereço de ${p.name}`} value={address} onChange={(e) => setAddress(e.target.value)} /><button className="btn sm">Salvar</button><button type="button" className="btn sm sec" onClick={() => setAddress(null)}>Cancelar</button></form>}
    </div>
  )
}
function ReviewList({ creator, title }) {
  const [d, load] = useApi(`/admin/review${creator ? `?creator=${creator}` : ''}`)
  const [who, setWho] = useState('')
  if (!d) return <Loading />
  const act = async (id, body) => { await api(`/admin/places/${id}`, { method: 'POST', body }); toast('Salvo'); load() }
  const handles = [...new Set(d.low.map((p) => p.handle))]
  const shown = d.low.filter((p) => !who || p.handle === who)
  return (
    <div className="adm-list">
      {title && <span className="eb">{title}</span>}
      {!creator && handles.length > 1 && <Chips label="Criador" value={who} onChange={setWho} items={[['', 'Todos', d.low.length], ...handles.map((h) => [h, `@${h}`, d.low.filter((p) => p.handle === h).length])]} />}
      {shown.map((p) => <ReviewRow key={p.id} p={p} act={act} />)}
      {!shown.length && <p className="sm mut">Nada a revisar.</p>}
    </div>
  )
}

function Claims() {
  const [d, load] = useApi('/admin/claims')
  if (!d) return <Loading />
  const decide = async (id, status) => { await api(`/admin/claims/${id}`, { method: 'POST', body: { status } }); toast('Feito'); load() }
  return (
    <div className="adm-list">
      {d.claims.map((c) => <div key={c.id} className="card adm-row">
        <div className="adm-id"><b className="sm">{c.place_name}</b><span className="xs mut">{c.email} · {c.method === 'email' ? 'e-mail do domínio' : 'conferência manual'} · {c.contact}</span></div>
        {c.status === 'pending' ? <div className="adm-acts"><button className="btn sm" onClick={() => decide(c.id, 'approved')}>Aprovar</button><button className="btn sm danger" onClick={() => decide(c.id, 'rejected')}>Recusar</button></div> : <span className={'tag ' + (c.status === 'approved' ? 'ok' : 'bd2')}>{c.status === 'approved' ? 'Aprovada' : 'Recusada'}</span>}
      </div>)}
      {!d.claims.length && <p className="sm mut">Nenhum pedido.</p>}
    </div>
  )
}
const PLACE_TABS = [['base', 'Base', 'pin', '/admin/lugares'], ['revisar', 'A revisar nos mapas', 'map', '/admin/lugares?aba=revisar'], ['rede', 'Rede', 'globe', '/admin/lugares?aba=rede'], ['restaurantes', 'Pedidos de restaurantes', 'user', '/admin/lugares?aba=restaurantes']]
export function Places() {
  useTitle('Lugares')
  const q = useLocation().search.get('aba')
  const tab = PLACE_TABS.some(([k]) => k === q) ? q : 'base'
  return (
    <AdminPage active="lugares">
      <PageHead title="Lugares" sub="Tudo sobre lugares: a base própria, o que precisa de correção e o que os restaurantes pedem." />
      <Tabs label="Lugares" active={tab} items={PLACE_TABS} />
      {tab === 'revisar' ? <ReviewList /> : tab === 'rede' ? <NetworkView /> : tab === 'restaurantes' ? <Claims /> : <PlacesBase />}
    </AdminPage>
  )
}

// ---------- Denúncias: lista à esquerda, decisão à direita ----------
function ReportPanel({ g, done, slaDays }) {
  const [address, setAddress] = useState(null)
  const run = async (action) => {
    if (action === 'pause_map' && !confirm(`Pausar o mapa inteiro de @${g.handle}?`)) return
    await api('/admin/reports/act', { method: 'POST', body: { ids: g.ids, action } }); toast('Feito'); done()
  }
  const fix = async (e) => {
    e.preventDefault()
    if (!address.trim()) return
    await api(`/admin/places/${g.placeId}`, { method: 'POST', body: { address: address.trim() } })
    await run('correct')
  }
  return (
    <div className="card col adm-panel">
      <div><b>{g.placeName || 'Mapa inteiro'}</b><div className="xs mut">@{g.handle} · {g.reason}</div></div>
      <div className="card soft sm">{g.details.length ? g.details.map((x, i) => <div key={i}>“{x}”</div>) : <span className="mut">Sem detalhes enviados.</span>}</div>
      {address != null && <form className="col" style={{ gap: 8 }} onSubmit={fix}><input className="in" autoFocus placeholder="Novo endereço" aria-label="Novo endereço" value={address} onChange={(e) => setAddress(e.target.value)} /><div className="adm-acts"><button className="btn sm">Salvar correção</button><button type="button" className="btn sm sec" onClick={() => setAddress(null)}>Cancelar</button></div></form>}
      <div className="adm-acts">
        {g.placeId && address == null && <button className="btn sm" onClick={() => setAddress('')}>Corrigir endereço</button>}
        <button className="btn sm ln" onClick={() => run('notify')}>Avisar criador</button>
        <button className="btn sm sec" onClick={() => run('archive')}>Arquivar</button>
      </div>
      <div className="adm-acts">
        {g.placeId && <button className="btn sm danger" onClick={() => run('hide_place')}>Ocultar lugar</button>}
        <button className="btn sm danger" onClick={() => run('pause_map')}>Pausar mapa</button>
      </div>
      <span className="xs mut">O criador é avisado de medidas relevantes. Prazo de resposta: {slaDays} dias.</span>
    </div>
  )
}

export function Reports() {
  useTitle('Denúncias')
  const [st, setSt] = useState('open')
  const [d, load] = useApi(`/admin/reports?status=${st}`)
  const [sel, setSel] = useState(null)
  const [counts, setCounts] = useState(null)
  useEffect(() => { if (d) setCounts(d.counts) }, [d])
  const cur = !d || st === 'resolved' ? null : d.groups.find((g) => g.ids[0] === sel) || d.groups[0]
  return (
    <AdminPage active="denuncias">
      <PageHead title="Denúncias" sub="Sobre lugares e mapas, com o prazo de cada uma." />
      <Chips label="Situação" value={st} onChange={(k) => { setSt(k); setSel(null) }} items={[['open', 'Abertas', counts?.open], ['review', 'Em análise', counts?.review], ['resolved', 'Resolvidas', counts?.resolved]]} />
      {!d ? <Loading /> : <div className={cur ? 'adm-split' : ''}>
        <div className="adm-list">
          {d.groups.map((g) => <button key={g.ids[0]} type="button" className={'card adm-row click' + (cur === g ? ' sel' : '')} style={{ textAlign: 'left' }} onClick={() => setSel(g.ids[0])}>
            <span className="adm-id"><b className="sm">{g.placeName || 'Mapa inteiro'}</b><span className="xs mut">@{g.handle} · {g.reason}{g.count > 1 ? ` · ${g.count} denúncias` : ''}</span></span>
            {st !== 'resolved' && <span className={'tag ' + (g.daysLeft <= 1 ? 'bd2' : 'wn')}>{g.daysLeft ? `${g.daysLeft} dias` : 'vence hoje'}</span>}
          </button>)}
          {!d.groups.length && <p className="sm mut">Nada por aqui.</p>}
        </div>
        {cur && <ReportPanel key={cur.ids[0]} g={cur} slaDays={d.slaDays} done={() => { setSel(null); load() }} />}
      </div>}
    </AdminPage>
  )
}

// ---------- Métricas: negócio e qualidade dos dados ----------
export function Metrics() {
  useTitle('Métricas')
  const [d] = useApi('/admin/metrics')
  const [review] = useApi('/admin/review')
  const top = d?.funnel?.[0]?.[1] || 1
  const pc = (v) => (v == null ? '—' : `${v} %`)
  const usage = d ? [['Mudaram o visual', d.studio.changedVisual], ['Enviaram símbolo próprio', d.studio.customSymbol], ['Domínio próprio', d.studio.customDomain], ['No mapa geral', d.studio.network]] : []
  return (
    <AdminPage active="metricas">
      <PageHead title="Métricas" sub="Negócio, funil de criadores e qualidade dos dados." />
      {!d || !review ? <Loading /> : <>
        <div className="g4"><div className="kpi"><b>—</b><span>receita recorrente mensal (cobrança inativa)</span></div><div className="kpi"><b>{d.funnel[4][1]}</b><span>criadores pagantes</span></div><div className="kpi"><b>—</b><span>cancelamento mensal</span></div><div className="kpi"><b>—</b><span>teste que vira pago</span></div></div>
        <div className="g2">
          <div className="card col"><b>Funil de criadores</b>{d.funnel.map(([l, n]) => <div key={l} className="row"><span className="sm" style={{ width: 150 }}>{l}</span><div className="bar sp"><i style={{ width: `${(n / top) * 100}%` }} /></div><b className="sm" style={{ width: 28, textAlign: 'right' }}>{n}</b></div>)}</div>
          <div className="card col"><b>Uso do estúdio</b><span className="sm mut">Entre os aprovados.</span>{usage.map(([l, v]) => <div key={l} className="row jb"><span className="sm">{l}</span><b className="sm">{pc(v)}</b></div>)}</div>
        </div>
        <span className="eb">Qualidade dos dados · {review.metrics.places} lugares</span>
        <div className="g4"><div className="kpi"><b>{review.metrics.reviewPct == null ? '—' : `${review.metrics.reviewPct}%`}</b><span>lugares que precisaram de revisão</span></div><div className="kpi"><b>{review.metrics.unresolvedPct == null ? '—' : `${review.metrics.unresolvedPct}%`}</b><span>posts sem lugar</span></div></div>
        <Note>Receita e retenção só existem quando a cobrança for ativada. A taxa real de erro da extração depende de amostras auditadas à mão.</Note>
      </>}
    </AdminPage>
  )
}

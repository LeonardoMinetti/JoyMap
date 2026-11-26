import React, { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { Link, navigate, toast } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import { AdminPage, Loading, Note, PageHead, useTitle } from '../lib/ui.jsx'
import MapCanvas from '../MapCanvas.jsx'
import { num } from '../theme.jsx'

const DEF = { accent: '#d93a1c', tone: 'light', shape: 'circle', pinSize: 55, pinBorder: true, cluster: false, selected: 'outline', mapLabels: true, labelDensity: 40, start: 'all', startView: null, categories: [{ id: 'low', name: 'Baixa confiança', color: '#d93a1c', icon: 'alert' }] }
const Shell = AdminPage

// I1 · fila de candidaturas
export function Applications() {
  useTitle('Candidaturas')
  const [d, setD] = useState(null)
  const load = useCallback(() => api('/admin/creators').then(setD), [])
  useEffect(() => { load() }, [load])
  const decide = async (id, body, tier) => { try { if (tier) await api(`/admin/creators/${id}/plan`, { method: 'POST', body: { tier } }); else await api(`/admin/creators/${id}/decision`, { method: 'POST', body }); load() } catch (x) { toast(x.message === 'abaixo_do_criterio' ? 'Abaixo do mínimo de seguidores: use a lista de espera.' : 'Não foi possível salvar.') } }
  const adjust = async () => { const v = prompt('Novo mínimo de seguidores:', d.minFollowers); if (v == null) return; await api('/admin/config', { method: 'PUT', body: { minFollowers: v } }); load() }
  const S = { approved: ['ok', 'Aprovado'], pending: ['wn', 'Aguardando decisão'], waitlist: ['', 'Lista de espera'], rejected: ['bd2', 'Recusado'] }
  const C = { met: ['ok', 'Atende'], below: ['bd2', 'Abaixo'], unknown: ['wn', 'Informar seguidores'] }
  return (
    <Shell active="candidaturas">
      {!d ? <Loading /> : <>
        <PageHead title="Candidaturas" sub="Perfis que pediram convite, à espera de conferência e decisão." right={<div className="row wrap" style={{ gap: 8 }}><span className="tag">Mínimo atual: {num(d.minFollowers)} seguidores</span><button className="btn ln sm" onClick={adjust}>Ajustar critério</button></div>} />
        <div className="card" style={{ padding: 8, overflowX: 'auto' }}><table className="tbl admt"><thead><tr><th>Perfil</th><th>Seguidores</th><th>Critério</th><th>Verificação</th><th>Status</th><th /></tr></thead><tbody>
          {d.creators.map((c) => <Row key={c.id} c={c} S={S} C={C} decide={decide} />)}
          {!d.creators.length && <tr><td colSpan="6" className="mut">Nenhuma candidatura ainda.</td></tr>}</tbody></table></div>
        <Note>Confira o perfil no Instagram, informe o número de seguidores e confirme o titular antes de aprovar. Critérios além de seguidores: perfil ativo, conteúdo de indicação de lugares (gastronomia, viagem, passeios, esportes) e sem sinais de perfil falso. A decisão fica registrada com data e responsável.</Note></>}
    </Shell>
  )
}
function Row({ c, S, C, decide }) {
  const [f, setF] = useState(c.followers || '')
  const dirty = Number(f || 0) !== c.followers
  return (
    <tr><td><b>@{c.handle}</b> <a className="xs" href={`https://instagram.com/${c.handle}`} target="_blank" rel="noopener noreferrer">perfil ↗</a><div className="xs mut">{c.email}{c.tiktok ? ` · TikTok @${c.tiktok}` : ''}</div></td>
      <td><div className="row" style={{ gap: 6 }}><input className="in" type="number" min="0" style={{ width: 110, minHeight: 36, padding: '4px 10px' }} aria-label={`Seguidores de ${c.handle}`} value={f} onChange={(e) => setF(e.target.value)} />{dirty && <button className="btn sm" onClick={() => decide(c.id, { status: c.status, followers: f })}>Salvar</button>}</div></td>
      <td><span className={`tag ${C[c.criterion][0]}`}>{C[c.criterion][1]}</span></td>
      <td><button className={'tag ' + (c.verified ? 'ok' : 'wn')} style={{ border: 0, cursor: 'pointer' }} onClick={() => decide(c.id, { status: c.status, verified: !c.verified })}>{c.verified ? 'Titular confirmado' : 'Conferir perfil'}</button></td>
      <td><span className={`tag ${S[c.status][0]}`}>{S[c.status][1]}</span>{c.status === 'approved' && <select className="selbox" style={{ marginTop: 6, minHeight: 32 }} aria-label={`Plano de ${c.handle}`} value={c.tier || 'creator'} onChange={(e) => decide(c.id, null, e.target.value)}><option value="free">Grátis</option><option value="creator">Criador</option><option value="pro">Pro</option></select>}</td>
      <td><div className="row wrap" style={{ gap: 6 }}>{c.status !== 'approved' && <button className="btn sm" disabled={c.criterion !== 'met' || !c.verified} title={c.criterion !== 'met' ? 'Informe seguidores acima do mínimo' : !c.verified ? 'Confirme o titular antes' : ''} onClick={() => decide(c.id, { status: 'approved' })}>Aprovar</button>}{c.status !== 'waitlist' && <button className="btn sm ln" onClick={() => decide(c.id, { status: 'waitlist' })}>Lista de espera</button>}{c.status !== 'rejected' && <button className="btn sm sec" onClick={() => decide(c.id, { status: 'rejected' })}>Recusar</button>}</div></td></tr>
  )
}

// I2 · revisão de mapas
export function MapReview() {
  useTitle('Revisão de mapas')
  const [creator, setCreator] = useState(null)
  const [d, setD] = useState(null)
  const [sel, setSel] = useState(null)
  const load = useCallback(() => api(`/admin/review${creator ? `?creator=${creator}` : ''}`).then(setD), [creator])
  useEffect(() => { load() }, [load])
  const low = d?.low || []
  const cur = low.find((p) => p.id === sel) || low[0]
  const places = low.filter((p) => p.lat != null).map((p) => ({ id: p.id, name: p.name, lat: p.lat, lon: p.lon, category: 'low' }))
  const act = async (id, body) => { await api(`/admin/places/${id}`, { method: 'POST', body }); toast('Salvo'); load() }
  return (
    <Shell active="mapas">
      <PageHead title="Mapas" sub="Lugares dos mapas dos criadores que precisam de revisão." />
      {!d ? <Loading /> : <div className="g3" style={{ gridTemplateColumns: '1fr 1.4fr 1fr' }}>
        <div className="col"><span className="eb">Fila</span><button className={'card click' + (!creator ? ' sel' : '')} onClick={() => setCreator(null)}><b className="sm">Todos os mapas</b></button>{d.queue.map((q) => <button key={q.id} className={'card click' + (creator === q.id ? ' sel' : '')} style={{ gap: 4 }} onClick={() => setCreator(q.id)}><b className="sm">@{q.handle}</b><span className="xs mut">{q.places} lugares · {q.pending} pendentes</span></button>)}</div>
        <div className="col"><span className="eb">Lugares com baixa confiança</span>
          <div style={{ borderRadius: 16, overflow: 'hidden', height: 240 }}><MapCanvas places={places} theme={DEF} selectedId={cur?.id} onSelect={setSel} style={{ height: 240 }} /></div>
          {cur ? <div className="card col" style={{ gap: 6 }}><div className="row"><b className="sp">{cur.name || 'Sem nome'}</b><span className="tag wn">{cur.issue}</span></div><span className="sm mut">@{cur.handle} · endereço do post: {cur.address || 'sem endereço'}{cur.municipality ? `. Município encontrado: ${cur.municipality}.` : '.'}</span>
            <div className="row"><button className="btn sm" onClick={() => { const a = prompt('Endereço corrigido:', cur.address || ''); if (a) act(cur.id, { address: a }) }}>Corrigir</button><button className="btn sm sec" onClick={() => act(cur.id, { reviewed: true })}>Marcar como revisado</button></div></div> : <p className="sm mut">Nenhum lugar com baixa confiança na fila.</p>}</div>
        <div className="col"><span className="eb">Métricas de qualidade</span><div className="kpi"><b>{d.metrics.reviewPct == null ? '—' : `${d.metrics.reviewPct}%`}</b><span>lugares que precisaram de revisão</span></div><div className="kpi"><b>{d.metrics.unresolvedPct == null ? '—' : `${d.metrics.unresolvedPct}%`}</b><span>posts sem lugar</span></div><Note>São contagens sobre todos os mapas ({d.metrics.places} lugares). A taxa real de erro da extração depende de amostras auditadas manualmente.</Note></div>
      </div>}
    </Shell>
  )
}

// I3 · moderação
const ACTIONS = [['correct', 'Corrigir dado'], ['hide_place', 'Ocultar lugar'], ['pause_map', 'Pausar mapa'], ['notify', 'Avisar criador'], ['archive', 'Arquivar']]
export function Moderation() {
  useTitle('Moderação')
  const [st, setSt] = useState('open')
  const [d, setD] = useState(null)
  const [sel, setSel] = useState(null)
  const [extra, setExtra] = useState({ symbols: [], claims: [] })
  const load = useCallback(() => { api(`/admin/reports?status=${st}`).then(setD); api('/admin/symbols').then((s) => api('/admin/claims').then((c) => setExtra({ symbols: s.symbols, claims: c.claims }))) }, [st])
  useEffect(() => { load() }, [load])
  const run = async (g, action) => {
    if (action === 'correct') { navigate('/admin/mapas'); }
    if (action === 'pause_map' && !confirm('Pausar o mapa inteiro deste criador?')) return
    await api('/admin/reports/act', { method: 'POST', body: { ids: g.ids, action } }); toast('Feito'); setSel(null); load()
  }
  const cur = d?.groups.find((g) => g.ids[0] === sel)
  const CH = [['open', 'Abertas'], ['review', 'Em análise'], ['resolved', 'Resolvidas']]
  return (
    <Shell active="moderacao">
      <PageHead title="Moderação" sub="Denúncias sobre lugares e mapas, com o prazo de cada uma." />
      <div className="row wrap">{CH.map(([k, l]) => <button key={k} className={'chip' + (st === k ? ' on' : '')} onClick={() => { setSt(k); setSel(null) }}>{l}{d ? ` (${d.counts[k]})` : ''}</button>)}</div>
      {!d ? <Loading /> : <>
        <div className="card" style={{ padding: 8, overflowX: 'auto' }}><table className="tbl admt"><thead><tr><th>Lugar / mapa</th><th>Motivo</th><th>Denúncias</th><th>Prazo</th><th /></tr></thead><tbody>
          {d.groups.map((g) => <tr key={g.ids[0]} style={sel === g.ids[0] ? { background: 'var(--soft)' } : undefined}><td><b>{g.placeName || 'Mapa inteiro'}</b><div className="xs mut">@{g.handle}</div></td><td>{g.reason}</td><td>{g.count}</td><td>{st === 'resolved' ? '—' : g.daysLeft ? `${g.daysLeft} dias` : 'vence hoje'}</td><td>{st !== 'resolved' && <button className={'btn sm' + (st === 'review' ? ' sec' : '')} onClick={() => setSel(g.ids[0])}>{st === 'open' ? 'Analisar' : 'Abrir'}</button>}</td></tr>)}
          {!d.groups.length && <tr><td colSpan="5" className="mut">Nada por aqui.</td></tr>}</tbody></table></div>
        <div className="card col" style={{ gap: 8 }}><b>Ações possíveis</b>
          {cur && <div className="card soft sm">{cur.details.length ? cur.details.map((x, i) => <div key={i}>“{x}”</div>) : <span className="mut">Sem detalhes enviados.</span>}</div>}
          <div className="row wrap">{ACTIONS.map(([k, l]) => <button key={k} className="chip" disabled={!cur || (k === 'hide_place' && !cur.placeId)} onClick={() => run(cur, k)}>{l}</button>)}</div><span className="xs mut">Selecione uma denúncia acima. O criador é avisado de medidas relevantes (aviso no painel dele) e tem um canal para esclarecer. Prazo de resposta: {d.slaDays} dias (premissa interna).</span></div>
        <div className="g2">
          <div className="card col"><b>Símbolos enviados para revisão</b>{extra.symbols.map((s) => <div key={s.id} className="row"><span style={{ width: 36, height: 36, borderRadius: '50%', background: '#171717', display: 'grid', placeItems: 'center' }}><Icon sym={s} s={20} c="#fff" /></span><span className="sm sp">{s.name} · @{s.handle}</span><button className="btn sm" onClick={async () => { await api(`/admin/symbols/${s.id}`, { method: 'POST', body: { status: 'approved' } }); load() }}>Liberar</button><button className="btn sm ln" onClick={async () => { await api(`/admin/symbols/${s.id}`, { method: 'POST', body: { status: 'rejected' } }); load() }}>Recusar</button></div>)}{!extra.symbols.length && <span className="sm mut">Nenhum símbolo na fila.</span>}</div>
          <div className="card col"><b>Reivindicações de restaurantes</b>{extra.claims.map((c) => <div key={c.id} className="row"><div className="sp"><b className="sm">{c.place_name}</b><div className="xs mut">{c.email} · {c.method === 'email' ? 'e-mail do domínio' : 'manual'} · {c.contact}</div></div>{c.status === 'pending' ? <><button className="btn sm" onClick={async () => { await api(`/admin/claims/${c.id}`, { method: 'POST', body: { status: 'approved' } }); load() }}>Aprovar</button><button className="btn sm ln" onClick={async () => { await api(`/admin/claims/${c.id}`, { method: 'POST', body: { status: 'rejected' } }); load() }}>Recusar</button></> : <span className={'tag ' + (c.status === 'approved' ? 'ok' : 'bd2')}>{c.status === 'approved' ? 'Aprovada' : 'Recusada'}</span>}</div>)}{!extra.claims.length && <span className="sm mut">Nenhum pedido.</span>}</div></div></>}
    </Shell>
  )
}

// I4 · métricas do negócio
export function Metrics() {
  useTitle('Métricas')
  const [d, setD] = useState(null)
  useEffect(() => { api('/admin/metrics').then(setD) }, [])
  const top = d?.funnel?.[0]?.[1] || 1
  const pc = (v) => (v == null ? '—' : `${v} %`)
  return (
    <Shell active="metricas">
      <PageHead title="Métricas" sub="Indicadores do negócio e do funil de criadores." />
      {!d ? <Loading /> : <>
        <div className="g4"><div className="kpi"><b>—</b><span>receita recorrente mensal (cobrança inativa)</span></div><div className="kpi"><b>{d.funnel[4][1]}</b><span>criadores pagantes</span></div><div className="kpi"><b>—</b><span>cancelamento mensal</span></div><div className="kpi"><b>—</b><span>teste que vira pago</span></div></div>
        <div className="g2">
          <div className="card col"><b>Funil de criadores</b>{d.funnel.map(([l, n]) => <div key={l} className="row"><span className="sm" style={{ width: 150 }}>{l}</span><div className="bar sp"><i style={{ width: `${(n / top) * 100}%` }} /></div><b className="sm" style={{ width: 28, textAlign: 'right' }}>{n}</b></div>)}</div>
          <div className="card col"><b>Uso do estúdio</b><span className="sm mut">Quem personaliza mais tende a ficar mais tempo? (entre aprovados)</span><div className="row"><span className="sm" style={{ width: 190 }}>Mudaram o visual</span><b className="sm">{pc(d.studio.changedVisual)}</b></div><div className="row"><span className="sm" style={{ width: 190 }}>Enviaram símbolo próprio</span><b className="sm">{pc(d.studio.customSymbol)}</b></div><div className="row"><span className="sm" style={{ width: 190 }}>Domínio próprio</span><b className="sm">{pc(d.studio.customDomain)}</b></div><div className="row"><span className="sm" style={{ width: 190 }}>No mapa geral</span><b className="sm">{pc(d.studio.network)}</b></div></div></div>
        <Note>Indicadores de decisão: custo por criador atendido, tempo de revisão por mapa, taxa de erro na extração e participação no mapa geral. Receita e retenção só existem quando a cobrança for ativada; até lá aparecem como "—".</Note></>}
    </Shell>
  )
}

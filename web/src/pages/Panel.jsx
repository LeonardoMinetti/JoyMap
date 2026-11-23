import React, { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../api.js'
import { Link, navigate, toast } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import { PanelPage, Note, Switch, Field, Loading, useTitle } from '../lib/ui.jsx'
import { useMe } from '../lib/me.jsx'
import { fmtDM, fmtDate, num, onAccent, onColor, TONES, ACCENTS, CAT_COLORS, catOf } from '../theme.jsx'
import { findGroups, hasCoords, issueOf } from '../lib/places.js'
import { PlacePhoto, pubVars } from '../pub/shared.jsx'
import MapCanvas from '../MapCanvas.jsx'

const ACCOUNT_TABS = [['conta', 'Perfil', '/painel/conta'], ['contas', 'Contas conectadas', '/painel/contas'], ['privacidade', 'Privacidade', '/painel/privacidade'], ['plano', 'Plano e cobrança', '/painel/plano']]
const AccountPage = ({ tab, children }) => (
  <PanelPage active="conta">
    <h1 className="d s44">Minha conta</h1>
    <nav className="sub-tabs" aria-label="Minha conta">{ACCOUNT_TABS.map(([k, l, to]) => <Link key={k} to={to} className={k === tab ? 'on' : ''} aria-current={k === tab ? 'page' : undefined}>{l}</Link>)}</nav>
    {children}
  </PanelPage>
)
const Photo = ({ s = 56, label = 'foto' }) => <div className="sq ph" style={{ width: s, height: s }}>{label}</div>
const Head = ({ title, sub, right }) => <div className="row jb wrap pg-h"><div><h1 className="d s44">{title}</h1>{sub && <p className="sm mut">{sub}</p>}</div>{right}</div>
import { STATIC } from '../lib/base.js'
import { demoExport } from '../lib/demoCreator.js'
const dlDemo = (f) => (e) => { if (STATIC) { e.preventDefault(); demoExport(f) } }
const useStats = (days = 30) => { const [s, setS] = useState(null); useEffect(() => { setS(null); api(`/creator/stats?days=${days}`).then(setS).catch(() => setS({ error: true })) }, [days]); return s }
const usePlacesList = () => { const [p, setP] = useState(null); const load = () => api('/creator/places').then((d) => setP(d.places)); useEffect(() => { load() }, []); return [p, load] }
const sampleTag = (n) => (n < 30 ? <span className="tag wn" title="Poucas visitas: os números ainda variam muito">Amostra pequena</span> : null)

// F1 · visão geral
const Delta = ({ children }) => <span className="xs mut">{children}</span>
function Kpi({ v, l, hint }) { return <div className="kpi" title={hint}><b>{num(v)}</b><span>{l}</span></div> }
export function Overview() {
  useTitle('Visão geral')
  const { me, reload } = useMe()
  const [days, setDays] = useState(30)
  const s = useStats(days)
  const [places] = usePlacesList()
  const [hov, setHov] = useState(null)
  const c = me.creator
  const theme = c.theme
  const series = useMemo(() => {
    if (!s || s.error) return []
    const m = new Map(s.perDay.map((d) => [d.d, d.n]))
    return Array.from({ length: days }, (_, i) => { const d = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10); return { d, n: m.get(d) || 0 } })
  }, [s, days])
  const max = Math.max(1, ...series.map((x) => x.n))
  const peak = series.reduce((a, b) => (b.n > a.n ? b : a), { n: 0 })
  const shown = hov != null ? series[hov] : peak
  const pending = places ? places.filter((p) => p.status === 'pending' || p.status === 'unresolved').length : 0
  const top = s && !s.error ? s.topPlaces.slice(0, 5) : []
  const topMax = Math.max(1, ...top.map((p) => p.opens))
  const byId = new Map((places || []).map((p) => [p.id, p]))
  return (
    <PanelPage active="visao">
      {me.notices.map((n) => <div key={n.id} className="note row"><Icon n="alert" s={18} c="#93370d" /><span className="sp">{n.text}</span><button className="btn sm ln" onClick={async () => { await api('/creator/notices/seen', { method: 'POST' }); reload() }}>Entendi</button></div>)}
      {!c.published && <div className="note row"><span className="sp"><b>Seu mapa ainda não está no ar.</b> Revise os lugares e publique para os seguidores verem.</span><Link className="btn sm" to="/revisar">Revisar e publicar</Link></div>}
      <Head title="Visão geral" sub={`Últimos ${days} dias · interações no seu mapa`} right={<div className="row wrap">{s && !s.error && sampleTag(s.sessions)}<div className="seg" role="group" aria-label="Período"><button className={days === 30 ? 'on' : ''} onClick={() => setDays(30)}>30 dias</button><button className={days === 7 ? 'on' : ''} onClick={() => setDays(7)}>7 dias</button></div><Link className="btn sm" to="/painel/atualizar">Atualizar mapa{pending ? ` (${pending})` : ''}</Link></div>} />
      {!s ? <Loading /> : s.error ? <p className="err">Não foi possível carregar.</p> : <>
        <div className="g4"><Kpi v={s.sessions} l="sessões" hint="Visitas ao seu mapa" /><Kpi v={s.placeOpens} l="lugares abertos" hint="Vezes que um lugar foi aberto" /><Kpi v={s.routeClicks} l="cliques em rota" hint="Quem pediu rota até o lugar" /><Kpi v={s.postOpens} l="voltas aos seus posts" hint="Quem voltou ao post original" /></div>
        <div className="g2" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div className="card col"><div className="row jb wrap"><b>Sessões por dia</b>{s.sessions > 0 && <span className="sm" aria-live="polite"><b>{fmtDM(shown.d)}</b> · {shown.n} sess{shown.n === 1 ? 'ão' : 'ões'}{hov == null && peak.n ? <Delta> (pico)</Delta> : null}</span>}</div>
            {s.sessions ? <div className="bars" onMouseLeave={() => setHov(null)}>{series.map((d, i) => <i key={d.d} tabIndex={0} role="img" aria-label={`${fmtDM(d.d)}: ${d.n} sessões`} className={(d.d === shown.d && d.n ? 'hi' : '')} onMouseEnter={() => setHov(i)} onFocus={() => setHov(i)} onBlur={() => setHov(null)} style={{ height: `${Math.max(2, (d.n / max) * 100)}%` }} />)}</div> : <p className="sm mut">Ainda sem visitas. Publique o mapa e coloque o link na bio.</p>}</div>
          <div className="card col soft"><span className="eb">Oportunidade de conteúdo</span>
            {s.opportunity ? <><b className="d s32">{s.opportunity.count} buscas por "{s.opportunity.term}"</b><span className="sm">{s.opportunity.empty} ficaram sem resultado. Que tal indicar um lugar sobre esse tema?</span><div className="row"><Link className="btn sm" to={`/adicionar?q=${encodeURIComponent(s.opportunity.term)}`}>Indicar lugar</Link><Link className="btn sm ln" to="/painel/buscas">Ver buscas</Link></div></> : <span className="sm">Quando seguidores buscarem algo que o mapa não tem, aparece aqui como ideia de conteúdo.</span>}</div>
        </div>
        <div className="g2" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div className="card col"><div className="row jb"><b>Lugares mais abertos</b><Link className="link xs" to="/painel/lugares">Ver todos</Link></div>
            {top.length ? top.map((p, i) => { const pl = byId.get(p.id); return (
              <Link key={p.id} to={`/revisar/${p.id}`} className="rank"><b className="sm" style={{ width: 18 }}>{i + 1}</b>{pl ? <PlacePhoto place={pl} theme={theme} size={40} style={{ borderRadius: 12 }} /> : <Photo s={40} />}
                <div className="sp col" style={{ gap: 4 }}><div className="row jb"><b className="sm trunc">{p.name}</b><span className="xs mut">{p.opens} aberturas · {p.routes} rotas</span></div><div className="hb"><i style={{ width: `${(p.opens / topMax) * 100}%` }} /></div></div></Link>) })
              : <p className="sm mut">Os lugares mais abertos aparecem aqui quando houver visitas.</p>}</div>
          <div className="col" style={{ gap: 20, minWidth: 0 }}>
            <div className="card row">{s.featured ? <><Photo /><div className="sp"><span className="eb">Indicação em destaque</span><div className="b">{s.featured.name}</div><div className="xs mut">{s.featured.routes} cliques em rota</div></div></> : <span className="sm mut">A indicação em destaque aparece quando houver cliques em rota.</span>}</div>
            <div className="card soft"><span className="xs mut">{s.note}</span></div></div>
        </div>
        <AudienceBlock s={s} /></>}
    </PanelPage>
  )
}

// F2 · buscas e oportunidades
export function Searches() {
  useTitle('Buscas')
  const s = useStats(30)
  const [f, setF] = useState('all')
  const [q, setQ] = useState('')
  if (!s) return <PanelPage active="buscas"><Loading /></PanelPage>
  const rows = (s.searches || []).filter((x) => (f === 'all' || (f === 'empty' && x.empty > 0) || (f === 'ok' && x.empty === 0)) && (!q || x.term.toLowerCase().includes(q.toLowerCase())))
  const total = (s.searches || []).reduce((n, x) => n + x.count, 0)
  const empty = (s.searches || []).reduce((n, x) => n + x.empty, 0)
  const mx = Math.max(1, ...(s.searches || []).map((x) => x.count))
  return (
    <PanelPage active="buscas">
      <Head title="Buscas e oportunidades" sub="O que sua audiência procura no seu mapa · últimos 30 dias" right={!s.error && sampleTag(s.sessions)} />
      <div className="g3"><Kpi v={total} l="buscas" /><Kpi v={empty} l="sem resultado" hint="Buscas em que o mapa não tinha o que a pessoa procurava" /><Kpi v={s.requests} l={`pedido${s.requests === 1 ? '' : 's'} de indicação`} hint='Quem tocou em "Pedir uma indicação" (anônimo)' /></div>
      <section className="blk" aria-label="Termos buscados">
      <div className="row wrap jb"><div className="seg" role="group" aria-label="Filtrar buscas">{[['all', 'Todas'], ['empty', 'Sem resultado'], ['ok', 'Com resultado']].map(([k, l]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l}</button>)}</div><div className="in" style={{ minHeight: 40, width: 240 }}><Icon n="search" s={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar termo" aria-label="Buscar termo" /></div></div>
      <div className="card col" style={{ gap: 4, padding: 12 }}>
        {rows.map((x) => (
          <div key={x.term} className="srch">
            <div className="sp col" style={{ gap: 6 }}><div className="row jb"><b>{x.term}</b><span className="xs mut">{x.count} busca{x.count === 1 ? '' : 's'}</span></div>
              <div className="hb split" title={`${x.withResults} com resultado, ${x.empty} sem`}><i style={{ width: `${(x.withResults / mx) * 100}%` }} /><i className="warn" style={{ width: `${(x.empty / mx) * 100}%` }} /></div></div>
            {x.empty > 0 ? <><span className="tag wn">{x.empty} sem resultado</span><Link className="btn sm" to={`/adicionar?q=${encodeURIComponent(x.term)}`}>Indicar lugar</Link></> : <span className="tag ok">Atendida</span>}
          </div>))}
        {!rows.length && <p className="sm mut" style={{ padding: 12 }}>{(s.searches || []).length ? 'Nenhuma busca neste filtro.' : 'Ainda sem buscas no seu mapa.'}</p>}
      </div>
      <p className="xs mut" style={{ margin: 0 }}>Os termos passam por um filtro que remove e-mails, telefones e links antes de serem guardados. Barra cinza: buscas com resultado; barra amarela: sem resultado.</p>
      </section>
    </PanelPage>
  )
}

// F3 · lugares
export function PlacesPage() {
  useTitle('Lugares')
  const [places, reload] = usePlacesList()
  const s = useStats(30)
  const { me } = useMe()
  const theme = me.creator.theme
  const [f, setF] = useState(() => new URLSearchParams(location.search).get('f') || 'all')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [sort, setSort] = useState('recent')
  const [view, setView] = useState('grid')
  if (!places) return <PanelPage active="lugares"><Loading /></PanelPage>
  const live = places.filter((p) => p.status === 'pending' || p.status === 'confirmed')
  const perf = new Map((s?.topPlaces || []).map((p) => [p.id, p]))
  const FIL = [['all', 'Todos', () => true], ['pending', 'Pendentes', (p) => p.status === 'pending'], ['ad', 'Publi', (p) => p.ad], ['nocoord', 'Sem localização', (p) => !hasCoords(p)], ['semfoto', 'Sem foto', (p) => !p.photo]]
  const test = FIL.find((x) => x[0] === f)[2]
  let list = live.filter((p) => test(p) && (!cat || p.category === cat) && (!q || `${p.name} ${p.neighborhood || ''} ${p.address || ''}`.toLowerCase().includes(q.toLowerCase())))
  list = [...list].sort((a, b) => sort === 'name' ? (a.name || '').localeCompare(b.name || '') : sort === 'opens' ? (perf.get(b.id)?.opens || 0) - (perf.get(a.id)?.opens || 0) : b.id - a.id)
  const cats = theme.categories.filter((c) => live.some((p) => p.category === c.id))
  const status = (p) => { const is = issueOf(p, places); return p.ad ? ['ax', 'Publi'] : [is.k, is.tag === 'Ver unidades' ? (p.status === 'confirmed' ? 'Confirmado' : 'Para revisar') : is.tag] }
  const confirm1 = async (e, p) => { e.stopPropagation(); await api(`/creator/places/${p.id}`, { method: 'PATCH', body: { status: 'confirmed' } }); toast('Lugar confirmado'); reload() }
  return (
    <PanelPage active="lugares">
      <Head title="Lugares" sub={`${live.length} lugares no seu mapa`} right={<div className="row wrap"><Link className="btn ln sm" to="/colar-posts?voltar=/painel/atualizar">Colar posts</Link><Link className="btn sm" to="/adicionar"><Icon n="plus" s={14} />Adicionar lugar</Link></div>} />
      <section className="blk" aria-label="Lista de lugares">
      <div className="row wrap jb">
        <div className="seg" role="group" aria-label="Filtrar lugares">{FIL.map(([k, l, fn]) => <button key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{l}{k !== 'all' && <span className="n">{live.filter(fn).length}</span>}</button>)}</div>
        <div className="row wrap"><div className="in" style={{ minHeight: 40, width: 220 }}><Icon n="search" s={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome ou bairro" aria-label="Buscar lugar" /></div>
          <select className="selbox" aria-label="Ordenar" value={sort} onChange={(e) => setSort(e.target.value)}><option value="recent">Mais recentes</option><option value="opens">Mais abertos</option><option value="name">Nome (A–Z)</option></select>
          <div className="seg" role="group" aria-label="Visualização"><button className={view === 'grid' ? 'on' : ''} aria-label="Cartões" onClick={() => setView('grid')}><Icon n="grid" s={16} c={view === 'grid' ? '#fff' : '#6b6b6b'} /></button><button className={view === 'list' ? 'on' : ''} aria-label="Lista" onClick={() => setView('list')}><Icon n="menu" s={16} c={view === 'list' ? '#fff' : '#6b6b6b'} /></button></div></div>
      </div>
      <div className="row wrap" style={{ gap: 6 }}><button className={'chip' + (!cat ? ' on' : '')} onClick={() => setCat('')}>Todas as categorias</button>{cats.map((c) => <button key={c.id} className={'chip' + (cat === c.id ? ' on' : '')} onClick={() => setCat(cat === c.id ? '' : c.id)}><span style={{ width: 10, height: 10, borderRadius: '50%', background: c.color, display: 'inline-block' }} />{c.name}</button>)}</div>
      {view === 'grid' ? (
        <div className="plgrid">{list.map((p) => { const st = status(p); const pf = perf.get(p.id); const cc = catOf(theme, p.category); return (
          <div key={p.id} className="card plc" role="button" tabIndex={0} onClick={() => navigate(`/revisar/${p.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/revisar/${p.id}`)}>
            <div className="plc-ph"><PlacePhoto place={p} theme={theme} aspect="4/3" style={{ width: '100%', borderRadius: 16, display: 'grid', placeItems: 'center' }} label="Sem foto" /><span className={`tag ${st[0]}`}>{st[1]}</span></div>
            <b className="sm trunc">{p.name || 'Sem nome'}</b>
            <div className="row" style={{ gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: cc.color, flex: 'none' }} /><span className="xs mut trunc">{cc.name}{p.neighborhood ? ` · ${p.neighborhood}` : ''}</span></div>
            <div className="row jb xs mut"><span>{pf?.opens || 0} aberturas · {pf?.routes || 0} rotas</span>{p.googleUrl && <Icon n="ext" s={12} />}{p.instagramUrl && <Icon n="insta" s={12} />}</div>
            {p.status === 'pending' && <button className="btn sm blk" onClick={(e) => confirm1(e, p)}>Confirmar</button>}
          </div>) })}
          {!list.length && <p className="mut sm" style={{ gridColumn: '1/-1' }}>Nenhum lugar nesta lista.</p>}</div>
      ) : (
        <div className="card" style={{ padding: 8 }}><table className="tbl"><thead><tr><th>Lugar</th><th>Categoria</th><th>Aberturas</th><th>Rotas</th><th>Status</th></tr></thead><tbody>
          {list.map((p) => { const st = status(p); const pf = perf.get(p.id); return (
            <tr key={p.id} className="click" style={{ cursor: 'pointer' }} onClick={() => navigate(`/revisar/${p.id}`)}><td><div className="row"><PlacePhoto place={p} theme={theme} size={36} style={{ borderRadius: 10 }} label="" /><div><b>{p.name || 'Sem nome'}</b><div className="xs mut">{p.neighborhood || p.municipality || p.address || ''}</div></div></div></td><td>{catOf(theme, p.category).name}</td><td>{pf?.opens || 0}</td><td>{pf?.routes || 0}</td><td><span className={`tag ${st[0]}`}>{st[1]}</span></td></tr>) })}
          {!list.length && <tr><td colSpan="5" className="mut">Nenhum lugar nesta lista.</td></tr>}</tbody></table></div>
      )}
      </section>
    </PanelPage>
  )
}

// Audiência (bloco da Visão geral)
const WD = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
function AudienceBlock({ s }) {
  const a = s.audience
  const wd = [1, 2, 3, 4, 5, 6, 0].map((i) => a.weekdays[i])
  const mx = Math.max(1, ...wd)
  return (
    <section className="blk sec" aria-label="Audiência">
      <div className="sec-h"><h2 className="d s32">Audiência</h2><p className="sm mut">De onde vêm as visitas ao seu mapa (região aproximada)</p></div>
      <div className="g2">
        <div className="card col"><b>Cidades</b><p className="sm mut">Ainda não mostramos a cidade das visitas: isso exigiria localizar visitantes pelo IP, e hoje não guardamos IP. Quando houver uma base de localização aproximada, ela aparece aqui.</p></div>
        <div className="card col"><b>Quando acessam</b>{a.sample ? <><div className="bars" style={{ height: 130 }}>{wd.map((n, i) => <i key={i} className={n === Math.max(...wd) && n ? 'hi' : ''} style={{ height: `${Math.max(3, (n / mx) * 100)}%` }} title={`${WD[i]}: ${n}`} />)}</div><div className="row jb xs mut">{WD.map((d) => <span key={d}>{d}</span>)}</div></> : <p className="sm mut">Ainda sem visitas.</p>}</div>
      </div>
      <div className="g3"><div className="kpi"><b>{a.enough ? `${a.mobilePct}%` : '—'}</b><span>no celular</span></div><div className="kpi"><b>{a.enough ? `${a.returningPct}%` : '—'}</b><span>voltam em outra visita</span></div><div className="kpi"><b>{a.enough ? a.origins.length : '—'}</b><span>origens de tráfego</span></div></div>
      {a.enough ? <div className="card col"><b>Origem do tráfego</b>{a.origins.map((o) => <div key={o.ref} className="row"><span className="sm" style={{ width: 130, textTransform: 'capitalize' }}>{o.ref}</span><div className="bar sp"><i style={{ width: `${o.pct}%` }} /></div><b className="sm">{o.pct}%</b></div>)}</div> : <p className="xs mut">Percentuais aparecem a partir de 5 sessões ({a.sample} até agora).</p>}
      <div className="card soft col" style={{ gap: 6 }}><b className="sm">Como protegemos seus seguidores</b><span className="sm mut">Mostramos só agregados, com amostra mínima de 5 sessões. Você nunca vê uma lista de pessoas nem a jornada de alguém.</span></div>
    </section>
  )
}

// F5 · atualizar mapa
export function UpdateMap() {
  useTitle('Atualizar mapa')
  const { me, reload } = useMe()
  const [places, load] = usePlacesList()
  if (!places) return <PanelPage active="visao"><Loading /></PanelPage>
  const c = me.creator
  const pending = places.filter((p) => p.status === 'pending')
  const unresolved = places.filter((p) => p.status === 'unresolved')
  const auto = c.settings.autoConfirmHigh
  const patch = async (id, body) => { await api(`/creator/places/${id}`, { method: 'PATCH', body }); load() }
  return (
    <PanelPage active="visao">
      <Link className="sm mut" to="/painel">← Visão geral</Link>
      <Head title="Atualizar mapa" sub={`${pending.length + unresolved.length} posts para resolver`} right={<div className="row"><Link className="btn sm" to="/colar-posts?voltar=/painel/atualizar">Colar novos posts</Link><button className="btn ln sm" onClick={async () => { await api('/creator/settings', { method: 'PUT', body: { autoConfirmHigh: !auto } }); reload() }}>Atualização automática: {auto ? 'confirmar confiança alta' : 'pedir aprovação'}</button></div>} />
      {c.accounts.instagram !== 'connected' && <Note>A detecção automática de posts novos depende da conexão oficial com o Instagram, que ainda não está ativa. Por enquanto, cole o link e a legenda dos novos posts.</Note>}
      {pending.map((p) => (
        <div key={p.id} className="card row" style={{ gap: 16 }}><Photo s={72} label="post" /><div className="sp"><b>Sugestão: {p.name}{p.neighborhood ? ` · ${p.neighborhood}` : ''}</b><div className="sm mut">{p.tiktokId ? 'Vídeo' : 'Post'}{p.postedOn ? ` de ${fmtDM(p.postedOn)}` : ''} · {p.address ? (p.geoStatus === 'found' ? 'endereço citado na legenda' : 'endereço não encontrado') : 'só o @ do lugar na legenda'}</div></div>
          <span className={'tag ' + (p.confidence === 'high' ? 'ok' : 'wn')}>Confiança {p.confidence === 'high' ? 'alta' : 'média'}</span>
          {p.confidence === 'high' && p.geoStatus === 'found' ? <button className="btn sm" onClick={() => patch(p.id, { status: 'confirmed' })}>Adicionar</button> : <Link className="btn sm" to={`/revisar/${p.id}`}>Revisar</Link>}<button className="btn sm ln" onClick={() => patch(p.id, { status: 'removed' })}>Ignorar</button></div>))}
      {unresolved.map((p) => (
        <div key={p.id} className="card row" style={{ gap: 16 }}><Photo s={72} label="post" /><div className="sp"><b>Sem lugar identificado</b><div className="sm mut">{p.snippet ? `“${p.snippet}”` : 'Post sem texto para identificar o lugar'}</div></div><span className="tag">Sem sugestão</span><Link className="btn sm sec" to={`/adicionar?resolver=${p.id}`}>Indicar lugar</Link><button className="btn sm ln" onClick={() => patch(p.id, { status: 'removed' })}>Ignorar</button></div>))}
      {!pending.length && !unresolved.length && <p className="mut">Nada novo para resolver. Cole novos posts quando indicar mais lugares.</p>}
      <Note>Nada entra no mapa sem a sua aprovação, a menos que você ative a confirmação automática dos lugares de confiança alta.</Note>
    </PanelPage>
  )
}

// F6 · divulgar: o link do mapa e o código para incorporar
// Endereço do mapa, domínio próprio e QR code (antes ficavam no Estúdio)
function AddressCard() {
  const { me, reload } = useMe()
  const cr = me.creator
  const T = cr.theme
  const [slug, setSlug] = useState(cr.slug)
  const [avail, setAvail] = useState(null)
  const [dom, setDom] = useState(cr.domain.name || '')
  const [domInfo, setDomInfo] = useState(null)
  const [qrStyle, setQrStyle] = useState('map')
  const [qr, setQr] = useState('')
  const url = `${location.origin}/@${cr.slug}`
  useEffect(() => {
    if (slug === cr.slug) return setAvail(null)
    const h = setTimeout(() => api(`/creator/slug-available?slug=${encodeURIComponent(slug)}`).then((d) => setAvail(d)).catch(() => {}), 400)
    return () => clearTimeout(h)
  }, [slug])
  const color = qrStyle === 'black' ? '#000000' : T.accent
  useEffect(() => { QRCode.toDataURL(url, { margin: 1, width: 192, color: { dark: color } }).then(setQr).catch(() => {}) }, [url, color])
  const saveSlug = async () => { try { await api('/creator/slug', { method: 'PUT', body: { slug } }); await reload(); toast('Endereço salvo') } catch (x) { toast(x.message === 'slug_em_uso' ? 'Este endereço já está em uso.' : 'Use 3 a 30 letras, números, - ou _.') } }
  const saveDom = async () => { try { const d = await api('/creator/domain', { method: 'PUT', body: { domain: dom } }); setDomInfo(d); await reload() } catch (x) { toast(x.message === 'dominio_em_uso' ? 'Este domínio já está em uso.' : 'Domínio inválido. Exemplo: mapa.seusite.com.br') } }
  const check = async () => { const d = await api('/creator/domain/check', { method: 'POST' }); setDomInfo({ ...domInfo, ...d }); await reload(); toast(d.status === 'active' ? 'Domínio ativo' : 'O DNS ainda não aponta para nós') }
  const target = domInfo?.target || new URL(location.origin).hostname
  const download = async (kind) => {
    if (kind === 'svg') {
      const svg = await QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: color } })
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); a.download = `qr-${cr.slug}.svg`; a.click(); return
    }
    const cv = document.createElement('canvas')
    await QRCode.toCanvas(cv, url, { margin: 2, width: 1024, errorCorrectionLevel: 'H', color: { dark: color } })
    if (qrStyle === 'logo') { const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.arc(512, 512, 120, 0, 7); g.fill(); g.fillStyle = T.accent; g.beginPath(); g.arc(512, 512, 96, 0, 7); g.fill(); g.fillStyle = onAccent(T); g.font = '700 110px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(cr.displayName.slice(0, 1).toUpperCase(), 512, 520) }
    const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = `qr-${cr.slug}.png`; a.click()
  }
  return (
    <div className="blk">
      {STATIC && <Note>Na demonstração o endereço do mapa e o domínio ficam fixos.</Note>}
      <div><label className="lb" htmlFor="s1">Endereço do mapa</label><div className="row"><div className="in f sp"><span className="mut nowrap">{location.host}/@</span><input id="s1" value={slug} disabled={STATIC} onChange={(e) => setSlug(e.target.value.toLowerCase())} />{slug === cr.slug ? <span className="tag ok">Seu endereço</span> : avail && <span className={'tag ' + (avail.available ? 'ok' : 'bd2')}>{avail.available ? 'Disponível' : avail.reason === 'em_uso' ? 'Em uso' : 'Inválido'}</span>}</div><button className="btn" disabled={STATIC || slug === cr.slug || !avail?.available} onClick={saveSlug}>Salvar</button></div>
        <span className="xs mut">Ao trocar o endereço, o link antigo para de funcionar. Atualize a bio.</span></div>
      <div className="card col" style={{ gap: 10 }}><div className="row jb"><b>Domínio próprio</b><span className="tag ax">Plano Criador</span></div>
        <div className="row"><div className="in sp"><input value={dom} disabled={STATIC} onChange={(e) => setDom(e.target.value)} placeholder="mapa.dudacome.com.br" aria-label="Domínio próprio" /></div><button className="btn" disabled={STATIC} onClick={saveDom}>{cr.domain.name ? 'Atualizar' : 'Salvar'}</button></div>
        {cr.domain.name && <><div className="g2"><div className="card soft col" style={{ gap: 4 }}><span className="eb">Tipo</span><b className="sm">CNAME</b></div><div className="card soft col" style={{ gap: 4 }}><span className="eb">Valor</span><b className="sm">{target}</b></div></div>
          <div className="row"><span className={'tag ' + (cr.domain.status === 'active' ? 'ok' : 'wn')}>{cr.domain.status === 'active' ? 'Ativo' : 'Aguardando DNS'}</span><span className="xs mut sp">Pode levar algumas horas para o DNS propagar. O certificado HTTPS do domínio é configurado no servidor.</span><button className="btn sec sm" onClick={check}>Verificar agora</button></div></>}</div>
      <div className="card row" style={{ gap: 16 }}><div className="sq" style={{ width: 96, height: 96, background: '#fff', border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}>{qr && <img src={qr} alt="QR code do mapa" width="88" height="88" />}</div>
        <div className="sp col" style={{ gap: 6 }}><b>QR code</b><div className="row wrap">{[['map', 'Cor do mapa'], ['black', 'Preto'], ['logo', 'Com logo']].map(([k, l]) => <button key={k} className={'chip' + (qrStyle === k ? ' on' : '')} onClick={() => setQrStyle(k)}>{l}</button>)}</div><div className="row"><button className="btn sec sm" onClick={() => download('png')}>Baixar PNG</button><button className="btn sec sm" onClick={() => download('svg')}>Baixar SVG</button></div>{qrStyle === 'logo' && <span className="xs mut">O logo entra só no PNG.</span>}</div></div>
    </div>
  )
}

export function Promote() {
  useTitle('Divulgar')
  const { me } = useMe()
  const c = me.creator
  const url = `${location.origin}/@${c.slug}`
  const embed = `<iframe src="${url}/incorporar" width="100%" height="480" style="border:0" title="Mapa de ${c.displayName}" loading="lazy"></iframe>`
  const copy = (t, m) => navigator.clipboard?.writeText(t).then(() => toast(m)).catch(() => toast(t))
  return (
    <PanelPage active="divulgar">
      <Head title="Divulgar" sub="O link do seu mapa e como colocá-lo em outros lugares" />
      <section className="blk sec" aria-label="O link do seu mapa">
        <div className="sec-h"><h2 className="d s32">O link do seu mapa</h2></div>
        <div className="card row" style={{ gap: 14, padding: 22 }}><span className="todo-ic" style={{ width: 44, height: 44 }}><Icon n="link" s={20} /></span><div className="sp" style={{ minWidth: 0 }}><span className="eb">Endereço atual</span><b className="d s26 trunc" style={{ display: 'block' }}>{location.host}/@{c.slug}</b></div><button className="btn" onClick={() => copy(url, 'Link copiado')}>Copiar link</button><a className="btn ln" href={url} target="_blank" rel="noopener noreferrer">Abrir</a></div>
        <AddressCard />
      </section>
      <section className="blk sec" aria-label="Incorporar em outro site">
        <div className="sec-h"><h2 className="d s32">Incorporar em outro site</h2></div>
        <div className="card col" style={{ gap: 12 }}>
          <b>Mapa dentro do seu site ou blog</b><span className="sm mut">Cole este código na página onde o mapa deve aparecer. Ele mostra só o mapa, com os seus pins.</span>
          <div className="card soft xs" style={{ fontFamily: "'Courier New',monospace", wordBreak: 'break-all' }}>{embed}</div>
          <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => copy(embed, 'Código copiado')}>Copiar código</button></div>
      </section>
    </PanelPage>
  )
}

// F7 · roteiros (grátis no mapa; a venda ainda não está aberta)
// arrastar para reordenar (com botões de subir e descer para teclado e celular)
function useReorder(list, set) {
  const from = useRef(null)
  const move = (a, b) => { if (b < 0 || b >= list.length || a === b) return; const n = [...list]; const [x] = n.splice(a, 1); n.splice(b, 0, x); set(n) }
  const props = (i) => ({ onDragOver: (e) => e.preventDefault(), onDrop: (e) => { e.preventDefault(); if (from.current != null) move(from.current, i); from.current = null } })
  const handle = (i) => <span draggable role="button" tabIndex={0} aria-label="Arrastar para reordenar (ou use as setas)" style={{ cursor: 'grab', display: 'inline-flex' }} onDragStart={(e) => { from.current = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }} onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); move(i, i - 1) } if (e.key === 'ArrowDown') { e.preventDefault(); move(i, i + 1) } }}><Icon n="drag" s={18} c="#a3a3a3" /></span>
  return { props, handle, move }
}
let KEYN = 0
const withKey = (r) => ({ ...r, _k: r._k || `k${++KEYN}` })

// o mesmo cartão que o seguidor vê na aba Roteiros do mapa
function RoutePreview({ route, places, theme }) {
  const rp = route.placeIds.map((id) => places.find((p) => p.id === id)).filter(Boolean)
  return (
    <div className="pub" style={{ ...pubVars(theme), background: 'transparent', minHeight: 0 }}>
      <div className="ms-route" style={{ cursor: 'default', marginTop: 0, ...(route.color ? { background: route.color, color: onColor(route.color) } : {}) }}>
        <b className="pt">{route.name || 'Nome do roteiro'}</b>{route.note && <span>{route.note}</span>}<hr />
        <span className="ms-stack">{rp.slice(0, 4).map((p) => <PlacePhoto key={p.id} place={p} theme={theme} size={44} />)}{rp.length > 4 && <em>+{rp.length - 4}</em>}{!rp.length && <span>Nenhum lugar ainda</span>}<span className="sp" /><Icon n="next" s={20} c="currentColor" /></span>
      </div>
    </div>
  )
}

export function Roteiros() {
  useTitle('Roteiros')
  const { me } = useMe()
  const theme = me.creator.theme
  const [places] = usePlacesList()
  const [rows, setRows] = useState(null)
  const [orig, setOrig] = useState('[]')
  const [sel, setSel] = useState(0)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [on, setOn] = useState(null)
  const load = () => api('/creator/routes').then((d) => { const r = d.routes.map(withKey); setRows(r); setOrig(JSON.stringify(r)) })
  useEffect(() => { load(); api('/creator/interest').then((d) => setOn(d.listas)) }, [])
  const rowsSort = useReorder(rows || [], (n) => { const cur = rows[sel]; setRows(n); setSel(n.indexOf(cur)) })
  const r = rows?.[sel]
  const placeSort = useReorder(r?.placeIds || [], (ids) => setRows(rows.map((x, j) => (j === sel ? { ...x, placeIds: ids } : x))))
  if (!rows || !places) return <PanelPage active="roteiros"><Loading /></PanelPage>
  const confirmed = places.filter((p) => p.status === 'confirmed')
  const byId = new Map(places.map((p) => [p.id, p]))
  const dirty = JSON.stringify(rows) !== orig
  const set = (patch) => setRows(rows.map((x, j) => (j === sel ? { ...x, ...patch } : x)))
  const add = () => { setRows([...rows, withKey({ name: '', note: '', placeIds: [] })]); setSel(rows.length) }
  const remove = () => { if (r.placeIds.length && !confirm(`Remover o roteiro "${r.name || 'sem nome'}"?`)) return; setRows(rows.filter((_, j) => j !== sel)); setSel(Math.max(0, sel - 1)) }
  const toggle = (id) => set({ placeIds: r.placeIds.includes(id) ? r.placeIds.filter((x) => x !== id) : [...r.placeIds, id] })
  const save = async () => { await api('/creator/routes', { method: 'PUT', body: { routes: rows.filter((x) => x.name.trim()) } }); await load(); setSel(0); toast('Roteiros salvos (já valem no mapa publicado)') }
  const cats = theme.categories.filter((c) => confirmed.some((p) => p.category === c.id))
  const pool = confirmed.filter((p) => (!cat || p.category === cat) && (!q || `${p.name} ${p.neighborhood || ''}`.toLowerCase().includes(q.toLowerCase())))
  const pts = r ? r.placeIds.map((id) => byId.get(id)).filter((p) => p && hasCoords(p)) : []
  return (
    <PanelPage active="roteiros">
      <Head title="Roteiros" sub="Monte percursos com os lugares do seu mapa, na ordem em que você indicaria" right={<div className="row">{dirty && <button className="btn ln sm" onClick={() => { const o = JSON.parse(orig); setRows(o); setSel(0) }}>Desfazer</button>}<button className="btn sm" disabled={!dirty} onClick={save}>{dirty ? 'Salvar roteiros' : 'Tudo salvo'}</button></div>} />
      <div className="g2" style={{ gridTemplateColumns: 'minmax(260px,340px) 1fr', alignItems: 'start' }}>
        <div className="col" style={{ gap: 10, minWidth: 0 }}>
          {rows.map((x, i) => { const rp = x.placeIds.map((id) => byId.get(id)).filter(Boolean); return (
            <div key={x._k} {...rowsSort.props(i)} className={'card col rt-it' + (i === sel ? ' sel' : '')} style={{ gap: 8, cursor: 'pointer', padding: 14 }} role="button" tabIndex={0} aria-pressed={i === sel} onClick={() => setSel(i)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSel(i))}>
              <div className="row">{rowsSort.handle(i)}<div className="sp"><b>{x.name || 'Roteiro sem nome'}</b><div className="xs mut">{x.placeIds.length} lugar{x.placeIds.length === 1 ? '' : 'es'}{x.note ? ` · ${x.note}` : ''}</div></div></div>
              <div className="row" style={{ gap: 0, paddingLeft: 26 }}>{rp.slice(0, 5).map((p, k) => <span key={p.id} style={{ marginLeft: k ? -10 : 0, border: '3px solid #fff', borderRadius: '50%', overflow: 'hidden', display: 'inline-flex' }}><PlacePhoto place={p} theme={theme} size={36} style={{ borderRadius: '50%' }} /></span>)}{rp.length > 5 && <span className="xs mut" style={{ marginLeft: 8 }}>+{rp.length - 5}</span>}{!rp.length && <span className="xs mut">Sem lugares ainda</span>}</div>
            </div>) })}
          <button className="btn ln blk" disabled={rows.length >= 12} onClick={add}><Icon n="plus" s={16} />Novo roteiro</button>
          {!rows.length && <p className="sm mut">Reúna lugares do seu mapa em um roteiro: um passeio por bairro, uma noite, um fim de semana. Seus seguidores abrem o roteiro e seguem lugar por lugar.</p>}
        </div>
        {r ? (
          <div className="col" style={{ gap: 16, minWidth: 0 }} key={r._k}>
            <div className="card col" style={{ gap: 12 }}>
              <span className="eb">Como aparece no seu mapa</span>
              <RoutePreview route={r} places={places} theme={theme} />
              <div><span className="lb">Cor do cartão</span>
                <div className="row wrap" style={{ gap: 8 }}>
                  <button type="button" className={'chip' + (!r.color ? ' on' : '')} onClick={() => set({ color: null })}>Cor do mapa</button>
                  {[...ACCENTS, ...CAT_COLORS].map((col) => <button key={col} type="button" aria-label={`Cor ${col}`} aria-pressed={r.color?.toLowerCase() === col} className={'dotsw' + (r.color?.toLowerCase() === col ? ' on' : '')} style={{ background: col }} onClick={() => set({ color: col })} />)}
                  <label className="chip" style={{ position: 'relative' }}>Outra<input type="color" className="sr" value={r.color || theme.accent} onChange={(e) => set({ color: e.target.value })} aria-label="Outra cor do cartão" /></label></div></div>
              <div className="g2"><Field label="Nome do roteiro" id="rn"><div className="in"><input id="rn" value={r.name} maxLength="40" placeholder="Ex.: Domingo de café" onChange={(e) => set({ name: e.target.value })} /></div></Field><Field label="Observação" id="ro"><div className="in"><input id="ro" value={r.note || ''} maxLength="60" placeholder="Ex.: 3 h de passeio" onChange={(e) => set({ note: e.target.value })} /></div></Field></div>
            </div>
            <div className="card col" style={{ gap: 10 }}>
              <div className="row jb"><b>Percurso <span className="mut sm">({r.placeIds.length})</span></b><span className="xs mut">Arraste para mudar a ordem</span></div>
              {pts.length > 0 && <div style={{ borderRadius: 16, overflow: 'hidden', pointerEvents: 'none' }}><MapCanvas places={pts} theme={{ ...theme, cluster: false, mapLabels: false }} symbols={me.creator.symbols} interactive={false} style={{ height: 170 }} /></div>}
              {r.placeIds.map((id, i) => { const p = byId.get(id); if (!p) return null; return (
                <div key={id} {...placeSort.props(i)} className="row card soft" style={{ padding: 8, gap: 10 }}>
                  {placeSort.handle(i)}<b className="sm" style={{ width: 20, textAlign: 'center' }}>{i + 1}</b><PlacePhoto place={p} theme={theme} size={44} style={{ borderRadius: 12 }} />
                  <div className="sp"><b className="sm">{p.name}</b><div className="xs mut">{catOf(theme, p.category).name}{p.neighborhood ? ` · ${p.neighborhood}` : ''}</div></div>
                  <button className="btn ln sm" aria-label="Subir" disabled={i === 0} onClick={() => placeSort.move(i, i - 1)}><Icon n="up" s={14} /></button><button className="btn ln sm" aria-label="Descer" disabled={i === r.placeIds.length - 1} onClick={() => placeSort.move(i, i + 1)}><Icon n="down" s={14} /></button>
                  <button className="btn ln sm" aria-label={`Tirar ${p.name} do roteiro`} onClick={() => toggle(id)}><Icon n="close" s={14} /></button>
                </div>) })}
              {!r.placeIds.length && <p className="sm mut">Escolha os lugares abaixo. A ordem em que entram é a ordem do percurso.</p>}
            </div>
            <div className="card col" style={{ gap: 10 }}>
              <b>Adicionar lugares</b>
              <div className="in" style={{ minHeight: 40 }}><Icon n="search" s={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou bairro" aria-label="Buscar lugar" /></div>
              <div className="row wrap"><button className={'chip' + (!cat ? ' on' : '')} onClick={() => setCat('')}>Todos</button>{cats.map((c) => <button key={c.id} className={'chip' + (cat === c.id ? ' on' : '')} onClick={() => setCat(cat === c.id ? '' : c.id)}>{c.name}</button>)}</div>
              <div className="g4" style={{ gap: 10 }}>{pool.map((p) => { const inn = r.placeIds.includes(p.id); return (
                <button key={p.id} type="button" className={'card col' + (inn ? ' sel' : '')} style={{ padding: 8, gap: 6, textAlign: 'left', position: 'relative' }} aria-pressed={inn} onClick={() => toggle(p.id)}>
                  <PlacePhoto place={p} theme={theme} aspect="4/3" style={{ borderRadius: 12, width: '100%' }} />
                  <b className="xs">{p.name}</b><span className="xs mut">{p.neighborhood || catOf(theme, p.category).name}</span>
                  <span style={{ position: 'absolute', top: 14, right: 14, width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', background: inn ? 'var(--ink)' : 'rgba(255,255,255,.9)', color: inn ? '#fff' : 'var(--ink)' }}><Icon n={inn ? 'check' : 'plus'} s={14} c={inn ? '#fff' : '#171713'} /></span>
                </button>) })}{!pool.length && <p className="sm mut" style={{ gridColumn: '1/-1' }}>{confirmed.length ? 'Nenhum lugar encontrado.' : 'Confirme lugares no mapa para montar roteiros.'}</p>}</div>
            </div>
            <div className="card row jb wrap">
              <div className="row" role="group" aria-label="Como oferecer este roteiro"><button className="chip on" aria-pressed="true">Grátis no mapa</button><button className="chip" disabled title="A venda de roteiros ainda não está aberta">Vender · em breve</button></div>
              <button className="btn bd2 sm" onClick={remove}><Icon n="trash" s={14} />Remover roteiro</button>
            </div>
          </div>
        ) : <div className="card col" style={{ gap: 6 }}><b>Nenhum roteiro selecionado</b><span className="sm mut">Crie um roteiro para começar.</span></div>}
      </div>
      <div className="card soft col" style={{ gap: 8 }}>
        <div className="row"><b>Vender roteiros</b><span className="tag wn">Em breve</span></div>
        <span className="sm mut">Você escolhe: cada roteiro pode continuar grátis no seu mapa ou, quando a venda abrir, ser oferecido pago para quem quiser ir além. Nada muda para os que ficarem grátis. Preço e comissão ainda não estão definidos, então hoje nenhum roteiro é cobrado.</span>
        <div className="row jb wrap"><span className="sm">Quer participar do teste? Avisamos quando abrir para o seu perfil.</span><button className="btn sm" disabled={on !== false} onClick={async () => { await api('/creator/interest', { method: 'POST', body: { kind: 'listas' } }); setOn(true); toast('Você está na lista') }}>{on ? 'Você está na lista' : 'Entrar na lista'}</button></div>
      </div>
    </PanelPage>
  )
}

// F8 · contas conectadas
export function Accounts() {
  useTitle('Contas conectadas')
  const { me, reload } = useMe()
  const c = me.creator
  const [msg, setMsg] = useState('')
  const connect = async (n) => { try { await api(`/creator/connect/${n}`, { method: 'POST' }) } catch (x) { if (x.status === 501) setMsg(n) } }
  const revoke = async (n) => { if (confirm('Revogar o acesso? Paramos de ler novos posts.')) { await api('/creator/accounts', { method: 'PUT', body: { network: n, state: 'revoked' } }); reload() } }
  const ig = c.accounts.instagram === 'connected', tk = c.accounts.tiktok === 'connected'
  return (
    <AccountPage tab="contas">
      <div className="card col" style={{ gap: 12 }}><div className="row"><Icon n="insta" s={26} /><div className="sp"><b>Instagram · @{c.handle}</b><div className="sm mut">{ig ? 'Conta profissional · conectada' : 'Conta profissional · ainda não conectada'}</div></div>{ig ? <span className="tag ok">Ativa</span> : <button className="btn sm" onClick={() => connect('instagram')}>Conectar</button>}</div>
        <div className="sep" /><div className="row wrap" style={{ gap: 8 }}><span className="tag">Ler posts e legendas</span><span className="tag">Ler perfil básico</span></div>
        <div className="row jb wrap"><span className="xs mut">{ig ? 'Acesso renovado automaticamente. Expira se você não abrir o painel por 60 dias.' : 'Sem conexão, você adiciona os posts colando o link e a legenda.'}</span>{ig && <button className="btn bd2 sm" onClick={() => revoke('instagram')}>Revogar acesso</button>}</div></div>
      <div className="card col" style={{ gap: 12 }}><div className="row"><Icon n="tiktok" s={26} /><div className="sp"><b>TikTok · {c.tiktok ? `@${c.tiktok}` : 'sem @ informado'}</b><div className="sm mut">Opcional · {tk ? 'conectado' : 'não conectado'}</div></div>{tk ? <button className="btn bd2 sm" onClick={() => revoke('tiktok')}>Revogar acesso</button> : <button className="btn sm" onClick={() => connect('tiktok')}>Conectar</button>}</div></div>
      {msg && <Note>A conexão oficial com o {msg === 'instagram' ? 'Instagram' : 'TikTok'} depende da aprovação do nosso app pela plataforma e ainda não está ativa.</Note>}
      <Note>Ao revogar, paramos de ler novos posts. O mapa continua publicado com o que já está nele, até você pausar ou excluir.</Note>
      <div className="card soft col" style={{ gap: 6 }}><b className="sm">O que nunca acessamos</b><span className="sm mut">Mensagens diretas, Stories, seguidores, curtidas e comentários.</span></div>
    </AccountPage>
  )
}

// F9 · privacidade
const CONSENT = { network: 'Aparecer no mapa geral', aggregatesForRestaurants: 'Dados agregados para restaurantes', marketing: 'Divulgação e cases', terms: 'Termos e Política' }
export function Privacy() {
  useTitle('Privacidade')
  const { me } = useMe()
  const [cons, setCons] = useState(me.creator.consents)
  const [log, setLog] = useState([])
  const loadLog = () => api('/creator/consents/log').then((d) => setLog(d.log))
  useEffect(() => { loadLog() }, [])
  const rows = [['hosting', 'Hospedar e exibir o meu mapa', 'Necessário para o serviço'], ['network', 'Aparecer no mapa geral', 'Seu mapa entra na descoberta em rede. Você pode sair quando quiser.'], ['aggregatesForRestaurants', 'Dados agregados para restaurantes', 'Contagens de indicações e interesse, sem dados de pessoas.'], ['marketing', 'Divulgação e cases', 'Usar o seu mapa como exemplo.']]
  const set = async (k, v) => { const next = { ...cons, [k]: v }; setCons(next); const r = await api('/creator/consents', { method: 'PUT', body: next }); setCons(r.consents); loadLog() }
  return (
    <AccountPage tab="privacidade">
      <div className="card col" style={{ gap: 14 }}>{rows.map(([k, t, d], i) => <React.Fragment key={k}>{i > 0 && <div className="sep" />}<div className="row"><div className="sp"><b>{t}</b><div className="sm mut">{d}</div></div><Switch on={k === 'hosting' ? true : !!cons[k]} disabled={k === 'hosting'} onChange={(v) => set(k, v)} label={t} /></div></React.Fragment>)}</div>
      <span className="eb">Histórico de escolhas</span>
      <div className="card" style={{ padding: 8 }}><table className="tbl"><tbody>{log.map((l, i) => <tr key={i}><td>{fmtDate(l.ts.slice(0, 10)).slice(0, 5)} · {l.key === 'terms' ? 'Aceitou os Termos e a Política' : `${l.value ? 'Ativou' : 'Desativou'} "${CONSENT[l.key]}"`}</td><td className="mut">v. dos termos {l.terms_version}</td></tr>)}{!log.length && <tr><td className="mut">Nenhuma escolha registrada ainda.</td></tr>}</tbody></table></div>
      <Note>Mudanças relevantes de finalidade só valem com uma nova autorização sua.</Note>
    </AccountPage>
  )
}

// F10 · plano e cobrança (a cobrança ainda não está ativa)
export function Billing() {
  useTitle('Plano e cobrança')
  const { me, reload } = useMe()
  const p = me.creator.plan
  const annual = p.billing === 'annual'
  return (
    <AccountPage tab="plano">
      <div className="g2">
        <div className="card col soft"><span className="eb">Plano atual</span><b className="d s32">Criador · {annual ? 'anual' : 'mensal'}</b><span className="sm">R$ [preço] por {annual ? 'ano' : 'mês'}. {p.trialEnds ? `Teste grátis termina em ${fmtDate(p.trialEnds)}.` : 'O teste grátis começa no onboarding.'}</span><div className="row"><button className="btn sm" onClick={async () => { await api('/creator/billing', { method: 'PUT', body: { billing: annual ? 'monthly' : 'annual' } }); reload() }}>Mudar para {annual ? 'mensal' : 'anual'}</button><button className="btn sm ln" onClick={() => toast('Hoje há um único plano pago: Criador.')}>Mudar plano</button></div></div>
        <div className="card col"><span className="eb">Forma de pagamento</span><div className="row"><Icon n="card" s={22} /><b className="sm">Nenhuma cadastrada</b></div><button className="btn sec sm" style={{ alignSelf: 'flex-start' }} disabled>Trocar (em breve)</button></div></div>
      <span className="eb">Faturas</span>
      <div className="card" style={{ padding: 8 }}><table className="tbl"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Status</th><th /></tr></thead><tbody><tr><td colSpan="5" className="mut">Nenhuma fatura: a cobrança ainda não está ativa.</td></tr></tbody></table></div>
      <Note>Aviso 7 dias antes de qualquer cobrança ou do fim do teste. Reembolsos seguem a lei e a oferta contratada.</Note>
    </AccountPage>
  )
}

// F11 · minha conta
export function Account() {
  useTitle('Minha conta')
  const { me, reload } = useMe()
  const c = me.creator
  const [name, setName] = useState(c.displayName)
  const paused = c.settings.paused || c.settings.adminPaused
  const save = async () => { await api('/creator/account', { method: 'PUT', body: { displayName: name } }); await reload(); toast('Nome salvo') }
  const togglePause = async () => { await api('/creator/pause', { method: 'POST', body: { paused: !c.settings.paused } }); await reload(); toast(c.settings.paused ? 'Mapa de volta ao ar' : 'Mapa pausado') }
  const del = async () => {
    if (prompt('Isto apaga o mapa e a conta e não dá para desfazer. Digite EXCLUIR para confirmar:') !== 'EXCLUIR') return
    await api('/creator/account', { method: 'DELETE', body: { confirm: 'EXCLUIR' } }); await reload(); navigate('/')
  }
  const url = `${location.host}/@${c.slug}`
  return (
    <AccountPage tab="conta">
      <div className="g2" style={{ gridTemplateColumns: '1.4fr 1fr', alignItems: 'start' }}>
        <div className="card col" style={{ gap: 16 }}>
          <div className="row" style={{ gap: 14 }}><div className="av" style={{ width: 64, height: 64, fontSize: 28 }}>{(name || '?').trim().slice(0, 1).toUpperCase()}</div><div className="sp" style={{ minWidth: 0 }}><b className="d s26 trunc" style={{ display: 'block' }}>{name || 'Seu nome'}</b><span className="sm mut">@{c.handle}</span></div></div>
          <Field label="Nome no mapa" id="n"><div className="row"><div className="in sp"><input id="n" value={name} onChange={(e) => setName(e.target.value)} maxLength="60" /></div><button className="btn" disabled={!name.trim() || name === c.displayName} onClick={save}>Salvar</button></div></Field>
          <Field label="E-mail de acesso" id="m"><div className="in" style={{ background: 'var(--soft)' }}><Icon n="mail" s={16} c="#757575" /><input id="m" value={me.user.email} readOnly /></div></Field>
        </div>
        <div className="card col" style={{ gap: 12 }}>
          <div className="row jb"><b>Seu mapa</b><span className={'tag ' + (paused ? 'wn' : c.published ? 'ok' : '')}>{paused ? 'Pausado' : c.published ? 'No ar' : 'Rascunho'}</span></div>
          <span className="sm mut trunc">{url}</span>
          <div className="sep" />
          <div className="row"><div className="sp"><b className="sm">Mapa no ar</b><div className="xs mut">Desligue para tirar do ar sem apagar nada. Seguidores veem "Mapa indisponível".{c.settings.adminPaused && ' (Pausado pela equipe: fale com a gente.)'}</div></div><Switch on={!paused} disabled={c.settings.adminPaused} onChange={togglePause} label="Mapa no ar" /></div>
          <div className="sep" />
          <div><b className="sm">Exportar meus dados</b><div className="xs mut" style={{ marginBottom: 8 }}>Lugares, categorias, estilo e métricas agregadas.</div><div className="row"><a className="btn sec sm" href="/api/creator/export" download onClick={dlDemo()}>JSON</a><a className="btn sec sm" href="/api/creator/export?format=csv" download onClick={dlDemo('csv')}>CSV</a></div></div>
        </div>
      </div>
      <div className="card col" style={{ borderColor: 'var(--bad)', gap: 10 }}><b className="acc">Zona de risco</b><div className="row wrap"><div className="sp"><b className="sm">Excluir conta e mapa</b><div className="sm mut">Remove o mapa e as fontes derivadas. Cópias técnicas somem no prazo da Política. Não dá para desfazer.</div></div><button className="btn bd2 sm" onClick={del}>Excluir</button></div></div>
      <Note>Dúvidas sobre dados pessoais? Escreva para [e-mail de privacidade].</Note>
    </AccountPage>
  )
}

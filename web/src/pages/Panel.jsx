import React, { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../api.js'
import { Link, navigate, toast } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import { PanelPage, Note, Switch, Field, Loading, useTitle } from '../lib/ui.jsx'
import { useMe } from '../lib/me.jsx'
import { fmtDM, fmtDate, num, onAccent, TONES, catOf } from '../theme.jsx'
import { findGroups, hasCoords, issueOf } from '../lib/places.js'

const Photo = ({ s = 56, label = 'foto' }) => <div className="sq ph" style={{ width: s, height: s }}>{label}</div>
const Head = ({ title, sub, right }) => <div className="row jb wrap"><div><h1 className="d s44">{title}</h1>{sub && <p className="sm mut">{sub}</p>}</div>{right}</div>
const useStats = (days = 30) => { const [s, setS] = useState(null); useEffect(() => { setS(null); api(`/creator/stats?days=${days}`).then(setS).catch(() => setS({ error: true })) }, [days]); return s }
const usePlacesList = () => { const [p, setP] = useState(null); const load = () => api('/creator/places').then((d) => setP(d.places)); useEffect(() => { load() }, []); return [p, load] }
const sampleTag = (n) => (n < 30 ? <span className="tag wn" title="Poucas visitas: os números ainda variam muito">Amostra pequena</span> : null)

// F1 · visão geral
export function Overview() {
  useTitle('Visão geral')
  const { me, reload } = useMe()
  const [days, setDays] = useState(30)
  const s = useStats(days)
  const c = me.creator
  const series = useMemo(() => {
    if (!s || s.error) return []
    const m = new Map(s.perDay.map((d) => [d.d, d.n]))
    return Array.from({ length: days }, (_, i) => { const d = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10); return { d, n: m.get(d) || 0 } })
  }, [s, days])
  const max = Math.max(1, ...series.map((x) => x.n))
  const peak = series.reduce((a, b) => (b.n > a.n ? b : a), { n: 0 })
  return (
    <PanelPage active="visao">
      {me.notices.map((n) => <div key={n.id} className="note row"><Icon n="alert" s={18} c="#93370d" /><span className="sp">{n.text}</span><button className="btn sm ln" onClick={async () => { await api('/creator/notices/seen', { method: 'POST' }); reload() }}>Entendi</button></div>)}
      {!c.published && <div className="note row"><span className="sp"><b>Seu mapa ainda não está no ar.</b> Revise os lugares e publique para os seguidores verem.</span><Link className="btn sm" to="/revisar">Revisar e publicar</Link></div>}
      <Head title="Visão geral" sub={`Últimos ${days} dias · interações no seu mapa`} right={<div className="row">{s && !s.error && sampleTag(s.sessions)}<button className={'chip' + (days === 30 ? ' on' : '')} onClick={() => setDays(30)}>30 dias</button><button className={'chip' + (days === 7 ? ' on' : '')} onClick={() => setDays(7)}>7 dias</button></div>} />
      {!s ? <Loading /> : s.error ? <p className="err">Não foi possível carregar.</p> : <>
        <div className="g4"><div className="kpi"><b>{num(s.sessions)}</b><span>sessões</span></div><div className="kpi"><b>{num(s.placeOpens)}</b><span>lugares abertos</span></div><div className="kpi"><b>{num(s.routeClicks)}</b><span>cliques em rota</span></div><div className="kpi"><b>{num(s.postOpens)}</b><span>voltas aos seus posts</span></div></div>
        <div className="g2" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div className="card col"><b>Sessões por dia</b>{s.sessions ? <><div className="bars">{series.map((d) => <i key={d.d} className={d.d === peak.d && d.n ? 'hi' : ''} title={`${fmtDM(d.d)}: ${d.n}`} style={{ height: `${Math.max(2, (d.n / max) * 100)}%` }} />)}</div><span className="xs mut">{peak.n ? `Pico em ${fmtDM(peak.d)}: ${peak.n} sessões.` : ''}</span></> : <p className="sm mut">Ainda sem visitas. Publique o mapa e coloque o link na bio.</p>}</div>
          <div className="card col" style={{ background: 'var(--suns)', borderColor: 'transparent' }}><span className="eb">Oportunidade de conteúdo</span>
            {s.opportunity ? <><b className="d s32">{s.opportunity.count} buscas por "{s.opportunity.term}"</b><span className="sm">{s.opportunity.empty} ficaram sem resultado. Que tal indicar um lugar sobre esse tema?</span><Link className="btn sm" to="/painel/buscas" style={{ alignSelf: 'flex-start' }}>Ver buscas</Link></> : <span className="sm">Quando seguidores buscarem algo que o mapa não tem, aparece aqui como ideia de conteúdo.</span>}</div>
        </div>
        <div className="g2"><div className="card row">{s.featured ? <><Photo /><div className="sp"><span className="eb">Indicação em destaque</span><div className="b">{s.featured.name}</div><div className="xs mut">{s.featured.routes} cliques em rota</div></div></> : <span className="sm mut">A indicação em destaque aparece quando houver cliques em rota.</span>}</div>
          <div className="card soft"><span className="xs mut">{s.note}</span></div></div></>}
    </PanelPage>
  )
}

// F2 · buscas e oportunidades
export function Searches() {
  useTitle('Buscas')
  const s = useStats(30)
  return (
    <PanelPage active="buscas">
      <Head title="Buscas e oportunidades" sub="O que sua audiência procura no seu mapa" right={s && !s.error && sampleTag(s.sessions)} />
      {!s ? <Loading /> : <>
        <div className="card" style={{ padding: 8 }}><table className="tbl"><thead><tr><th>Termo</th><th>Buscas</th><th>Com resultado</th><th>Sem resultado</th><th /></tr></thead><tbody>
          {s.searches.map((x) => <tr key={x.term}><td><b>{x.term}</b></td><td>{x.count}</td><td>{x.withResults}</td><td>{x.empty ? <span className="tag wn">{x.empty}</span> : 0}</td><td>{x.empty > 0 && <Link className="btn sm" to={`/adicionar?q=${encodeURIComponent(x.term)}`}>Indicar lugar</Link>}</td></tr>)}
          {!s.searches.length && <tr><td colSpan="5" className="mut">Ainda sem buscas no seu mapa.</td></tr>}</tbody></table></div>
        <div className="g2"><div className="card col"><b>Pedidos de indicação</b><span className="sm mut">Seguidores que tocaram em "Pedir uma indicação" (anônimo).</span><b className="d s32">{s.requests} pedido{s.requests === 1 ? '' : 's'}</b></div><div className="card soft"><span className="xs mut">Termos passam por filtro que remove e-mails, telefones e links antes de serem guardados.</span></div></div></>}
    </PanelPage>
  )
}

// F3 · lugares
export function PlacesPage() {
  useTitle('Lugares')
  const [places] = usePlacesList()
  const s = useStats(30)
  const { me } = useMe()
  const [f, setF] = useState('all')
  const [q, setQ] = useState('')
  if (!places) return <PanelPage active="lugares"><Loading /></PanelPage>
  const live = places.filter((p) => p.status === 'pending' || p.status === 'confirmed')
  const perf = new Map((s?.topPlaces || []).map((p) => [p.id, p]))
  const cnt = { pending: live.filter((p) => p.status === 'pending').length, ad: live.filter((p) => p.ad).length, nocoord: live.filter((p) => !hasCoords(p)).length }
  const list = live.filter((p) => (f === 'all' || (f === 'pending' && p.status === 'pending') || (f === 'ad' && p.ad) || (f === 'nocoord' && !hasCoords(p))) && (!q || `${p.name} ${p.address || ''}`.toLowerCase().includes(q.toLowerCase())))
  return (
    <PanelPage active="lugares">
      <Head title="Lugares" sub={`${live.length} lugares no seu mapa`} right={<div className="row"><div className="in" style={{ minHeight: 40, width: 240 }}><Icon n="search" s={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" aria-label="Buscar lugar" /></div><Link className="btn sm" to="/adicionar">Adicionar lugar</Link></div>} />
      <div className="row wrap">{[['all', 'Todos'], ['pending', `Pendentes (${cnt.pending})`], ['ad', `Publi (${cnt.ad})`], ['nocoord', `Sem coordenadas (${cnt.nocoord})`]].map(([k, l]) => <button key={k} className={'chip' + (f === k ? ' on' : '')} onClick={() => setF(k)}>{l}</button>)}</div>
      <div className="card" style={{ padding: 8 }}><table className="tbl"><thead><tr><th>Lugar</th><th>Categoria</th><th>Aberturas</th><th>Rotas</th><th>Status</th></tr></thead><tbody>
        {list.map((p) => { const is = issueOf(p, places); const pf = perf.get(p.id); const st = p.ad ? ['ax', 'Publi'] : [is.k, is.tag === 'Ver unidades' ? (p.status === 'confirmed' ? 'Confirmado' : 'Para revisar') : is.tag]; return (
          <tr key={p.id} className="click" style={{ cursor: 'pointer' }} onClick={() => navigate(`/revisar/${p.id}`)}><td><b>{p.name || 'Sem nome'}</b><div className="xs mut">{is.link ? is.detail : p.neighborhood || p.municipality || p.address || ''}</div></td><td>{catOf(me.creator.theme, p.category).name}</td><td>{pf?.opens || 0}</td><td>{pf?.routes || 0}</td><td><span className={`tag ${st[0]}`}>{st[1]}</span></td></tr>) })}
        {!list.length && <tr><td colSpan="5" className="mut">Nenhum lugar nesta lista.</td></tr>}</tbody></table></div>
    </PanelPage>
  )
}

// F4 · audiência
const WD = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
export function Audience() {
  useTitle('Audiência')
  const s = useStats(30)
  if (!s) return <PanelPage active="audiencia"><Loading /></PanelPage>
  const a = s.audience
  const wd = [1, 2, 3, 4, 5, 6, 0].map((i) => a.weekdays[i])
  const mx = Math.max(1, ...wd)
  return (
    <PanelPage active="audiencia">
      <Head title="Audiência" sub="De onde vêm as visitas ao seu mapa (região aproximada)" right={sampleTag(s.sessions)} />
      <div className="g2">
        <div className="card col"><b>Cidades</b><p className="sm mut">Ainda não mostramos a cidade das visitas: isso exigiria localizar visitantes pelo IP, e hoje não guardamos IP. Quando houver uma base de localização aproximada, ela aparece aqui.</p></div>
        <div className="card col"><b>Quando acessam</b>{a.sample ? <><div className="bars" style={{ height: 130 }}>{wd.map((n, i) => <i key={i} className={n === Math.max(...wd) && n ? 'hi' : ''} style={{ height: `${Math.max(3, (n / mx) * 100)}%` }} title={`${WD[i]}: ${n}`} />)}</div><div className="row jb xs mut">{WD.map((d) => <span key={d}>{d}</span>)}</div></> : <p className="sm mut">Ainda sem visitas.</p>}</div>
      </div>
      <div className="card soft col" style={{ gap: 6 }}><b className="sm">Como protegemos seus seguidores</b><span className="sm mut">Mostramos só agregados, com amostra mínima de 5 sessões. Você nunca vê uma lista de pessoas nem a jornada de alguém.</span></div>
      <div className="g3"><div className="kpi"><b>{a.enough ? `${a.mobilePct}%` : '—'}</b><span>no celular</span></div><div className="kpi"><b>{a.enough ? `${a.returningPct}%` : '—'}</b><span>voltam em outra visita</span></div><div className="kpi"><b>{a.enough ? a.origins.length : '—'}</b><span>origens de tráfego</span></div></div>
      {a.enough ? <div className="card col"><b>Origem do tráfego</b>{a.origins.map((o) => <div key={o.ref} className="row"><span className="sm" style={{ width: 130, textTransform: 'capitalize' }}>{o.ref}</span><div className="bar sp"><i style={{ width: `${o.pct}%` }} /></div><b className="sm">{o.pct}%</b></div>)}</div> : <p className="xs mut">Percentuais aparecem a partir de 5 sessões ({a.sample} até agora).</p>}
    </PanelPage>
  )
}

// F5 · atualizar mapa
export function UpdateMap() {
  useTitle('Atualizar mapa')
  const { me, reload } = useMe()
  const [places, load] = usePlacesList()
  if (!places) return <PanelPage active="atualizar"><Loading /></PanelPage>
  const c = me.creator
  const pending = places.filter((p) => p.status === 'pending')
  const unresolved = places.filter((p) => p.status === 'unresolved')
  const auto = c.settings.autoConfirmHigh
  const patch = async (id, body) => { await api(`/creator/places/${id}`, { method: 'PATCH', body }); load() }
  return (
    <PanelPage active="atualizar">
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

// F6 · divulgar (modelos geram PNG de verdade, no navegador)
function drawStory(kind, cv, { c, places, url, qrImg }) {
  const W = 1080, H = 1350
  cv.width = W; cv.height = H
  const g = cv.getContext('2d')
  const T = c.theme
  const fillBg = (col) => { g.fillStyle = col; g.fillRect(0, 0, W, H) }
  const text = (t, x, y, size, col, weight = 700, align = 'center') => { g.fillStyle = col; g.font = `${weight} ${size}px Archivo, Arial, sans-serif`; g.textAlign = align; g.fillText(t, x, y) }
  const wrap = (t, x, y, size, col, maxW) => { const words = t.split(' '); let line = ''; let yy = y; for (const w of words) { const test = line ? `${line} ${w}` : w; if (g.measureText(test).width > maxW && line) { text(line, x, yy, size, col); line = w; yy += size * 1.1 } else line = test; g.font = `700 ${size}px Archivo, Arial, sans-serif` } text(line, x, yy, size, col) }
  if (kind === 'map') {
    fillBg(TONES[T.tone].tint)
    const pts = places.filter(hasCoords)
    if (pts.length) {
      const la = pts.map((p) => p.lat), lo = pts.map((p) => p.lon)
      const [a, b, d, e] = [Math.min(...la), Math.max(...la), Math.min(...lo), Math.max(...lo)]
      for (const p of pts) {
        const x = 120 + ((p.lon - d) / Math.max(e - d, 1e-6)) * (W - 240), y = 150 + ((b - p.lat) / Math.max(b - a, 1e-6)) * (H - 520)
        g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill(); g.fillStyle = catOf(T, p.category).color; g.beginPath(); g.arc(x, y, 24, 0, 7); g.fill()
      }
    }
    text(c.displayName, W / 2, H - 200, 96, '#171717'); text(`${places.length} lugares indicados`, W / 2, H - 120, 44, '#404040', 600); text(url.replace(/^https?:\/\//, ''), W / 2, H - 56, 34, '#6b6b6b', 600)
  } else if (kind === 'week') {
    fillBg(T.accent); const on = onAccent(T)
    text('LUGAR DA SEMANA', W / 2, 260, 48, on, 700)
    g.font = '700 150px Archivo, Arial, sans-serif'; wrap((places[0]?.name || 'Seu lugar aqui').toUpperCase(), W / 2, 620, 150, on, W - 160)
    text(`indicado por @${c.handle}`, W / 2, H - 180, 46, on, 600); text(url.replace(/^https?:\/\//, ''), W / 2, H - 110, 38, on, 600)
  } else if (kind === 'qr') {
    fillBg('#ffffff'); if (qrImg) g.drawImage(qrImg, 190, 220, 700, 700)
    text(c.displayName, W / 2, 1060, 80, '#171717'); text('Aponte a câmera e veja os lugares no mapa', W / 2, 1140, 38, '#404040', 600); text(url.replace(/^https?:\/\//, ''), W / 2, 1230, 36, '#6b6b6b', 600)
  } else {
    fillBg('#171717'); g.font = '700 130px Archivo, Arial, sans-serif'; wrap('PROCURANDO ONDE COMER?', W / 2, 520, 130, '#fff', W - 160)
    text('Todos os lugares que eu indico estão no mapa:', W / 2, 960, 44, '#d4d4d4', 600); text(url.replace(/^https?:\/\//, ''), W / 2, 1040, 54, T.accent, 700); text('link na bio', W / 2, 1140, 40, '#a3a3a3', 600)
  }
}
export function Promote() {
  useTitle('Divulgar')
  const { me, reload } = useMe()
  const [places] = usePlacesList()
  const [qrImg, setQrImg] = useState(null)
  const c = me.creator
  const url = `${location.origin}/@${c.slug}`
  const embed = `<iframe src="${url}/incorporar" width="100%" height="480" style="border:0" title="Mapa de ${c.displayName}" loading="lazy"></iframe>`
  useEffect(() => { QRCode.toDataURL(url, { margin: 1, width: 700 }).then((d) => { const i = new Image(); i.onload = () => setQrImg(i); i.src = d }) }, [url])
  const copy = (t, m) => navigator.clipboard?.writeText(t).then(() => toast(m)).catch(() => toast(t))
  const confirmed = (places || []).filter((p) => p.status === 'confirmed')
  const tiles = [['map', 'Mapa completo'], ['week', 'Lugar da semana'], ['qr', 'QR para mesa de evento'], ['bio', 'Chamada para a bio']]
  const refs = useRef({})
  useEffect(() => { if (!places) return; for (const [k] of tiles) if (refs.current[k]) drawStory(k, refs.current[k], { c, places: confirmed, url, qrImg }) }, [places, qrImg])
  const flag = async (k) => { await api('/creator/settings', { method: 'PUT', body: { [k]: !c.settings[k] } }); reload() }
  return (
    <PanelPage active="divulgar">
      <Head title="Divulgar" />
      <div className="card row"><Icon n="link" s={20} /><b className="sp trunc">{location.host}/@{c.slug}</b><button className="btn sm" onClick={() => copy(url, 'Link copiado')}>Copiar link</button></div>
      <div className="g2">
        <div className="card col"><b>Link na bio</b><span className="sm mut">Troque o link do seu perfil pelo do mapa e marque aqui quando fizer (só você consegue trocar, no app da rede).</span><div className="row wrap"><button className={'tag ' + (c.settings.bioLinkIg ? 'ok' : 'wn')} style={{ border: 0, cursor: 'pointer' }} onClick={() => flag('bioLinkIg')}>Instagram: {c.settings.bioLinkIg ? 'link atualizado' : 'ainda não'}</button><button className={'tag ' + (c.settings.bioLinkTiktok ? 'ok' : 'wn')} style={{ border: 0, cursor: 'pointer' }} onClick={() => flag('bioLinkTiktok')}>TikTok: {c.settings.bioLinkTiktok ? 'link atualizado' : 'ainda não'}</button></div></div>
        <div className="card col"><b>Incorporar em outro site</b><div className="card soft xs" style={{ fontFamily: "'Courier New',monospace", wordBreak: 'break-all' }}>{embed}</div><button className="btn sec sm" style={{ alignSelf: 'flex-start' }} onClick={() => copy(embed, 'Código copiado')}>Copiar código</button></div>
      </div>
      <span className="eb">Modelos para stories e posts</span>
      <div className="g4">{tiles.map(([k, l]) => (
        <div key={k} className="card col" style={{ padding: 10 }}><div style={{ borderRadius: 12, overflow: 'hidden', background: 'var(--soft)' }}><canvas ref={(el) => { refs.current[k] = el }} style={{ width: '100%', display: 'block' }} /></div><b className="xs">{l}</b>
          <button className="btn sec sm" disabled={!places} onClick={() => { const cv = document.createElement('canvas'); drawStory(k, cv, { c, places: confirmed, url, qrImg }); const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = `${k}-${c.slug}.png`; a.click() }}>Baixar PNG</button></div>))}</div>
      <span className="xs mut">As imagens têm 1080×1350 e usam as cores do seu mapa.</span>
    </PanelPage>
  )
}

// F7 · listas à venda (em breve)
export function Lists() {
  useTitle('Listas à venda')
  const [on, setOn] = useState(null)
  useEffect(() => { api('/creator/interest').then((d) => setOn(d.listas)) }, [])
  return (
    <PanelPage active="listas">
      <div className="row"><h1 className="d s44">Listas à venda</h1><span className="tag wn">Em breve</span></div>
      <div className="hero col" style={{ padding: 32, gap: 10 }}><b className="d s32">Venda seus roteiros e guias</b><span className="mut" style={{ maxWidth: 520 }}>Monte listas exclusivas, como "Fim de semana em Campos do Jordão", e ofereça para quem quiser ir além do mapa gratuito. Prévia de produto: não é oferta nem promessa de receita.</span></div>
      <div className="g3">
        <div className="card col" style={{ gap: 6 }}><b>Roteiro pago</b><span className="sm mut">Lugares, ordem, dicas e horários.</span><div className="ph" style={{ height: 90 }}>preview</div></div>
        <div className="card col" style={{ gap: 6 }}><b>Preço e acesso</b><span className="sm mut">Você define o valor; o pagamento passa por um provedor.</span><div className="in ph" style={{ marginTop: 6 }}>R$ [valor]</div></div>
        <div className="card col" style={{ gap: 6 }}><b>Comissão da plataforma</b><span className="sm mut">[percentual a definir]</span></div></div>
      <div className="card row jb wrap"><div><b>Quer participar do teste?</b><div className="sm mut">Avisamos quando abrir para o seu perfil.</div></div><button className="btn" disabled={on !== false} onClick={async () => { await api('/creator/interest', { method: 'POST', body: { kind: 'listas' } }); setOn(true); toast('Você está na lista') }}>{on ? 'Você está na lista' : 'Entrar na lista'}</button></div>
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
    <PanelPage active="contas">
      <h1 className="d s44">Contas conectadas</h1>
      <div className="card col" style={{ gap: 12 }}><div className="row"><Icon n="insta" s={26} /><div className="sp"><b>Instagram · @{c.handle}</b><div className="sm mut">{ig ? 'Conta profissional · conectada' : 'Conta profissional · ainda não conectada'}</div></div>{ig ? <span className="tag ok">Ativa</span> : <button className="btn sm" onClick={() => connect('instagram')}>Conectar</button>}</div>
        <div className="sep" /><div className="row wrap" style={{ gap: 8 }}><span className="tag">Ler posts e legendas</span><span className="tag">Ler perfil básico</span></div>
        <div className="row jb wrap"><span className="xs mut">{ig ? 'Acesso renovado automaticamente. Expira se você não abrir o painel por 60 dias.' : 'Sem conexão, você adiciona os posts colando o link e a legenda.'}</span>{ig && <button className="btn bd2 sm" onClick={() => revoke('instagram')}>Revogar acesso</button>}</div></div>
      <div className="card col" style={{ gap: 12 }}><div className="row"><Icon n="tiktok" s={26} /><div className="sp"><b>TikTok · {c.tiktok ? `@${c.tiktok}` : 'sem @ informado'}</b><div className="sm mut">Opcional · {tk ? 'conectado' : 'não conectado'}</div></div>{tk ? <button className="btn bd2 sm" onClick={() => revoke('tiktok')}>Revogar acesso</button> : <button className="btn sm" onClick={() => connect('tiktok')}>Conectar</button>}</div></div>
      {msg && <Note style={{ background: 'var(--accs)', color: 'var(--accd)' }}>A conexão oficial com o {msg === 'instagram' ? 'Instagram' : 'TikTok'} depende da aprovação do nosso app pela plataforma e ainda não está ativa.</Note>}
      <Note>Ao revogar, paramos de ler novos posts. O mapa continua publicado com o que já está nele, até você pausar ou excluir.</Note>
      <div className="card soft col" style={{ gap: 6 }}><b className="sm">O que nunca acessamos</b><span className="sm mut">Mensagens diretas, Stories, seguidores, curtidas e comentários.</span></div>
    </PanelPage>
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
    <PanelPage active="privacidade">
      <h1 className="d s44">Privacidade e consentimentos</h1>
      <div className="card col" style={{ gap: 14 }}>{rows.map(([k, t, d], i) => <React.Fragment key={k}>{i > 0 && <div className="sep" />}<div className="row"><div className="sp"><b>{t}</b><div className="sm mut">{d}</div></div><Switch on={k === 'hosting' ? true : !!cons[k]} disabled={k === 'hosting'} onChange={(v) => set(k, v)} label={t} /></div></React.Fragment>)}</div>
      <span className="eb">Histórico de escolhas</span>
      <div className="card" style={{ padding: 8 }}><table className="tbl"><tbody>{log.map((l, i) => <tr key={i}><td>{fmtDate(l.ts.slice(0, 10)).slice(0, 5)} · {l.key === 'terms' ? 'Aceitou os Termos e a Política' : `${l.value ? 'Ativou' : 'Desativou'} "${CONSENT[l.key]}"`}</td><td className="mut">v. dos termos {l.terms_version}</td></tr>)}{!log.length && <tr><td className="mut">Nenhuma escolha registrada ainda.</td></tr>}</tbody></table></div>
      <Note>Mudanças relevantes de finalidade só valem com uma nova autorização sua.</Note>
    </PanelPage>
  )
}

// F10 · plano e cobrança (a cobrança ainda não está ativa)
export function Billing() {
  useTitle('Plano e cobrança')
  const { me, reload } = useMe()
  const p = me.creator.plan
  const annual = p.billing === 'annual'
  return (
    <PanelPage active="plano">
      <h1 className="d s44">Plano e cobrança</h1>
      <div className="g2">
        <div className="card col" style={{ background: 'var(--accs)', borderColor: 'transparent' }}><span className="eb">Plano atual</span><b className="d s32">Criador · {annual ? 'anual' : 'mensal'}</b><span className="sm">R$ [preço] por {annual ? 'ano' : 'mês'}. {p.trialEnds ? `Teste grátis termina em ${fmtDate(p.trialEnds)}.` : 'O teste grátis começa no onboarding.'}</span><div className="row"><button className="btn sm" onClick={async () => { await api('/creator/billing', { method: 'PUT', body: { billing: annual ? 'monthly' : 'annual' } }); reload() }}>Mudar para {annual ? 'mensal' : 'anual'}</button><button className="btn sm ln" onClick={() => toast('Hoje há um único plano pago: Criador.')}>Mudar plano</button></div></div>
        <div className="card col"><span className="eb">Forma de pagamento</span><div className="row"><Icon n="card" s={22} /><b className="sm">Nenhuma cadastrada</b></div><button className="btn sec sm" style={{ alignSelf: 'flex-start' }} disabled>Trocar (em breve)</button></div></div>
      <span className="eb">Faturas</span>
      <div className="card" style={{ padding: 8 }}><table className="tbl"><thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th>Status</th><th /></tr></thead><tbody><tr><td colSpan="5" className="mut">Nenhuma fatura: a cobrança ainda não está ativa.</td></tr></tbody></table></div>
      <Note>Aviso 7 dias antes de qualquer cobrança ou do fim do teste. Reembolsos seguem a lei e a oferta contratada.</Note>
    </PanelPage>
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
  const del = async () => {
    if (prompt('Isto apaga o mapa e a conta e não dá para desfazer. Digite EXCLUIR para confirmar:') !== 'EXCLUIR') return
    await api('/creator/account', { method: 'DELETE', body: { confirm: 'EXCLUIR' } }); await reload(); navigate('/')
  }
  return (
    <PanelPage active="conta">
      <h1 className="d s44">Minha conta</h1>
      <div className="g2"><Field label="Nome" id="n"><div className="row"><div className="in sp"><input id="n" value={name} onChange={(e) => setName(e.target.value)} maxLength="60" /></div><button className="btn" disabled={!name.trim() || name === c.displayName} onClick={save}>Salvar</button></div></Field><Field label="E-mail" id="m"><div className="in" style={{ background: 'var(--soft)' }}><input id="m" value={me.user.email} readOnly /></div></Field></div>
      <div className="card row"><div className="sp"><b>{c.settings.paused ? 'Mapa pausado' : 'Pausar o mapa'}</b><div className="sm mut">Tira o mapa do ar sem apagar nada. Seguidores veem "Mapa indisponível".{c.settings.adminPaused && ' (Pausado pela equipe: fale com a gente para esclarecer.)'}</div></div><button className="btn ln sm" disabled={c.settings.adminPaused} onClick={async () => { await api('/creator/pause', { method: 'POST', body: { paused: !c.settings.paused } }); await reload(); toast(c.settings.paused ? 'Mapa de volta ao ar' : 'Mapa pausado') }}>{paused ? (c.settings.adminPaused ? 'Pausado' : 'Retomar') : 'Pausar'}</button></div>
      <div className="card row"><div className="sp"><b>Exportar meus dados</b><div className="sm mut">Lugares, categorias, estilo e métricas agregadas em JSON e CSV.</div></div><div className="row"><a className="btn sec sm" href="/api/creator/export" download>JSON</a><a className="btn sec sm" href="/api/creator/export?format=csv" download>CSV</a></div></div>
      <div className="card col" style={{ borderColor: 'var(--bad)', gap: 10 }}><b className="acc">Zona de risco</b><div className="row"><div className="sp"><b className="sm">Excluir conta e mapa</b><div className="sm mut">Remove o mapa e as fontes derivadas. Cópias técnicas somem no prazo da Política. Não dá para desfazer.</div></div><button className="btn bd2 sm" onClick={del}>Excluir</button></div></div>
      <Note>Dúvidas sobre dados pessoais? Escreva para [e-mail de privacidade].</Note>
    </PanelPage>
  )
}

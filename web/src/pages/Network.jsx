import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api.js'
import { Link, navigate } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import { Note, Switch, Loading, AdminPage, RestaurantPage, PageHead, useTitle } from '../lib/ui.jsx'
import { useMe } from '../lib/me.jsx'
import { withBase } from '../lib/base.js'
import MapCanvas from '../MapCanvas.jsx'
import { fmtDate, initial, onColor } from '../theme.jsx'

const NET_THEME = (creators) => ({
  accent: '#ff4b2b', tone: 'light', shape: 'circle', pinSize: 55, pinBorder: true, cluster: true, selected: 'outline', mapLabels: true, labelDensity: 40, start: 'all', startView: null,
  categories: [...creators.map((c) => ({ id: c.slug, name: c.name, color: c.accent, icon: 'rest' })), { id: 'multi', name: 'Vários criadores', color: '#171717', icon: 'star' }],
})
const Dots = ({ list }) => <span className="row" style={{ gap: 6 }}>{list.map((c) => <span key={c.slug} className="dot" style={{ background: c.accent }} />)}</span>

// Endereços antigos do mapa geral: agora ele vive dentro da administração (recarrega para reavaliar a sessão)
export function HardRedirect({ to }) {
  useEffect(() => { location.replace(withBase(to) + location.search) }, [to])
  return null
}

// Administração · Rede: mapa geral (só criadores que aceitaram aparecer)
export function NetworkView() {
  const [d, setD] = useState(null)
  const [off, setOff] = useState([])
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)
  useEffect(() => { api('/network').then(setD) }, [])
  const theme = useMemo(() => NET_THEME(d?.creators || []), [d])
  const groups = useMemo(() => (d?.places || []).map((g) => ({ ...g, creators: g.creators.filter((c) => !off.includes(c.slug)) })).filter((g) => g.creators.length), [d, off])
  const shown = groups.filter((g) => !q || `${g.name} ${g.address || ''} ${g.neighborhood || ''}`.toLowerCase().includes(q.toLowerCase()))
  const places = shown.map((g) => ({ id: g.key, name: g.name, lat: g.lat, lon: g.lon, category: g.creators.length > 1 ? 'multi' : g.creators[0].slug }))
  return (
    <>
      <p className="sm mut" style={{ margin: 0 }}>Mapa geral: lugares indicados por criadores que escolheram participar. Cada criador decide se aparece aqui.</p>
      <div className="net">
        <div className="net-m"><MapCanvas places={places} theme={theme} selectedId={sel} onSelect={setSel} style={{ position: 'absolute', inset: 0, height: '100%' }} /></div>
        <div className="net-l">
          <div className="in"><Icon n="search" s={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lugar ou bairro" aria-label="Buscar lugar ou bairro" /></div>
          <span className="eb">Criadores</span>
          {!d ? <Loading /> : d.creators.length === 0 ? <p className="sm mut">Ainda não há criadores na rede.</p> : d.creators.map((c) => <div key={c.slug} className="row"><span className="dot" style={{ background: c.accent }} /><Link className="b sm sp" to={`/@${c.slug}`}>{c.name}</Link><Switch on={!off.includes(c.slug)} onChange={(v) => setOff(v ? off.filter((x) => x !== c.slug) : [...off, c.slug])} label={`Mostrar ${c.name}`} /></div>)}
          <div className="sep" />
          {shown.map((g) => (
            <button key={g.key} className={'card col click' + (sel === g.key ? ' sel' : '')} style={{ gap: 6 }} onClick={() => setSel(g.key)}>
              <div className="row"><b className="sp">{g.name}</b>{g.creators.length > 1 && <span className="tag ax">{g.creators.length} criadores</span>}</div>
              <div className="row" style={{ gap: 6 }}><Dots list={g.creators} /><span className="xs mut">{g.neighborhood || g.municipality}</span></div>
              {sel === g.key && <Link className="btn sm" to={`/admin/rede/lugar?k=${encodeURIComponent(g.key)}`} style={{ alignSelf: 'flex-start' }}>Ver indicações</Link>}</button>))}
          {d && !shown.length && d.places.length > 0 && <p className="sm mut">Nada encontrado.</p>}
        </div>
      </div>
    </>
  )
}

// Administração · Rede: lugar com vários criadores
export function AdminNetworkPlace() {
  useTitle('Lugar da rede')
  const key = new URLSearchParams(location.search).get('k')
  const [d, setD] = useState(null)
  useEffect(() => { api('/network').then(setD) }, [])
  const g = d?.places.find((p) => p.key === key)
  return (
    <AdminPage active="lugares">
      <Link className="row sm mut" to="/admin/lugares?aba=rede"><Icon n="back" s={18} />Rede</Link>
      {!d ? <Loading /> : !g ? <p className="mut">Este lugar não está mais na rede.</p> : <>
        <div><h1 className="d s44">{g.name}</h1><p className="mut sm" style={{ marginTop: 6 }}>{g.address || 'Endereço não informado'}{g.neighborhood ? ` · ${g.neighborhood}` : ''} · {g.quality === 'address_exact' ? 'endereço exato' : 'localização aproximada (a confirmar)'}</p></div>
        <span className="eb">{g.creators.length} {g.creators.length > 1 ? 'criadores indicaram' : 'criador indicou'}</span>
        <div className="g2">
          {g.creators.map((c) => (
            <div key={c.slug} className="card col" style={{ gap: 10 }}><div className="row"><div className="av" style={{ width: 36, height: 36, fontSize: 16, background: c.accent, color: onColor(c.accent) }}>{initial(c.name)}</div><div className="sp"><b className="sm">{c.name}</b><div className="xs mut">{c.postedOn ? fmtDate(c.postedOn) : '@' + c.handle}</div></div>{c.ad && <span className="tag wn">Publi</span>}</div>
              <div className="row">{c.postUrl ? <a className="btn sm sp" href={c.postUrl} target="_blank" rel="noopener noreferrer">{c.tiktokId ? 'Ver vídeo' : 'Ver post'}</a> : <span className="btn sm sp off">Sem post</span>}<Link className="btn sm sec sp" to={`/@${c.slug}`}>Mapa dele(a)</Link></div></div>))}
        </div>
        <a className="btn" style={{ alignSelf: 'flex-start' }} href={`https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lon}`} target="_blank" rel="noopener noreferrer">Abrir rota</a></>}
    </AdminPage>
  )
}

// Restaurante · reivindicar um lugar
export function Claim() {
  useTitle('Reivindicar lugar')
  const { me } = useMe()
  const [q, setQ] = useState('')
  const [res, setRes] = useState(null)
  const [sel, setSel] = useState(null)
  const [method, setMethod] = useState('manual')
  const [contact, setContact] = useState('')
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => {
    if (q.trim().length < 2 || sel?.name === q) return setRes(null)
    const h = setTimeout(() => api(`/restaurants/search?q=${encodeURIComponent(q.trim())}`).then((d) => setRes(d.results)).catch(() => setRes([])), 400)
    return () => clearTimeout(h)
  }, [q])
  const go = async () => {
    setErr('')
    if (!sel) return setErr('Selecione o seu lugar.')
    if (!contact.trim()) return setErr('Informe um e-mail ou telefone de contato do estabelecimento.')
    try { await api('/claims', { method: 'POST', body: { key: sel.key, method, contact } }); setDone(true) } catch { setErr('Não foi possível enviar o pedido.') }
  }
  const M = [['google', 'store', 'Perfil de empresa do Google', 'Login oficial, sem senha para nós', true], ['email', 'mail', 'E-mail do domínio', 'A equipe confere o e-mail e o site do estabelecimento'], ['manual', 'user', 'Verificação manual', 'Documento do estabelecimento']]
  return (
    <RestaurantPage active="lugar">
      <div><h1 className="d s44">Reivindicar um lugar</h1><p className="mut sm" style={{ marginTop: 6 }}>Veja quais criadores indicaram o seu restaurante e corrija as informações exibidas nos mapas.</p></div>
      {done ? <div className="card col" style={{ gap: 8 }}><b className="d s26">Pedido recebido</b><p className="sm">A equipe confere que você é o responsável por <b>{sel.name}</b> e libera o painel. Isso costuma levar alguns dias úteis.</p><Link className="btn sm" to="/restaurante" style={{ alignSelf: 'flex-start' }}>Ir para a visão geral</Link></div> : <>
        <div className="in f"><Icon n="search" s={18} /><input value={q} onChange={(e) => { setQ(e.target.value); setSel(null) }} placeholder="Nome do restaurante" aria-label="Buscar o seu restaurante" /></div>
        {res && !res.length && <p className="sm mut">Não encontramos este lugar nos mapas dos criadores ainda.</p>}
        {(res || (sel ? [sel] : [])).map((r) => <button key={r.key} className={'card row' + (sel?.key === r.key ? ' sel' : '')} style={{ textAlign: 'left' }} onClick={() => { setSel(r); setQ(r.name); setRes(null) }}><div className="sq ph" style={{ width: 56, height: 56 }}>foto</div><div className="sp"><b>{r.name}</b><div className="sm mut">{r.address || ''}{r.neighborhood ? ` · ${r.neighborhood}` : ''} · {r.creators} {r.creators === 1 ? 'criador' : 'criadores'}</div></div>{sel?.key === r.key && <span className="tag ok">Selecionado</span>}</button>)}
        <span className="eb">Como confirmamos que você é o responsável</span>
        <div className="g3">{M.map(([k, i, t, d, off]) => <button key={k} disabled={off} className={'card col click' + (method === k ? ' sel' : '')} style={{ gap: 6, opacity: off ? 0.55 : 1 }} onClick={() => setMethod(k)}><Icon n={i} s={22} /><b className="sm">{t}</b><span className="xs mut">{off ? 'Em breve' : d}</span></button>)}</div>
        <div className="in"><Icon n="mail" s={18} c="#757575" /><input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="E-mail ou telefone de contato do estabelecimento" aria-label="Contato do estabelecimento" /></div>
        <Note>Reivindicar não dá poder sobre o que os criadores publicam. Dá o direito de corrigir dados do lugar e de ver contagens agregadas.</Note>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={go}>Enviar pedido</button></>}
    </RestaurantPage>
  )
}

// Restaurante · visão geral
export function RestaurantPanel() {
  useTitle('Painel do restaurante')
  const { me } = useMe()
  const [d, setD] = useState(null)
  const [i, setI] = useState(0)
  useEffect(() => { if (me?.user) api('/restaurant/panel').then(setD) }, [me])
  return (
    <RestaurantPage active="visao">
      {!d ? <Loading /> : !d.places.length ? <><div><h1 className="d s44">Visão geral</h1></div><div className="card col"><b className="d s26">Nenhum lugar liberado ainda</b><p className="sm mut">{me.claims.length ? `Seu pedido (${me.claims.map((c) => c.place_name).join(', ')}) está em análise pela equipe.` : 'Reivindique o seu lugar para ver as indicações recebidas.'}</p><Link className="btn sm" to="/restaurantes" style={{ alignSelf: 'flex-start' }}>Reivindicar lugar</Link></div></> : (() => {
        const p = d.places[i] || d.places[0]
        return <>
          <div><h1 className="d s44">{p.name}</h1><p className="mut sm" style={{ marginTop: 6 }}>{p.neighborhood || p.address} · lugar verificado</p></div>
          {d.places.length > 1 && <div className="row wrap">{d.places.map((x, k) => <button key={x.key} className={'chip' + (k === i ? ' on' : '')} onClick={() => setI(k)}>{x.name}</button>)}</div>}
          <div className="g4"><div className="kpi"><b>{p.creators}</b><span>criadores indicaram</span></div><div className="kpi"><b>{p.indications.length}</b><span>indicações</span></div><div className="kpi"><b>{p.ads}</b><span>com publicidade declarada</span></div><div className="kpi"><b>[ ]</b><span>avaliações do Google (conectar)</span></div></div>
          <div className="g2">
            <div className="card col"><b>Indicações recebidas</b>{p.indications.map((x, k) => <div key={k} className="row"><span className="dot" style={{ background: x.accent }} /><span className="sm sp">{x.name}{x.postedOn ? ` · ${fmtDate(x.postedOn).slice(0, 5)}` : ''}</span>{x.ad && <span className="tag wn">Publi</span>}</div>)}{!p.indications.length && <span className="sm mut">Nenhum criador compartilhou dados agregados deste lugar ainda.</span>}<span className="xs mut">Só criadores que aceitaram compartilhar dados agregados aparecem aqui.</span></div>
            <div className="card col"><b>Avaliações de clientes</b><span className="sm mut">Conecte o Perfil de Empresa do Google para ver todas as avaliações, com a sua autorização.</span><button className="btn sm" style={{ alignSelf: 'flex-start' }} disabled>Conectar Google (em breve)</button><Note>Sem conexão, mostramos só o que o Google permite publicamente. Comentários de espectadores não são tratados como avaliações de clientes.</Note></div></div>
          <div className="card row wrap" style={{ gap: 16 }}><span className="tag">Dados insuficientes</span><div className="sp"><b className="sm">Percepção de confiança</b><div className="xs mut">Ainda não há comentários analisados. Veja os critérios.</div></div><Link className="btn sm sec" to="/restaurante/percepcao">Ver detalhes</Link></div></>
      })()}
    </RestaurantPage>
  )
}

// Restaurante · percepção de confiança
export function Perception() {
  useTitle('Percepção de confiança')
  const STATES = [['ok', 'Sem sinais relevantes'], ['wn', 'Atenção'], ['bd2', 'Questionamentos recorrentes'], ['', 'Dados insuficientes']]
  return (
    <RestaurantPage active="percepcao">
      <div><h1 className="d s44">Percepção de confiança</h1><p className="mut sm" style={{ marginTop: 6 }}>Privada: nunca aparece no mapa dos seguidores.</p></div>
      <div className="g4">{STATES.map(([k, l]) => <span key={l} className={`tag ${k}`} style={{ padding: 12, textAlign: 'center', outline: l === 'Dados insuficientes' ? '2px solid var(--ink)' : 'none' }}>{l}</span>)}</div>
      <div className="card col" style={{ gap: 10, border: '2px solid var(--ink)' }}><div className="row jb"><b className="d s26">Dados insuficientes</b><span className="tag">Estado atual</span></div>
        <p className="sm"><b>Evidência:</b> 0 comentários analisados.</p>
        <p className="sm"><b>Contexto:</b> manifestações de espectadores em publicações de criadores. Não são avaliações de clientes.</p>
        <p className="sm"><b>Critério:</b> mínimo de 10 comentários analisados. Publicidade declarada nunca conta como problema.</p></div>
      <div className="g2"><div className="card col"><b>Limitações</b><span className="sm mut">Hoje não coletamos comentários de nenhuma plataforma: não há fonte autorizada, então nenhum estado de alerta é possível. Quando houver, a classificação será por regras; ironia e contexto podem ser mal lidos e amostras pequenas variam muito.</span></div><div className="card col"><b>Sugestões práticas</b><span className="sm mut">Responder dúvidas com transparência. Pedir marcação visível de parceria. Divulgar cardápio e preços.</span></div></div>
      <Note>Não usamos alarme para incentivar assinatura.</Note>
    </RestaurantPage>
  )
}

// Restaurante · conta
export function RestaurantAccount() {
  useTitle('Conta do restaurante')
  const { me } = useMe()
  const ST = { approved: ['ok', 'Liberado'], pending: ['wn', 'Em análise'], rejected: ['bd2', 'Recusado'] }
  return (
    <RestaurantPage active="conta">
      <div><h1 className="d s44">Conta</h1><p className="mut sm" style={{ marginTop: 6 }}>Seus dados de acesso e os lugares reivindicados.</p></div>
      <div className="card col" style={{ gap: 4 }}><span className="eb">E-mail</span><b>{me?.user?.email}</b><span className="sm mut">Acesso por link no e-mail, sem senha. Planos para restaurantes ainda estão em definição.</span></div>
      <div className="card col" style={{ gap: 10 }}><b>Lugares reivindicados</b>
        {(me?.claims || []).map((c) => <div key={c.id} className="row"><span className="sm sp">{c.place_name}</span><span className={'tag ' + (ST[c.status]?.[0] || '')}>{ST[c.status]?.[1] || c.status}</span></div>)}
        {!me?.claims?.length && <span className="sm mut">Nenhum lugar ainda.</span>}
        <Link className="btn sm sec" to="/restaurantes" style={{ alignSelf: 'flex-start' }}>Reivindicar um lugar</Link></div>
    </RestaurantPage>
  )
}

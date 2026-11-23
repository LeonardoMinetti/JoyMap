import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../api.js'
import { Link, navigate, toast } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import { Hd, Logo, Stage, Note, Switch, Field, Guard, Loading, useTitle } from '../lib/ui.jsx'
import { useMe } from '../lib/me.jsx'
import MapCanvas from '../MapCanvas.jsx'
import FakeMap from '../FakeMap.jsx'
import { catOf, fmtDate, symOf } from '../theme.jsx'
import { findGroups, hasCoords, isReliable, issueOf, normName } from '../lib/places.js'

// Carrega os lugares do criador (com recarga manual)
export function usePlaces(poll) {
  const [places, setPlaces] = useState(null)
  const load = useCallback(() => api('/creator/places').then((d) => { setPlaces(d.places); return d.places }), [])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (poll && places?.some((p) => p.geoStatus === 'pending')) { const h = setTimeout(load, 2200); return () => clearTimeout(h) } }, [places, poll, load])
  return [places, load]
}
const Photo = ({ size = 48, label = 'foto' }) => <div className="sq ph" style={{ width: size, height: size }}>{label}</div>
const publicUrl = (c) => `${location.origin}/@${c.slug}`

// Colar posts (entrada manual enquanto a importação oficial não está ativa)
export function PastePosts() {
  useTitle('Colar posts')
  const [rows, setRows] = useState([{ url: '', caption: '' }])
  const [err, setErr] = useState('')
  const back = new URLSearchParams(location.search).get('voltar') || '/montando'
  const set = (i, k, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const send = async () => {
    const posts = rows.filter((r) => r.url.trim() || r.caption.trim())
    if (!posts.length) return setErr('Cole pelo menos um post.')
    try { await api('/creator/posts', { method: 'POST', body: { posts } }); navigate(back === '/painel/atualizar' ? '/painel/atualizar' : '/montando') } catch { setErr('Não foi possível ler os posts. Tente com menos de 30 por vez.') }
  }
  return (
    <Guard need="approved"><Stage>
      <Hd back={back} title="Colar posts" />
      <div className="bd" style={{ gap: 12 }}>
        <p className="sm mut">A importação automática do Instagram ainda não está ativa. Cole o link e a legenda de cada post de indicação: identificamos o lugar e o endereço, e você revisa tudo antes de publicar. Posts do TikTok trazem a data e o vídeo.</p>
        {rows.map((r, i) => (
          <div key={i} className="card col" style={{ gap: 8 }}>
            <Field label={`Post ${i + 1} · link (opcional)`} id={`u${i}`}><div className="in"><Icon n="link" s={16} c="#757575" /><input id={`u${i}`} value={r.url} onChange={(e) => set(i, 'url', e.target.value)} placeholder="Cole o link do post ou vídeo" /></div></Field>
            <Field label="Legenda" id={`l${i}`}><textarea id={`l${i}`} className="in" rows="4" value={r.caption} onChange={(e) => set(i, 'caption', e.target.value)} placeholder="Cole a legenda (com @ do lugar e 📍 endereço, se tiver)" /></Field>
          </div>))}
        <button className="btn ln" onClick={() => setRows([...rows, { url: '', caption: '' }])} disabled={rows.length >= 30}><Icon n="plus" s={16} />Mais um post</button>
        {err && <p className="err" role="alert">{err}</p>}
      </div>
      <div className="ft"><button className="btn blk" onClick={send}>Identificar lugares</button></div>
    </Stage></Guard>
  )
}

// C1 · Montando o mapa
export function Building() {
  useTitle('Montando o mapa')
  const [p, setP] = useState(null)
  useEffect(() => {
    let on = true
    const tick = async () => { try { const d = await api('/creator/progress'); if (on) setP(d) } catch { /* tenta de novo */ } }
    tick(); const h = setInterval(tick, 2000)
    return () => { on = false; clearInterval(h) }
  }, [])
  if (!p) return <Guard need="approved"><Loading /></Guard>
  const s1 = p.posts > 0, s2 = p.places > 0, s3 = s1 && p.pending === 0, s4 = p.done
  const pct = (s1 ? 25 : 0) + (s2 ? 25 : 0) + (s3 ? 25 : p.withAddress ? Math.round(25 * (p.located / p.withAddress)) : 0) + (s4 ? 25 : 0)
  const Row = ({ ok, running, title, sub }) => <div className="row"><Icon n={ok ? 'check' : 'clock'} s={20} c={ok ? '#067647' : running ? '#d93a1c' : '#a3a3a3'} /><div className="sp"><b className={'sm' + (!ok && !running ? ' mut' : '')}>{title}</b>{sub && <div className="xs mut">{sub}</div>}</div></div>
  return (
    <Guard need="approved"><Stage>
      <div className="hd"><Logo size={26} /></div>
      <div className="bd" style={{ justifyContent: 'center', gap: 14 }}>
        <h1 className="d s44">Montando o seu mapa</h1>
        <p className="mut sm">Pode fechar esta tela e voltar depois: o que já foi localizado fica guardado.</p>
        <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${pct}%` }} /></div>
        <div className="card col" style={{ gap: 14 }}>
          <Row ok={s1} running={!s1} title="Lendo seus posts" sub={s1 ? `${p.posts} post${p.posts > 1 ? 's' : ''} lido${p.posts > 1 ? 's' : ''}` : 'Aguardando seus posts'} />
          <Row ok={s2} running={s1 && !s2} title="Identificando lugares" sub={s2 ? `${p.places} lugar${p.places > 1 ? 'es' : ''} encontrado${p.places > 1 ? 's' : ''}` : s1 ? 'Nenhum lugar com nome nos posts' : null} />
          <Row ok={s3} running={s1 && !s3} title="Localizando no mapa" sub={s1 ? `${p.located} de ${p.withAddress}` : null} />
          <Row ok={s4} running={false} title="Preparando a prévia" />
        </div>
        {!s1 && <Note style={{ background: 'var(--accs)', color: 'var(--accd)' }}>A leitura automática do Instagram ainda não está ativa. Cole o link e a legenda dos seus posts para começar.</Note>}
        <Note>Nada é publicado sem a sua aprovação.</Note>
      </div>
      <div className="ft">{!s1 ? <Link className="btn blk" to="/colar-posts">Colar posts</Link> : <><button className="btn blk" disabled={!s4} onClick={() => navigate('/previa')}>{s4 ? 'Ver prévia' : 'Aguarde…'}</button><Link className="btn ln blk" to="/colar-posts">Colar mais posts</Link></>}</div>
    </Stage></Guard>
  )
}

// C2 · Prévia privada
export function Preview() {
  useTitle('Prévia do mapa')
  const { me } = useMe()
  const [places] = usePlaces(true)
  if (!places) return <Guard need="approved"><Loading /></Guard>
  const live = places.filter((p) => p.status === 'pending' || p.status === 'confirmed')
  const onMap = live.filter(hasCoords)
  const reliable = live.filter(isReliable).length
  const doubt = live.filter((p) => p.status === 'pending').length
  const theme = me.creator.theme
  return (
    <Guard need="approved"><Stage>
      <div className="hd"><span className="sp">Prévia do seu mapa</span><span className="tag wn">Privada</span></div>
      <div style={{ height: 300, position: 'relative' }}><MapCanvas places={onMap} theme={theme} symbols={me.creator.symbols} style={{ height: 300 }} /></div>
      <div className="bd" style={{ gap: 12 }}>
        <div className="g3"><div className="kpi" style={{ padding: 12 }}><b className="s32">{live.length}</b><span>lugares</span></div><div className="kpi ok" style={{ padding: 12 }}><b className="s32">{reliable}</b><span>confiáveis</span></div><div className="kpi wn" style={{ padding: 12 }}><b className="s32">{doubt}</b><span>para revisar</span></div></div>
        <Note>{doubt ? `Só você vê esta prévia. Revise os ${doubt} lugares com dúvida antes de publicar.` : 'Só você vê esta prévia. Tudo revisado: pode seguir para publicar.'}</Note>
        <Link className="card row" to="/estudio"><Icon n="palette" s={20} /><div className="sp"><b className="sm">Personalizar o visual</b><div className="xs mut">Cores, símbolos e estilo de mapa</div></div><Icon n="next" s={18} /></Link>
      </div>
      <div className="ft"><Link className="btn blk" to="/revisar">Revisar lugares</Link></div>
    </Stage></Guard>
  )
}

// C3 · Revisar lugares
export function Review() {
  useTitle('Revisar lugares')
  const [places, load] = usePlaces(true)
  const [tab, setTab] = useState('pending')
  if (!places) return <Guard need="approved"><Loading /></Guard>
  const live = places.filter((p) => p.status === 'pending' || p.status === 'confirmed')
  const unresolved = places.filter((p) => p.status === 'unresolved')
  const list = live.filter((p) => tab === 'all' || p.status === tab)
  const patch = async (id, body) => { await api(`/creator/places/${id}`, { method: 'PATCH', body }); load() }
  const pendingN = live.filter((p) => p.status === 'pending').length
  return (
    <Guard need="approved"><Stage>
      <Hd back="/previa" title="Revisar lugares" right={<span className="xs mut" style={{ fontFamily: 'Archivo' }}>{pendingN} pendentes</span>} />
      <div className="bd" style={{ gap: 10 }}>
        <div className="row">{[['pending', 'Pendentes'], ['all', 'Todos'], ['confirmed', 'Confirmados']].map(([k, l]) => <button key={k} className={'chip' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>{l}</button>)}</div>
        {tab === 'pending' && live.some((p) => p.status === 'pending' && isReliable(p)) && <button className="btn sec sm" onClick={async () => { const r = await api('/creator/places/confirm-high', { method: 'POST' }); toast(`${r.confirmed} confirmado(s) de confiança alta`); load() }}>Confirmar os de confiança alta</button>}
        {list.map((p) => {
          const is = issueOf(p, places)
          return (
            <div key={p.id} className="card col" style={{ gap: 8 }}>
              <div className="row"><Photo /><div className="sp"><b>{p.name || 'Sem nome'}</b><div className="xs mut">{is.detail}</div></div>{is.link ? <Link className={`tag ${is.k}`} to={is.link}>{is.tag}</Link> : <span className={`tag ${is.k}`}>{is.tag}</span>}</div>
              <div className="row">
                <Link className="btn sm" to={`/revisar/${p.id}`}>Corrigir</Link>
                {p.status !== 'confirmed' && <button className="btn sm sec" disabled={!p.name} onClick={() => patch(p.id, { status: 'confirmed' })}>Confirmar</button>}
                <button className="btn sm ln" onClick={() => { if (confirm(`Remover "${p.name}" do mapa?`)) patch(p.id, { status: 'removed' }) }}>Remover</button>
              </div>
            </div>)
        })}
        {!list.length && <p className="mut sm c" style={{ padding: 20 }}>{tab === 'pending' ? 'Nada pendente. Tudo revisado.' : 'Nada nesta lista.'}</p>}
        {unresolved.length > 0 && <Link className="card soft row" to="/sem-lugar"><Icon n="alert" s={18} c="#93370d" /><span className="sm sp"><b>{unresolved.length}</b> post{unresolved.length > 1 ? 's' : ''} sem lugar identificado</span><Icon n="next" s={18} /></Link>}
      </div>
      <div className="ft"><div className="row"><Link className="btn ln sp" to="/adicionar">Adicionar</Link><Link className="btn sp" to="/publicar">Seguir para publicar</Link></div></div>
    </Stage></Guard>
  )
}

// C4 · Editar lugar
export function EditPlace({ id }) {
  useTitle('Editar lugar')
  const { me } = useMe()
  const [places] = usePlaces()
  const [f, setF] = useState(null)
  const [trocar, setTrocar] = useState(false)
  const p = places?.find((x) => x.id === Number(id))
  useEffect(() => { if (p && !f) setF({ name: p.name || '', address: p.address || '', category: p.category, note: p.note || '', postUrl: p.postUrl || '', ad: !!p.ad }) }, [p, f])
  if (!places || !f) return <Guard need="approved">{places ? <Stage><Hd back="/revisar" title="Editar lugar" /><p className="bd mut">Lugar não encontrado.</p></Stage> : <Loading />}</Guard>
  const theme = me.creator.theme
  const save = async () => { await api(`/creator/places/${p.id}`, { method: 'PATCH', body: f }); navigate('/revisar') }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const cats = theme.categories
  return (
    <Guard need="approved"><Stage>
      <Hd back="/revisar" title="Editar lugar" />
      <div style={{ height: 150 }}>{hasCoords(p) ? <MapCanvas places={[p]} theme={{ ...theme, cluster: false }} symbols={me.creator.symbols} selectedId={p.id} interactive={false} style={{ height: 150 }} /> : <div className="ph" style={{ height: 150, borderRadius: 0 }}>Sem coordenadas ainda</div>}</div>
      <div className="bd" style={{ gap: 12 }}>
        <Field label="Nome" id="n1"><div className="in f"><input id="n1" value={f.name} onChange={set('name')} /></div></Field>
        <Field label="Endereço" id="n2"><div className="in"><input id="n2" value={f.address} onChange={set('address')} placeholder="Rua, número - bairro" /></div></Field>
        <div><label className="lb">Categoria e símbolo</label><div className="row wrap">
          {cats.map((c) => { const { n, sym } = symOf(c, me.creator.symbols); return <button key={c.id} className={'chip' + (f.category === c.id ? ' on' : '')} onClick={() => setF({ ...f, category: c.id })}><Icon n={n} sym={sym} s={16} c={f.category === c.id ? '#fff' : '#171717'} />{c.name}</button> })}</div></div>
        <div><label className="lb">Post da indicação</label>
          {trocar ? <div className="in"><Icon n="link" s={16} c="#757575" /><input value={f.postUrl} onChange={set('postUrl')} placeholder="Cole o link do post ou vídeo" autoFocus /></div>
            : <div className="card soft row"><Icon n="link" s={18} /><span className="sm sp trunc">{f.postUrl ? `${f.postUrl.replace(/^https?:\/\/(www\.)?/, '')}${p.postedOn ? ` (${fmtDate(p.postedOn)})` : ''}` : 'Sem post vinculado'}</span><button className="tag" style={{ border: 0, cursor: 'pointer' }} onClick={() => setTrocar(true)}>{f.postUrl ? 'Trocar' : 'Adicionar'}</button></div>}</div>
        <Field label="Sua nota (opcional)" id="n3"><div className="in"><input id="n3" value={f.note} onChange={set('note')} placeholder="Peça o pão de queijo…" maxLength="200" /></div></Field>
        <div className="row"><div className="sp"><b className="sm">Publicidade</b><div className="xs mut">O mapa mostra o aviso "Publi" ao seguidor.</div></div><Switch on={f.ad} onChange={(v) => setF({ ...f, ad: v })} label="Publicidade" /></div>
      </div>
      <div className="ft"><button className="btn blk" onClick={save}>Salvar alterações</button><button className="btn ln blk" onClick={async () => { if (confirm(`Remover "${p.name}" do mapa?`)) { await api(`/creator/places/${p.id}`, { method: 'PATCH', body: { status: 'removed' } }); navigate('/revisar') } }}>Remover do mapa</button></div>
    </Stage></Guard>
  )
}

// C5 · Adicionar lugar (busca real no OpenStreetMap/Nominatim)
export function AddPlace() {
  useTitle('Adicionar lugar')
  const qs = new URLSearchParams(location.search)
  const resolve = Number(qs.get('resolver')) || null
  const [places] = usePlaces()
  const [q, setQ] = useState(qs.get('q') || '')
  const [res, setRes] = useState(null)
  const [sel, setSel] = useState(null)
  const [postUrl, setPostUrl] = useState('')
  const [manual, setManual] = useState(false)
  const [m, setM] = useState({ name: '', address: '' })
  const [err, setErr] = useState('')
  const old = resolve && places?.find((p) => p.id === resolve)
  useEffect(() => { if (old && !postUrl) setPostUrl(old.postUrl || '') }, [old])
  useEffect(() => {
    if (q.trim().length < 3) { setRes(null); return }
    setRes('loading')
    const h = setTimeout(() => api(`/creator/search-place?q=${encodeURIComponent(q.trim())}`).then((d) => setRes(d.results)).catch(() => setRes([])), 700)
    return () => clearTimeout(h)
  }, [q])
  const add = async () => {
    setErr('')
    const body = manual ? { name: m.name, address: m.address, postUrl } : { ...sel, postUrl }
    if (!body.name) return setErr(manual ? 'Informe o nome do lugar.' : 'Selecione um dos resultados.')
    try {
      await api('/creator/places', { method: 'POST', body })
      if (old) await api(`/creator/places/${old.id}`, { method: 'PATCH', body: { status: 'removed' } })
      navigate(resolve ? '/sem-lugar' : '/revisar')
    } catch { setErr('Não foi possível adicionar.') }
  }
  return (
    <Guard need="approved"><Stage>
      <Hd back={resolve ? '/sem-lugar' : '/revisar'} title="Adicionar lugar" />
      <div className="bd" style={{ gap: 12 }}>
        <div className="in f"><Icon n="search" s={18} /><input value={q} onChange={(e) => { setQ(e.target.value); setSel(null) }} placeholder="Buscar restaurante, café, bar…" aria-label="Buscar lugar" autoFocus /></div>
        {old?.snippet && <p className="xs mut">Post: “{old.snippet}”</p>}
        {!manual && <>
          <span className="eb">Resultados</span>
          {res === 'loading' && <p className="sm mut">Buscando…</p>}
          {Array.isArray(res) && !res.length && <p className="sm mut">Nada encontrado. Tente outro nome ou informe o endereço manualmente.</p>}
          {Array.isArray(res) && res.map((r, i) => (
            <button key={i} className={'card row' + (sel === r ? ' sel' : '')} onClick={() => setSel(r)} style={{ textAlign: 'left' }}><Icon n="pin" s={20} c={sel === r ? '#d93a1c' : '#6b6b6b'} /><div className="sp"><b className="sm">{r.name}</b><div className="xs mut">{r.address}{r.municipality && r.municipality !== 'São Paulo' ? ` · ${r.municipality}` : ''}</div></div><span className={'tag' + (sel === r ? ' ok' : '')}>{sel === r ? 'Selecionado' : 'Selecionar'}</span></button>))}
        </>}
        {manual && <div className="col" style={{ gap: 10 }}>
          <Field label="Nome do lugar" id="mn"><div className="in"><input id="mn" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} /></div></Field>
          <Field label="Endereço" id="ma"><div className="in"><input id="ma" value={m.address} onChange={(e) => setM({ ...m, address: e.target.value })} placeholder="Rua, número - bairro" /></div></Field></div>}
        <div className="sep" />
        <Field label="Post da indicação" id="p1"><div className="in"><Icon n="link" s={18} c="#757575" /><input id="p1" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="Cole o link do post ou vídeo" /></div></Field>
        <Note>{manual ? <>Vamos localizar o endereço automaticamente. <button className="link" onClick={() => setManual(false)}>Voltar à busca</button></> : <>Não achou o lugar? <button className="link" onClick={() => setManual(true)}>Informe o endereço manualmente</button> e a gente localiza.</>}</Note>
        {err && <p className="err" role="alert">{err}</p>}
      </div>
      <div className="ft"><button className="btn blk" onClick={add}>Adicionar ao mapa</button></div>
    </Stage></Guard>
  )
}

// C6 · Posts sem lugar
export function Unresolved() {
  useTitle('Posts sem lugar')
  const [places, load] = usePlaces()
  if (!places) return <Guard need="approved"><Loading /></Guard>
  const list = places.filter((p) => p.status === 'unresolved')
  const dismiss = async (id) => { await api(`/creator/places/${id}`, { method: 'PATCH', body: { status: 'removed' } }); load() }
  return (
    <Guard need="approved"><Stage>
      <Hd back="/revisar" title="Posts sem lugar" right={<span className="xs mut" style={{ fontFamily: 'Archivo' }}>{list.length} posts</span>} />
      <div className="bd" style={{ gap: 10 }}>
        <p className="sm mut">Não achamos um lugar nestes posts. Indique o lugar ou marque como "não é indicação".</p>
        {list.map((p) => (
          <div key={p.id} className="card col" style={{ gap: 8 }}>
            <div className="row as"><Photo size={56} label="post" /><div className="sp"><b className="sm">{p.postedOn ? fmtDate(p.postedOn) : 'Sem data'}{p.tiktokId ? ' · Vídeo do TikTok' : ' · Post'}</b><div className="xs mut">{p.snippet ? `“${p.snippet}”` : 'Sem texto para identificar o lugar.'}</div>{p.postUrl && <a className="xs" href={p.postUrl} target="_blank" rel="noopener noreferrer">abrir post ↗</a>}</div></div>
            <div className="row"><Link className="btn sm" to={`/adicionar?resolver=${p.id}`}>Indicar lugar</Link><button className="btn sm sec" onClick={() => dismiss(p.id)}>Não é indicação</button></div>
          </div>))}
        {!list.length && <p className="mut sm c" style={{ padding: 20 }}>Nenhum post sem lugar.</p>}
      </div>
      <div className="ft"><Link className="btn blk" to="/revisar">Voltar à revisão</Link></div>
    </Stage></Guard>
  )
}

// C7 · Unidades e duplicadas
export function Units() {
  useTitle('Unidades e duplicadas')
  const [places, load] = usePlaces()
  if (!places) return <Guard need="approved"><Loading /></Guard>
  const { dups, chains } = findGroups(places)
  const merge = async (keep, drop) => { await api('/creator/places/merge', { method: 'POST', body: { keep, drop } }); toast('Lugares mesclados'); load() }
  const separate = async (g) => { await api('/creator/places/keep-separate', { method: 'POST', body: { ids: g.map((p) => p.id) } }); load() }
  return (
    <Guard need="approved"><Stage>
      <Hd back="/revisar" title="Unidades e duplicadas" />
      <div className="bd" style={{ gap: 12 }}>
        <span className="eb">Possível duplicata</span>
        {dups.map((g) => (
          <div key={g.map((p) => p.id).join('-')} className="card col" style={{ gap: 10 }}><p className="sm">Estes lugares estão no mesmo endereço{g.some((p, i) => g.some((q, j) => i !== j && p.name !== q.name)) ? ', com grafias diferentes do nome' : ''}:</p>
            {g.map((p, i) => <div key={p.id} className="row"><Icon n="pin" s={18} c="#d93a1c" /><span className="sm sp"><b>{p.name}</b>{i > 0 && g[0].name !== p.name ? ' (outra grafia)' : ''} · {p.address}</span></div>)}
            <div className="row"><button className="btn sm" onClick={() => merge(g[0].id, g[1].id)}>Mesclar em um lugar</button><button className="btn sm sec" onClick={() => separate(g)}>Manter separados</button></div></div>))}
        {!dups.length && <p className="sm mut">Nenhuma duplicata encontrada.</p>}
        <span className="eb">Rede com várias unidades</span>
        {chains.map((g) => (
          <div key={normName(g[0].name)} className="card col" style={{ gap: 10 }}><b>{g[0].name}</b>
            {g.map((p) => <div key={p.id} className="row"><Icon n="pin" s={18} c="#2d7ff9" /><span className="sm sp">{p.address || 'Sem endereço'}{p.neighborhood ? ` · ${p.neighborhood}` : ''}</span><span className={'tag' + (hasCoords(p) ? ' ok' : ' wn')}>{hasCoords(p) ? 'Mapa' : 'Sem coord.'}</span></div>)}
            <Note>Cada unidade vira um pin. O post pode indicar uma ou todas.</Note></div>))}
        {!chains.length && <p className="sm mut">Nenhuma rede com várias unidades.</p>}
      </div>
      <div className="ft"><Link className="btn blk" to="/revisar">Concluir</Link></div>
    </Stage></Guard>
  )
}

// C8 · Checklist de publicação
export function Publish() {
  useTitle('Antes de publicar')
  const { me, reload } = useMe()
  const [places] = usePlaces()
  const [ok, setOk] = useState(false)
  const [err, setErr] = useState('')
  if (!places) return <Guard need="approved"><Loading /></Guard>
  const c = me.creator
  const confirmed = places.filter((p) => p.status === 'confirmed')
  const pending = places.filter((p) => p.status === 'pending').length
  const noCoords = confirmed.filter((p) => !hasCoords(p)).length
  const styled = ['accent', 'bg', 'fg', 'font', 'tone', 'shape', 'radius'].some((k) => c.theme[k] !== { accent: '#ff4b2b', bg: '#ffffff', fg: '#171717', font: 'sans', tone: 'light', shape: 'drop', radius: 14 }[k])
  const go = async () => {
    try { await api('/creator/publish', { method: 'POST', body: { published: true } }); await reload(); navigate('/publicado') } catch (x) { setErr(x.message === 'pausado_pela_equipe' ? 'O mapa está pausado pela equipe. Fale com a gente para esclarecer.' : 'Não foi possível publicar.') }
  }
  const Row = ({ ok, children }) => <div className="row"><Icon n={ok ? 'check' : 'alert'} s={20} c={ok ? '#067647' : '#93370d'} /><span className="sm sp">{children}</span></div>
  return (
    <Guard need="approved"><Stage>
      <Hd back="/revisar" title="Antes de publicar" />
      <div className="bd" style={{ gap: 12 }}>
        <h1 className="d s32">Revisão final</h1>
        <div className="card col" style={{ gap: 12 }}>
          <Row ok={confirmed.length > 0}>{confirmed.length ? `${confirmed.length} lugares revisados` : 'Nenhum lugar confirmado ainda'}</Row>
          {pending > 0 && <Row ok={false}>{pending} lugares ainda para revisar (não aparecerão no mapa)</Row>}
          <Row ok={styled}>{styled ? 'Visual personalizado' : 'Visual padrão (personalize no Estúdio, se quiser)'}</Row>
          <Row ok>Endereço: {location.host}/@{c.slug}</Row>
          {noCoords > 0 && <Row ok={false}>{noCoords} lugares ainda sem coordenadas (não aparecerão no mapa)</Row>}
        </div>
        <div className="card soft col" style={{ gap: 8 }}><b className="sm">Identificação de publicidade</b><span className="sm mut">Se um lugar foi parceria, marque na ficha. O mapa mostra o aviso "Publi" ao seguidor.</span></div>
        <div className="row" style={{ gap: 10 }}><Switch on={ok} onChange={setOk} label="Li e aprovo a prévia" /><span className="sm">Li e aprovo a prévia deste mapa</span></div>
        {err && <p className="err" role="alert">{err}</p>}
      </div>
      <div className="ft"><button className="btn blk" disabled={!ok || !confirmed.length} onClick={go}>Publicar mapa</button><span className="xs mut c">Você pode pausar ou retirar quando quiser.</span></div>
    </Stage></Guard>
  )
}

// C9 · Mapa publicado
export function Published() {
  useTitle('Mapa publicado')
  const { me } = useMe()
  const [places] = usePlaces()
  const [qr, setQr] = useState('')
  const c = me?.creator
  const url = c ? publicUrl(c) : ''
  useEffect(() => { if (url) QRCode.toDataURL(url, { margin: 1, width: 240 }).then(setQr).catch(() => {}) }, [url])
  const [showQr, setShowQr] = useState(false)
  if (!places) return <Guard need="approved"><Loading /></Guard>
  const copy = () => navigator.clipboard?.writeText(url).then(() => toast('Link copiado')).catch(() => toast(url))
  const share = () => (navigator.share ? navigator.share({ title: c.displayName, url }).catch(() => {}) : copy())
  return (
    <Guard need="approved"><Stage>
      <div style={{ height: 240, background: 'var(--accs)' }}>{places.some((p) => p.status === 'confirmed' && hasCoords(p)) ? <MapCanvas places={places.filter((p) => p.status === 'confirmed' && hasCoords(p))} theme={c.theme} symbols={c.symbols} interactive={false} style={{ height: 240 }} /> : <FakeMap h={240} tone="mint" pal="candy" shape="circle" n={12} lab={false} />}</div>
      <div className="bd" style={{ gap: 14 }}>
        <span className={'tag ' + (c.published ? 'ok' : 'wn')} style={{ alignSelf: 'flex-start' }}>{c.published ? 'No ar' : 'Fora do ar'}</span>
        <h1 className="d s56">{c.published ? 'Seu mapa está publicado' : 'Seu mapa não está publicado'}</h1>
        <div className="card soft row"><Icon n="link" s={18} /><b className="sm sp trunc">{location.host}/@{c.slug}</b><button className="tag ax" style={{ border: 0, cursor: 'pointer' }} onClick={copy}>Copiar</button></div>
        <div className="g2"><button className="card row" onClick={() => setShowQr(true)}><Icon n="qr" s={22} /><b className="sm">QR code</b></button><button className="card row" onClick={share}><Icon n="share" s={22} /><b className="sm">Compartilhar</b></button></div>
        <Note>Próximo passo: troque o link da sua bio. Isso só você consegue fazer no app da rede social.</Note>
      </div>
      <div className="ft"><Link className="btn blk" to="/painel">Ir para o painel</Link>{c.published && <a className="btn ln blk" href={url} target="_blank" rel="noopener noreferrer">Abrir o mapa</a>}</div>
      {showQr && <div className="sheetwrap" onClick={() => setShowQr(false)}><div className="sheet" onClick={(e) => e.stopPropagation()} style={{ alignItems: 'center' }}><div className="row jb" style={{ width: '100%' }}><h2 className="d s26">QR code</h2><button aria-label="Fechar" style={{ background: 'none', border: 0 }} onClick={() => setShowQr(false)}><Icon n="close" s={22} /></button></div>{qr && <img src={qr} alt="QR code do mapa" width="200" height="200" />}<span className="xs mut c">Aponte a câmera para abrir o mapa.</span></div></div>}
    </Stage></Guard>
  )
}

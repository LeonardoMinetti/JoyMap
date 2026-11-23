import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../api.js'
import { Link, navigate, toast } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import { Logo, Side, Note, Switch, Field, Guard, Loading, useTitle } from '../lib/ui.jsx'
import { PlacePhoto } from '../pub/shared.jsx'
import { useMe } from '../lib/me.jsx'
import MapCanvas from '../MapCanvas.jsx'
import FakeMap from '../FakeMap.jsx'
import { catOf, fmtDate, symOf } from '../theme.jsx'
import { resizeImage } from '../lib/image.js'
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

// ---------- layout de desktop dos fluxos de montagem ----------
// Dentro do painel (menu lateral) depois do onboarding; antes disso, uma página larga com o logo no topo.
function FlowShell({ active = 'lugares', children }) {
  const { me } = useMe()
  const done = me?.creator?.onboarding === 'done'
  return (
    <Guard need="approved">
      <div className="page"><div className={'app' + (done ? '' : ' ob')}>
        {done && <Side active={active} />}
        <div className="main">
          {!done && <div className="ob-top"><Logo size={26} /><span className="xs mut">Montando o seu mapa</span></div>}
          {children}
        </div>
      </div></div>
    </Guard>
  )
}
function FlowHead({ back, backLabel = 'Voltar', title, sub, right }) {
  return (
    <div className="flow-head">
      {back && <Link className="flow-back" to={back}><Icon n="back" s={16} />{backLabel}</Link>}
      <div className="row jb wrap pg-h"><div><h1 className="d s44">{title}</h1>{sub && <p className="sm mut">{sub}</p>}</div>{right}</div>
    </div>
  )
}
const FlowGrid = ({ aside, children }) => <div className={aside ? 'flow2' : 'flow1'}><div className="col" style={{ gap: 20, minWidth: 0 }}>{children}</div>{aside && <aside>{aside}</aside>}</div>
const Thumb = ({ p, theme, size = 56 }) => <PlacePhoto place={p} theme={theme} size={size} style={{ borderRadius: 14, flex: 'none' }} label="" />

// Colar posts (entrada manual enquanto a importação oficial não está ativa)
export function PastePosts() {
  useTitle('Colar posts')
  const [rows, setRows] = useState([{ url: '', caption: '' }])
  const [err, setErr] = useState('')
  const back = new URLSearchParams(location.search).get('voltar') || '/montando'
  const set = (i, k, v) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))
  const filled = rows.filter((r) => r.url.trim() || r.caption.trim()).length
  const send = async () => {
    const posts = rows.filter((r) => r.url.trim() || r.caption.trim())
    if (!posts.length) return setErr('Cole pelo menos um post.')
    try { await api('/creator/posts', { method: 'POST', body: { posts } }); navigate(back === '/painel/atualizar' ? '/painel/atualizar' : '/montando') } catch { setErr('Não foi possível ler os posts. Tente com menos de 30 por vez.') }
  }
  return (
    <FlowShell>
      <FlowHead back={back === '/montando' ? undefined : back} backLabel="Voltar" title="Colar posts" sub="Cole o link e a legenda de cada post de indicação. Identificamos o lugar e o endereço, e você revisa tudo antes de publicar." />
      <FlowGrid aside={<>
        <div className="card col"><b>Como funciona</b>
          <ol className="steps"><li>Cole o link e a legenda do post (com o @ do lugar e o endereço, se tiver).</li><li>Identificamos o lugar e localizamos no mapa.</li><li>Você revisa cada lugar antes de publicar.</li></ol>
          <span className="xs mut">A importação automática do Instagram ainda não está ativa. Posts do TikTok trazem a data e o vídeo.</span></div>
        <div className="card col"><div className="row jb"><b>{filled} post{filled === 1 ? '' : 's'} para enviar</b><span className="xs mut">até 30</span></div>
          <button className="btn blk" onClick={send}>Identificar lugares</button>{err && <p className="err" role="alert">{err}</p>}</div>
      </>}>
        {rows.map((r, i) => (
          <div key={i} className="card col">
            <div className="row jb"><b className="sm">Post {i + 1}</b>{rows.length > 1 && <button className="link xs" onClick={() => setRows(rows.filter((_, j) => j !== i))}>Remover</button>}</div>
            <div className="g2" style={{ alignItems: 'start' }}>
              <Field label="Link (opcional)" id={`u${i}`}><div className="in"><Icon n="link" s={16} c="#757575" /><input id={`u${i}`} value={r.url} onChange={(e) => set(i, 'url', e.target.value)} placeholder="Cole o link do post ou vídeo" /></div></Field>
              <Field label="Legenda" id={`l${i}`}><textarea id={`l${i}`} className="in" rows="4" value={r.caption} onChange={(e) => set(i, 'caption', e.target.value)} placeholder="Cole a legenda (com @ do lugar e 📍 endereço, se tiver)" /></Field>
            </div>
          </div>))}
        <button className="btn ln" style={{ alignSelf: 'flex-start' }} onClick={() => setRows([...rows, { url: '', caption: '' }])} disabled={rows.length >= 30}><Icon n="plus" s={16} />Mais um post</button>
      </FlowGrid>
    </FlowShell>
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
    <FlowShell>
      <FlowHead title="Montando o seu mapa" sub="Pode fechar esta tela e voltar depois: o que já foi localizado fica guardado." />
      <FlowGrid aside={<>
        <div className="card col">{!s1 ? <Link className="btn blk" to="/colar-posts">Colar posts</Link> : <><button className="btn blk" disabled={!s4} onClick={() => navigate('/previa')}>{s4 ? 'Ver prévia' : 'Aguarde…'}</button><Link className="btn ln blk" to="/colar-posts">Colar mais posts</Link></>}</div>
        {!s1 && <Note>A leitura automática do Instagram ainda não está ativa. Cole o link e a legenda dos seus posts para começar.</Note>}
        <Note>Nada é publicado sem a sua aprovação.</Note>
      </>}>
        <div className="card col">
          <div className="row jb"><b>Progresso</b><b className="sm">{pct}%</b></div>
          <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${pct}%` }} /></div>
          <div className="sep" />
          <Row ok={s1} running={!s1} title="Lendo seus posts" sub={s1 ? `${p.posts} post${p.posts > 1 ? 's' : ''} lido${p.posts > 1 ? 's' : ''}` : 'Aguardando seus posts'} />
          <Row ok={s2} running={s1 && !s2} title="Identificando lugares" sub={s2 ? `${p.places} lugar${p.places > 1 ? 'es' : ''} encontrado${p.places > 1 ? 's' : ''}` : s1 ? 'Nenhum lugar com nome nos posts' : null} />
          <Row ok={s3} running={s1 && !s3} title="Localizando no mapa" sub={s1 ? `${p.located} de ${p.withAddress}` : null} />
          <Row ok={s4} running={false} title="Preparando a prévia" />
        </div>
      </FlowGrid>
    </FlowShell>
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
    <FlowShell>
      <FlowHead title="Prévia do seu mapa" sub="Só você vê esta prévia." right={<span className="tag wn">Privada</span>} />
      <FlowGrid aside={<>
        <div className="g3" style={{ gap: 12 }}><div className="kpi"><b className="s32">{live.length}</b><span>lugares</span></div><div className="kpi"><b className="s32">{reliable}</b><span>confiáveis</span></div><div className="kpi"><b className="s32">{doubt}</b><span>para revisar</span></div></div>
        <Note>{doubt ? `Revise os ${doubt} lugares com dúvida antes de publicar.` : 'Tudo revisado: pode seguir para publicar.'}</Note>
        <Link className="card row" to="/estudio"><Icon n="palette" s={20} /><div className="sp"><b className="sm">Personalizar o visual</b><div className="xs mut">Cores, símbolos e estilo de mapa</div></div><Icon n="next" s={18} /></Link>
        <Link className="btn blk" to="/revisar">Revisar lugares</Link>
      </>}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative', height: 480 }}><MapCanvas places={onMap} theme={theme} symbols={me.creator.symbols} style={{ height: 480 }} /></div>
      </FlowGrid>
    </FlowShell>
  )
}

// C3 · Revisar lugares
export function Review() {
  useTitle('Revisar lugares')
  const { me } = useMe()
  const theme = me.creator.theme
  const [places, load] = usePlaces(true)
  const [tab, setTab] = useState('pending')
  if (!places) return <Guard need="approved"><Loading /></Guard>
  const live = places.filter((p) => p.status === 'pending' || p.status === 'confirmed')
  const unresolved = places.filter((p) => p.status === 'unresolved')
  const list = live.filter((p) => tab === 'all' || p.status === tab)
  const patch = async (id, body) => { await api(`/creator/places/${id}`, { method: 'PATCH', body }); load() }
  const pendingN = live.filter((p) => p.status === 'pending').length
  return (
    <FlowShell>
      <FlowHead back="/painel" backLabel="Painel" title="Revisar lugares" sub={`${pendingN} pendente${pendingN === 1 ? '' : 's'} · ${live.length} no mapa`} />
      <FlowGrid aside={<>
        <div className="card col"><b>Resumo</b>
          <div className="row jb sm"><span className="mut">Pendentes</span><b>{pendingN}</b></div>
          <div className="row jb sm"><span className="mut">Confirmados</span><b>{live.length - pendingN}</b></div>
          <div className="row jb sm"><span className="mut">Posts sem lugar</span><b>{unresolved.length}</b></div>
          <div className="sep" />
          <Link className="btn blk" to="/publicar">Seguir para publicar</Link><Link className="btn ln blk" to="/adicionar">Adicionar lugar</Link>
          <Link className="btn ln blk" to="/unidades">Unidades e duplicadas</Link></div>
        {unresolved.length > 0 && <Link className="card row" to="/sem-lugar"><Icon n="alert" s={18} c="#93370d" /><span className="sm sp"><b>{unresolved.length}</b> post{unresolved.length > 1 ? 's' : ''} sem lugar identificado</span><Icon n="next" s={18} /></Link>}
      </>}>
        <div className="row wrap jb"><div className="seg" role="group" aria-label="Filtrar">{[['pending', 'Pendentes'], ['all', 'Todos'], ['confirmed', 'Confirmados']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
          {tab === 'pending' && live.some((p) => p.status === 'pending' && isReliable(p)) && <button className="btn sec sm" onClick={async () => { const r = await api('/creator/places/confirm-high', { method: 'POST' }); toast(`${r.confirmed} confirmado(s) de confiança alta`); load() }}>Confirmar os de confiança alta</button>}</div>
        <div className="rv-grid">
          {list.map((p) => {
            const is = issueOf(p, places)
            return (
              <div key={p.id} className="card col" style={{ gap: 12 }}>
                <div className="row"><Thumb p={p} theme={theme} /><div className="sp"><b className="trunc" style={{ display: 'block' }}>{p.name || 'Sem nome'}</b><div className="xs mut">{is.detail}</div></div></div>
                <div className="row jb wrap">{is.link ? <Link className={`tag ${is.k}`} to={is.link}>{is.tag}</Link> : <span className={`tag ${is.k}`}>{is.tag}</span>}
                  <div className="row" style={{ gap: 8 }}>
                    <Link className="btn sm" to={`/revisar/${p.id}`}>Corrigir</Link>
                    {p.status !== 'confirmed' && <button className="btn sm sec" disabled={!p.name} onClick={() => patch(p.id, { status: 'confirmed' })}>Confirmar</button>}
                    <button className="btn sm ln" onClick={() => { if (confirm(`Remover "${p.name}" do mapa?`)) patch(p.id, { status: 'removed' }) }}>Remover</button></div></div>
              </div>)
          })}
        </div>
        {!list.length && <div className="card soft c" style={{ padding: 32 }}><span className="mut sm">{tab === 'pending' ? 'Nada pendente. Tudo revisado.' : 'Nada nesta lista.'}</span></div>}
      </FlowGrid>
    </FlowShell>
  )
}

// C4 · Editar lugar
export function EditPlace({ id }) {
  useTitle('Editar lugar')
  const { me } = useMe()
  const [places] = usePlaces()
  const [f, setF] = useState(null)
  const [trocar, setTrocar] = useState(false)
  const [photo, setPhoto] = useState(null)
  const pick = useRef(null)
  const p = places?.find((x) => x.id === Number(id))
  useEffect(() => { if (p && !f) { setF({ name: p.name || '', address: p.address || '', category: p.category, note: p.note || '', postUrl: p.postUrl || '', ad: !!p.ad, googleUrl: p.googleUrl || '', instagramUrl: p.instagramUrl || '', couponNote: p.couponNote || '', couponCode: p.couponCode || '' }); setPhoto(p.photo || null) } }, [p, f])
  if (!places || !f) return places ? <FlowShell><FlowHead back="/painel/lugares" backLabel="Lugares" title="Editar lugar" /><p className="mut">Lugar não encontrado.</p></FlowShell> : <Guard need="approved"><Loading /></Guard>
  const theme = me.creator.theme
  const save = async () => {
    try { await api(`/creator/places/${p.id}`, { method: 'PATCH', body: f }); toast('Alterações salvas'); navigate('/painel/lugares') }
    catch (x) { toast(x.message === 'google_invalido' ? 'O link do Google precisa ser do Google Maps (maps.app.goo.gl ou google.com/maps).' : x.message === 'instagram_invalido' ? 'Use o @ ou o link do perfil do Instagram do lugar (não de um post).' : 'Não foi possível salvar.') }
  }
  const sendPhoto = async (file) => {
    try { const im = await resizeImage(file); const r = await api(`/creator/places/${p.id}/photo`, { method: 'PUT', body: { mime: im.mime, data: im.data } }); setPhoto(r.photo || im.url); toast('Foto salva') }
    catch { toast('Use uma foto JPG, PNG ou WebP.') }
    if (pick.current) pick.current.value = ''
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const cats = theme.categories
  return (
    <FlowShell>
      <FlowHead back="/painel/lugares" backLabel="Lugares" title={f.name || 'Editar lugar'} sub="Edite as informações que aparecem no cartão e na página do lugar." />
      <FlowGrid aside={<>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>{hasCoords(p) ? <MapCanvas places={[p]} theme={{ ...theme, cluster: false }} symbols={me.creator.symbols} selectedId={p.id} interactive={false} style={{ height: 220 }} /> : <div className="ph" style={{ height: 220, borderRadius: 0 }}>Sem coordenadas ainda</div>}</div>
        <div className="card col"><b>Foto do lugar</b>
          <div className="sq ph" style={{ width: '100%', height: 200, borderRadius: 16, overflow: 'hidden', ...(photo ? { backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : {}) }}>{photo ? 'foto' : 'Sem foto'}</div>
          <input ref={pick} type="file" accept="image/jpeg,image/png,image/webp" className="sr" id="pf" onChange={(e) => e.target.files[0] && sendPhoto(e.target.files[0])} />
          <div className="row"><label htmlFor="pf" className="btn sec sm">{photo ? 'Trocar foto' : 'Escolher foto'}</label>{photo && <button className="link xs" onClick={async () => { await api(`/creator/places/${p.id}/photo`, { method: 'DELETE' }); setPhoto(null) }}>Remover</button>}</div>
          <span className="xs mut">Use uma foto sua ou autorizada. Ela aparece no cartão e na página do lugar.</span></div>
        <div className="card col"><button className="btn blk" onClick={save}>Salvar alterações</button><button className="btn ln blk" onClick={async () => { if (confirm(`Remover "${p.name}" do mapa?`)) { await api(`/creator/places/${p.id}`, { method: 'PATCH', body: { status: 'removed' } }); navigate('/painel/lugares') } }}>Remover do mapa</button></div>
      </>}>
        <div className="card col">
          <b>Informações</b>
          <div className="g2"><Field label="Nome" id="n1"><div className="in f"><input id="n1" value={f.name} onChange={set('name')} /></div></Field>
            <Field label="Endereço" id="n2"><div className="in"><input id="n2" value={f.address} onChange={set('address')} placeholder="Rua, número - bairro" /></div></Field></div>
          <div><label className="lb">Categoria</label><div className="row wrap">
            {cats.map((c) => { const { n, sym } = symOf(c, me.creator.symbols); return <button key={c.id} className={'chip' + (f.category === c.id ? ' on' : '')} aria-pressed={f.category === c.id} onClick={() => setF({ ...f, category: c.id })}><Icon n={n} sym={sym} s={16} c={f.category === c.id ? '#fff' : '#171717'} />{c.name}</button> })}</div></div>
        </div>
        <div className="card col">
          <b>Links</b>
          <div><label className="lb">Post da indicação</label>
            {trocar ? <div className="in"><Icon n="link" s={16} c="#757575" /><input value={f.postUrl} onChange={set('postUrl')} placeholder="Cole o link do post ou vídeo" autoFocus /></div>
              : <div className="card soft row" style={{ padding: 14 }}><Icon n="link" s={18} /><span className="sm sp trunc">{f.postUrl ? `${f.postUrl.replace(/^https?:\/\/(www\.)?/, '')}${p.postedOn ? ` (${fmtDate(p.postedOn)})` : ''}` : 'Sem post vinculado'}</span><button className="tag" style={{ border: 0, cursor: 'pointer' }} onClick={() => setTrocar(true)}>{f.postUrl ? 'Trocar' : 'Adicionar'}</button></div>}</div>
          <div className="g2" style={{ alignItems: 'start' }}>
            <Field label="Link do Google (opcional)" id="n4"><div className="in"><Icon n="link" s={16} c="#757575" /><input id="n4" value={f.googleUrl} onChange={set('googleUrl')} placeholder="Link do lugar no Google Maps" inputMode="url" /></div><span className="xs mut">No Google Maps, toque em Compartilhar e copie o link. Sem ele, o mapa oferece uma busca no Google pelo nome e endereço.</span></Field>
            <Field label="Instagram do lugar (opcional)" id="n5"><div className="in"><Icon n="insta" s={16} c="#757575" /><input id="n5" value={f.instagramUrl} onChange={set('instagramUrl')} placeholder="@perfil ou link do perfil" autoCapitalize="none" /></div></Field></div>
        </div>
        <div className="card col">
          <b>Sua indicação</b>
          <Field label="Sua nota (opcional)" id="n3"><div className="in"><input id="n3" value={f.note} onChange={set('note')} placeholder="Peça o pão de queijo…" maxLength="200" /></div></Field>
        </div>
        <div className="card col">
          <div><b>Cupom ou desconto</b><div className="xs mut">Se o lugar oferece algo a quem vem pela sua indicação, conte aqui. Aparece na página do lugar.</div></div>
          <Field label="O que o seguidor ganha" id="c1"><div className="in"><input id="c1" value={f.couponNote} onChange={set('couponNote')} placeholder="Ex.: 10% de desconto dizendo que veio pelo meu mapa" maxLength="140" /></div></Field>
          <Field label="Código do cupom (opcional)" id="c2"><div className="in"><Icon n="star" s={16} c="#757575" /><input id="c2" value={f.couponCode} onChange={set('couponCode')} placeholder="Ex.: MAPA10" maxLength="30" autoCapitalize="characters" /></div></Field>
          <span className="xs mut">Combine o benefício com o estabelecimento antes de divulgar. Deixe em branco se não houver.</span>
        </div>
      </FlowGrid>
    </FlowShell>
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
      navigate(resolve ? '/sem-lugar' : '/painel/lugares')
    } catch { setErr('Não foi possível adicionar.') }
  }
  return (
    <FlowShell>
      <FlowHead back={resolve ? '/sem-lugar' : '/painel/lugares'} backLabel={resolve ? 'Posts sem lugar' : 'Lugares'} title="Adicionar lugar" sub="Busque o lugar pelo nome ou informe o endereço. Nós localizamos no mapa." />
      <FlowGrid aside={<>
        <div className="card col"><b>Post da indicação</b>
          <Field label="Link do post ou vídeo" id="p1"><div className="in"><Icon n="link" s={18} c="#757575" /><input id="p1" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="Cole o link do post ou vídeo" /></div></Field>
          {old?.snippet && <p className="xs mut" style={{ margin: 0 }}>Post: “{old.snippet}”</p>}
          <button className="btn blk" onClick={add}>Adicionar ao mapa</button>{err && <p className="err" role="alert">{err}</p>}</div>
        <Note>{manual ? <>Vamos localizar o endereço automaticamente. <button className="link" onClick={() => setManual(false)}>Voltar à busca</button></> : <>Não achou o lugar? <button className="link" onClick={() => setManual(true)}>Informe o endereço manualmente</button> e a gente localiza.</>}</Note>
      </>}>
        {!manual ? <>
          <div className="in f" style={{ background: '#fff' }}><Icon n="search" s={18} /><input value={q} onChange={(e) => { setQ(e.target.value); setSel(null) }} placeholder="Buscar restaurante, café, bar…" aria-label="Buscar lugar" autoFocus /></div>
          {res === 'loading' && <p className="sm mut">Buscando…</p>}
          {res == null && <p className="sm mut">Digite pelo menos 3 letras para buscar.</p>}
          {Array.isArray(res) && !res.length && <p className="sm mut">Nada encontrado. Tente outro nome ou informe o endereço manualmente.</p>}
          {Array.isArray(res) && res.length > 0 && <div className="rv-grid">{res.map((r, i) => (
            <button key={i} className={'card row' + (sel === r ? ' sel' : '')} onClick={() => setSel(r)} style={{ textAlign: 'left' }}><Icon n="pin" s={20} c={sel === r ? '#d93a1c' : '#6b6b6b'} /><div className="sp"><b className="sm">{r.name}</b><div className="xs mut">{r.address}{r.municipality && r.municipality !== 'São Paulo' ? ` · ${r.municipality}` : ''}</div></div><span className={'tag' + (sel === r ? ' ok' : '')}>{sel === r ? 'Selecionado' : 'Selecionar'}</span></button>))}</div>}
        </> : <div className="card col"><b>Informar manualmente</b>
          <Field label="Nome do lugar" id="mn"><div className="in"><input id="mn" value={m.name} onChange={(e) => setM({ ...m, name: e.target.value })} /></div></Field>
          <Field label="Endereço" id="ma"><div className="in"><input id="ma" value={m.address} onChange={(e) => setM({ ...m, address: e.target.value })} placeholder="Rua, número - bairro" /></div></Field></div>}
      </FlowGrid>
    </FlowShell>
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
    <FlowShell>
      <FlowHead back="/revisar" backLabel="Revisar lugares" title="Posts sem lugar" sub={`${list.length} post${list.length === 1 ? '' : 's'} · não achamos um lugar nestes posts. Indique o lugar ou marque como "não é indicação".`} />
      <FlowGrid aside={<div className="card col"><Link className="btn blk" to="/revisar">Voltar à revisão</Link></div>}>
        <div className="rv-grid">{list.map((p) => (
          <div key={p.id} className="card col">
            <div className="row as"><Photo size={56} label="post" /><div className="sp"><b className="sm">{p.postedOn ? fmtDate(p.postedOn) : 'Sem data'}{p.tiktokId ? ' · Vídeo do TikTok' : ' · Post'}</b><div className="xs mut">{p.snippet ? `“${p.snippet}”` : 'Sem texto para identificar o lugar.'}</div>{p.postUrl && <a className="xs" href={p.postUrl} target="_blank" rel="noopener noreferrer">abrir post ↗</a>}</div></div>
            <div className="row"><Link className="btn sm" to={`/adicionar?resolver=${p.id}`}>Indicar lugar</Link><button className="btn sm sec" onClick={() => dismiss(p.id)}>Não é indicação</button></div>
          </div>))}</div>
        {!list.length && <div className="card soft c" style={{ padding: 32 }}><span className="mut sm">Nenhum post sem lugar.</span></div>}
      </FlowGrid>
    </FlowShell>
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
    <FlowShell>
      <FlowHead back="/revisar" backLabel="Revisar lugares" title="Unidades e duplicadas" sub="Junte lugares repetidos e confira redes com várias unidades." />
      <FlowGrid aside={<div className="card col"><Link className="btn blk" to="/revisar">Concluir</Link></div>}>
        <section className="blk"><span className="eb">Possível duplicata</span>
          {dups.map((g) => (
            <div key={g.map((p) => p.id).join('-')} className="card col"><p className="sm" style={{ margin: 0 }}>Estes lugares estão no mesmo endereço{g.some((p, i) => g.some((q, j) => i !== j && p.name !== q.name)) ? ', com grafias diferentes do nome' : ''}:</p>
              {g.map((p, i) => <div key={p.id} className="row"><Icon n="pin" s={18} c="#d93a1c" /><span className="sm sp"><b>{p.name}</b>{i > 0 && g[0].name !== p.name ? ' (outra grafia)' : ''} · {p.address}</span></div>)}
              <div className="row"><button className="btn sm" onClick={() => merge(g[0].id, g[1].id)}>Mesclar em um lugar</button><button className="btn sm sec" onClick={() => separate(g)}>Manter separados</button></div></div>))}
          {!dups.length && <p className="sm mut" style={{ margin: 0 }}>Nenhuma duplicata encontrada.</p>}</section>
        <section className="blk sec"><span className="eb">Rede com várias unidades</span>
          {chains.map((g) => (
            <div key={normName(g[0].name)} className="card col"><b>{g[0].name}</b>
              {g.map((p) => <div key={p.id} className="row"><Icon n="pin" s={18} c="#2d7ff9" /><span className="sm sp">{p.address || 'Sem endereço'}{p.neighborhood ? ` · ${p.neighborhood}` : ''}</span><span className={'tag' + (hasCoords(p) ? ' ok' : ' wn')}>{hasCoords(p) ? 'Mapa' : 'Sem coord.'}</span></div>)}
              <Note>Cada unidade vira um pin. O post pode indicar uma ou todas.</Note></div>))}
          {!chains.length && <p className="sm mut" style={{ margin: 0 }}>Nenhuma rede com várias unidades.</p>}</section>
      </FlowGrid>
    </FlowShell>
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
    <FlowShell>
      <FlowHead back="/revisar" backLabel="Revisar lugares" title="Revisão final" sub="Confira antes de colocar o mapa no ar." />
      <FlowGrid aside={<div className="card col">
        <div className="row" style={{ gap: 10 }}><Switch on={ok} onChange={setOk} label="Li e aprovo a prévia" /><span className="sm">Li e aprovo a prévia deste mapa</span></div>
        <button className="btn blk" disabled={!ok || !confirmed.length} onClick={go}>Publicar mapa</button>
        {err && <p className="err" role="alert">{err}</p>}
        <span className="xs mut c">Você pode pausar ou retirar quando quiser.</span></div>}>
        <div className="card col">
          <Row ok={confirmed.length > 0}>{confirmed.length ? `${confirmed.length} lugares revisados` : 'Nenhum lugar confirmado ainda'}</Row>
          {pending > 0 && <Row ok={false}>{pending} lugares ainda para revisar (não aparecerão no mapa)</Row>}
          <Row ok={styled}>{styled ? 'Visual personalizado' : 'Visual padrão (personalize no Estúdio, se quiser)'}</Row>
          <Row ok>Endereço: {location.host}/@{c.slug}</Row>
          {noCoords > 0 && <Row ok={false}>{noCoords} lugares ainda sem coordenadas (não aparecerão no mapa)</Row>}
        </div>
      </FlowGrid>
    </FlowShell>
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
  const onMap = places.filter((p) => p.status === 'confirmed' && hasCoords(p))
  return (
    <FlowShell>
      <FlowHead title={c.published ? 'Seu mapa está publicado' : 'Seu mapa não está publicado'} right={<span className={'tag ' + (c.published ? 'ok' : 'wn')}>{c.published ? 'No ar' : 'Fora do ar'}</span>} />
      <FlowGrid aside={<>
        <div className="card col"><b>Compartilhe</b>
          <div className="card soft row" style={{ padding: 14 }}><Icon n="link" s={18} /><b className="sm sp trunc">{location.host}/@{c.slug}</b><button className="tag ax" style={{ border: 0, cursor: 'pointer' }} onClick={copy}>Copiar</button></div>
          <div className="row"><button className="btn ln sp" onClick={() => setShowQr(true)}><Icon n="qr" s={16} />QR code</button><button className="btn ln sp" onClick={share}><Icon n="share" s={16} />Compartilhar</button></div></div>
        <Note>Próximo passo: troque o link da sua bio. Isso só você consegue fazer no app da rede social.</Note>
        <div className="card col"><Link className="btn blk" to="/painel">Ir para o painel</Link>{c.published && <a className="btn ln blk" href={url} target="_blank" rel="noopener noreferrer">Abrir o mapa</a>}</div>
      </>}>
        <div className="card" style={{ padding: 0, overflow: 'hidden', height: 420 }}>{onMap.length ? <MapCanvas places={onMap} theme={c.theme} symbols={c.symbols} interactive={false} style={{ height: 420 }} /> : <FakeMap h={420} tone="mint" pal="candy" shape="circle" n={12} lab={false} />}</div>
      </FlowGrid>
      {showQr && <div className="sheetwrap" onClick={() => setShowQr(false)}><div className="sheet" onClick={(e) => e.stopPropagation()} style={{ alignItems: 'center' }}><div className="row jb" style={{ width: '100%' }}><h2 className="d s26">QR code</h2><button aria-label="Fechar" style={{ background: 'none', border: 0 }} onClick={() => setShowQr(false)}><Icon n="close" s={22} /></button></div>{qr && <img src={qr} alt="QR code do mapa" width="200" height="200" />}<span className="xs mut c">Aponte a câmera para abrir o mapa.</span></div></div>}
    </FlowShell>
  )
}

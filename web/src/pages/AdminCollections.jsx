// Administração · Coletas: cada Reel trazido de um criador e o que foi (ou não) encontrado nele.
import React, { useEffect, useMemo, useState } from 'react'
import { AdminPage, Note, PageHead, useTitle } from '../lib/ui.jsx'
import { Icon } from '../lib/icons.jsx'
import { Link, toast } from '../lib/router.jsx'
import { VaultGate } from '../lib/VaultGate.jsx'
import { open } from '../lib/vault.js'
import { withBase } from '../lib/base.js'
import { embedOf } from '../pub/embed.js'
import { instagramHandle } from '../lib/placeEdits.js'
import { fmtDate, initial } from '../theme.jsx'

const MARKS = 'joymap:coletas-marcas', EDITS = 'joymap:base-alteracoes'
const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) || {} } catch { return {} } }
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true } catch { toast('Este navegador não deixou guardar.'); return false } }
const fold = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
// só link do Instagram vira link clicável: o dado vem de fora
const safeUrl = (u) => (/^https:\/\/(www\.)?instagram\.com\//.test(u) ? u : null)

const VIEWS = [['todos', 'Todos'], ['nada', 'Nada encontrado'], ['achou', 'Com lugar'], ['semlegenda', 'Sem legenda'], ['resolvidos', 'Resolvidos']]
const IN_VIEW = {
  todos: () => true,
  nada: (p, m) => !p.lugares.length && !m,
  achou: (p) => p.lugares.length > 0,
  semlegenda: (p) => !p.caption.trim(),
  resolvidos: (p, m) => !!m,
}

export function AdminCollections() {
  useTitle('Coletas')
  return (
    <AdminPage active="coletas">
      <VaultGate file="/base/coletas.enc.json" title="Coletas" sub="As postagens coletadas são protegidas pela senha da equipe.">{(data, lock, password) => <Home data={data} lock={lock} password={password} />}</VaultGate>
    </AdminPage>
  )
}

// miniaturas vêm em blocos cifrados, abertos só quando aparecem na tela
const blocks = new Map()
function thumbs(handle, i, password) {
  const key = `${handle}~${i}`
  if (!blocks.has(key)) blocks.set(key, fetch(withBase(`/base/thumbs/${key}.enc.json`), { cache: 'no-store' }).then((r) => r.json()).then((box) => open(box, password)).catch(() => { blocks.delete(key); return {} }))
  return blocks.get(key)
}
const codeOf = (url) => String(url).match(/\/(?:reel|p)\/([\w-]+)/)?.[1] || ''

function Thumb({ post, handle, password, onPlay }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let on = true
    setSrc('')
    if (post.mini != null && password) thumbs(handle, post.mini, password).then((t) => on && setSrc(t[codeOf(post.url)] ? `data:image/jpeg;base64,${t[codeOf(post.url)]}` : ''))
    return () => { on = false }
  }, [post.url])
  const video = post.tipo === 'Reel'
  return (
    <button type="button" className="cl-thumb" onClick={onPlay} disabled={!embedOf(post.url)} aria-label={video ? 'Assistir ao Reel aqui' : 'Ver a postagem aqui'}>
      {src ? <img src={src} alt="" /> : <span className="xs mut">sem miniatura</span>}
      <i aria-hidden="true">{video ? '▶' : '⤢'}</i>
      <em>{post.tipo || 'Reel'}</em>
    </button>
  )
}

// Player oficial do Instagram, dentro da página
function Player({ post, onClose }) {
  const e = embedOf(post.url)
  useEffect(() => { const k = (ev) => ev.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [])
  if (!e) return null
  return (
    <div className="postv" role="dialog" aria-modal="true" aria-label="Postagem" onClick={(ev) => ev.target === ev.currentTarget && onClose()}>
      <div className="postv-box">
        <div className="postv-top"><b>{post.tipo || 'Reel'} · {fmtDate(post.data)}</b><button type="button" onClick={onClose} aria-label="Fechar" autoFocus><Icon n="close" s={18} c="currentColor" /></button></div>
        <iframe src={e.src} title="Postagem no Instagram" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
        <a className="postv-out" href={post.url} target="_blank" rel="noopener noreferrer">Abrir no Instagram ↗</a>
      </div>
    </div>
  )
}

function Avatar({ c }) {
  return c.foto ? <img className="cl-av" src={withBase(c.foto)} alt="" /> : <span className="cl-av">{initial(c.nome || c.usuario)}</span>
}

function Home({ data, lock, password }) {
  const [who, setWho] = useState(null)
  const marks = read(MARKS)
  if (who && data[who]) return <Collections c={data[who]} lock={lock} password={password} back={() => setWho(null)} />
  const list = Object.entries(data)
  return (
    <>
      <PageHead title="Coletas" sub={`${list.length} ${list.length === 1 ? 'criador coletado' : 'criadores coletados'}`} right={<button className="btn sec sm" onClick={lock}><Icon n="lock" s={14} c="currentColor" />Fechar</button>} />
      <div className="cl-creators">
        {list.map(([k, c]) => (
          <button key={k} type="button" className="card col click cl-creator" onClick={() => setWho(k)}>
            <div className="row" style={{ gap: 14 }}><Avatar c={c} /><div className="sp"><b>{c.nome || c.usuario}</b><div className="sm mut">@{c.usuario}</div></div><span className="tag ax">{c.plano || 'Grátis'}</span></div>
            <span className="xs mut">{c.posts.length} postagens · {c.posts.filter((p) => p.lugares.length).length} com lugar · {c.posts.filter((p) => IN_VIEW.nada(p, marks[p.url])).length} para conferir</span>
            {c.coletadoEm && <span className="xs mut">Coletado em {fmtDate(c.coletadoEm)}</span>}
          </button>))}
      </div>
    </>
  )
}

function Collections({ c, lock, password, back }) {
  const [kind, setKind] = useState('')
  const [playing, setPlaying] = useState(null)
  const [view, setView] = useState('nada')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(30)
  const [marks, setMarks] = useState(() => read(MARKS))
  const counts = useMemo(() => Object.fromEntries(VIEWS.map(([k]) => [k, c.posts.filter((p) => IN_VIEW[k](p, marks[p.url])).length])), [c, marks])
  const shown = useMemo(() => c.posts.filter((p) => IN_VIEW[view](p, marks[p.url]) && (!kind || p.tipo === kind)).filter((p) => !q || fold(`${p.caption} ${p.lugares.map((l) => l.nome).join(' ')}`).includes(fold(q))), [c, view, q, marks, kind])
  useEffect(() => setLimit(30), [view, q, kind])

  const mark = (url, value) => { const next = { ...marks }; if (value) next[url] = value; else delete next[url]; setMarks(next); write(MARKS, next) }
  // o lugar criado aqui entra na mesma lista de alterações da tela Lugares
  const addPlace = (post, f) => {
    const edits = read(EDITS)
    edits[`novo-${Date.now().toString(36)}`] = { ...f, cidade: f.cidade || 'São Paulo', lat: '', lon: '', situacao: '', fontes: `coleta @${c.usuario}: ${post.url}` }
    if (!write(EDITS, edits)) return false
    mark(post.url, { tipo: 'adicionado', nome: f.nome })
    toast('Lugar enviado para a tela Lugares')
    return true
  }

  return (
    <>
      <button type="button" className="pb-back row sm mut" onClick={back}><Icon n="back" s={18} />Todos os criadores</button>
      <div className="row" style={{ gap: 14 }}><Avatar c={c} /><span className="tag ax">{c.plano || 'Grátis'}</span></div>
      <PageHead title={c.nome || c.usuario} sub={`@${c.usuario} · ${c.posts.length} postagens · ${c.posts.filter((p) => p.lugares.length).length} com lugar · ${counts.nada} para conferir${c.coletadoEm ? ` · coletado em ${fmtDate(c.coletadoEm)}` : ''}`}
        right={<div className="row wrap" style={{ gap: 8 }}>
          <select className="selbox" aria-label="Tipo de postagem" value={kind} onChange={(e) => setKind(e.target.value)}><option value="">Todos os tipos</option>{['Reel', 'Carrossel', 'Foto'].map((t) => <option key={t}>{t}</option>)}</select>
          <Link className="btn ln sm" to="/admin/lugares">Ver Lugares</Link>
          <button className="btn sec sm" onClick={lock}><Icon n="lock" s={14} c="currentColor" />Fechar</button>
        </div>} />
      <Note>As marcações ficam guardadas só neste navegador. Lugares que você adicionar aparecem na tela Lugares, para exportar junto com as outras alterações.</Note>
      <div className="row wrap" role="group" aria-label="Filtrar as postagens" style={{ gap: 8 }}>
        {VIEWS.map(([k, l]) => <button key={k} type="button" className={'chip' + (view === k ? ' on' : '')} aria-pressed={view === k} onClick={() => setView(k)}>{l} · {counts[k]}</button>)}
      </div>
      <div className="in cl-search"><Icon n="search" s={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar na legenda ou no lugar" aria-label="Buscar na legenda ou no lugar" /></div>
      <div className="col" style={{ gap: 12 }}>
        {shown.slice(0, limit).map((p) => <Post key={p.url} post={p} marked={marks[p.url]} mark={mark} addPlace={addPlace} thumb={<Thumb post={p} handle={c.usuario.toLowerCase()} password={password} onPlay={() => setPlaying(p)} />} owner={c.usuario} />)}
        {shown.length > limit && <button className="btn ln sm" style={{ alignSelf: 'center' }} onClick={() => setLimit(limit + 50)}>Mostrar mais ({shown.length - limit})</button>}
        {!shown.length && <p className="sm mut">Nada neste filtro.</p>}
      </div>
      {playing && <Player post={playing} onClose={() => setPlaying(null)} />}
    </>
  )
}

function Post({ post: p, marked, mark, addPlace, thumb, owner }) {
  const [full, setFull] = useState(false)
  const [adding, setAdding] = useState(false)
  const url = safeUrl(p.url)
  const long = p.caption.length > 220
  return (
    <article className="card cl-post">
      {thumb}
      <div className="col cl-body">
      <div className="row wrap" style={{ gap: 8 }}>
        <b className="sm">{p.data ? fmtDate(p.data) : 'Sem data'}</b>
        {p.data && p.dataEstimada && <span className="xs mut">(estimada pelo link)</span>}
        {p.autor && p.autor !== owner && <span className="xs mut">publicado por @{p.autor}</span>}
        {p.publi && <span className="tag wn">Publi</span>}
        <span className="sp" />
        {marked ? <span className="tag ok">{marked.tipo === 'adicionado' ? `Adicionado: ${marked.nome}` : 'Sem lugar'}</span>
          : p.lugares.length ? <span className="tag ok">{p.lugares.length} {p.lugares.length > 1 ? 'lugares' : 'lugar'}</span>
            : <span className="tag wn">{p.caption.trim() ? 'Nada encontrado' : 'Sem legenda'}</span>}
        {url && <a className="btn ln sm" href={url} target="_blank" rel="noopener noreferrer">Instagram ↗</a>}
      </div>
      <p className="sm cl-cap">{full || !long ? p.caption || 'Sem legenda.' : `${p.caption.slice(0, 220)}…`}</p>
      {long && <button type="button" className="link xs cl-more" onClick={() => setFull(!full)}>{full ? 'Ver menos' : 'Ver a legenda inteira'}</button>}
      {p.local && <span className="sm">Local marcado: <b>{p.local}</b></span>}
      {p.lugares.length > 0 && <ul className="cl-places">{p.lugares.map((l, i) => <li key={i}><b>{l.nome}</b><span className="xs mut">{[l.rua, l.bairro, l.publi && 'publi'].filter(Boolean).join(' · ')}</span>{l.naBase ? <span className="tag ok">Na base</span> : <span className="tag">Fora da base</span>}</li>)}</ul>}
      {(p.arrobas.length > 0 || p.coautores.length > 0 || p.patrocinadores.length > 0) && <div className="xs mut cl-meta">
        {p.arrobas.length > 0 && <span>Citados: {p.arrobas.map((a) => <a key={a} className="link" href={`https://instagram.com/${a.slice(1)}`} target="_blank" rel="noopener noreferrer">{a}</a>)}</span>}
        {p.coautores.length > 0 && <span>Coautores: {p.coautores.join(', ')}</span>}
        {p.patrocinadores.length > 0 && <span>Patrocinadores: {p.patrocinadores.join(', ')}</span>}
      </div>}
      {adding ? <AddPlace onCancel={() => setAdding(false)} onSave={(f) => { if (addPlace(p, f)) setAdding(false) }} />
        : <div className="row wrap" style={{ gap: 8 }}>
          <button type="button" className="btn sm" onClick={() => setAdding(true)}><Icon n="plus" s={14} c="currentColor" />Adicionar lugar</button>
          {marked ? <button type="button" className="btn sec sm" onClick={() => mark(p.url, null)}>Desfazer marcação</button>
            : !p.lugares.length && <button type="button" className="btn sec sm" onClick={() => mark(p.url, { tipo: 'sem-lugar' })}>Não tem lugar</button>}
        </div>}
      </div>
    </article>
  )
}

function AddPlace({ onSave, onCancel }) {
  const [f, setF] = useState({ nome: '', endereco: '', bairro: '', instagram: '' })
  const [msg, setMsg] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!f.nome.trim()) return setMsg('Informe o nome do lugar.')
    const insta = f.instagram.trim() ? instagramHandle(f.instagram) : ''
    if (f.instagram.trim() && !insta) return setMsg('Instagram inválido. Use @perfil ou o link do perfil.')
    onSave({ ...f, nome: f.nome.trim(), instagram: insta })
  }
  return (
    <form className="col cl-add" onSubmit={submit}>
      <div className="g2">{[['nome', 'Nome'], ['endereco', 'Endereço'], ['bairro', 'Bairro'], ['instagram', 'Instagram']].map(([k, l]) => <label key={k} className="col" style={{ gap: 4 }}><span className="lb">{l}</span><input className="in" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>)}</div>
      {msg && <Note>{msg}</Note>}
      <div className="row" style={{ gap: 8 }}><button className="btn sm">Salvar lugar</button><button type="button" className="btn sec sm" onClick={onCancel}>Cancelar</button></div>
    </form>
  )
}

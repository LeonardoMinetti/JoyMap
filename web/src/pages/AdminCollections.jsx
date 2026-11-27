// Administração · Coletas: cada Reel trazido de um criador e o que foi (ou não) encontrado nele.
import React, { useEffect, useMemo, useState } from 'react'
import { AdminPage, Note, PageHead, useTitle } from '../lib/ui.jsx'
import { Icon } from '../lib/icons.jsx'
import { Link, toast } from '../lib/router.jsx'
import { VaultGate } from '../lib/VaultGate.jsx'
import { open } from '../lib/vault.js'
import { withBase } from '../lib/base.js'
import { embedOf } from '../pub/embed.js'
import { safeLink } from '../lib/arrival.js'
import { DAYS, dayText, parseDay, httpsLink } from '../lib/placeInfo.js'
import { fileToLogo } from '../lib/logo.js'
import { publishToMap, savePlaceEdits, applyPlaceEdits, saveArrival, hasPoint, REPO } from '../lib/publish.js'
import { findInMap } from '../../../scripts/lib/fluxo.js'
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
  const [tab, setTab] = useState(c.lugares ? 'lugares' : 'posts')
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
      <div className="row" role="group" aria-label="O que mostrar" style={{ gap: 8 }}>
        {[['lugares', `Lugares${c.lugares ? ` · ${c.lugares.length}` : ''}`], ['posts', `Postagens · ${c.posts.length}`], ['textos', 'No mapa'], ['chegada', 'Chegada']].map(([k, l]) => <button key={k} type="button" className={'btn sm' + (tab === k ? '' : ' sec')} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      {tab === 'lugares' ? <Found c={c} /> : tab === 'textos' ? <Abouts handle={c.usuario.toLowerCase()} /> : tab === 'chegada' ? <ArrivalEditor handle={c.usuario.toLowerCase()} /> : <>
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
      </>}
      {playing && <Player post={playing} onClose={() => setPlaying(null)} />}
    </>
  )
}

const APPROVED = 'joymap:coletas-aprovados'
const STATUS = [['pronto', 'Prontos', 'ok'], ['revisar', 'Revisar', 'wn'], ['sem-endereco', 'Sem endereço', 'bd2'], ['no-mapa', 'Já no mapa', '']]

// resultado do fluxo (base, IBGE e busca): é aqui que se aprova o que vai para o mapa
function Found({ c }) {
  const [status, setStatus] = useState('pronto')
  const [q, setQ] = useState('')
  const [ok, setOk] = useState(() => read(APPROVED)[c.usuario] || {})
  const handle = c.usuario.toLowerCase()
  const [live, setLive] = useState(null) // mapa publicado agora: quem já está nele aparece como "Já no mapa"
  const [published, setPublished] = useState([])
  useEffect(() => { fetch(withBase(`/maps/${handle}.json`), { cache: 'no-store' }).then((r) => r.json()).then((m) => setLive(m.places)).catch(() => setLive(false)) }, [handle])
  const list = useMemo(() => (c.lugares || []).map((p) => (published.includes(p.chave) || (live && p.situacao !== 'no-mapa' && findInMap(p, live)) ? { ...p, situacao: 'no-mapa', motivo: 'já está no mapa' } : p)), [c, live, published])
  if (!list.length) return <Note>O fluxo de seleção ainda não rodou para este criador.</Note>
  const keep = (next) => { setOk(next); write(APPROVED, { ...read(APPROVED), [c.usuario]: next }) }
  const toggle = (p) => { const next = { ...ok }; if (next[p.chave]) delete next[p.chave]; else next[p.chave] = p.categoria; keep(next) }
  const shown = list.filter((p) => p.situacao === status).filter((p) => !q || fold(`${p.nome} ${p.endereco} ${p.bairro}`).includes(fold(q)))
  // só conta o que ainda pode entrar
  const pickable = Object.fromEntries(Object.entries(ok).filter(([k]) => list.some((p) => p.chave === k && p.situacao !== 'no-mapa' && hasPoint(p))))
  const chosen = Object.keys(pickable).length
  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ usuario: c.usuario.toLowerCase(), aprovados: Object.entries(pickable).map(([chave, categoria]) => ({ chave, categoria })) }, null, 1)], { type: 'application/json' }))
    a.download = `joymap-aprovados-${c.usuario}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }
  const ready = list.filter((p) => p.situacao === 'pronto')
  return (
    <>
      <Note>Marque o que vai para o mapa e publique. As marcações ficam só neste navegador.</Note>
      <div className="row wrap" role="group" aria-label="Situação" style={{ gap: 8 }}>
        {STATUS.map(([k, l]) => <button key={k} type="button" className={'chip' + (status === k ? ' on' : '')} aria-pressed={status === k} onClick={() => setStatus(k)}>{l} · {list.filter((p) => p.situacao === k).length}</button>)}
      </div>
      <div className="row wrap" style={{ gap: 8 }}>
        <div className="in cl-search sp"><Icon n="search" s={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lugar ou rua" aria-label="Buscar lugar ou rua" /></div>
        {status === 'pronto' && ready.length > 0 && <button type="button" className="btn ln sm" onClick={() => keep({ ...ok, ...Object.fromEntries(ready.map((p) => [p.chave, ok[p.chave] || p.categoria])) })}>Marcar todos os prontos</button>}
        <button type="button" className="btn ln sm" disabled={!chosen} onClick={download}>Exportar</button>
      </div>
      {live === false ? <Note>Este criador ainda não tem mapa publicado.</Note>
        : <Publish handle={handle} found={list} choices={pickable} onDone={(keys) => { setPublished((v) => [...v, ...keys]); keep(Object.fromEntries(Object.entries(ok).filter(([k]) => !keys.includes(k)))) }} />}
      <div className="col" style={{ gap: 12 }}>
        {shown.map((p) => (
          <div key={p.chave} className="card cl-found">
            <label className="cl-check"><input type="checkbox" checked={!!ok[p.chave]} disabled={!hasPoint(p) || p.situacao === 'no-mapa'} onChange={() => toggle(p)} aria-label={`Aprovar ${p.nome}`} /></label>
            <div className="col" style={{ gap: 4, minWidth: 0 }}>
              <div className="row wrap" style={{ gap: 8 }}><b>{p.nome}</b>{p.publi && <span className="tag wn">Publi</span>}{p.base && <span className="tag ok">Na base</span>}{!hasPoint(p) && p.situacao !== 'no-mapa' && <span className="tag bd2">Sem ponto</span>}</div>
              <span className="sm">{[p.endereco || 'Sem endereço', p.bairro, p.cidade !== 'São Paulo' && p.cidade].filter(Boolean).join(' · ')}</span>
              <span className="xs mut">{p.motivo}</span>
              <span className="xs mut cl-links">{p.posts.slice(0, 4).map((x) => (safeUrl(x.url) ? <a key={x.url} className="link" href={x.url} target="_blank" rel="noopener noreferrer">{fmtDate(x.data)} ↗</a> : null))}{p.arroba && <a className="link" href={`https://instagram.com/${p.arroba.slice(1)}`} target="_blank" rel="noopener noreferrer">{p.arroba}</a>}
                <a className="link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.nome} ${p.endereco} ${p.cidade}`)}`} target="_blank" rel="noopener noreferrer">Conferir no Google Maps ↗</a></span>
            </div>
            {ok[p.chave] && <select className="selbox cl-cat" aria-label={`Categoria de ${p.nome}`} value={ok[p.chave]} onChange={(e) => keep({ ...ok, [p.chave]: e.target.value })}>{c.categorias.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}</select>}
          </div>))}
        {!shown.length && <p className="sm mut">Nada neste filtro.</p>}
      </div>
    </>
  )
}

const TOKEN = 'joymap:github-chave'
const getToken = () => { try { return sessionStorage.getItem(TOKEN) || localStorage.getItem(TOKEN) || '' } catch { return '' } }
const setToken = (v, remember) => { try { sessionStorage.removeItem(TOKEN); localStorage.removeItem(TOKEN); if (v) (remember ? localStorage : sessionStorage).setItem(TOKEN, v) } catch { /* vale só nesta tela */ } }

function Publish({ handle, found, choices, onDone }) {
  const [token, setTok] = useState(getToken)
  const [typed, setTyped] = useState('')
  const [remember, setRemember] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const n = Object.keys(choices).length
  const connect = (e) => { e.preventDefault(); const v = typed.trim(); if (!v) return; setToken(v, remember); setTok(v); setTyped(''); setMsg('') }
  const disconnect = () => { setToken(''); setTok(''); setConfirm(false) }
  const go = async () => {
    setBusy(true); setMsg('')
    try {
      const r = await publishToMap({ token, handle, found, choices })
      onDone(Object.keys(choices))
      setMsg(r.added.length ? `${r.added.length} ${r.added.length > 1 ? 'lugares enviados' : 'lugar enviado'}. O mapa ficará com ${r.total} e se atualiza em alguns minutos.` : 'Todos já estavam no mapa.')
    } catch (e) { setMsg(e.message || 'Não foi possível publicar.') }
    setBusy(false); setConfirm(false)
  }
  return (
    <div className="card col cl-publish">
      {!token ? (
        <form className="col" onSubmit={connect}>
          <b>Publicar direto daqui</b>
          <span className="sm mut">Cole uma chave de acesso do GitHub restrita ao repositório {REPO}, com a permissão “Contents: Read and write” e validade curta. Ela permite alterar o site: use só no seu computador.</span>
          <a className="link sm" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer">Criar a chave no GitHub ↗</a>
          <label className="col" style={{ gap: 4 }}><span className="lb">Chave de acesso</span><input className="in" type="password" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} /></label>
          <label className="row sm" style={{ gap: 8 }}><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />Lembrar neste computador</label>
          <button className="btn sm" style={{ alignSelf: 'flex-start' }} disabled={!typed.trim()}>Conectar</button>
        </form>
      ) : (
        <div className="row wrap" style={{ gap: 8 }}>
          {confirm
            ? <><span className="sm sp">Publicar {n} {n > 1 ? 'lugares' : 'lugar'} no mapa de @{handle}? Fica visível para qualquer pessoa.</span><button type="button" className="btn sm" disabled={busy} onClick={go}>{busy ? 'Publicando…' : 'Confirmar'}</button><button type="button" className="btn sec sm" disabled={busy} onClick={() => setConfirm(false)}>Cancelar</button></>
            : <><span className="sm sp">{n ? `${n} marcado${n > 1 ? 's' : ''} para o mapa de @${handle}` : 'Marque os lugares que vão para o mapa.'}</span><button type="button" className="btn sm" disabled={!n} onClick={() => setConfirm(true)}>Publicar no mapa ({n})</button><button type="button" className="btn sec sm" onClick={disconnect}>Desconectar</button></>}
        </div>
      )}
      {msg && <Note>{msg}</Note>}
    </div>
  )
}

// lugares já publicados: descrição (sai em nome do criador) e categorias, para revisar o que a IA fez
function Abouts({ handle }) {
  const [map, setMap] = useState(null)
  const [edits, setEdits] = useState({})
  const [q, setQ] = useState('')
  const [only, setOnly] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [limit, setLimit] = useState(30)
  useEffect(() => { fetch(withBase(`/maps/${handle}.json`), { cache: 'no-store' }).then((r) => r.json()).then(setMap).catch(() => setMap(false)) }, [handle])
  useEffect(() => setLimit(30), [q, only])
  if (map === null) return <p className="sm mut">Carregando…</p>
  if (!map) return <Note>Este criador ainda não tem mapa publicado.</Note>
  const cats = [...map.creator.theme.categories].sort((a, b) => a.name.localeCompare(b.name))
  const name = (id) => cats.find((c) => c.id === id)?.name || id
  const now = (p) => ({ about: p.about || '', category: p.category, tags: p.tags || [], ...edits[p.id] })
  const set = (p, patch) => setEdits({ ...edits, [p.id]: { ...edits[p.id], ...patch } })
  const changed = applyPlaceEdits(map, edits).count
  const used = cats.filter((c) => map.places.some((p) => p.category === c.id || p.tags?.includes(c.id)))
  const shown = map.places.filter((p) => (!only || p.category === only || p.tags?.includes(only)) && (!q || fold(`${p.name} ${p.about}`).includes(fold(q))))
  const save = async () => {
    const token = getToken()
    if (!token) return setMsg('Conecte a chave do GitHub na aba Lugares para salvar.')
    setBusy(true); setMsg('')
    try {
      const r = await savePlaceEdits({ token, handle, edits })
      setMap(r.map)
      setEdits({})
      setMsg(`${r.count} lugares enviados. O mapa se atualiza em alguns minutos.`)
    } catch (e) { setMsg(e.message) }
    setBusy(false)
  }
  return (
    <>
      <Note>Descrições e categorias foram sugeridas pela IA. Revise antes de divulgar.</Note>
      <div className="row wrap" style={{ gap: 8 }}>
        <div className="in cl-search sp"><Icon n="search" s={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lugar" aria-label="Buscar lugar" /></div>
        <select className="selbox" aria-label="Filtrar por categoria" value={only} onChange={(e) => setOnly(e.target.value)}><option value="">Todas as categorias</option>{used.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <button type="button" className="btn sm" disabled={!changed || busy} onClick={save}>{busy ? 'Salvando…' : `Salvar no mapa (${changed})`}</button>
      </div>
      {msg && <Note>{msg}</Note>}
      <div className="col" style={{ gap: 12 }}>
        {shown.slice(0, limit).map((p) => {
          const v = now(p)
          return (
            <div key={p.id} className="card col" style={{ gap: 10 }}>
              <div className="row wrap" style={{ gap: 8 }}><b className="sm sp">{p.name}</b><span className={'tag ' + (p.aboutSource === 'basico' ? 'wn' : p.aboutSource === 'editado' ? 'ok' : '')}>{p.aboutSource === 'basico' ? 'Descrição básica' : p.aboutSource === 'editado' ? 'Editada' : 'Pelas legendas'}</span></div>
              <textarea className="in" rows={2} maxLength={300} aria-label={`Descrição de ${p.name}`} value={v.about} onChange={(e) => set(p, { about: e.target.value })} />
              <div className="row wrap" style={{ gap: 8 }}>
                <label className="col" style={{ gap: 4 }}><span className="lb">Categoria principal</span><select className="selbox" value={v.category} onChange={(e) => set(p, { category: e.target.value, tags: v.tags.filter((t) => t !== e.target.value) })}>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label className="col" style={{ gap: 4 }}><span className="lb">Extras (até 2)</span><select className="selbox" value="" disabled={v.tags.length >= 2} onChange={(e) => e.target.value && set(p, { tags: [...v.tags, e.target.value] })}><option value="">Adicionar…</option>{cats.filter((c) => c.id !== v.category && !v.tags.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <div className="row wrap" style={{ gap: 6, alignSelf: 'flex-end' }}>{v.tags.map((t) => <button key={t} type="button" className="chip on" aria-label={`Tirar ${name(t)}`} onClick={() => set(p, { tags: v.tags.filter((x) => x !== t) })}>{name(t)} ×</button>)}</div>
              </div>
              <InfoFields place={p} edit={edits[p.id] || {}} set={(patch) => set(p, patch)} />
            </div>)
        })}
        {shown.length > limit && <button type="button" className="btn ln sm" style={{ alignSelf: 'center' }} onClick={() => setLimit(limit + 60)}>Mostrar mais ({shown.length - limit})</button>}
        {!shown.length && <p className="sm mut">Nada encontrado.</p>}
      </div>
    </>
  )
}

// nota do Google (digitada à mão, com a data em que foi vista), contato e horário
function InfoFields({ place: p, edit, set }) {
  const val = (k) => edit[k] ?? p[k] ?? ''
  const days = edit.days ?? DAYS.map((_, i) => dayText(p.hours?.[i]))
  const input = (k, label, extra) => <label className="col" style={{ gap: 4 }}><span className="lb">{label}</span><input className="in" value={val(k)} onChange={(e) => set({ [k]: e.target.value })} {...extra} /></label>
  const bad = days.some((d) => parseDay(d) === undefined)
  const today = new Date().toLocaleDateString('sv-SE')
  return (
    <details className="cl-info">
      <summary>Nota do Google, contato e horário</summary>
      <div className="col" style={{ gap: 10, marginTop: 10 }}>
        <div className="g3">
          {input('rating', 'Nota (0 a 5)', { inputMode: 'decimal', placeholder: '4,5', onChange: (e) => set({ rating: e.target.value, ratingDate: edit.ratingDate || today }) })}
          {input('reviews', 'Nº de avaliações', { inputMode: 'numeric' })}
          {input('ratingDate', 'Vista em', { type: 'date' })}
        </div>
        <div className="g3">{input('phone', 'Telefone', { placeholder: '(11) 90000-0000' })}{input('website', 'Site', { placeholder: 'https://' })}{input('instagramUrl', 'Instagram do lugar', { placeholder: 'https://instagram.com/…' })}</div>
        <div className="g2">{DAYS.map((d, i) => <label key={d} className="col" style={{ gap: 4 }}><span className="lb">{d}</span><input className="in" value={days[i]} placeholder="09:00-18:00 ou vazio" onChange={(e) => set({ days: days.map((x, j) => (j === i ? e.target.value : x)) })} /></label>)}</div>
        {bad && <Note>Não entendi um dos horários. Use o formato 09:00-18:00.</Note>}
        {[val('website'), val('instagramUrl')].some((u) => u && !httpsLink(u)) && <Note>Os links precisam começar com https://</Note>}
        <span className="xs mut">A nota só aparece quando tem a data.</span>
      </div>
    </details>
  )
}

// o que o criador informa para a tela de chegada; blocos vazios não aparecem no mapa
function ArrivalEditor({ handle }) {
  const [brands, setBrands] = useState(null)
  const [event, setEvent] = useState({ title: '', date: '', place: '', url: '' })
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { fetch(withBase(`/maps/${handle}.json`), { cache: 'no-store' }).then((r) => r.json()).then((m) => { setBrands(m.creator.brands || []); if (m.creator.event) setEvent({ title: '', date: '', place: '', url: '', ...m.creator.event }) }).catch(() => setBrands([])) }, [handle])
  if (!brands) return <p className="sm mut">Carregando…</p>
  const setBrand = (i, patch) => setBrands(brands.map((b, j) => (j === i ? { ...b, ...patch } : b)))
  const pickLogo = async (i, file) => { if (!file) return; try { setBrand(i, { logo: await fileToLogo(file) }) } catch { setMsg('Não consegui ler essa imagem. Use PNG, JPG ou WebP.') } }
  const save = async () => {
    const token = getToken()
    if (!token) return setMsg('Conecte a chave do GitHub na aba Lugares para salvar.')
    const list = brands.filter((b) => b.name?.trim())
    if (list.some((b) => b.url && !safeLink(b.url)) || (event.url && !safeLink(event.url))) return setMsg('Os links precisam começar com https://')
    if (event.title && !event.date) return setMsg('Informe a data do evento.')
    setBusy(true); setMsg('')
    try {
      await saveArrival({ token, handle, brands: list, event: event.title ? event : null })
      setBrands(list)
      setMsg('Salvo. O mapa se atualiza em alguns minutos.')
    } catch (e) { setMsg(e.message) }
    setBusy(false)
  }
  const field = (label, value, onChange, extra) => <label className="col" style={{ gap: 4 }}><span className="lb">{label}</span><input className="in" value={value || ''} onChange={(e) => onChange(e.target.value)} {...extra} /></label>
  return (
    <>
      <Note>Só inclua marcas com quem o criador trabalhou de fato e que autorizem o uso do logo. O que ficar vazio não aparece.</Note>
      <div className="card col">
        <b>Marcas parceiras</b>
        {brands.map((b, i) => (
          <div key={i} className="col cl-brand">
            <div className="g2">{field('Nome', b.name, (v) => setBrand(i, { name: v }), { maxLength: 40 })}{field('Link (opcional)', b.url, (v) => setBrand(i, { url: v }), { placeholder: 'https://' })}</div>
            <div className="row wrap" style={{ gap: 10 }}>
              {b.logo && <img src={b.logo} alt="" className="cl-logo" />}
              <label className="btn ln sm">{b.logo ? 'Trocar logo' : 'Enviar logo'}<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => pickLogo(i, e.target.files[0])} /></label>
              <button type="button" className="btn sec sm" onClick={() => setBrands(brands.filter((_, j) => j !== i))}>Remover</button>
            </div>
          </div>))}
        {brands.length < 12 && <button type="button" className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setBrands([...brands, { name: '', url: '', logo: '' }])}><Icon n="plus" s={14} c="currentColor" />Adicionar marca</button>}
      </div>
      <div className="card col">
        <b>Próximo evento</b>
        <div className="g2">{field('Nome do evento', event.title, (v) => setEvent({ ...event, title: v }), { maxLength: 80 })}{field('Data', event.date, (v) => setEvent({ ...event, date: v }), { type: 'date' })}{field('Local', event.place, (v) => setEvent({ ...event, place: v }), { maxLength: 80 })}{field('Link (opcional)', event.url, (v) => setEvent({ ...event, url: v }), { placeholder: 'https://' })}</div>
        <span className="xs mut">Depois da data, o evento some sozinho.</span>
      </div>
      {msg && <Note>{msg}</Note>}
      <button type="button" className="btn" style={{ alignSelf: 'flex-start' }} disabled={busy} onClick={save}>{busy ? 'Salvando…' : 'Salvar no mapa'}</button>
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

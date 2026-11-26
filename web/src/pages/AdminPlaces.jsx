// Administração · Lugares: curadoria da base própria. O arquivo publicado é cifrado e só abre com a senha da equipe.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { AdminPage, Note, PageHead, useTitle } from '../lib/ui.jsx'
import { Icon } from '../lib/icons.jsx'
import { toast } from '../lib/router.jsx'
import { withBase } from '../lib/base.js'
import MapCanvas from '../MapCanvas.jsx'
import { addBasemap } from '../basemap.js'
import { VaultGate } from '../lib/VaultGate.jsx'
import { merge, pending, instagramHandle, toCsv } from '../lib/placeEdits.js'

const EDITS = 'joymap:base-alteracoes'
const read = (store, k) => { try { return window[store].getItem(k) } catch { return null } }
const write = (store, k, v) => { try { v == null ? window[store].removeItem(k) : window[store].setItem(k, v); return true } catch { return false } }
const readEdits = () => { try { return JSON.parse(read('localStorage', EDITS)) || {} } catch { return {} } }

const THEME = {
  accent: '#171717', tone: 'light', shape: 'circle', pinSize: 45, pinBorder: true, cluster: true, selected: 'outline', mapLabels: true, labelDensity: 40, start: 'pick', startView: { lat: -23.57, lon: -46.66, zoom: 11 },
  categories: [{ id: 'ok', name: 'Conferido', color: '#067647', icon: 'rest' }, { id: 'wait', name: 'A conferir', color: '#b54708', icon: 'rest' }, { id: 'base', name: 'Sem pendência', color: '#171713', icon: 'rest' }],
}
const VIEWS = [['todos', 'Todos'], ['pendentes', 'A revisar'], ['semponto', 'Sem ponto'], ['seminsta', 'Sem Instagram'], ['conferidos', 'Conferidos'], ['excluidos', 'Excluídos']]
const IN_VIEW = {
  todos: (p) => p.situacao !== 'excluido',
  pendentes: (p) => p.situacao !== 'excluido' && pending(p).length > 0,
  semponto: (p) => p.situacao !== 'excluido' && (p.lat === '' || p.lat == null),
  seminsta: (p) => p.situacao !== 'excluido' && !p.instagram,
  conferidos: (p) => p.situacao === 'conferido',
  excluidos: (p) => p.situacao === 'excluido',
}
const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function download(name, text, type) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function AdminPlaces() {
  useTitle('Lugares')
  return (
    <AdminPage active="lugares">
      <VaultGate file="/base/lugares.enc.json" title="Lugares" sub="A base própria do JoyMap é protegida por senha da equipe.">{(data, lock) => <Curation base={data} lock={lock} />}</VaultGate>
    </AdminPage>
  )
}

function Curation({ base, lock }) {
  const [edits, setEdits] = useState(readEdits)
  const [view, setView] = useState('todos')
  const [q, setQ] = useState('')
  const [hood, setHood] = useState('')
  const [sel, setSel] = useState(null)
  const [limit, setLimit] = useState(60)

  const all = useMemo(() => merge(base, edits), [base, edits])
  const counts = useMemo(() => Object.fromEntries(VIEWS.map(([k]) => [k, all.filter(IN_VIEW[k]).length])), [all])
  const hoods = useMemo(() => [...new Set(all.flatMap((p) => String(p.bairro || '').split(',').map((s) => s.trim()).filter(Boolean)))].sort((a, b) => a.localeCompare(b)), [all])
  const shown = useMemo(() => {
    const t = fold(q)
    return all.filter(IN_VIEW[view])
      .filter((p) => !hood || String(p.bairro || '').split(',').some((s) => s.trim() === hood))
      .filter((p) => !t || fold(`${p.nome} ${p.endereco} ${p.bairro} ${p.instagram}`).includes(t))
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome)))
  }, [all, view, q, hood])
  useEffect(() => setLimit(60), [view, q, hood])
  const mapped = useMemo(() => shown.filter((p) => p.lat !== '' && p.lat != null).map((p) => ({ id: p.id, name: p.nome, lat: Number(p.lat), lon: Number(p.lon), category: p.situacao === 'conferido' ? 'ok' : pending(p).length ? 'wait' : 'base' })), [shown])
  const current = sel === 'novo' ? { id: 'novo', nome: '', endereco: '', bairro: '', cidade: 'São Paulo', instagram: '', lat: '', lon: '' } : all.find((p) => p.id === sel)

  const save = (id, patch) => {
    const next = { ...edits, [id]: { ...edits[id], ...patch } }
    setEdits(next)
    if (!write('localStorage', EDITS, JSON.stringify(next))) toast('Este navegador não deixou guardar. Exporte antes de sair.')
  }
  const undo = (id) => { const next = { ...edits }; delete next[id]; setEdits(next); write('localStorage', EDITS, JSON.stringify(next)); if (!base.some((p) => p.id === id)) setSel(null) }
  const pick = (id) => { setSel(id); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const changed = Object.keys(edits).length

  return (
    <>
      <PageHead title="Lugares" sub={`${counts.todos} lugares na base · ${counts.pendentes} a revisar · ${counts.conferidos} conferidos`}
        right={<div className="row wrap" style={{ gap: 8 }}>
          <button className="btn sm" onClick={() => pick('novo')}><Icon n="plus" s={14} c="currentColor" />Novo lugar</button>
          <button className="btn ln sm" onClick={() => download('joymap-lugares.csv', toCsv(all.filter(IN_VIEW.todos)), 'text/csv;charset=utf-8')}>Exportar CSV</button>
          <button className="btn ln sm" disabled={!changed} onClick={() => download('joymap-alteracoes.json', JSON.stringify({ alteracoes: edits }, null, 1), 'application/json')}>Exportar alterações ({changed})</button>
          <button className="btn sec sm" onClick={lock}><Icon n="lock" s={14} c="currentColor" />Fechar base</button>
        </div>} />
      <Note>Suas alterações ficam guardadas só neste navegador. Exporte as alterações para não perdê-las e para aplicar à base.</Note>

      <div className="row wrap" role="group" aria-label="Filtrar a base" style={{ gap: 8 }}>
        {VIEWS.map(([k, l]) => <button key={k} type="button" className={'chip' + (view === k ? ' on' : '')} aria-pressed={view === k} onClick={() => setView(k)}>{l} · {counts[k]}</button>)}
      </div>

      <div className="bx-grid">
        <div className="col bx-list">
          <div className="in"><Icon n="search" s={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome, rua ou @" aria-label="Buscar nome, rua ou Instagram" /></div>
          <select className="selbox" aria-label="Bairro" value={hood} onChange={(e) => setHood(e.target.value)}><option value="">Todos os bairros</option>{hoods.map((h) => <option key={h}>{h}</option>)}</select>
          <span className="eb">{shown.length} {shown.length === 1 ? 'resultado' : 'resultados'}</span>
          {shown.slice(0, limit).map((p) => (
            <button key={p.id} type="button" className={'card col click bx-item' + (sel === p.id ? ' sel' : '')} onClick={() => pick(p.id)}>
              <div className="row"><b className="sp sm">{p.nome}</b>{p.situacao === 'conferido' ? <span className="tag ok">Conferido</span> : p.situacao === 'excluido' ? <span className="tag bd2">Excluído</span> : pending(p).length ? <span className="tag wn">Revisar</span> : null}</div>
              <span className="xs mut">{p.endereco || 'Sem endereço'}{p.bairro ? ` · ${p.bairro}` : ''}</span>
              {p.instagram && <span className="xs mut">{p.instagram}</span>}
            </button>))}
          {shown.length > limit && <button className="btn ln sm" onClick={() => setLimit(limit + 100)}>Mostrar mais</button>}
          {!shown.length && <p className="sm mut">Nada encontrado.</p>}
        </div>

        <div className="col bx-side">
          {current
            ? <Editor key={current.id} place={current} isNew={sel === 'novo'} edited={!!edits[current.id]} onClose={() => setSel(null)} onUndo={() => undo(current.id)}
                onSave={(patch) => { const id = sel === 'novo' ? `novo-${Date.now().toString(36)}` : current.id; save(id, patch); setSel(id); toast('Salvo neste navegador') }} />
            : <div className="card bx-map"><MapCanvas places={mapped} theme={THEME} selectedId={null} onSelect={pick} style={{ position: 'absolute', inset: 0, height: '100%' }} /></div>}
        </div>
      </div>
    </>
  )
}

function Editor({ place, isNew, edited, onSave, onUndo, onClose }) {
  const [f, setF] = useState({ nome: place.nome || '', endereco: place.endereco || '', bairro: place.bairro || '', cidade: place.cidade || 'São Paulo', instagram: place.instagram || '', lat: place.lat ?? '', lon: place.lon ?? '' })
  const [msg, setMsg] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = (situacao) => {
    if (!f.nome.trim()) return setMsg('Informe o nome do lugar.')
    const insta = f.instagram.trim() ? instagramHandle(f.instagram) : ''
    if (f.instagram.trim() && !insta) return setMsg('Instagram inválido. Use @perfil ou o link do perfil.')
    const moved = String(f.lat) !== String(place.lat ?? '') || String(f.lon) !== String(place.lon ?? '')
    const patch = { ...f, nome: f.nome.trim(), instagram: insta, situacao: situacao ?? place.situacao ?? '' }
    if (moved) patch.ponto = 'ajustado na curadoria'
    if (insta !== (place.instagram || '')) patch.instagram_origem = 'curadoria'
    setMsg(''); setF({ ...f, instagram: insta }); onSave(patch)
  }
  const notes = pending(place)
  const search = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${f.nome} ${f.endereco} ${f.cidade}`)}`
  const field = (k, label, extra) => <div><label className="lb" htmlFor={`bx-${k}`}>{label}</label><input id={`bx-${k}`} className="in" value={f[k]} onChange={set(k)} {...extra} /></div>
  return (
    <form className="card col" onSubmit={(e) => { e.preventDefault(); submit() }}>
      <div className="row"><b className="sp">{isNew ? 'Novo lugar' : place.nome}</b><button type="button" className="btn sec sm" onClick={onClose}><Icon n="back" s={14} c="currentColor" />Mapa</button></div>
      {!isNew && notes.length > 0 && <div className="row wrap" style={{ gap: 6 }}>{notes.map((n) => <span key={n} className="tag wn">{n}</span>)}</div>}
      {field('nome', 'Nome')}
      {field('endereco', 'Endereço')}
      <div className="g2">{field('bairro', 'Bairro')}{field('cidade', 'Cidade')}</div>
      {field('instagram', 'Instagram', { placeholder: '@perfil' })}
      <div className="row wrap" style={{ gap: 12 }}>
        {f.instagram && instagramHandle(f.instagram) && <a className="xs link" href={`https://instagram.com/${instagramHandle(f.instagram).slice(1)}`} target="_blank" rel="noopener noreferrer">Abrir o perfil ↗</a>}
        <a className="xs link" href={search} target="_blank" rel="noopener noreferrer">Conferir no Google Maps ↗</a>
      </div>
      <div>
        <span className="lb">Ponto no mapa {place.ponto ? <span className="mut">({place.ponto})</span> : null}</span>
        <PointPicker lat={f.lat} lon={f.lon} onMove={(lat, lon) => setF((v) => ({ ...v, lat, lon }))} />
        <span className="xs mut">Clique no mapa ou arraste o pino para corrigir.</span>
      </div>
      {(place.horario_quarta || place.pagamento || place.fontes) && <span className="xs mut">{[place.horario_quarta && `Quarta: ${place.horario_quarta}`, place.pagamento, place.fontes && `Origem: ${place.fontes}`].filter(Boolean).join(' · ')}</span>}
      {msg && <Note>{msg}</Note>}
      <div className="row wrap" style={{ gap: 8 }}>
        <button type="button" className="btn" onClick={() => submit('conferido')}><Icon n="check" s={14} c="currentColor" />Salvar e conferir</button>
        <button className="btn ln">Salvar</button>
        {!isNew && (place.situacao === 'excluido'
          ? <button type="button" className="btn sec" onClick={() => onSave({ situacao: '' })}>Restaurar</button>
          : <button type="button" className="btn sec" onClick={() => onSave({ situacao: 'excluido' })}>Excluir</button>)}
        {edited && <button type="button" className="btn sec" onClick={onUndo}>Desfazer alterações</button>}
      </div>
    </form>
  )
}

function PointPicker({ lat, lon, onMove }) {
  const el = useRef(null), map = useRef(null), marker = useRef(null), move = useRef(onMove)
  move.current = onMove
  const has = lat !== '' && lat != null && !Number.isNaN(Number(lat))
  const set = (ll) => move.current(Number(ll.lat.toFixed(6)), Number(ll.lng.toFixed(6)))
  useEffect(() => {
    const m = L.map(el.current, { zoomControl: true, maxZoom: 18, scrollWheelZoom: false }).setView(has ? [Number(lat), Number(lon)] : [-23.56, -46.65], has ? 16 : 11)
    m.attributionControl.setPrefix(false)
    map.current = m
    const off = addBasemap(m, 'light', {})
    m.on('click', (e) => set(e.latlng))
    const t = setTimeout(() => m.invalidateSize(), 60)
    return () => { clearTimeout(t); off(); m.remove(); marker.current = null }
  }, [])
  useEffect(() => {
    if (!has) return
    const at = [Number(lat), Number(lon)]
    if (!marker.current) {
      marker.current = L.marker(at, { draggable: true, icon: L.divIcon({ className: 'pinwrap', html: '<i class="bx-pin"></i>', iconSize: [0, 0] }) }).addTo(map.current)
      marker.current.on('dragend', () => set(marker.current.getLatLng()))
    } else marker.current.setLatLng(at)
  }, [lat, lon])
  return <div ref={el} className="mapcanvas bx-pick" role="application" aria-label="Posição do lugar" />
}

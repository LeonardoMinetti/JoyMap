import React, { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import MapCanvas from './MapCanvas.jsx'
import { FONTS, Icon, catOf } from './theme.jsx'
import { api, track } from './api.js'

const fmt = (d) => (d ? d.split('-').reverse().join('/') : '')

// Página pública do criador. Também é usada como prévia no Estúdio (preview = sem eventos, dados recebidos por props).
export default function PublicPage({ slug, preview, data: given }) {
  const [state, setState] = useState(given ? { data: given } : { loading: true })
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [openId, setOpenId] = useState(null)
  const [video, setVideo] = useState(false)
  const [sheet, setSheet] = useState(null) // 'share' | 'report'

  useEffect(() => {
    if (given) return setState({ data: given })
    api(`/public/${slug}`).then((data) => { setState({ data }); track(slug, 'session') }).catch(() => setState({ error: true }))
  }, [slug, given])

  const data = state.data
  const theme = data?.creator.theme
  const places = data?.places || []
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return places.filter((p) => (cat === 'all' || p.category === cat) && (!t || `${p.name} ${p.address || ''} ${p.municipality || ''}`.toLowerCase().includes(t)))
  }, [places, q, cat])

  useEffect(() => {
    if (preview || !q.trim()) return
    const h = setTimeout(() => track(slug, 'search', { term: q.trim(), results: shown.length }), 900)
    return () => clearTimeout(h)
  }, [q])

  if (state.loading) return <div className="pubstate">Carregando…</div>
  if (state.error || !data) return (
    <div className="pubstate col"><div className="sq0"><Icon n="pin" s={30} c="#6b6b6b" /></div><h1 className="d s44">Este mapa não está disponível</h1><p className="mut">O criador pausou ou retirou o mapa.</p></div>
  )

  const f = FONTS[theme.font] || FONTS.sans
  const vars = { '--acc': theme.accent, '--bg': theme.bg, '--fg': theme.fg, '--r': `${theme.radius}px`, fontFamily: f.css }
  const open = places.find((p) => p.id === openId)
  const usedCats = theme.categories.filter((c) => places.some((p) => p.category === c.id))
  const pick = (id) => { setOpenId(id); setVideo(false); if (!preview) track(slug, 'place_open', { placeId: id }) }
  const url = typeof location !== 'undefined' ? `${location.origin}/@${data.creator.slug}` : ''

  return (
    <div className={'pub' + (preview ? ' preview' : '')} style={vars}>
      <header className="pubhead">
        <div className="pubav">{data.creator.displayName.slice(0, 1).toUpperCase()}</div>
        <div className="sp"><h1 className="pubname" style={{ textTransform: f.title || 'none' }}>{data.creator.displayName}</h1><div className="pubsub">@{data.creator.handle} · {places.length} lugares</div></div>
        <button className="pubicon" aria-label="Compartilhar" onClick={() => setSheet('share')}><Icon n="share" s={18} /></button>
      </header>
      {theme.bio && <p className="pubbio">{theme.bio}</p>}
      {theme.showLinks && data.creator.links.length > 0 && (
        <div className="publinks">{data.creator.links.map((l, i) => <a key={i} href={l.url} target="_blank" rel="noopener noreferrer" className={i === 0 ? 'pbtn fill' : 'pbtn line'}>{l.title}</a>)}</div>
      )}
      {theme.showFilters && usedCats.length > 1 && (
        <div className="pubchips">
          <button className={'pchip' + (cat === 'all' ? ' on' : '')} onClick={() => setCat('all')}>Todos</button>
          {usedCats.map((c) => <button key={c.id} className={'pchip' + (cat === c.id ? ' on' : '')} onClick={() => setCat(c.id)}><span className="pdot" style={{ background: c.color }} />{c.name}</button>)}
        </div>
      )}
      <label className="pubsearch"><Icon n="search" s={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar neste mapa" aria-label="Buscar neste mapa" /></label>
      <div className="pubmap"><MapCanvas places={shown} theme={theme} selectedId={openId} onSelect={pick} /></div>

      {open ? (
        <article className="pubcard">
          <button className="pubicon x" onClick={() => setOpenId(null)} aria-label="Fechar"><Icon n="close" s={18} /></button>
          <div className="tagrow"><span className="pdot" style={{ background: catOf(theme, open.category).color }} />{catOf(theme, open.category).name}{open.ad && <span className="pubad">Publi</span>}</div>
          <h2 className="pubplace" style={{ textTransform: f.title || 'none' }}>{open.name}</h2>
          <p className="pubaddr">{open.address}{open.geoQuality !== 'address_exact' && <span className="pubwarn"> · localização aproximada</span>}</p>
          <p className="pubmeta">Indicado{open.postedOn ? ` em ${fmt(open.postedOn)}` : ''}</p>
          <div className="pubactions">
            <a className="pbtn fill" href={`https://www.google.com/maps/dir/?api=1&destination=${open.lat},${open.lon}`} target="_blank" rel="noopener noreferrer" onClick={() => !preview && track(slug, 'route_click', { placeId: open.id })}><Icon n="route" s={16} /> Abrir rota</a>
            {open.tiktokId && <button className="pbtn line" onClick={() => { setVideo(!video); if (!video && !preview) track(slug, 'video_open', { placeId: open.id }) }}><Icon n="play" s={14} /> {video ? 'Fechar vídeo' : 'Ver vídeo'}</button>}
            {open.postUrl && <a className="pbtn line" href={open.postUrl} target="_blank" rel="noopener noreferrer" onClick={() => !preview && track(slug, 'post_open', { placeId: open.id })}>Abrir post <Icon n="ext" s={14} /></a>}
          </div>
          {video && open.tiktokId && <iframe className="pubvideo" title={`Vídeo: ${open.name}`} src={`https://www.tiktok.com/player/v1/${open.tiktokId}?music_info=1&description=1`} allow="fullscreen" />}
          <button className="publink" onClick={() => setSheet('report')}>Informar erro neste lugar</button>
        </article>
      ) : (
        <div className="publist">
          {shown.map((p) => { const c = catOf(theme, p.category); return (
            <button key={p.id} className="pubrow" onClick={() => pick(p.id)}>
              <span className="pubthumb" style={{ background: c.color }}><Icon n={c.icon} s={20} c="#fff" /></span>
              <span className="sp"><b>{p.name}</b><small>{p.municipality || 'São Paulo'} · {c.name}</small></span>
            </button>) })}
          {shown.length === 0 && (
            <div className="pubempty"><b>Nada {q ? `por "${q}"` : 'aqui'}</b><span>Este mapa ainda não tem indicações assim.</span>
              {q && !preview && <button className="pbtn fill" onClick={() => { track(slug, 'search', { term: q.trim(), results: 0 }); setQ('') }}>Pedir uma indicação</button>}</div>
          )}
        </div>
      )}
      <footer className="pubfoot">Mapa feito com MAPA SP</footer>
      {sheet && <Sheet kind={sheet} url={url} slug={slug} place={open} preview={preview} onClose={() => setSheet(null)} />}
    </div>
  )
}

function Sheet({ kind, url, slug, place, preview, onClose }) {
  const [qr, setQr] = useState('')
  const [reason, setReason] = useState('Informação errada')
  const [done, setDone] = useState(false)
  useEffect(() => { if (kind === 'share') QRCode.toDataURL(url, { margin: 1, width: 180 }).then(setQr).catch(() => {}) }, [kind, url])
  const send = async () => {
    if (!preview) await fetch('/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, placeId: place?.id, reason }) }).catch(() => {})
    setDone(true)
  }
  return (
    <div className="pubsheetwrap" onClick={onClose}>
      <div className="pubsheet" onClick={(e) => e.stopPropagation()}>
        <button className="pubicon x" onClick={onClose} aria-label="Fechar"><Icon n="close" s={18} /></button>
        {kind === 'share' ? (<>
          <h2 className="pubplace">Compartilhar</h2>
          <div className="pubcopy"><span>{url}</span><button className="pbtn fill" onClick={() => navigator.clipboard?.writeText(url).catch(() => {})}>Copiar</button></div>
          {qr && <img src={qr} alt="QR code do mapa" width="150" height="150" />}
        </>) : done ? (<><h2 className="pubplace">Obrigado</h2><p>Recebemos o aviso. Não guardamos seu IP, só um código anônimo para evitar spam.</p></>) : (<>
          <h2 className="pubplace">Informar erro</h2>
          {['Informação errada', 'Sou o dono e quero corrigir', 'Conteúdo enganoso ou sem aviso de publicidade', 'Spam ou abuso'].map((r) => (
            <label key={r} className="pubradio"><input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} /> {r}</label>))}
          <button className="pbtn fill" onClick={send}>Enviar</button>
        </>)}
      </div>
    </div>
  )
}

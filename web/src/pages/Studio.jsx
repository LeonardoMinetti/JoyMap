import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { api } from '../api.js'
import { Link, navigate, toast } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import { Logo, Guard, Loading, Note, Switch, Side, useTitle } from '../lib/ui.jsx'
import { useMe } from '../lib/me.jsx'
import FakeMap from '../FakeMap.jsx'
import MapCanvas from '../MapCanvas.jsx'
import MapSheet from '../pub/MapSheet.jsx'
import { pubVars } from '../pub/shared.jsx'
import { LIBS } from '../iconcat.js'
import { ACCENTS, CAT_COLORS, FONTS, RADIUS_MODES, SHAPES, SYMBOL_LIBRARY, TEMPLATES, TONES, applyTemplate, catOf, contrast, onAccent, radiusMode, symOf } from '../theme.jsx'

const SAMPLE = [['Café Exemplo', 'cafe'], ['Forno Aurora', 'bread'], ['Casa Maré', 'fish'], ['Bar Modelo', 'bar'], ['Burger Teste', 'burger'], ['Doce Ensaio', 'cake'], ['Brasa Demo', 'rest']]
  .map(([name, category], i) => ({ id: -(i + 1), name, category, neighborhood: ['Pinheiros', 'Moema', 'Centro'][i % 3], lat: -23.55, lon: -46.64, geoQuality: 'address_exact', postedOn: '2026-09-12', ad: false }))

const Ctx = createContext(null)
const useStudio = () => useContext(Ctx)

// Rascunho do estúdio: tudo muda na prévia na hora e só vai ao ar quando o criador publica as alterações.
function StudioProvider({ children }) {
  const { me, reload } = useMe()
  const c = me.creator
  const [theme, setT] = useState(c.theme)
  const [links, setL] = useState(c.links)
  const [snap, setSnap] = useState(() => JSON.stringify({ t: c.theme, l: c.links }))
  const [places, setPlaces] = useState(null)
  const [routes, setRoutes] = useState([])
  const [coverVer, setCoverVer] = useState(0)
  const loadPlaces = useCallback(() => { api('/creator/places').then((d) => setPlaces(d.places)); api('/creator/routes').then((d) => setRoutes(d.routes)) }, [])
  useEffect(() => { loadPlaces() }, [loadPlaces])
  const setTheme = (patch) => setT((t) => ({ ...t, ...(typeof patch === 'function' ? patch(t) : patch) }))
  const setLinks = (l) => setL(typeof l === 'function' ? l : () => l)
  const dirty = JSON.stringify({ t: theme, l: links }) !== snap
  const publish = async () => {
    const r = await api('/creator/theme', { method: 'PUT', body: theme })
    const l = await api('/creator/links', { method: 'PUT', body: { links } })
    setT(r.theme); setL(l.links); setSnap(JSON.stringify({ t: r.theme, l: l.links }))
    await reload(); toast('Alterações publicadas')
  }
  const undo = () => { const s = JSON.parse(snap); setT(s.t); setL(s.l) }
  const real = (places || []).filter((p) => p.status === 'confirmed' && p.lat != null)
  const data = useMemo(() => ({
    creator: { handle: c.handle, tiktok: c.tiktok, slug: c.slug, displayName: c.displayName, theme, links: links.filter((l) => l.on && l.title), cover: theme.layout.cover && c.hasCover, coverUrl: '/api/creator/cover', symbols: c.symbols },
    places: real.length ? real : SAMPLE, routes: routes.filter((r) => r.placeIds.length).map((r) => ({ ...r, placeIds: r.placeIds })),
  }), [theme, links, places, routes, c])
  return <Ctx.Provider value={{ c, theme, setTheme, links, setLinks, dirty, publish, undo, places: places || [], real, data, usingSample: !real.length, loadPlaces, coverVer, bumpCover: () => setCoverVer((v) => v + 1), routes, setRoutes, reload }}>{children}</Ctx.Provider>
}
export function StudioRoute({ children }) { return <Guard need="approved" finished><StudioProvider>{children}</StudioProvider></Guard> }

// Prévia ao vivo: a própria página pública dentro de um celular
export function PhonePreview({ fake, themeOverride, width = 300, height = 620, interactive }) {
  const s = useStudio()
  const data = themeOverride ? { ...s.data, creator: { ...s.data.creator, theme: themeOverride }, places: SAMPLE } : s.data
  const theme = data.creator.theme
  const [cat, setCat] = useState([])
  const f = useMemo(() => ({ cats: cat, setCats: setCat, q: '', clear: () => setCat([]) }), [cat])
  const shown = cat.length ? data.places.filter((p) => cat.includes(p.category)) : data.places
  return (
    <div style={{ width, height, borderRadius: 34, border: '8px solid #171717', overflow: 'hidden', background: theme.bg, boxShadow: '0 18px 40px rgba(0,0,0,.22)', flex: 'none' }}>
      <div className="pub preview" style={{ ...pubVars(theme), height: '100%' }}><MapSheet data={data} shown={shown} f={f} selectedId={null} preview fake={fake || s.usingSample || !!themeOverride} snap="low" /></div>
    </div>
  )
}

const NAV = [['modelos', 'Modelos', 'layers', '/estudio/modelos'], ['cores', 'Cores e tema', 'palette', '/estudio/cores'], ['categorias', 'Categorias', 'grid', '/estudio/categorias'], ['simbolos', 'Símbolos', 'spark', '/estudio/simbolos'],
  ['mapa', 'Estilo do mapa', 'pin', '/estudio/mapa'], ['pins', 'Pins', 'flag', '/estudio/pins'], ['layout', 'Layout', 'menu', '/estudio/layout'], ['links', 'Links da bio', 'link', '/estudio/links'], ['endereco', 'Endereço', 'globe', '/estudio/endereco']]
// O Estúdio vive dentro do painel original: mesma barra lateral, cabeçalho com o estado de publicação e abas das seções.
function StudioHead({ active }) {
  const s = useStudio()
  const ref = React.useRef(null)
  // no celular as abas rolam na horizontal: mantém a ativa à vista
  React.useEffect(() => { const e = ref.current?.querySelector('.on'); if (e && ref.current.scrollWidth > ref.current.clientWidth) ref.current.scrollTo({ left: e.offsetLeft - 48, behavior: 'auto' }) }, [active])
  return (
    <div className="stm-h">
      <div className="stm-t">
        <div><span className="eb">Painel</span><b className="d s26">Estúdio de estilo</b></div>
        <div className="stm-act">
          <span className={'stm-st' + (s.dirty ? ' dirty' : '')} role="status"><i />{s.dirty ? 'Alterações não publicadas' : 'Tudo publicado'}</span>
          {s.dirty && <button type="button" className="link xs" onClick={s.undo}>Desfazer</button>}
          <button type="button" className="btn sm" disabled={!s.dirty} onClick={s.publish}>Publicar</button>
        </div>
      </div>
      <nav className="stm-tabs" ref={ref} aria-label="Seções do estúdio">
        {NAV.map(([k, l, i, to]) => <Link key={k} className={'stm-tab' + (k === active ? ' on' : '')} to={to}><Icon n={i} s={16} c="currentColor" />{l}</Link>)}
      </nav>
    </div>
  )
}
// layout: 'side' e 'main' = controles + prévia lateral; 'full' = sem prévia
function Shell({ active, layout = 'side', previewWidth = 460, title, children, fake, tpl }) {
  useTitle(`Estúdio · ${title}`)
  const s = useStudio()
  return (
    <div className="page"><div className="app">
      <Side active="estudio" />
      <div className="main stm">
        <StudioHead active={active} />
        <div className={'stbody' + (layout === 'full' ? ' full' : '')}>
          <div className="ctl">{children}</div>
          {layout !== 'full' && <div className="prev"><div><PhonePreview fake={fake} />{s.usingSample && <div className="xs mut c" style={{ marginTop: 10, maxWidth: 300 }}>Prévia com lugares de exemplo. Confirme lugares para ver os seus.</div>}</div></div>}
        </div>
      </div>
    </div></div>
  )
}
const Lb = ({ children }) => <span className="lb">{children}</span>
const Slider = ({ value, onChange, label }) => <input type="range" min="0" max="100" value={value} aria-label={label} onChange={(e) => onChange(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--acc)' }} />
const ColorBox = ({ value, onChange, label, wide }) => <label className={wide ? 'in' : 'swatch'} style={wide ? { cursor: 'pointer' } : { background: value, position: 'relative', display: 'block' }} aria-label={label}>{wide && <><i style={{ width: 22, height: 22, borderRadius: 6, background: value, border: '1px solid var(--line)' }} /><span>{value.toUpperCase()}</span></>}<input type="color" className="sr" value={value} onChange={(e) => onChange(e.target.value)} /></label>

// arrastar para reordenar (com setas do teclado no cabeçalho de arraste)
function useSortable(list, set) {
  const from = useRef(null)
  const move = (a, b) => { if (b < 0 || b >= list.length || a === b) return; const n = [...list]; const [x] = n.splice(a, 1); n.splice(b, 0, x); set(n) }
  const props = (i) => ({ onDragOver: (e) => e.preventDefault(), onDrop: (e) => { e.preventDefault(); if (from.current != null) move(from.current, i); from.current = null } })
  const handle = (i) => <span draggable tabIndex={0} role="button" aria-label="Arrastar para reordenar (ou use as setas)" style={{ cursor: 'grab', display: 'inline-flex' }} onDragStart={(e) => { from.current = i; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)) }} onKeyDown={(e) => { if (e.key === 'ArrowUp') { e.preventDefault(); move(i, i - 1) } if (e.key === 'ArrowDown') { e.preventDefault(); move(i, i + 1) } }}><Icon n="drag" s={18} c="#a3a3a3" /></span>
  return { props, handle }
}
const upload = (file, max) => new Promise((res, rej) => { if (!file || file.size > max) return rej(new Error('size')); const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file) })

// D1 · visão geral
export function StudioHome() {
  const s = useStudio()
  const T = s.theme
  const mini = (to, vis, t, d) => <Link key={to} className="card click" to={to}>{vis}<b>{t}</b><span className="xs mut">{d}</span></Link>
  const sq = (c, r = 12, w = 26) => <i key={c} className="sq" style={{ width: w, height: w, background: c, borderRadius: r }} />
  return (
    <Shell active="modelos" layout="main" previewWidth={460} title="Visão geral">
      <p className="mut">Deixe o mapa com a sua cara. Tudo muda na prévia ao lado, em tempo real. Comece por um modelo ou escolha uma seção.</p>
      <div className="g3" style={{ gap: 14 }}>
        {mini('/estudio/cores', <div className="row" style={{ gap: 6 }}>{[T.accent, T.bg, T.fg].map((c) => sq(c))}</div>, 'Cores e tema', 'Paleta, fonte, cantos')}
        {mini('/estudio/categorias', <div className="row" style={{ gap: 6 }}>{T.categories.slice(0, 3).map((c) => { const { n, sym } = symOf(c, s.c.symbols); return <Icon key={c.id} n={n} sym={sym} s={22} c={c.color} /> })}</div>, 'Categorias', 'Nome, cor e símbolo de cada uma')}
        {mini('/estudio/simbolos', <div className="row" style={{ gap: 6 }}>{['pizza', 'fish', 'burger'].map((n) => <Icon key={n} n={n} s={22} />)}</div>, 'Símbolos', 'Biblioteca e envio de SVG próprio')}
        {mini('/estudio/mapa', <div style={{ borderRadius: 8, overflow: 'hidden', height: 30 }}><FakeMap h={30} tone={T.tone} n={0} lab={false} /></div>, 'Estilo do mapa', 'Base, rótulos, densidade')}
        {mini('/estudio/pins', <div className="row" style={{ gap: 6 }}>{sq('#ff4b2b', '50%', 22)}{sq('#2d7ff9', 6, 22)}<i className="sq" style={{ width: 22, height: 22, background: '#12b76a', clipPath: 'polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0 50%)' }} /></div>, 'Pins e agrupamento', 'Formato, tamanho, cluster')}
        {mini('/estudio/layout', <div className="ph" style={{ height: 30 }}>blocos</div>, 'Layout da página', 'Ordem, capa, lista ou grade')}
        {mini('/estudio/links', <Icon n="link" s={22} />, 'Links da bio', 'Botões ao lado do mapa')}
        {mini('/estudio/endereco', <Icon n="globe" s={22} />, 'Endereço e domínio', 'Slug, domínio, QR code')}
        {mini('/estudio/modelos', <Icon n="layers" s={22} />, 'Modelos prontos', 'Comece por um e ajuste')}
      </div>
      <Note>Dica: comece por um modelo e ajuste só o que importa. Todas as escolhas valem para o mapa, os cartões e a página.</Note>
    </Shell>
  )
}

// D2 · cores e tema
export function StudioColors() {
  const { theme: T, setTheme } = useStudio()
  const ratio = contrast(onAccent(T), T.accent)
  const textRatio = contrast(T.fg, T.bg)
  return (
    <Shell active="cores" title="Cores e tema">
      <h1 className="d s32">Cores e tema</h1>
      <div><Lb>Cor principal</Lb><div className="row wrap" style={{ gap: 8 }}>{ACCENTS.map((a) => <button key={a} aria-label={`Cor ${a}`} className={'swatch' + (T.accent.toLowerCase() === a ? ' on' : '')} style={{ background: a }} onClick={() => setTheme({ accent: a })} />)}<label className="chip" style={{ position: 'relative' }}>Outra cor<input type="color" className="sr" value={T.accent} onChange={(e) => setTheme({ accent: e.target.value })} aria-label="Outra cor" /></label></div></div>
      <div className="g2"><div><Lb>Fundo</Lb><ColorBox wide value={T.bg} onChange={(v) => setTheme({ bg: v })} label="Cor de fundo" /></div><div><Lb>Texto</Lb><ColorBox wide value={T.fg} onChange={(v) => setTheme({ fg: v })} label="Cor do texto" /></div></div>
      <div><Lb>Fonte dos títulos</Lb><div className="g2" style={{ gap: 8 }}>{Object.entries(FONTS).map(([k, f]) => <button key={k} className={'card' + (T.font === k ? ' sel' : '')} style={{ padding: 10, textAlign: 'left', fontFamily: f.css, textTransform: f.upper ? 'uppercase' : 'none', fontWeight: 700, fontSize: f.size }} onClick={() => setTheme({ font: k })}>{f.label}</button>)}</div></div>
      <div><Lb>Cantos dos botões e cartões</Lb><div className="row">{Object.entries(RADIUS_MODES).map(([k, m]) => <button key={k} className={'chip' + (radiusMode(T.radius) === k ? ' on' : '')} onClick={() => setTheme({ radius: m.r })}>{m.label}</button>)}</div></div>
      <div className="row"><div className="sp"><b className="sm">Contraste automático</b><div className="xs mut">Ajusta o texto dos botões para ficar legível</div></div><Switch on={T.contrastAuto} onChange={(v) => setTheme({ contrastAuto: v })} label="Contraste automático" /></div>
      <Note style={ratio < 4.5 || textRatio < 4.5 ? { background: 'var(--bads)', color: 'var(--bad)' } : undefined}>
        {ratio >= 4.5 ? `Verificação de acessibilidade: o texto ${onAccent(T) === '#ffffff' ? 'branco' : 'escuro'} sobre esta cor passa no contraste mínimo (${ratio.toFixed(1)}:1).` : `Atenção: o texto sobre esta cor tem contraste ${ratio.toFixed(1)}:1, abaixo do mínimo de 4,5:1.${T.contrastAuto ? '' : ' Ligue o contraste automático.'}`}
        {textRatio < 4.5 && ` O texto sobre o fundo está em ${textRatio.toFixed(1)}:1: escolha cores mais distantes.`}
      </Note>
    </Shell>
  )
}

// D3 · categorias
export function StudioCategories() {
  const { theme: T, setTheme, places, c: cr } = useStudio()
  const [sel, setSel] = useState(null)
  const count = (id) => places.filter((p) => p.category === id && (p.status === 'confirmed' || p.status === 'pending')).length
  const setCat = (i, patch) => setTheme((t) => ({ categories: t.categories.map((x, j) => (j === i ? { ...x, ...patch } : x)) }))
  const sort = useSortable(T.categories, (n) => setTheme({ categories: n }))
  const common = ['rest', 'heart', 'star', 'bread']
  return (
    <Shell active="categorias" title="Categorias">
      <h1 className="d s32">Categorias</h1>
      <p className="sm mut">Cada categoria tem nome, símbolo e cor. Os seguidores filtram por elas.</p>
      {T.categories.map((cat, i) => {
        const { n, sym } = symOf(cat, cr.symbols)
        const open = sel === i
        return (
          <div key={cat.id} className={'card' + (open ? ' sel col' : '')} style={open ? { gap: 12 } : undefined} {...sort.props(i)}>
            <div className="row">{sort.handle(i)}<span className="catico" style={{ background: cat.color }}><Icon n={n} sym={sym} s={18} c="#fff" /></span>
              {open ? <div className="sp"><span className="lb" style={{ margin: 0 }}>Nome</span><input className="in" style={{ minHeight: 36, padding: '4px 10px' }} aria-label="Nome da categoria" value={cat.name} maxLength="30" onChange={(e) => setCat(i, { name: e.target.value })} /></div>
                : <div className="sp"><b className="sm">{cat.name}</b><div className="xs mut">{count(cat.id)} lugares</div></div>}
              <button aria-label={open ? 'Fechar edição' : 'Editar categoria'} style={{ background: 'none', border: 0, padding: 4 }} onClick={() => setSel(open ? null : i)}><Icon n={open ? 'check' : 'edit'} s={18} /></button></div>
            {open && <>
              <div className="row wrap" style={{ gap: 6 }}><span className="lb" style={{ margin: 0, width: '100%' }}>Símbolo</span>
                {[cat.icon, ...common.filter((x) => x !== cat.icon)].slice(0, 4).map((k) => { const s2 = symOf({ icon: k }, cr.symbols); return <button key={k} aria-label={`Símbolo ${k}`} className={'chip' + (cat.icon === k ? ' on' : '')} onClick={() => setCat(i, { icon: k })}><Icon n={s2.n} sym={s2.sym} s={16} c={cat.icon === k ? '#fff' : '#171717'} /></button> })}
                <Link className="chip" to={`/estudio/simbolos?cat=${cat.id}`}>Ver todos</Link></div>
              <div><span className="lb">Cor</span><div className="row" style={{ gap: 8 }}>{[cat.color, ...CAT_COLORS.filter((x) => x !== cat.color)].slice(0, 5).map((col) => <button key={col} aria-label={`Cor ${col}`} className={'dotsw' + (cat.color === col ? ' on' : '')} style={{ background: col }} onClick={() => setCat(i, { color: col })} />)}
                <label className="chip" style={{ position: 'relative' }}>Outra<input type="color" className="sr" value={cat.color} onChange={(e) => setCat(i, { color: e.target.value })} aria-label="Outra cor da categoria" /></label></div></div>
              <button className="btn ln sm" style={{ alignSelf: 'flex-start' }} disabled={T.categories.length <= 1} onClick={() => { if (!count(cat.id) || confirm(`${count(cat.id)} lugares usam "${cat.name}". Eles aparecerão como "Outros". Remover mesmo assim?`)) { setTheme({ categories: T.categories.filter((_, j) => j !== i) }); setSel(null) } }}><Icon n="trash" s={14} />Remover categoria</button>
            </>}
          </div>)
      })}
      <button className="btn ln blk" disabled={T.categories.length >= 16} onClick={() => { setTheme({ categories: [...T.categories, { id: `c${Date.now().toString(36)}`.slice(0, 20), name: 'Nova categoria', color: CAT_COLORS[T.categories.length % CAT_COLORS.length], icon: 'star' }] }); setSel(T.categories.length) }}><Icon n="plus" s={18} />Nova categoria</button>
    </Shell>
  )
}

// D4 · biblioteca de símbolos
const SYMBOL_ERR = { svg_grande: 'O arquivo passa de 50 KB.', svg_inseguro: 'O SVG tem elementos não permitidos (scripts, imagens ou links).', svg_sem_path: 'Só aceitamos desenhos feitos com caminhos (path). Converta as formas em contorno e exporte de novo.', svg_invalido: 'Não conseguimos ler este SVG.', limite_20: 'Limite de 20 símbolos enviados.' }
export function StudioSymbols() {
  const { theme: T, setTheme, c: cr, reload } = useStudio()
  const [grp, setGrp] = useState('Comida')
  const [style, setStyle] = useState(() => (/^lib:([a-z0-9]+):/.exec(T.categories[0]?.icon || '') || [])[1] || 'base')
  const [q, setQ] = useState('')
  const target = new URLSearchParams(location.search).get('cat')
  const idx = Math.max(0, T.categories.findIndex((x) => x.id === target))
  const cat = T.categories[idx]
  const GROUPS = style === 'base' ? ['Comida', 'Bebidas', 'Passeios', 'Viagem', 'Compras', 'Formas'] : ['Comida', 'Doces', 'Bebidas', 'Lugares', 'Destaques']
  const STYLES = [['base', 'Básicos'], ...Object.entries(LIBS).map(([k, v]) => [k, v.label]), ['mine', 'Meus envios']]
  const lib = LIBS[style]
  const libItems = lib ? lib.cat.filter(([, l, g]) => (!q ? g === grp : l.toLowerCase().includes(q.toLowerCase()))) : []
  const cols = ['#ff4b2b', '#a16207', '#7c3aed', '#f59e0b', '#ec4899', '#dc2626', '#2d7ff9', '#ea580c']
  const items = style !== 'base' ? [] : SYMBOL_LIBRARY.filter(([, l, g]) => (!q ? g === grp : l.toLowerCase().includes(q.toLowerCase())))
  const apply = (icon) => { setTheme({ categories: T.categories.map((c, j) => (j === idx ? { ...c, icon } : c)) }); toast(`Símbolo aplicado em "${cat.name}"`) }
  const file = useRef(null)
  const send = async (f) => {
    if (!f) return
    try {
      const svg = await f.text()
      await api('/creator/symbols', { method: 'POST', body: { name: f.name.replace(/\.svg$/i, ''), svg } })
      await reload(); setStyle('mine'); toast('Enviado. Passa a valer no mapa depois da revisão.')
    } catch (e) { toast(SYMBOL_ERR[e.message] || 'Não foi possível enviar o símbolo.') }
    if (file.current) file.current.value = ''
  }
  return (
    <Shell active="simbolos" layout="main" previewWidth={380} title="Símbolos">
      <div className="row jb wrap"><h1 className="d s32">Biblioteca de símbolos</h1><div className="in" style={{ width: 260 }}><Icon n="search" s={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar símbolo" aria-label="Buscar símbolo" /></div></div>
      <p className="sm mut">Aplicando em: <b>{cat.name}</b>. <Link className="link" to="/estudio/categorias">Trocar categoria</Link></p>
      <div className="row wrap" role="tablist" aria-label="Estilo do símbolo">{STYLES.map(([k, l]) => <button key={k} role="tab" aria-selected={style === k} className={'chip' + (style === k ? ' on' : '')} onClick={() => { setStyle(k); setQ('') }}>{l}</button>)}</div>
      {style !== 'mine' && <div className="row wrap">{GROUPS.map((g) => <button key={g} className={'chip' + (grp === g && !q ? ' on' : '')} style={{ background: grp === g && !q ? undefined : 'transparent' }} onClick={() => { setGrp(g); setQ('') }}>{g}</button>)}</div>}
      {lib && <p className="xs mut">{lib.long}. Licença {lib.license}. {lib.color ? 'O desenho traz as próprias cores.' : 'Usa a cor da categoria.'}</p>}
      {style === 'mine' ? (
        <div className="g5" style={{ gap: 12 }}>{cr.symbols.map((s, i) => (
          <div key={s.id} className="card col" style={{ alignItems: 'center', gap: 8, padding: 14 }}>
            <button disabled={s.status !== 'approved'} aria-label={`Usar ${s.name}`} style={{ width: 48, height: 48, borderRadius: '50%', background: cols[i % cols.length], display: 'grid', placeItems: 'center', border: 0, opacity: s.status === 'approved' ? 1 : 0.5, cursor: s.status === 'approved' ? 'pointer' : 'not-allowed' }} onClick={() => apply(`custom:${s.id}`)}><Icon sym={s} s={24} c="#fff" /></button>
            <span className="xs mut trunc" style={{ maxWidth: '100%' }}>{s.name}</span>
            <span className={'tag ' + (s.status === 'approved' ? 'ok' : s.status === 'rejected' ? 'bd2' : 'wn')}>{s.status === 'approved' ? 'Liberado' : s.status === 'rejected' ? 'Recusado' : 'Em análise'}</span>
            <button className="link xs" onClick={async () => { await api(`/creator/symbols/${s.id}`, { method: 'DELETE' }); await reload() }}>Remover</button></div>))}
          {!cr.symbols.length && <p className="mut sm" style={{ gridColumn: '1/-1' }}>Você ainda não enviou símbolos.</p>}</div>
      ) : lib ? (
        <div className="g5" style={{ gap: 12 }}>{libItems.map(([n, l]) => { const id = `lib:${style}:${n}`; return (
          <button key={n} className={'card col' + (cat.icon === id ? ' sel' : '')} style={{ alignItems: 'center', gap: 8, padding: 14 }} onClick={() => apply(id)} aria-label={`Usar ${l}`}><span style={{ width: 48, height: 48, borderRadius: '50%', background: lib.color ? '#f1f1f4' : cat.color, display: 'grid', placeItems: 'center' }}><Icon sym={{ lib: id }} s={lib.color ? 32 : 24} c="#fff" /></span><span className="xs mut">{l}</span></button>) })}
          {!libItems.length && <p className="mut sm" style={{ gridColumn: '1/-1' }}>Nenhum símbolo encontrado.</p>}</div>
      ) : (
        <div className="g5" style={{ gap: 12 }}>{items.map(([n, l], i) => (
          <button key={n} className={'card col' + (cat.icon === n ? ' sel' : '')} style={{ alignItems: 'center', gap: 8, padding: 14 }} onClick={() => apply(n)}><span style={{ width: 48, height: 48, borderRadius: '50%', background: cols[SYMBOL_LIBRARY.findIndex((x) => x[0] === n) % cols.length], display: 'grid', placeItems: 'center' }}><Icon n={n} s={24} c="#fff" /></span><span className="xs mut">{l}</span></button>))}
          {!items.length && <p className="mut sm" style={{ gridColumn: '1/-1' }}>Nenhum símbolo encontrado.</p>}</div>
      )}
      <div className="card soft row" style={{ gap: 16, border: '2px dashed var(--line)' }}><span className="sq" style={{ display: 'grid', placeItems: 'center', background: '#fff' }}><Icon n="up" s={22} /></span><div className="sp"><b>Envie o seu próprio símbolo</b><div className="sm mut">SVG de uma cor, até 50 KB, só caminhos (path). Revisamos antes de liberar.</div></div>
        <input ref={file} type="file" accept=".svg,image/svg+xml" className="sr" id="svgfile" onChange={(e) => send(e.target.files[0])} /><label htmlFor="svgfile" className="btn sec sm">Escolher arquivo</label></div>
    </Shell>
  )
}

// D5 · estilo do mapa
export function StudioMap() {
  const { theme: T, setTheme, real, c: cr } = useStudio()
  const [view, setView] = useState(null)
  return (
    <Shell active="mapa" title="Estilo do mapa">
      <h1 className="d s32">Estilo do mapa</h1>
      <div className="g2" style={{ gap: 10 }}>
        {Object.entries(TONES).map(([k, t]) => <button key={k} className={'card col' + (T.tone === k ? ' sel' : '')} style={{ padding: 8, gap: 6, textAlign: 'left' }} onClick={() => setTheme({ tone: k })}><div style={{ borderRadius: 10, overflow: 'hidden', pointerEvents: 'none' }}><FakeMap h={100} tone={k} n={5} lab={false} /></div><b className="xs">{t.label}</b></button>)}
        <div className="card soft col" style={{ padding: 8, gap: 6, justifyContent: 'center', alignItems: 'center' }}><Icon n="plus" s={22} /><b className="xs">Mais estilos em breve</b></div>
      </div>
      <div className="row"><div className="sp"><b className="sm">Nomes de bairros</b><div className="xs mut">Mostrar rótulos no mapa (até o zoom 12)</div></div><Switch on={T.mapLabels} onChange={(v) => setTheme({ mapLabels: v })} label="Nomes de bairros" /></div>
      <div><Lb>Densidade de rótulos</Lb><Slider value={T.labelDensity} onChange={(v) => setTheme({ labelDensity: v })} label="Densidade de rótulos" /></div>
      <Note>Os estilos de mapa são do OpenFreeMap (Positron, Bright, Liberty, Fiord e Dark), sobre dados do OpenStreetMap. Revise o uso dos tiles antes do lançamento. Créditos dos símbolos: <a className="link" href="/licencas-simbolos.txt" target="_blank" rel="noopener">licenças</a>.</Note>
    </Shell>
  )
}

// D6 · pins e agrupamento
export function StudioPins() {
  const { theme: T, setTheme } = useStudio()
  const shapeBox = (k) => {
    const st = { width: 30, height: 30, background: '#ff4b2b', display: 'block', margin: 4 }
    if (k === 'drop') Object.assign(st, { borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)' })
    if (k === 'circle') st.borderRadius = '50%'
    if (k === 'square') st.borderRadius = 8
    if (k === 'hex') st.clipPath = 'polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0 50%)'
    return <i style={st} />
  }
  return (
    <Shell active="pins" title="Pins">
      <h1 className="d s32">Pins e agrupamento</h1>
      <div><Lb>Formato</Lb><div className="g4" style={{ gap: 8 }}>{Object.entries(SHAPES).map(([k, l]) => <button key={k} className={'card col' + (T.shape === k ? ' sel' : '')} style={{ alignItems: 'center', padding: 10, gap: 6 }} onClick={() => setTheme({ shape: k })}>{shapeBox(k)}<span className="xs">{l}</span></button>)}</div></div>
      <div><Lb>Tamanho</Lb><div className="row"><span className="xs mut">P</span><div className="sp"><Slider value={T.pinSize} onChange={(v) => setTheme({ pinSize: v })} label="Tamanho do pin" /></div><span className="xs mut">G</span></div></div>
      <div className="row"><div className="sp"><b className="sm">Borda branca</b><div className="xs mut">Melhora a leitura em mapas escuros</div></div><Switch on={T.pinBorder} onChange={(v) => setTheme({ pinBorder: v })} label="Borda branca" /></div>
      <div className="row"><div className="sp"><b className="sm">Agrupar pins próximos</b><div className="xs mut">Mostra o total quando o zoom é baixo</div></div><Switch on={T.cluster} onChange={(v) => setTheme({ cluster: v })} label="Agrupar pins próximos" /></div>
      <div className="card soft row" style={{ gap: 14 }}><span style={{ width: 40, height: 40, borderRadius: '50%', background: '#171717', color: '#fff', display: 'grid', placeItems: 'center', font: '700 16px Archivo' }}>12</span><span style={{ width: 34, height: 34, borderRadius: '50%', background: '#171717', color: '#fff', display: 'grid', placeItems: 'center', font: '700 14px Archivo' }}>5</span><span className="sm mut sp">Estilo do grupo: círculo escuro com contagem</span></div>
      <div><Lb>Pin selecionado</Lb><div className="row wrap">{[['outline', 'Maior com contorno'], ['pulse', 'Pulsando'], ['color', 'Só cor']].map(([k, l]) => <button key={k} className={'chip' + (T.selected === k ? ' on' : '')} onClick={() => setTheme({ selected: k })}>{l}</button>)}</div></div>
    </Shell>
  )
}

// D7 · layout da página (+ roteiros)
const BLOCK = { header: ['Cabeçalho', 'Foto, nome e bio'], links: ['Links da bio', 'Botões personalizados'], filters: ['Filtros por categoria', ''], map: ['Mapa', ''], list: ['Lista de lugares', ''], routes: ['Roteiros', 'Coleções de lugares'] }
export function StudioLayout() {
  const s = useStudio()
  const { theme: T, setTheme, c: cr } = s
  const L = T.layout
  const setL = (patch) => setTheme((t) => ({ layout: { ...t.layout, ...patch } }))
  const sort = useSortable(L.blocks, (b) => setL({ blocks: b }))
  const [msg, setMsg] = useState('')
  const coverFile = useRef(null)
  const pickCover = async (f) => {
    setMsg('')
    try {
      const url = await upload(f, 600 * 1024)
      const [, mime, data] = /^data:(.*?);base64,(.*)$/.exec(url)
      await api('/creator/cover', { method: 'PUT', body: { mime, data } })
      await s.reload(); s.bumpCover(); setL({ cover: true })
    } catch (e) { setMsg(e.message === 'size' ? 'A imagem passa de 600 KB.' : 'Use JPG, PNG ou WebP.') }
    if (coverFile.current) coverFile.current.value = ''
  }
  const detail = (id) => id === 'map' ? (<div className="row" style={{ gap: 4 }}>Altura: {[['sm', 'pequena'], ['md', 'média'], ['lg', 'grande']].map(([k, l]) => <button key={k} className={'chip'} style={{ padding: '3px 8px', fontSize: 11, ...(L.mapHeight === k ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : {}) }} onClick={() => setL({ mapHeight: k })}>{l}</button>)}</div>) : id === 'list' ? `Cartões em ${L.listStyle === 'rows' ? 'linhas' : 'grade'}` : BLOCK[id][1]
  return (
    <Shell active="layout" title="Layout">
      <h1 className="d s32">Layout da página</h1>
      <p className="sm mut">Arraste os blocos para mudar a ordem. Desligue o que não quiser mostrar.</p>
      {L.blocks.map((b, i) => (
        <div key={b.id} className="card row" {...sort.props(i)}>{sort.handle(i)}<div className="sp"><b className="sm">{BLOCK[b.id][0]}</b><div className="xs mut">{detail(b.id)}</div></div><Switch on={b.on} disabled={b.id === 'header'} label={BLOCK[b.id][0]} onChange={(v) => setL({ blocks: L.blocks.map((x) => (x.id === b.id ? { ...x, on: v } : x)) })} /></div>))}
      <div className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
        <div className="sp"><span className="lb">Imagem de capa</span>
          <div className="ph" style={{ height: 70, ...(cr.hasCover ? { backgroundImage: `url(/api/creator/cover?v=${s.coverVer})`, backgroundSize: 'cover', backgroundPosition: 'center', color: 'transparent' } : {}) }}>{cr.hasCover ? 'capa' : 'Sem capa'}</div>
          <input ref={coverFile} type="file" accept="image/jpeg,image/png,image/webp" className="sr" id="coverfile" onChange={(e) => pickCover(e.target.files[0])} />
          <div className="row" style={{ marginTop: 6 }}><label htmlFor="coverfile" className="btn sec sm">{cr.hasCover ? 'Trocar' : 'Escolher imagem'}</label>{cr.hasCover && <><label className="row xs" style={{ gap: 6 }}><Switch on={L.cover} onChange={(v) => setL({ cover: v })} label="Mostrar capa" />Mostrar</label><button className="link xs" onClick={async () => { await api('/creator/cover', { method: 'DELETE' }); await s.reload(); setL({ cover: false }) }}>Remover</button></>}</div>
          {msg && <p className="err" role="alert">{msg}</p>}<span className="xs mut">Até 600 KB. JPG, PNG ou WebP.</span></div>
        <div className="sp"><span className="lb">Lista</span><div className="row">{[['grid', 'Grade'], ['rows', 'Linhas']].map(([k, l]) => <button key={k} className={'chip' + (L.listStyle === k ? ' on' : '')} onClick={() => setL({ listStyle: k })}>{l}</button>)}</div></div>
      </div>
      <RoutesEditor />
    </Shell>
  )
}
function RoutesEditor() {
  const s = useStudio()
  const [rows, setRows] = useState(s.routes)
  useEffect(() => { setRows(s.routes) }, [s.routes])
  const confirmed = s.places.filter((p) => p.status === 'confirmed')
  const set = (i, patch) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const save = async () => { await api('/creator/routes', { method: 'PUT', body: { routes: rows } }); s.loadPlaces(); toast('Roteiros salvos (já valem no mapa publicado)') }
  return (
    <div className="card col" style={{ gap: 10 }}>
      <div className="row jb"><b>Roteiros do mapa</b><button className="btn ln sm" disabled={rows.length >= 12} onClick={() => setRows([...rows, { name: '', note: '', placeIds: [] }])}><Icon n="plus" s={14} />Novo roteiro</button></div>
      {!rows.length && <p className="sm mut">Monte coleções como "Domingo de café". Ligue o bloco "Roteiros" para mostrá-las na página.</p>}
      {rows.map((r, i) => (
        <div key={i} className="card soft col" style={{ gap: 8 }}>
          <div className="row"><input className="in sp" style={{ minHeight: 40 }} aria-label="Nome do roteiro" placeholder="Nome do roteiro" value={r.name} maxLength="40" onChange={(e) => set(i, { name: e.target.value })} /><input className="in sp" style={{ minHeight: 40 }} aria-label="Observação" placeholder="Ex.: 3 h de passeio" value={r.note || ''} maxLength="60" onChange={(e) => set(i, { note: e.target.value })} /><button className="btn ln sm" aria-label="Remover roteiro" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Icon n="trash" s={14} /></button></div>
          <div className="row wrap" style={{ gap: 6 }}>{confirmed.map((p) => <button key={p.id} className={'chip' + (r.placeIds.includes(p.id) ? ' on' : '')} style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => set(i, { placeIds: r.placeIds.includes(p.id) ? r.placeIds.filter((x) => x !== p.id) : [...r.placeIds, p.id] })}>{p.name}</button>)}{!confirmed.length && <span className="xs mut">Confirme lugares para montar roteiros.</span>}</div>
        </div>))}
      {rows.length > 0 && <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={save}>Salvar roteiros</button>}
    </div>
  )
}

// D8 · links da bio
export function StudioLinks() {
  const { theme: T, setTheme, links, setLinks, c: cr } = useStudio()
  const sort = useSortable(links, setLinks)
  const setLink = (i, patch) => setLinks(links.map((l, j) => (j === i ? { ...l, ...patch } : l)))
  return (
    <Shell active="links" title="Links da bio">
      <h1 className="d s32">Links da bio</h1>
      <p className="sm mut">Os botões que aparecem acima do mapa. Substitui o seu link atual. Até 8 links.</p>
      {links.map((l, i) => (
        <div key={i} className="card col" style={{ gap: 8 }} {...sort.props(i)}>
          <div className="row">{sort.handle(i)}<input className="in sp" style={{ minHeight: 40 }} aria-label="Título" placeholder="Título do botão" value={l.title} maxLength="40" onChange={(e) => setLink(i, { title: e.target.value })} /><Switch on={l.on} onChange={(v) => setLink(i, { on: v })} label="Mostrar link" /><button className="btn ln sm" aria-label="Remover link" onClick={() => setLinks(links.filter((_, j) => j !== i))}><Icon n="trash" s={14} /></button></div>
          <div className="in" style={{ minHeight: 40, marginLeft: 28, width: 'auto' }}><Icon n="link" s={16} /><input aria-label="Endereço do link" placeholder="https://exemplo.com/reservas" value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} /></div>
        </div>))}
      <div className="card row"><Icon n="drag" s={18} c="#a3a3a3" /><Icon n="insta" s={20} /><div className="sp"><b className="sm">Instagram</b><div className="xs mut">@{cr.handle}</div></div><Switch on={T.social.instagram} onChange={(v) => setTheme({ social: { ...T.social, instagram: v } })} label="Mostrar Instagram" /></div>
      <div className="card row"><Icon n="drag" s={18} c="#a3a3a3" /><Icon n="tiktok" s={20} /><div className="sp"><b className="sm">TikTok</b><div className="xs mut">{cr.tiktok ? `@${cr.tiktok}` : 'Sem @ do TikTok na candidatura'}</div></div><Switch on={T.social.tiktok && !!cr.tiktok} disabled={!cr.tiktok} onChange={(v) => setTheme({ social: { ...T.social, tiktok: v } })} label="Mostrar TikTok" /></div>
      <button className="btn ln blk" disabled={links.length >= 8} onClick={() => setLinks([...links, { title: '', url: '', on: true }])}><Icon n="plus" s={18} />Adicionar link</button>
      <div><Lb>Estilo dos botões</Lb><div className="row">{[['fill', 'Preenchido'], ['line', 'Contorno'], ['soft', 'Suave']].map(([k, l]) => <button key={k} className={'chip' + (T.linkStyle === k ? ' on' : '')} onClick={() => setTheme({ linkStyle: k })}>{l}</button>)}</div></div>
      <Note>Links sem título ou sem https:// não são publicados.</Note>
    </Shell>
  )
}

// D9 · endereço, domínio, QR code e imagem de compartilhamento
export function StudioAddress() {
  const s = useStudio()
  const { c: cr, theme: T } = s
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
  useEffect(() => { QRCode.toDataURL(url, { margin: 1, width: 192, color: { dark: qrStyle === 'black' ? '#000000' : onQr(T.accent) } }).then(setQr).catch(() => {}) }, [url, qrStyle, T.accent])
  function onQr(c) { return c }
  const saveSlug = async () => { try { await api('/creator/slug', { method: 'PUT', body: { slug } }); await s.reload(); toast('Endereço salvo') } catch (x) { toast(x.message === 'slug_em_uso' ? 'Este endereço já está em uso.' : 'Use 3 a 30 letras, números, - ou _.') } }
  const saveDom = async () => { try { const d = await api('/creator/domain', { method: 'PUT', body: { domain: dom } }); setDomInfo(d); await s.reload() } catch (x) { toast(x.message === 'dominio_em_uso' ? 'Este domínio já está em uso.' : 'Domínio inválido. Exemplo: mapa.seusite.com.br') } }
  const check = async () => { const d = await api('/creator/domain/check', { method: 'POST' }); setDomInfo({ ...domInfo, ...d }); await s.reload(); toast(d.status === 'active' ? 'Domínio ativo' : 'O DNS ainda não aponta para nós') }
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
    <Shell active="endereco" layout="full" title="Endereço">
      <h1 className="d s32">Endereço e domínio</h1>
      <div><label className="lb" htmlFor="s1">Endereço do mapa</label><div className="row"><div className="in f sp"><span className="mut nowrap">{location.host}/@</span><input id="s1" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} />{slug === cr.slug ? <span className="tag ok">Seu endereço</span> : avail && <span className={'tag ' + (avail.available ? 'ok' : 'bd2')}>{avail.available ? 'Disponível' : avail.reason === 'em_uso' ? 'Em uso' : 'Inválido'}</span>}</div><button className="btn" disabled={slug === cr.slug || !avail?.available} onClick={saveSlug}>Salvar</button></div>
        <span className="xs mut">Ao trocar o endereço, o link antigo para de funcionar. Atualize a bio.</span></div>
      <div className="card col" style={{ gap: 10 }}><div className="row jb"><b>Domínio próprio</b><span className="tag ax">Plano Criador</span></div>
        <div className="row"><div className="in sp"><input value={dom} onChange={(e) => setDom(e.target.value)} placeholder="mapa.dudacome.com.br" aria-label="Domínio próprio" /></div><button className="btn" onClick={saveDom}>{cr.domain.name ? 'Atualizar' : 'Salvar'}</button></div>
        {cr.domain.name && <><div className="g2"><div className="card soft col" style={{ gap: 4 }}><span className="eb">Tipo</span><b className="sm">CNAME</b></div><div className="card soft col" style={{ gap: 4 }}><span className="eb">Valor</span><b className="sm">{target}</b></div></div>
          <div className="row"><span className={'tag ' + (cr.domain.status === 'active' ? 'ok' : 'wn')}>{cr.domain.status === 'active' ? 'Ativo' : 'Aguardando DNS'}</span><span className="xs mut sp">Pode levar algumas horas para o DNS propagar. O certificado HTTPS do domínio é configurado no servidor.</span><button className="btn sec sm" onClick={check}>Verificar agora</button></div></>}</div>
      <div className="card row" style={{ gap: 16 }}><div className="sq" style={{ width: 96, height: 96, background: '#fff', border: '1px solid var(--line)', display: 'grid', placeItems: 'center' }}>{qr && <img src={qr} alt="QR code do mapa" width="88" height="88" />}</div>
        <div className="sp col" style={{ gap: 6 }}><b>QR code</b><div className="row wrap">{[['map', 'Cor do mapa'], ['black', 'Preto'], ['logo', 'Com logo']].map(([k, l]) => <button key={k} className={'chip' + (qrStyle === k ? ' on' : '')} onClick={() => setQrStyle(k)}>{l}</button>)}</div><div className="row"><button className="btn sec sm" onClick={() => download('png')}>Baixar PNG</button><button className="btn sec sm" onClick={() => download('svg')}>Baixar SVG</button></div>{qrStyle === 'logo' && <span className="xs mut">O logo entra só no PNG.</span>}</div></div>
      <div className="card col" style={{ gap: 8 }}><div className="row jb"><b>Imagem de compartilhamento</b><span className="tag wn">Imagem em breve</span></div><div className="row" style={{ gap: 14, flexWrap: 'wrap' }}><div style={{ borderRadius: 12, overflow: 'hidden', width: 'min(300px, 100%)', flex: 'none' }}><FakeMap h={157} tone={T.tone} shape={T.shape} acc={T.accent} colors={Object.fromEntries(T.categories.filter((c) => !/^custom:/.test(c.icon)).map((c) => [c.icon, c.color]))} n={9} lab={false} /></div><div className="sp"><b className="sm">{cr.displayName}</b><div className="sm mut">{s.real.length} lugares indicados em São Paulo</div><div className="xs mut" style={{ marginTop: 6 }}>Ao colar o link em apps de mensagem, o título e a descrição já aparecem. A imagem do cartão ainda não é gerada: o desenho ao lado é só uma prévia ilustrativa.</div></div></div></div>
    </Shell>
  )
}

// D10 · modelos prontos
export function StudioTemplates() {
  const { setTheme } = useStudio()
  const { theme } = useStudio()
  return (
    <Shell active="modelos" layout="full" title="Modelos">
      <div className="row jb wrap"><div><h1 className="d s32">Modelos prontos</h1><p className="sm mut">Escolha um ponto de partida. Dá para ajustar tudo depois.</p></div><button className="btn ln sm" onClick={() => { if (confirm('Voltar ao visual padrão? As categorias mantêm nome e símbolo.')) setTheme((t) => applyTemplate(t, { t: { accent: '#ff4b2b', bg: '#ffffff', fg: '#171717', tone: 'light', shape: 'drop', font: 'sans', radius: 14 }, pal: 'warm' })) }}>Começar do zero</button></div>
      <div className="g3" style={{ gap: 18 }}>
        {TEMPLATES.map((tpl) => {
          const preview = applyTemplate(theme, tpl)
          return (
            <div key={tpl.id} className="card col" style={{ padding: 12, gap: 10 }}>
              <div style={{ display: 'grid', placeItems: 'center', background: '#efeeec', borderRadius: 14, padding: 12, overflow: 'hidden', height: 300 }}><div style={{ transform: 'scale(.42)', transformOrigin: 'top center', height: 260 }}><PhonePreview themeOverride={preview} /></div></div>
              <div className="row jb"><b>{tpl.name}</b><button className="btn sm" onClick={() => { setTheme(applyTemplate(theme, tpl)); toast(`Modelo ${tpl.name} aplicado ao rascunho`); navigate('/estudio') }}>Usar</button></div>
            </div>)
        })}
      </div>
    </Shell>
  )
}

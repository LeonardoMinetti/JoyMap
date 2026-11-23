import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../api.js'
import { Link, navigate, toast } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import { Logo, Guard, Loading, Note, Switch, Side, useTitle } from '../lib/ui.jsx'
import { useMe } from '../lib/me.jsx'
import FakeMap from '../FakeMap.jsx'
import MapCanvas from '../MapCanvas.jsx'
import MapSheet from '../pub/MapSheet.jsx'
import { pubVars } from '../pub/shared.jsx'
import { LIBS, SAMPLE_ICON } from '../iconcat.js'
import { CATEGORIES } from '../../../server/theme.js'
import { demoPlaces } from '../demoData.js'
import { Phone, Native } from '../landing/device.jsx'
import { ACCENTS, CAT_COLORS, FONTS, RADIUS_MODES, SHAPES, SYMBOL_LIBRARY, TEMPLATES, TONES, applyTemplate, catOf, contrast, onAccent, radiusMode, symOf } from '../theme.jsx'

// Lugares de exemplo com foto (as mesmas fotos livres usadas na demonstração), só até o criador confirmar os dele
const SAMPLE_CATS = ['rest', 'cafe', 'bread', 'pizza', 'bar', 'burger', 'cake']
const SAMPLE = demoPlaces().slice(0, 9).map((p, i) => ({ ...p, id: -(i + 1), category: SAMPLE_CATS.includes(p.category) ? p.category : 'rest', postedOn: '2026-09-12', ad: false }))

const Ctx = createContext(null)
const useStudio = () => useContext(Ctx)

// Rascunho do estúdio: tudo muda na prévia na hora e só vai ao ar quando o criador publica as alterações.
function StudioProvider({ children }) {
  const { me, reload } = useMe()
  const c = me.creator
  const [theme, setT] = useState(c.theme)
  const [snap, setSnap] = useState(() => JSON.stringify(c.theme))
  const [places, setPlaces] = useState(null)
  const [routes, setRoutes] = useState([])
  const [coverVer, setCoverVer] = useState(0)
  const loadPlaces = useCallback(() => { api('/creator/places').then((d) => setPlaces(d.places)); api('/creator/routes').then((d) => setRoutes(d.routes)) }, [])
  useEffect(() => { loadPlaces() }, [loadPlaces])
  const setTheme = (patch) => setT((t) => ({ ...t, ...(typeof patch === 'function' ? patch(t) : patch) }))
  const dirty = JSON.stringify(theme) !== snap
  const publish = async () => {
    const r = await api('/creator/theme', { method: 'PUT', body: theme })
    setT(r.theme); setSnap(JSON.stringify(r.theme))
    await reload(); toast('Alterações publicadas')
  }
  const undo = () => setT(JSON.parse(snap))
  const real = (places || []).filter((p) => p.status === 'confirmed' && p.lat != null)
  const data = useMemo(() => ({
    creator: { handle: c.handle, tiktok: c.tiktok, slug: c.slug, displayName: c.displayName, theme, links: [], cover: theme.layout.cover && c.hasCover, coverUrl: '/api/creator/cover', symbols: c.symbols },
    places: real.length ? real : SAMPLE, routes: routes.filter((r) => r.placeIds.length).map((r) => ({ ...r, placeIds: r.placeIds })),
  }), [theme, places, routes, c])
  return <Ctx.Provider value={{ c, theme, setTheme, dirty, publish, undo, places: places || [], real, data, usingSample: !real.length, loadPlaces, coverVer, bumpCover: () => setCoverVer((v) => v + 1), routes, setRoutes, reload }}>{children}</Ctx.Provider>
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

// Prévia principal do Estúdio: iPhone com a tela real que o seguidor vê. Cada aba do Estúdio abre a tela em que a edição aparece.
const VIEWS = [['map', 'Mapa', 'Pins, cores, símbolos e o estilo do mapa.'], ['place', 'Lugar', 'O pin selecionado e o cartão do lugar.'], ['list', 'Lista', 'A lista de lugares.']]
const VIEW_FOR = { modelos: 'map', cores: 'map', categorias: 'map', mapa: 'map', pins: 'place' }
function StudioPhone({ active, fake }) {
  const s = useStudio()
  const theme = s.data.creator.theme
  const [pick, setPick] = useState(null) // escolha manual do visitante; some ao trocar de aba do Estúdio
  useEffect(() => { setPick(null) }, [active])
  const view = pick || VIEW_FOR[active] || 'map'
  const places = s.data.places
  const f = useMemo(() => ({ cats: [], setCats: () => {}, q: '', clear: () => {} }), [])
  // pulso suave quando uma edição muda a prévia
  const [flash, setFlash] = useState(false)
  const sig = JSON.stringify(theme)
  const first = useRef(true)
  useEffect(() => { if (first.current) { first.current = false; return } setFlash(true); const t = setTimeout(() => setFlash(false), 800); return () => clearTimeout(t) }, [sig])
  const cap = VIEWS.find((v) => v[0] === view)[2]
  return (
    <div className="stp">
      <div className="stp-seg" role="tablist" aria-label="Tela da prévia">
        {VIEWS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={view === k} className={view === k ? 'on' : ''} onClick={() => setPick(k)}>{l}</button>)}
      </div>
      <div className={'stp-ph' + (flash ? ' flash' : '')}>
        <Phone h={600} label="Prévia do seu mapa público, como o seguidor vê no celular">
          <Native h={600} theme={theme}>
            <div className="pub preview" style={{ ...pubVars(theme), height: '100%' }}>
              <MapSheet key={view} data={s.data} shown={places} f={f} selectedId={view === 'place' ? places[0]?.id : null} preview fake={fake || s.usingSample} snap={view === 'list' ? 'full' : view === 'place' ? 'half' : 'low'} />
            </div>
          </Native>
        </Phone>
      </div>
      <p className="stp-cap"><b>{VIEWS.find((v) => v[0] === view)[1]}</b> · {cap}</p>
    </div>
  )
}

const NAV = [['modelos', 'Modelos', 'layers', '/estudio/modelos'], ['cores', 'Cores e tema', 'palette', '/estudio/cores'], ['categorias', 'Categorias', 'grid', '/estudio/categorias'], ['pins', 'Pins e símbolos', 'flag', '/estudio/pins'],
  ['mapa', 'Estilo do mapa', 'pin', '/estudio/mapa']]
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
          {layout !== 'full' && <div className="prev"><div><StudioPhone active={active} fake={fake} />{s.usingSample && <div className="xs mut c" style={{ marginTop: 10, maxWidth: 300 }}>Prévia com lugares de exemplo. Confirme lugares para ver os seus.</div>}</div></div>}
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
        {mini('/estudio/categorias', <div className="row" style={{ gap: 6 }}>{T.categories.slice(0, 3).map((c) => { const { n, sym } = symOf(c, s.c.symbols); return <Icon key={c.id} n={n} sym={sym} s={22} c={c.color} /> })}</div>, 'Categorias', 'A cor de cada uma')}
        {mini('/estudio/pins', <div className="row" style={{ gap: 6 }}>{sq('#ff4b2b', '50%', 22)}{sq('#2d7ff9', 6, 22)}<i className="sq" style={{ width: 22, height: 22, background: '#12b76a', clipPath: 'polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0 50%)' }} /></div>, 'Pins e símbolos', 'Formato e pacote de símbolos')}
        {mini('/estudio/mapa', <div style={{ borderRadius: 8, overflow: 'hidden', height: 30 }}><FakeMap h={30} tone={T.tone} n={0} lab={false} /></div>, 'Estilo do mapa', 'Base e rótulos')}
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

// D3 · categorias (lista fixa do wagli: só cor e símbolo mudam)
export function StudioCategories() {
  const { theme: T, setTheme, places, c: cr } = useStudio()
  const [sel, setSel] = useState(null)
  const count = (id) => places.filter((p) => p.category === id && (p.status === 'confirmed' || p.status === 'pending')).length
  const setCat = (i, patch) => setTheme((t) => ({ categories: t.categories.map((x, j) => (j === i ? { ...x, ...patch } : x)) }))
  return (
    <Shell active="categorias" title="Categorias">
      <h1 className="d s32">Categorias</h1>
      <p className="sm mut">As categorias são as mesmas para todos os mapas, para os seguidores acharem tudo do mesmo jeito. Você escolhe a cor de cada uma. Os símbolos vêm do pacote escolhido em Pins e símbolos.</p>
      {T.categories.map((cat, i) => {
        const { n, sym } = symOf(cat, cr.symbols)
        const open = sel === i
        return (
          <div key={cat.id} className={'card' + (open ? ' sel col' : '')} style={open ? { gap: 12 } : undefined}>
            <div className="row"><span className="catico" style={{ background: cat.color }}><Icon n={n} sym={sym} s={18} c="#fff" /></span>
              <div className="sp"><b className="sm">{cat.name}</b><div className="xs mut">{count(cat.id)} lugares</div></div>
              <button aria-label={open ? 'Fechar edição' : `Editar ${cat.name}`} style={{ background: 'none', border: 0, padding: 4 }} onClick={() => setSel(open ? null : i)}><Icon n={open ? 'check' : 'edit'} s={18} /></button></div>
            {open && <>
              <div><span className="lb">Cor</span><div className="row" style={{ gap: 8 }}>{[cat.color, ...CAT_COLORS.filter((x) => x !== cat.color)].slice(0, 5).map((col) => <button key={col} aria-label={`Cor ${col}`} className={'dotsw' + (cat.color === col ? ' on' : '')} style={{ background: col }} onClick={() => setCat(i, { color: col })} />)}
                <label className="chip" style={{ position: 'relative' }}>Outra<input type="color" className="sr" value={cat.color} onChange={(e) => setCat(i, { color: e.target.value })} aria-label="Outra cor da categoria" /></label></div></div>
            </>}
          </div>)
      })}
    </Shell>
  )
}

// D4 · biblioteca de símbolos
// Pacote de símbolos: vale para todas as categorias de uma vez (o criador não escolhe símbolo por categoria)
const PACKS = [['base', 'Básicos', 'Ícones simples do wagli'], ...Object.entries(LIBS).map(([k, v]) => [k, v.label, v.long])]
const packIcon = (pack, cat) => (pack === 'base' ? CATEGORIES.find((c) => c.id === cat.id).icon : `lib:${pack}:${SAMPLE_ICON[pack][cat.id]}`)
function SymbolPicker() {
  const { theme: T, setTheme, c: cr } = useStudio()
  const current = PACKS.find(([k]) => T.categories.every((c) => c.icon === packIcon(k, c)))?.[0] || null
  const apply = (k, label) => { setTheme((t) => ({ categories: t.categories.map((c) => ({ ...c, icon: packIcon(k, c) })) })); toast(`Pacote ${label} aplicado a todas as categorias`) }
  const show = (k, c) => { const id = packIcon(k, c); const lib = LIBS[k]; return <span key={c.id} title={c.name} style={{ width: 34, height: 34, borderRadius: '50%', background: lib?.color ? '#f1f1f4' : c.color, display: 'grid', placeItems: 'center' }}>{k === 'base' ? <Icon {...symOf({ icon: id }, cr.symbols)} s={18} c="#fff" /> : <Icon sym={{ lib: id }} s={lib.color ? 24 : 18} c="#fff" />}</span> }
  return (
    <>
      <div><h2 className="d s26">Pacote de símbolos</h2><p className="sm mut">O pacote vale para todas as categorias de uma vez, no mapa e nos pins.</p></div>
      <div className="col" style={{ gap: 10 }}>{PACKS.map(([k, label, desc]) => (
        <button key={k} type="button" className={'card col' + (current === k ? ' sel' : '')} style={{ gap: 10, textAlign: 'left' }} aria-pressed={current === k} onClick={() => apply(k, label)}>
          <div className="row jb"><div><b className="sm">{label}</b><div className="xs mut">{desc}{LIBS[k] ? `. Licença ${LIBS[k].license}.` : ''}</div></div>{current === k && <span className="tag ok">Em uso</span>}</div>
          <div className="row wrap" style={{ gap: 8 }}>{T.categories.map((c) => show(k, c))}</div>
        </button>))}</div>
    </>
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
      <Note>Os estilos de mapa são do OpenFreeMap (Positron, Bright, Fiord e Dark), sobre dados do OpenStreetMap. Revise o uso dos tiles antes do lançamento. Créditos dos símbolos: <a className="link" href="/licencas-simbolos.txt" target="_blank" rel="noopener">licenças</a>.</Note>
    </Shell>
  )
}

// D6 · pins e símbolos (juntos)
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
    <Shell active="pins" title="Pins e símbolos">
      <h1 className="d s32">Pins e símbolos</h1>
      <h2 className="d s26">Pin</h2>
      <div><Lb>Formato</Lb><div className="g4" style={{ gap: 8 }}>{Object.entries(SHAPES).map(([k, l]) => <button key={k} className={'card col' + (T.shape === k ? ' sel' : '')} style={{ alignItems: 'center', padding: 10, gap: 6 }} onClick={() => setTheme({ shape: k })}>{shapeBox(k)}<span className="xs">{l}</span></button>)}</div></div>
      <div className="row"><div className="sp"><b className="sm">Borda branca</b><div className="xs mut">Melhora a leitura em mapas escuros</div></div><Switch on={T.pinBorder} onChange={(v) => setTheme({ pinBorder: v })} label="Borda branca" /></div>
      <div className="row"><div className="sp"><b className="sm">Agrupar pins próximos</b><div className="xs mut">Mostra o total quando o zoom é baixo</div></div><Switch on={T.cluster} onChange={(v) => setTheme({ cluster: v })} label="Agrupar pins próximos" /></div>
      <div className="card soft row" style={{ gap: 14 }}><span style={{ width: 40, height: 40, borderRadius: '50%', background: '#171717', color: '#fff', display: 'grid', placeItems: 'center', font: '700 16px Archivo' }}>12</span><span style={{ width: 34, height: 34, borderRadius: '50%', background: '#171717', color: '#fff', display: 'grid', placeItems: 'center', font: '700 14px Archivo' }}>5</span><span className="sm mut sp">Estilo do grupo: círculo escuro com contagem</span></div>
      <div><Lb>Pin selecionado</Lb><div className="row wrap">{[['outline', 'Maior com contorno'], ['pulse', 'Pulsando'], ['color', 'Só cor']].map(([k, l]) => <button key={k} className={'chip' + (T.selected === k ? ' on' : '')} onClick={() => setTheme({ selected: k })}>{l}</button>)}</div></div>
      <div className="sep" />
      <SymbolPicker />
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

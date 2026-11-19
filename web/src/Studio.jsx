import React, { useEffect, useMemo, useState } from 'react'
import { api } from './api.js'
import PublicPage from './PublicPage.jsx'
import { ACCENTS, FONTS, ICON_PATHS, Icon, SHAPES, TONES } from './theme.jsx'

const ICONS = ['rest', 'cafe', 'bar', 'bread', 'cake', 'pizza', 'fish', 'burger', 'heart', 'star', 'flag', 'store', 'clock', 'spark']
const PREVIEW_PLACES = [
  [-23.5629, -46.6855, 'cafe', 'Café Exemplo'], [-23.5489, -46.6388, 'bread', 'Forno Aurora'], [-23.5995, -46.6665, 'fish', 'Casa Maré'],
  [-23.5505, -46.6333, 'bar', 'Bar Modelo'], [-23.5614, -46.6559, 'burger', 'Burger Teste'], [-23.5329, -46.6395, 'cake', 'Doce Ensaio'], [-23.6107, -46.6933, 'rest', 'Brasa Demo'],
].map(([lat, lon, category, name], id) => ({ id: id + 1, name, lat, lon, category, address: 'Endereço de exemplo, 100', municipality: 'São Paulo', geoQuality: 'address_exact', ad: id === 3, postUrl: null, tiktokId: null }))

export default function Studio({ c, reload }) {
  const [theme, setTheme] = useState(c.theme)
  const [saved, setSaved] = useState(true)
  const set = (patch) => { setTheme((t) => ({ ...t, ...(typeof patch === 'function' ? patch(t) : patch) })); setSaved(false) }
  const setCat = (i, patch) => set((t) => ({ categories: t.categories.map((x, j) => (j === i ? { ...x, ...patch } : x)) }))
  const [real, setReal] = useState(null)
  useEffect(() => { api('/creator/places').then((d) => setReal(d.places.filter((p) => p.status === 'confirmed' && p.lat))) }, [])
  const places = real && real.length ? real : PREVIEW_PLACES
  const data = useMemo(() => ({ creator: { handle: c.handle, slug: c.slug, displayName: c.displayName, theme, links: c.links }, places }), [theme, places, c])
  const save = async () => { const r = await api('/creator/theme', { method: 'PUT', body: theme }); setTheme(r.theme); setSaved(true); reload() }
  return (
    <div className="studio">
      <div className="col sctl">
        <div className="row jb"><h1 className="d s32">Estúdio de estilo</h1><button className="btn sm" disabled={saved} onClick={save}>{saved ? 'Salvo' : 'Salvar'}</button></div>
        <div><span className="lb">Cor principal</span><div className="row wrap" style={{ gap: 8 }}>
          {ACCENTS.map((a) => <button key={a} aria-label={`Cor ${a}`} onClick={() => set({ accent: a })} className="swatch" style={{ background: a, boxShadow: theme.accent === a ? '0 0 0 3px #fff, 0 0 0 5px #171717' : 'none' }} />)}
          <input type="color" aria-label="Outra cor" value={theme.accent} onChange={(e) => set({ accent: e.target.value })} className="colorin" /></div></div>
        <div className="g2"><div><span className="lb">Fundo</span><input type="color" aria-label="Cor de fundo" value={theme.bg} onChange={(e) => set({ bg: e.target.value })} className="colorin wide" /></div>
          <div><span className="lb">Texto</span><input type="color" aria-label="Cor do texto" value={theme.fg} onChange={(e) => set({ fg: e.target.value })} className="colorin wide" /></div></div>
        <div><span className="lb">Fonte</span><div className="row wrap">{Object.entries(FONTS).map(([k, f]) => <button key={k} className={'chip' + (theme.font === k ? ' on' : '')} style={{ fontFamily: f.css }} onClick={() => set({ font: k })}>{f.label}</button>)}</div></div>
        <div><span className="lb">Estilo do mapa</span><div className="row wrap">{Object.entries(TONES).map(([k, t]) => <button key={k} className={'chip' + (theme.tone === k ? ' on' : '')} onClick={() => set({ tone: k })}><i className="tdot" style={{ background: t.tint, border: '1px solid #bbb' }} />{t.label}</button>)}</div></div>
        <div><span className="lb">Formato do pin</span><div className="row wrap">{Object.entries(SHAPES).map(([k, l]) => <button key={k} className={'chip' + (theme.shape === k ? ' on' : '')} onClick={() => set({ shape: k })}>{l}</button>)}</div></div>
        <div><span className="lb">Cantos: {theme.radius}px</span><input type="range" min="0" max="32" value={theme.radius} aria-label="Cantos" onChange={(e) => set({ radius: Number(e.target.value) })} style={{ width: '100%' }} /></div>
        <div className="row"><label className="check"><input type="checkbox" checked={theme.showLinks} onChange={(e) => set({ showLinks: e.target.checked })} /> Mostrar links da bio</label><label className="check"><input type="checkbox" checked={theme.showFilters} onChange={(e) => set({ showFilters: e.target.checked })} /> Mostrar filtros</label></div>
        <div><label className="lb" htmlFor="bio">Bio (até 160 caracteres)</label><textarea id="bio" className="in" rows="2" maxLength="160" value={theme.bio} onChange={(e) => set({ bio: e.target.value })} /></div>
        <div className="col" style={{ gap: 8 }}><span className="lb">Categorias, cores e símbolos</span>
          {theme.categories.map((cat, i) => (
            <div key={cat.id} className="card col" style={{ gap: 8, padding: 10 }}>
              <div className="row"><span className="catico" style={{ background: cat.color }}><Icon n={cat.icon} s={18} c="#fff" /></span>
                <input className="in sp" aria-label="Nome da categoria" value={cat.name} onChange={(e) => setCat(i, { name: e.target.value })} />
                <input type="color" aria-label="Cor da categoria" value={cat.color} onChange={(e) => setCat(i, { color: e.target.value })} className="colorin" />
                <button className="btn ln sm" aria-label="Remover categoria" disabled={theme.categories.length <= 1} onClick={() => set({ categories: theme.categories.filter((_, j) => j !== i) })}><Icon n="trash" s={14} /></button></div>
              <div className="row wrap" style={{ gap: 4 }}>{ICONS.map((n) => <button key={n} aria-label={`Símbolo ${n}`} className={'icobtn' + (cat.icon === n ? ' on' : '')} onClick={() => setCat(i, { icon: n })}><Icon n={n} s={16} /></button>)}</div>
            </div>))}
          <button className="btn ln sm" disabled={theme.categories.length >= 16} onClick={() => set({ categories: [...theme.categories, { id: `cat${Date.now().toString(36)}`, name: 'Nova categoria', color: theme.accent, icon: 'star' }] })}><Icon n="plus" s={16} />Nova categoria</button>
          <span className="xs mut">Envio de símbolo próprio (SVG) vem na próxima versão.</span>
        </div>
      </div>
      <div className="sprev"><div className="phoneframe"><PublicPage preview data={data} /></div>
        <span className="xs mut">{real && real.length ? 'Prévia com os seus lugares confirmados.' : 'Prévia com lugares de exemplo. Confirme lugares para ver os seus.'}</span></div>
    </div>
  )
}

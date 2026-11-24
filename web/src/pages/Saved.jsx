import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Link } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import { Top, Loading, useTitle } from '../lib/ui.jsx'
import { useMe } from '../lib/me.jsx'
import { STATIC, withBase } from '../lib/base.js'

// Meus salvos: os lugares guardados de todos os mapas. Com conta, vêm do servidor; sem conta, dos que ficaram neste aparelho.
const localSlugs = () => { try { return Object.keys(localStorage).filter((k) => k.startsWith('wagli_saved_')).map((k) => k.slice('wagli_saved_'.length)) } catch { return [] } }
async function fromDevice() {
  const out = []
  for (const slug of localSlugs()) {
    let ids = []
    try { ids = JSON.parse(localStorage.getItem(`wagli_saved_${slug}`) || '[]') } catch { /* vazio */ }
    if (!ids.length) continue
    try {
      const d = await api(`/public/${slug}`)
      for (const p of d.places) if (ids.includes(p.id)) out.push({ placeId: p.id, slug, creator: d.creator.displayName, handle: d.creator.handle, name: p.name, neighborhood: p.neighborhood, municipality: p.municipality, photo: p.photo })
    } catch { /* mapa fora do ar */ }
  }
  return out
}

export default function Saved() {
  useTitle('Meus salvos')
  const { me } = useMe()
  const logged = !!me?.user && !STATIC
  const [rows, setRows] = useState(null)
  useEffect(() => {
    let on = true
    ;(logged ? api('/saved').then((d) => d.saved).catch(() => []) : fromDevice()).then((r) => on && setRows(r))
    return () => { on = false }
  }, [logged])
  const groups = (rows || []).reduce((m, r) => { (m[r.slug] = m[r.slug] || { creator: r.creator, handle: r.handle, items: [] }).items.push(r); return m }, {})
  return (
    <div className="page lp">
      <Top active={-1} />
      <div className="w" style={{ paddingTop: 40, paddingBottom: 64, maxWidth: 760 }}>
        <h1 className="d s56">Meus salvos</h1>
        <p className="mut" style={{ marginTop: 6 }}>{logged ? 'Os lugares que você guardou na sua conta, de todos os mapas.' : 'Os lugares que você guardou neste aparelho, de todos os mapas.'}</p>
        {!logged && !STATIC && <div className="note row" style={{ marginTop: 16 }}><span className="sp">Entre com e-mail, sem senha, para guardar seus salvos na conta e ver em qualquer aparelho.</span><Link className="btn sm" to="/entrar?como=usuario&voltar=%2Fsalvos">Entrar</Link></div>}
        {STATIC && <div className="note" style={{ marginTop: 16 }}>Na demonstração não há conta de espectador: os salvos ficam só neste aparelho.</div>}
        {!rows ? <Loading /> : !rows.length ? <p className="mut" style={{ marginTop: 28 }}>Nada salvo ainda. Abra um mapa e toque no coração de um lugar.</p> : (
          <div className="col" style={{ gap: 28, marginTop: 28 }}>
            {Object.entries(groups).map(([slug, g]) => (
              <section key={slug} className="col" style={{ gap: 10 }}>
                <div className="row jb"><div><b className="d s26">{g.creator}</b><div className="xs mut">@{g.handle}</div></div><Link className="link sm" to={`/@${slug}`}>Abrir o mapa</Link></div>
                {g.items.map((p) => (
                  <Link key={p.placeId} to={`/@${slug}/lugar/${p.placeId}`} className="card row" style={{ gap: 14, padding: 12, textDecoration: 'none', color: 'inherit' }}>
                    {p.photo ? <img src={withBase(p.photo)} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12, flex: 'none' }} /> : <span className="catico" style={{ width: 64, height: 64, borderRadius: 12, background: '#eee' }}><Icon n="pin" s={22} c="#888" /></span>}
                    <div className="sp"><b>{p.name}</b><div className="sm mut">{p.neighborhood || p.municipality || 'São Paulo'}</div></div>
                    <Icon n="next" s={18} />
                  </Link>))}
              </section>))}
          </div>)}
      </div>
    </div>
  )
}

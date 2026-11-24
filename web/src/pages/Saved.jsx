import React, { useEffect, useState } from 'react'
import { api } from '../api.js'
import { Link, navigate } from '../lib/router.jsx'
import { Icon } from '../lib/icons.jsx'
import { ExplorerPage, Loading, useTitle } from '../lib/ui.jsx'
import { useMe } from '../lib/me.jsx'
import { STATIC, withBase } from '../lib/base.js'
import { initial } from '../theme.jsx'

// Espaço do explorador: três abas, só isto. Salvos (lugares de todos os mapas), Criadores (de quem você salvou) e Conta.
// Com conta, os salvos vêm do servidor; sem conta, dos que ficaram neste aparelho.
const localSlugs = () => { try { return Object.keys(localStorage).filter((k) => k.startsWith('wagli_saved_')).map((k) => k.slice('wagli_saved_'.length)) } catch { return [] } }
async function fromDevice() {
  const out = []
  for (const slug of localSlugs()) {
    let ids = []
    try { ids = JSON.parse(localStorage.getItem(`wagli_saved_${slug}`) || '[]') } catch { /* vazio */ }
    if (!ids.length) continue
    try {
      const d = await api(`/public/${slug}`)
      for (const p of d.places) if (ids.includes(p.id)) out.push({ placeId: p.id, slug, creator: d.creator.displayName, handle: d.creator.handle, avatarUrl: d.creator.avatarUrl, name: p.name, neighborhood: p.neighborhood, municipality: p.municipality, photo: p.photo })
    } catch { /* mapa fora do ar */ }
  }
  return out
}
const TABS = [['salvos', 'Salvos', 'heart', '/salvos'], ['criadores', 'Criadores', 'map', '/salvos/criadores'], ['conta', 'Conta', 'user', '/salvos/conta']]
const TITLE = { salvos: 'Meus salvos', criadores: 'Criadores', conta: 'Conta' }

export default function Saved({ tab = 'salvos' }) {
  useTitle(TITLE[tab])
  const { me } = useMe()
  const logged = !!me?.user && !STATIC
  const [rows, setRows] = useState(null)
  useEffect(() => {
    let on = true
    ;(logged ? api('/saved').then((d) => d.saved).catch(() => []) : fromDevice()).then((r) => on && setRows(r))
    return () => { on = false }
  }, [logged])
  const groups = Object.values((rows || []).reduce((m, r) => { (m[r.slug] = m[r.slug] || { slug: r.slug, creator: r.creator, handle: r.handle, avatarUrl: r.avatarUrl, items: [] }).items.push(r); return m }, {}))
  const SUB = { salvos: logged ? 'Os lugares que você guardou na sua conta, de todos os mapas.' : 'Os lugares que você guardou neste aparelho, de todos os mapas.', criadores: 'Os criadores de quem você salvou lugares.', conta: 'Seus dados de acesso.' }
  return (
    <ExplorerPage active={tab}>
      <div><h1 className="d s44">{TITLE[tab]}</h1><p className="mut sm" style={{ marginTop: 6 }}>{SUB[tab]}</p></div>
      {tab === 'conta' ? <Account me={me} /> : !rows ? <Loading /> : tab === 'salvos' ? <Places groups={groups} me={me} /> : <Creators groups={groups} />}
    </ExplorerPage>
  )
}

function Places({ groups, me }) {
  return (
    <>
      {!me?.user && <div className="note row" style={{ marginBottom: 20 }}><span className="sp">Entre como explorador para guardar seus salvos na conta e ver em qualquer aparelho.</span><Link className="btn sm" to="/entrar?como=explorador&voltar=%2Fsalvos">Entrar</Link></div>}
      {STATIC && me?.user && <div className="note" style={{ marginBottom: 20 }}>Na demonstração, os salvos ficam só neste aparelho.</div>}
      {!groups.length ? <p className="mut">Nada salvo ainda. Abra um mapa e toque no coração de um lugar.</p> : (
        <div className="col" style={{ gap: 28 }}>
          {groups.map((g) => (
            <section key={g.slug} className="col" style={{ gap: 10 }}>
              <div className="row jb"><div><b className="d s26">{g.creator}</b><div className="xs mut">@{g.handle}</div></div><Link className="link sm" to={`/@${g.slug}`}>Abrir o mapa</Link></div>
              {g.items.map((p) => (
                <Link key={p.placeId} to={`/@${g.slug}/lugar/${p.placeId}`} className="card row" style={{ gap: 14, padding: 12, textDecoration: 'none', color: 'inherit' }}>
                  {p.photo ? <img src={withBase(p.photo)} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12, flex: 'none' }} /> : <span className="catico" style={{ width: 64, height: 64, borderRadius: 12, background: '#eee' }}><Icon n="pin" s={22} c="#888" /></span>}
                  <div className="sp"><b>{p.name}</b><div className="sm mut">{p.neighborhood || p.municipality || 'São Paulo'}</div></div>
                  <Icon n="next" s={18} />
                </Link>))}
            </section>))}
        </div>)}
    </>
  )
}

// Criadores de quem você salvou lugares
function Creators({ groups }) {
  if (!groups.length) return (
    <div className="col" style={{ gap: 12, alignItems: 'flex-start' }}>
      <p className="mut">Os criadores aparecem aqui quando você salva um lugar do mapa deles.</p>
      <Link className="btn" to="/@demo">Explorar um mapa</Link>
    </div>
  )
  return (
    <div className="col" style={{ gap: 12 }}>
      {groups.map((g) => (
        <Link key={g.slug} to={`/@${g.slug}`} className="card row" style={{ gap: 14, padding: 14, textDecoration: 'none', color: 'inherit' }}>
          {g.avatarUrl ? <img src={withBase(g.avatarUrl)} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flex: 'none' }} /> : <span className="av">{initial(g.creator)}</span>}
          <div className="sp"><b>{g.creator}</b><div className="sm mut">@{g.handle} · {g.items.length} {g.items.length === 1 ? 'lugar salvo' : 'lugares salvos'}</div></div>
          <Icon n="next" s={18} />
        </Link>))}
    </div>
  )
}

function Account({ me }) {
  const { reload } = useMe()
  const out = async () => { await api('/auth/logout', { method: 'POST' }); await reload(); navigate('/') }
  if (!me?.user) return (
    <div className="card col" style={{ gap: 12, alignItems: 'flex-start' }}>
      <b>Você ainda não entrou</b>
      <span className="sm mut">Com uma conta, seus salvos ficam guardados e aparecem em qualquer aparelho.</span>
      <div className="row wrap"><Link className="btn" to="/entrar?como=explorador&voltar=%2Fsalvos">Entrar</Link><Link className="btn ln" to="/entrar?como=explorador&criar=1&voltar=%2Fsalvos">Criar conta</Link></div>
    </div>
  )
  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card col" style={{ gap: 4 }}><span className="eb">E-mail</span><b>{me.user.email}</b><span className="sm mut">Seus salvos são só seus: o criador não sabe quem salvou.</span></div>
      {!me.creator && <div className="card row jb wrap"><div className="sp"><b>Tem um mapa de indicações?</b><div className="sm mut">Peça o seu e tenha painel, Estúdio de estilo e métricas.</div></div><Link className="btn sm" to="/entrar?criar=1">Quero meu mapa</Link></div>}
      <button type="button" className="btn ln" style={{ alignSelf: 'flex-start' }} onClick={out}>Sair</button>
    </div>
  )
}

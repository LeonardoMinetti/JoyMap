import React, { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'
import PublicPage from './PublicPage.jsx'
import Dashboard from './Dashboard.jsx'
import Admin from './Admin.jsx'

const hash = () => (location.hash.replace(/^#\/?/, '') || '').split('?')[0]
export const Logo = () => <a className="logo" href="#/"><i />MAPA<b>SP</b></a>

function Landing({ me }) {
  return (
    <div className="landing">
      <header className="lhead"><Logo /><nav>{me?.user ? <a className="btn sm" href="#/painel">Meu painel</a> : <><a className="btn ln sm" href="#/entrar">Entrar</a><a className="btn sm" href="#/candidatura">Quero meu mapa</a></>}</nav></header>
      <section className="lhero">
        <div className="col" style={{ gap: 18 }}>
          <span className="tag ax">Para criadores que indicam lugares</span>
          <h1 className="d s72">Seus lugares indicados, num mapa com a sua cara.</h1>
          <p className="s16 mut">Você cola os posts, a gente identifica os lugares e localiza no mapa. Você revisa, personaliza cada detalhe e coloca o link na bio.</p>
          <div className="row"><a className="btn big" href="#/candidatura">Quero meu mapa</a><a className="btn ln big" href="#/entrar">Entrar</a></div>
          <p className="xs mut">Para perfis com um mínimo de seguidores. Você aprova tudo antes de publicar.</p>
        </div>
        <div className="lcards">
          {['Símbolo por categoria', 'Cores e fonte', 'Formato de pin', 'Estilo do mapa'].map((t) => <div key={t} className="card"><b>{t}</b><span className="sm mut">Tudo muda na prévia em tempo real.</span></div>)}
        </div>
      </section>
    </div>
  )
}

function Entrar() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(null)
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try { setSent(await api('/auth/request', { method: 'POST', body: { email } })) } catch (x) { setErr(x.message === 'email_invalido' ? 'Digite um e-mail válido.' : 'Não foi possível enviar. Tente de novo.') }
  }
  return (
    <div className="center"><Logo />
      <form className="card formcard" onSubmit={submit}>
        <h1 className="d s44">Acesse sem senha</h1>
        {location.hash.includes('erro=link') && <p className="note">Este link expirou ou já foi usado. Peça outro.</p>}
        {!sent ? (<>
          <p className="mut sm">Enviamos um link de acesso para o seu e-mail. Ele vale por 15 minutos e só funciona uma vez.</p>
          <label className="lb" htmlFor="em">E-mail</label>
          <input id="em" className="in" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" required />
          {err && <p className="err">{err}</p>}
          <button className="btn blk">Enviar link de acesso</button>
        </>) : (<>
          <p>Link enviado para <b>{email}</b>.</p>
          {sent.devLink ? <p className="note">Modo desenvolvimento (sem provedor de e-mail configurado): <a href={sent.devLink}>abrir o link de acesso</a></p> : <p className="mut sm">Confira o spam se não chegar.</p>}
        </>)}
      </form>
    </div>
  )
}

function Candidatura({ me, reload }) {
  const [cfg, setCfg] = useState({})
  const [f, setF] = useState({ handle: '', displayName: '', followers: '', acceptTerms: false })
  const [err, setErr] = useState('')
  useEffect(() => { api('/config').then(setCfg) }, [])
  if (!me?.user) return <div className="center"><Logo /><div className="card formcard"><h1 className="d s44">Peça seu mapa</h1><p className="mut">Primeiro confirme o seu e-mail.</p><a className="btn blk" href="#/entrar">Continuar com e-mail</a></div></div>
  if (me.creator) { location.hash = '#/painel'; return null }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setErr('')
    try { await api('/apply', { method: 'POST', body: { ...f, followers: Number(f.followers) } }); await reload(); location.hash = '#/painel' }
    catch (x) { setErr({ handle_invalido: 'Use só letras, números, ponto e sublinhado.', aceite_obrigatorio: 'É preciso aceitar os termos.' }[x.message] || 'Não foi possível enviar.') }
  }
  return (
    <div className="center"><Logo />
      <form className="card formcard" onSubmit={submit}>
        <h1 className="d s44">Conte quem é você</h1>
        <p className="mut sm">Analisamos cada perfil. Critério atual: no mínimo {cfg.minFollowers?.toLocaleString('pt-BR')} seguidores.</p>
        <label className="lb" htmlFor="h">Seu @ no Instagram ou TikTok</label>
        <input id="h" className="in" value={f.handle} onChange={set('handle')} placeholder="@seuperfil" required />
        <label className="lb" htmlFor="n">Nome de exibição</label>
        <input id="n" className="in" value={f.displayName} onChange={set('displayName')} placeholder="Como aparece no mapa" required />
        <label className="lb" htmlFor="s">Seguidores (a conferência final é nossa)</label>
        <input id="s" className="in" type="number" min="0" value={f.followers} onChange={set('followers')} required />
        <label className="check"><input type="checkbox" checked={f.acceptTerms} onChange={set('acceptTerms')} /> Sou o titular ou represento este perfil e aceito os Termos e a Política de Privacidade.</label>
        {err && <p className="err">{err}</p>}
        <button className="btn blk">Enviar candidatura</button>
      </form>
    </div>
  )
}

export default function App() {
  const [route, setRoute] = useState(hash())
  const [me, setMe] = useState(undefined)
  const reload = useCallback(() => api('/me').then(setMe).catch(() => setMe({ user: null })), [])
  useEffect(() => { reload(); const f = () => setRoute(hash()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [reload])

  const m = location.pathname.match(/^\/@([a-z0-9_-]+)\/?$/i)
  if (m) return <PublicPage slug={m[1].toLowerCase()} />
  if (me === undefined) return <div className="pubstate">Carregando…</div>
  if (route.startsWith('painel')) return me.user ? <Dashboard me={me} reload={reload} sub={route.split('/')[1] || ''} /> : <Entrar />
  if (route.startsWith('admin')) return me.user?.role === 'admin' ? <Admin /> : <div className="center"><div className="card formcard"><h1 className="d s32">Área restrita</h1><a className="btn" href="#/entrar">Entrar</a></div></div>
  if (route === 'entrar') return <Entrar />
  if (route === 'candidatura') return <Candidatura me={me} reload={reload} />
  return <Landing me={me} />
}

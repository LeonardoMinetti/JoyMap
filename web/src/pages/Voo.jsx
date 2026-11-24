import React, { useEffect, useState, useCallback } from 'react'
import { api } from '../api.js'
import { Link, navigate, toast } from '../lib/router.jsx'
import { Top, SiteFooter, Loading, useTitle } from '../lib/ui.jsx'
import { useMe } from '../lib/me.jsx'
import { beeUrl } from '../brand/index.js'
import { LEVELS, PERSONALITIES, XP_PER_VISIT } from '../levels.js'

export const PENDING = 'wagli_pending_visit'

function LoginBox() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(null)
  const [err, setErr] = useState('')
  const send = async (e) => {
    e.preventDefault(); setErr('')
    try { setSent(await api('/auth/request', { method: 'POST', body: { email, next: '/voo' } })) } catch { setErr('Digite um e-mail válido.') }
  }
  if (sent) return <div className="card col" style={{ maxWidth: 460 }}><b className="d s26">Link enviado</b><p className="mut sm">Abra o e-mail enviado para <b>{email}</b> e toque no botão. O link vale por 15 minutos.</p>{sent.devLink && <p className="note">Modo desenvolvimento: <a href={sent.devLink} style={{ fontWeight: 700 }}>abrir o link de acesso</a></p>}</div>
  return (
    <form className="card col" style={{ maxWidth: 460 }} onSubmit={send}>
      <b className="d s26">Entre para começar a voar</b>
      <p className="mut sm">Sem senha: mandamos um link para o seu e-mail.</p>
      <label className="lb" htmlFor="voo-email">E-mail</label>
      <input id="voo-email" className="in" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
      {err && <span className="sm" style={{ color: 'var(--bad)' }}>{err}</span>}
      <button className="btn dk" type="submit">Receber link</button>
    </form>
  )
}

export function Voo() {
  useTitle('Meu voo')
  const { me } = useMe()
  const [v, setV] = useState(null)
  const load = useCallback(() => api('/voo').then(setV).catch(() => setV(false)), [])
  useEffect(() => {
    if (!me?.user) return
    let pend = null
    try { pend = JSON.parse(localStorage.getItem(PENDING) || 'null'); localStorage.removeItem(PENDING) } catch { /* ok */ }
    if (pend?.slug) api('/voo/visits', { method: 'POST', body: pend }).then((r) => { toast(`+${r.gained} XP`); navigate(`/@${pend.slug}`) }).catch(() => load())
    else load()
  }, [me, load])
  const pick = async (personality) => { setV(await api('/voo', { method: 'PUT', body: { personality } })) }
  const lv = v && LEVELS.find((l) => l.n === v.level)
  const pct = v && v.next ? Math.min(100, Math.round(((v.xp - lv.min) / (v.next.at - lv.min)) * 100)) : 100
  return (
    <div className="page">
      <Top active={-1} />
      <div className="w col" style={{ paddingTop: 40, paddingBottom: 64, gap: 28 }}>
        <h1 className="d s56">Seu jeito. Seu voo.</h1>
        {me === undefined || (me?.user && v === null) ? <Loading /> : !me?.user ? <LoginBox /> : v === false ? <p className="mut">Não foi possível carregar o seu voo.</p> : (
          <>
            <div className="card split" style={{ background: 'var(--acc)', border: 0, gap: 28, alignItems: 'center', padding: 28 }}>
              <div style={{ width: 220, height: 220, borderRadius: '50%', background: 'var(--cream)', display: 'grid', placeItems: 'center', flex: 'none' }}><img src={beeUrl(v.personality, v.level)} alt={`Abelha ${v.personality}, nível ${v.level}`} width="180" /></div>
              <div className="col sp" style={{ gap: 10 }}>
                <span className="eb" style={{ color: 'var(--ink)' }}>Nível {String(v.level).padStart(2, '0')}</span>
                <h2 className="d s44">{v.levelName}</h2>
                <div className="bar" style={{ height: 12, background: 'rgba(23,23,19,.18)' }}><i style={{ width: pct + '%', background: 'var(--ink)' }} /></div>
                <div className="sm"><b>{v.xp} XP</b>{v.next ? <> · faltam <b>{v.next.missing} XP</b> para {v.next.name}</> : ' · nível máximo'} · {v.visits} {v.visits === 1 ? 'restaurante visitado' : 'restaurantes visitados'}</div>
              </div>
            </div>
            <div className="col" style={{ gap: 10 }}>
              <b className="eb">Personalidade</b>
              <div className="row wrap">{PERSONALITIES.map(([k, l]) => <button key={k} className={'chip' + (v.personality === k ? ' on' : '')} aria-pressed={v.personality === k} onClick={() => pick(k)}><img src={beeUrl(k, v.level)} alt="" width="28" />{l}</button>)}</div>
              <span className="xs mut">A personalidade é só expressão. Ela muda a carinha, não o nível.</span>
            </div>
            <div className="col" style={{ gap: 10 }}>
              <b className="eb">Os quatro níveis</b>
              <div className="g4">{LEVELS.map((l) => (
                <div key={l.n} className="card col" style={{ gap: 6, opacity: v.level >= l.n ? 1 : 0.55, background: l.n === 4 ? 'var(--ink)' : l.n === 3 ? 'var(--acc)' : '#fff', color: l.n === 4 ? '#fff' : 'var(--ink)' }}>
                  <img src={beeUrl(v.personality, l.n)} alt="" width="110" style={{ alignSelf: 'center' }} />
                  <span className="eb" style={{ color: 'inherit' }}>Nível {String(l.n).padStart(2, '0')}</span>
                  <b className="d s20">{l.name}</b><span className="xs">{l.max == null ? `${l.min}+ XP` : `${l.min}–${l.max} XP`}</span><span className="xs">{l.detail}</span>
                </div>))}</div>
            </div>
            <div className="col" style={{ gap: 10 }}>
              <b className="eb">Últimos lugares</b>
              {v.recent.length ? <div className="col" style={{ gap: 8 }}>{v.recent.map((r, i) => <div key={i} className="card row"><b className="sp">{r.name}</b><Link className="xs link" to={`/@${r.slug}`}>mapa de {r.creator}</Link></div>)}</div> : <p className="mut sm">Você ainda não marcou nenhum lugar. Abra um mapa e toque em "Já fui".</p>}
            </div>
            <p className="note">Cada restaurante marcado como visitado vale {XP_PER_VISIT} XP, até 10 por dia. A marcação é declarada por você. Outras formas de ganhar XP ainda não existem.</p>
          </>
        )}
      </div>
      <SiteFooter />
    </div>
  )
}

// Abre um arquivo cifrado do admin com a senha da equipe. A mesma senha vale para todos.
import React, { useEffect, useRef, useState } from 'react'
import { Loading, Note, PageHead } from './ui.jsx'
import { Icon } from './icons.jsx'
import { withBase } from './base.js'
import { open } from './vault.js'

const PASS = 'joymap:base-senha'
const read = (store, k) => { try { return window[store].getItem(k) } catch { return null } }
const write = (store, k, v) => { try { v == null ? window[store].removeItem(k) : window[store].setItem(k, v) } catch { /* sem armazenamento */ } }

export function VaultGate({ file, title, sub, children }) {
  const [data, setData] = useState(null)
  const [state, setState] = useState('loading') // loading | locked | ready | missing
  const box = useRef(null)
  const unlock = async (password, remember) => {
    const d = await open(box.current, password)
    write('sessionStorage', PASS, password)
    if (remember) write('localStorage', PASS, password)
    setData(d)
    setState('ready')
  }
  const forget = () => { write('sessionStorage', PASS, null); write('localStorage', PASS, null) }
  useEffect(() => {
    (async () => {
      const r = await fetch(withBase(file), { cache: 'no-store' }).catch(() => null)
      if (!r?.ok) return setState('missing')
      box.current = await r.json()
      const saved = read('sessionStorage', PASS) || read('localStorage', PASS)
      if (saved) { try { return await unlock(saved) } catch { forget() } }
      setState('locked')
    })().catch(() => setState('missing'))
  }, [file])
  const lock = () => { forget(); setData(null); setState('locked') }
  if (state === 'loading') return <Loading />
  if (state === 'missing') return <><PageHead title={title} /><Note>O arquivo ainda não foi publicado.</Note></>
  if (state === 'locked') return <Lock title={title} sub={sub} unlock={unlock} />
  return children(data, lock, read('sessionStorage', PASS))
}

function Lock({ title, sub, unlock }) {
  const [pw, setPw] = useState('')
  const [remember, setRemember] = useState(false)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async (e) => {
    e.preventDefault(); setBusy(true); setMsg('')
    try { await unlock(pw.trim(), remember) } catch { setMsg('Senha incorreta.'); setBusy(false) }
  }
  return (
    <>
      <PageHead title={title} sub={sub} />
      <form className="card col bx-lock" onSubmit={go}>
        <div className="row"><Icon n="lock" s={20} /><b>Abrir com a senha</b></div>
        <div><label className="lb" htmlFor="bx-pw">Senha da base</label><input id="bx-pw" className="in" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <label className="row sm" style={{ gap: 8 }}><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />Lembrar neste computador</label>
        {msg && <Note>{msg}</Note>}
        <button className="btn" disabled={busy || !pw.trim()}>{busy ? 'Abrindo…' : 'Abrir'}</button>
      </form>
    </>
  )
}

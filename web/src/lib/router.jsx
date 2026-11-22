import React, { useEffect, useState } from 'react'
import { withBase, stripBase } from './base.js'

const listeners = new Set()
export function navigate(to, { replace = false } = {}) {
  if (typeof window === 'undefined') return
  history[replace ? 'replaceState' : 'pushState'](null, '', withBase(to))
  listeners.forEach((f) => f())
  if (!to.includes('#')) window.scrollTo(0, 0)
}
export function useLocation() {
  const [, set] = useState(0)
  useEffect(() => {
    const f = () => set((n) => n + 1)
    addEventListener('popstate', f); listeners.add(f)
    return () => { removeEventListener('popstate', f); listeners.delete(f) }
  }, [])
  return { path: stripBase(location.pathname).replace(/\/+$/, '') || '/', search: new URLSearchParams(location.search), hash: location.hash }
}
export function Link({ to, children, onClick, ...p }) {
  return (
    <a href={withBase(to)} {...p} onClick={(e) => {
      onClick?.(e)
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || p.target === '_blank' || /^https?:/.test(to)) return
      e.preventDefault(); navigate(to)
    }}>{children}</a>
  )
}
// Redireciona durante o efeito (evita atualizar estado no meio da renderização)
export function Redirect({ to }) {
  useEffect(() => { navigate(to, { replace: true }) }, [to])
  return null
}

// Aviso rápido (toast)
let toastFn = null
export const toast = (m) => toastFn?.(m)
export function Toaster() {
  const [m, setM] = useState('')
  useEffect(() => { toastFn = (t) => { setM(t); setTimeout(() => setM(''), 2800) }; return () => { toastFn = null } }, [])
  return m ? <div className="toast" role="status">{m}</div> : null
}

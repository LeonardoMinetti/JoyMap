import React, { createContext, useContext, useEffect, useRef, useState } from 'react'

// Configuração central de motion (as mesmas durações e curvas também ficam em landing.css como variáveis).
export const MOTION = { fast: 180, base: 320, slow: 560, ease: 'cubic-bezier(.2,.7,.2,1)' }

export const PauseCtx = createContext({ paused: false, setPaused: () => {} })
export const usePause = () => useContext(PauseCtx)

export function useReducedMotion() {
  const [rm, setRm] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)')
    const f = () => setRm(m.matches)
    m.addEventListener('change', f)
    return () => m.removeEventListener('change', f)
  }, [])
  return rm
}

// Observa quando o elemento está visível (as animações só rodam nesse intervalo).
export function useInView(threshold = 0.35) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setOn(true); return }
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, on]
}

export const SceneCtx = createContext({ on: false, rm: false, paused: false })
export const useScene = () => useContext(SceneCtx)
// Cena: ganha a classe "on" quando visível, "rm" com movimento reduzido e "paused" se o visitante pausou tudo.
export function Scene({ as: Tag = 'div', className = '', threshold = 0.35, children, ...p }) {
  const [ref, on] = useInView(threshold)
  const rm = useReducedMotion()
  const { paused } = usePause()
  return <SceneCtx.Provider value={{ on, rm, paused }}><Tag ref={ref} className={`scene ${on ? 'on' : ''} ${rm ? 'rm' : ''} ${paused ? 'paused' : ''} ${className}`} {...p}>{children}</Tag></SceneCtx.Provider>
}
// Verdadeiro depois da primeira vez que a cena apareceu (para montar mapas só quando necessário).
export function useEver(on) {
  const [e, setE] = useState(false)
  useEffect(() => { if (on) setE(true) }, [on])
  return e
}

// Escala um palco de tamanho fixo (w × h) para caber na largura disponível.
export function useFit(w) {
  const ref = useRef(null)
  const [s, setS] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const f = () => setS(Math.min(1, el.clientWidth / w))
    f()
    const ro = new ResizeObserver(f)
    ro.observe(el)
    return () => ro.disconnect()
  }, [w])
  return [ref, s]
}

// Dispara uma sequência de etapas (0..n-1) em loop enquanto a cena está visível.
export function useSteps(n, { on, rm, paused, ms = 1500, hold = 3200 }) {
  const [step, setStep] = useState(rm ? n - 1 : 0)
  useEffect(() => {
    if (rm) { setStep(n - 1); return }
    if (!on || paused) return
    let i = 0
    let h
    const tick = () => { setStep(i); i += 1; h = setTimeout(i < n ? tick : () => { i = 0; setStep(0); h = setTimeout(tick, 600) }, i < n ? ms : hold) }
    setStep(0); h = setTimeout(tick, 350)
    return () => clearTimeout(h)
  }, [on, rm, paused, n, ms, hold])
  return step
}

// Percorre quadros com durações diferentes (ms) em loop, só enquanto a cena está visível e sem pausa.
// Com movimento reduzido, fica no quadro `rmFrame` (estado final compreensível).
export function useCycle(durations, { on, rm, paused, rmFrame = durations.length - 1 }) {
  const [i, setI] = useState(rm ? rmFrame : 0)
  const key = durations.join(',')
  useEffect(() => {
    if (rm) { setI(rmFrame); return }
    if (!on || paused) return
    let k = 0, h
    const go = () => { setI(k); h = setTimeout(() => { k = (k + 1) % durations.length; go() }, durations[k]) }
    go()
    return () => clearTimeout(h)
  }, [on, rm, paused, key, rmFrame])
  return i
}

export function useMedia(q) {
  const [m, setM] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(q).matches)
  useEffect(() => { const mm = matchMedia(q); const f = () => setM(mm.matches); f(); mm.addEventListener('change', f); return () => mm.removeEventListener('change', f) }, [q])
  return m
}

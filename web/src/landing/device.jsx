import { lum } from '../theme.jsx'
import React from 'react'

// Celular de mockup (moldura em CSS). A tela tem 272 px de largura; `Native` reduz as telas de 390 px do próprio app para caber.
export const SW = 272
export const S = SW / 390
export function Phone({ children, h = 540, cut = false, className = '', label }) {
  return (
    <div className={`dv ${cut ? 'cut' : ''} ${className}`} role={label ? 'img' : undefined} aria-label={label}>
      <div className="dv-s" style={{ height: h }}>
        {children}
        <i className="dv-i" aria-hidden="true" />
        <div className="dv-st" aria-hidden="true"><b>9:41</b><span><i /><i /><i /></span></div>
        {!cut && <i className="dv-h" aria-hidden="true" />}
      </div>
    </div>
  )
}
// Mostra uma interface projetada para 390 px de largura (a mesma do app) na escala do mockup.
// `theme` (opcional): a cor de fundo da tela chega até a barra de status do iPhone e a cor do texto da barra acompanha o contraste.
export function Native({ children, h, top = 46, className = "", theme }) {
  const bg = theme?.bg || '#ffffff'
  const dark = lum(bg) < 0.38
  return (
    <div className={`nv ${className}`} style={{ height: h / S, transform: `scale(${S})`, paddingTop: top, background: bg, '--st': dark ? '#ffffff' : '#171713' }}>
      <div className="nv-st" aria-hidden="true"><b>9:41</b><span><i /><i /><i /></span></div>
      {children}
    </div>
  )
}
// Janela de navegador para as telas de computador (painel).
export function Browser({ children, url = 'wagli · painel do criador', side = true }) {
  return (
    <div className="bw">
      <div className="bw-bar" aria-hidden="true"><span><i /><i /><i /></span><b>{url}</b></div>
      <div className="bw-in">{side && <aside className="bw-side" aria-hidden="true"><i className="on" /><i /><i /><i /></aside>}<div className="bw-main">{children}</div></div>
    </div>
  )
}

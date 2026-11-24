import React, { useId, useState } from 'react'
import raw from '../brand/logo.svg?raw'

// Logo "sendo escrito": o desenho oficial aparece por baixo de traços que seguem a ordem da mão.
// Cada traço: [caminho, espessura, duração em ms]. Coordenadas do viewBox 37×17 do logo.
export const STROKES = [
  ['M6 5.2C6.6 3.5 9 2.7 12 2.7', 2.3, 220], // chapéu do J
  ['M10.8 2.8C11.3 6 10.8 9.5 9.2 12C7.8 14.2 5 14.8 4 12.8C3 10.8 4.8 8.8 7 8C8.5 7.4 10.5 7.3 12 7.5', 2.5, 520], // haste e laço do J
  ['M14 6.7C12.600 6.5 11.9 8 12 9.1C12.2 10.5 13.800 10.4 14.4 8.9C15 7.4 14.7 6.6 13.8 6.7C13.5 7.6 14.8 8 16.2 6.8', 2.1, 260], // o
  ['M16.7 5.6C16.2 7 15.5 8.9 16.8 9C17.8 9 18.7 7.3 19 5.5', 2.2, 200], // y
  ['M19 6C19 9 18.6 12 17 13.8C15.600 15.2 13.8 14.4 14.3 12.9C15 11 17.500 10.8 19.8 10', 2.2, 340], // perna do y
  ['M19.6 11C20.500 9 20.8 6 21.2 3.2L22.9 9L25.7 2.4C25 5.500 24.8 9 26.2 11.2L27.2 11.2', 2.3, 420], // M
  ['M29.8 6.2C28.4 5 26.800 7 27.1 8.800C27.600 10.4 29.4 9 29.9 5.8C29.4 8 29.9 9.6 31.8 8.4', 2.2, 300], // a
  ['M32.2 6.800C31.4 9 31.5 12 32 14.9', 2.3, 220], // haste do p
  ['M31.9 7.2C32.5 4.2 35.2 3.300 35 6C34.800 8 33 9.2 31.5 9', 2.4, 260], // bojo do p
]
const paths = [...raw.matchAll(/ d="([^"]+)"/g)].map((m) => m[1])
let written = false // só escreve na chegada, não a cada troca de página

export default function LogoWrite({ height }) {
  const id = 'lw' + useId().replace(/\W/g, '')
  const [done, setDone] = useState(() => written || matchMedia('(prefers-reduced-motion: reduce)').matches)
  let at = 150
  return (
    <svg className="lw" viewBox="0 0 37 17" role="img" aria-label="JoyMap" style={{ height }}>
      {!done && (
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="37" height="17">
          {STROKES.map(([d, w, ms], i) => {
            const delay = at
            at += ms
            const last = i === STROKES.length - 1
            return <path key={i} d={d} pathLength="1" strokeWidth={w} style={{ animationDuration: ms + 'ms', animationDelay: delay + 'ms' }}
              onAnimationEnd={last ? () => { written = true; setDone(true) } : undefined} />
          })}
        </mask>
      )}
      <g fill="#171713" mask={done ? undefined : `url(#${id})`}>{paths.map((d, i) => <path key={i} d={d} />)}</g>
    </svg>
  )
}

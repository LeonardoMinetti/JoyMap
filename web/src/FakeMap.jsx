import React from 'react'
import { ICON_PATHS } from './lib/icons.jsx'

// Mapa ilustrativo do protótipo (SVG). Usado só em páginas de divulgação e exemplos: nunca mostra dados reais.
const T = {
  light: { bg: '#eef0f1', park: '#dce7d8', water: '#d3e2ec', road: '#ffffff', minor: '#f7f8f9', lab: '#7d848a' },
  dark: { bg: '#23262b', park: '#29332f', water: '#1c2934', road: '#3b4048', minor: '#2e3238', lab: '#9aa1a8' },
  sepia: { bg: '#f1e7d3', park: '#dde1bd', water: '#cddad6', road: '#fbf5e8', minor: '#f5ecd8', lab: '#8a7a5c' },
  mint: { bg: '#e2f1ed', park: '#cde8da', water: '#c3e0e9', road: '#ffffff', minor: '#f0faf6', lab: '#5b8a7e' },
  bright: { bg: '#f6f1e6', park: '#d4e6c4', water: '#bcd8ec', road: '#ffffff', minor: '#fbf8f1', lab: '#8a8576' },
  liberty: { bg: '#f3efe6', park: '#cfe3bd', water: '#b9d3ea', road: '#fff7d6', minor: '#faf6ec', lab: '#7d7a6a' },
  fiord: { bg: '#4a5a7c', park: '#4d6a74', water: '#34445f', road: '#6b7ca0', minor: '#58698d', lab: '#c1cbe0' },
  blue: { bg: '#e4ebf7', park: '#d9e7e2', water: '#c4d8f1', road: '#ffffff', minor: '#f2f5fb', lab: '#6a7fa3' },
}
const PAL = {
  warm: { rest: '#ff4b2b', cafe: '#a16207', bar: '#7c3aed', bread: '#f59e0b', cake: '#ec4899', pizza: '#dc2626', fish: '#2d7ff9', burger: '#ea580c' },
  cool: { rest: '#2d7ff9', cafe: '#0e7490', bar: '#6d28d9', bread: '#0891b2', cake: '#db2777', pizza: '#4f46e5', fish: '#0284c7', burger: '#1d4ed8' },
  candy: { rest: '#ff5c8a', cafe: '#d98a00', bar: '#9b5cff', bread: '#ff8a3d', cake: '#e03bb0', pizza: '#16a085', fish: '#2aa6f5', burger: '#ff6b6b' },
}
const B = [[22, 30, 'bread', 'Forno Aurora'], [48, 22, 'fish', 'Casa Maré'], [70, 35, 'cafe', 'Café Exemplo'], [33, 55, 'bar', 'Bar Modelo'], [58, 50, 'burger', 'Burger Teste'], [80, 62, 'pizza', 'Cantina Piloto'], [18, 72, 'cake', 'Doce Ensaio'], [45, 75, 'rest', 'Brasa Demo'], [66, 82, 'fish', 'Sushi Amostra'], [85, 20, 'rest', 'Mesa Ficção'], [12, 45, 'cafe', 'Grão Teste'], [55, 38, 'rest', 'Prato Modelo'], [38, 35, 'bar', 'Copo Piloto'], [75, 48, 'cake', 'Doce Demo']]
const px = (v) => (typeof v === 'number' ? `${v}px` : v)

export default function FakeMap({ w = '100%', h = 360, tone = 'light', shape = 'drop', pal = 'warm', acc = '#ff4b2b', n = 10, sel = -1, lab = true, colors }) {
  const t = T[tone] || T.light
  return (
    <div style={{ position: 'relative', overflow: 'hidden', width: px(w), height: px(h), background: t.bg }} aria-hidden="true">
      <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'block' }}>
        <ellipse cx="90" cy="290" rx="72" ry="46" fill={t.park} /><rect x="262" y="36" width="92" height="62" rx="14" fill={t.park} /><rect x="150" y="196" width="64" height="40" rx="12" fill={t.park} />
        <path d="M0 364 C80 334 150 384 260 354 S380 332 400 344 L400 400 L0 400Z" fill={t.water} />
        {['M-10 118 C100 88 200 172 410 108', 'M-10 250 C120 226 230 280 410 236', 'M120 -10 C140 100 100 220 150 410', 'M300 -10 C280 120 330 240 290 410'].map((d) => <path key={d} d={d} fill="none" stroke={t.road} strokeWidth="12" />)}
        {['M-10 180 L410 170', 'M-10 320 L410 300', 'M210 -10 L220 410', 'M50 -10 L30 410', 'M360 -10 L372 410', 'M-10 60 L410 52'].map((d) => <path key={d} d={d} fill="none" stroke={t.minor} strokeWidth="6" />)}
      </svg>
      {lab && [['Pinheiros', 8, 14], ['Centro', 62, 12], ['Moema', 42, 88]].map(([s, l, tp]) => <div key={s} style={{ position: 'absolute', left: `${l}%`, top: `${tp}%`, font: '600 10px Archivo,Arial,sans-serif', letterSpacing: '.08em', textTransform: 'uppercase', color: t.lab }}>{s}</div>)}
      {B.slice(0, n).map((b, i) => {
        const col = colors ? (colors[b[2]] || acc) : pal === 'mono' ? acc : (PAL[pal] || PAL.warm)[b[2]]
        const big = i === sel
        const z = big ? 40 : 30
        let sh = `position:absolute;left:0;top:0;display:grid;place-items:center;width:${z}px;height:${z}px;background:${col};`
        let inner = 'display:grid;'
        if (shape === 'drop') { sh += `margin:${-z - 4}px 0 0 ${-z / 2}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);`; inner += 'transform:rotate(45deg);' }
        else if (shape === 'circle') sh += `margin:${-z / 2}px 0 0 ${-z / 2}px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);`
        else if (shape === 'square') sh += `margin:${-z / 2}px 0 0 ${-z / 2}px;border-radius:9px;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);`
        else sh += `margin:${-z / 2}px 0 0 ${-z / 2}px;clip-path:polygon(25% 4%,75% 4%,100% 50%,75% 96%,25% 96%,0 50%);`
        if (big) sh += 'outline:3px solid #171717;outline-offset:2px;'
        const css = (s) => Object.fromEntries(s.split(';').filter(Boolean).map((r) => { const [k, ...v] = r.split(':'); return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.join(':').trim()] }))
        return (
          <div key={i} style={{ position: 'absolute', width: 0, height: 0, left: `${b[0]}%`, top: `${b[1]}%` }}>
            {big && <div style={{ position: 'absolute', left: 0, bottom: (shape === 'drop' ? z + 12 : z / 2 + 10), transform: 'translateX(-50%)', background: '#fff', color: '#171717', borderRadius: 8, padding: '5px 9px', font: '600 11px Archivo,Arial,sans-serif', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,.25)' }}>{b[3]}</div>}
            <span style={css(sh)}><span style={css(inner)}><svg width={big ? 20 : 15} height={big ? 20 : 15} viewBox="0 0 24 24" style={{ display: 'block', fill: 'none', stroke: '#fff', strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d={ICON_PATHS[b[2]]} /></svg></span></span>
          </div>
        )
      })}
    </div>
  )
}

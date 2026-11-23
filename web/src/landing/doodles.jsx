import React from 'react'

// Ilustrações de comida, viagem e ar livre desenhadas à mão (traço de tinta + aquarela chapada + sombra cinza deslocada) e formas geométricas.
// Elementos decorativos flutuantes: não são lidos por leitores de tela e não recebem toque.
const INK = '#171713', SH = '#c9c9c1'
const sh = (d, extra = {}) => <path d={d} fill={SH} opacity=".75" transform="translate(3 4)" {...extra} />

const ART = {
  ramen: <>
    <circle cx="52" cy="54" r="36" fill={SH} opacity=".7" />
    <circle cx="47" cy="49" r="36" fill="#fff" stroke={INK} strokeWidth="1.6" />
    <circle cx="47" cy="49" r="29" fill="#C99A3C" />
    <g fill="none" stroke="#F2DB80" strokeWidth="2.4" strokeLinecap="round"><path d="M24 58q5-7 10 0t10 0t10 0t10 0" /><path d="M28 66q5-7 10 0t10 0t10 0" /><path d="M26 50q5-7 10 0t10 0" /></g>
    <g stroke={INK} strokeWidth="1.3"><ellipse cx="35" cy="38" rx="10" ry="7.5" transform="rotate(-25 35 38)" fill="#fff" /><ellipse cx="45" cy="52" rx="10" ry="7.5" transform="rotate(-15 45 52)" fill="#fff" /></g>
    <circle cx="35" cy="38" r="4.3" fill="#F7A81B" /><circle cx="45" cy="52" r="4.3" fill="#F7A81B" />
    <path d="M55 33q11-5 17 4q-2 11-13 14q-9-5-4-18z" fill="#F4B3A0" stroke="#C97C66" strokeWidth="1.2" />
    <g fill="#4CAF50">{[[58, 42], [62, 46], [66, 41], [60, 49], [65, 47], [69, 44]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.9" />)}</g>
    <path d="M58 62l17-9l6 13l-15 9z" fill="#26412F" stroke={INK} strokeWidth="1" />
    <g strokeLinecap="round"><path d="M60 6L92 80M69 4L97 78" stroke={INK} strokeWidth="5" /><path d="M60 6L92 80M69 4L97 78" stroke="#D6402B" strokeWidth="2.8" /></g>
    <ellipse cx="13" cy="68" rx="7.5" ry="14" transform="rotate(18 13 68)" fill="#D6402B" stroke={INK} strokeWidth="1.4" /><path d="M16 80l6 16" stroke={INK} strokeWidth="4" strokeLinecap="round" /><path d="M16 80l6 16" stroke="#D6402B" strokeWidth="2.2" strokeLinecap="round" />
  </>,
  sushi: <>
    {sh('M20 48h62a14 14 0 0 1 0 28H20a14 14 0 0 1 0-28z')}
    <rect x="16" y="46" width="68" height="28" rx="14" fill="#fff" stroke={INK} strokeWidth="1.6" />
    <path d="M12 50q38-26 76 0q-10 15-38 15q-28 0-38-15z" fill="#F7824A" stroke={INK} strokeWidth="1.6" />
    <g fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity=".8"><path d="M30 46q5 6 3 13M44 42q5 7 3 16M58 42q5 7 3 16M72 46q4 5 2 11" /></g>
    <rect x="43" y="40" width="14" height="40" fill="#26412F" stroke={INK} strokeWidth="1.2" />
  </>,
  pizza: <>
    {sh('M12 22Q50 6 88 22L50 92z')}
    <path d="M12 22Q50 6 88 22L50 92z" fill="#F6C453" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M9 20Q50 2 91 20q-1 9-6 12Q50 17 15 32q-6-3-6-12z" fill="#E39A3F" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    <g stroke={INK} strokeWidth="1.2"><circle cx="38" cy="44" r="6.5" fill="#D6402B" /><circle cx="58" cy="48" r="6.5" fill="#D6402B" /><circle cx="49" cy="68" r="6" fill="#D6402B" /></g>
    <path d="M60 30q8-6 12 2q-6 6-12-2z" fill="#4CAF50" stroke={INK} strokeWidth="1" />
  </>,
  coffee: <>
    <ellipse cx="52" cy="82" rx="40" ry="11" fill={SH} opacity=".7" />
    <ellipse cx="49" cy="78" rx="38" ry="10.5" fill="#fff" stroke={INK} strokeWidth="1.6" />
    <path d="M70 42c20-2 20 22 0 24" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" /><path d="M70 42c20-2 20 22 0 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    <path d="M22 38h50v14q0 22-25 22q-25 0-25-22z" fill="#fff" stroke={INK} strokeWidth="1.6" />
    <path d="M22 50h50" stroke="#2D7FF9" strokeWidth="4" />
    <ellipse cx="47" cy="38" rx="25" ry="6" fill="#7B4A2A" stroke={INK} strokeWidth="1.4" />
    <g fill="none" stroke="#9a9a92" strokeWidth="2" strokeLinecap="round"><path d="M36 28q-5-6 0-12t0-10" /><path d="M48 28q-5-6 0-12t0-10" /><path d="M60 28q-5-6 0-12t0-10" /></g>
  </>,
  taco: <>
    {sh('M10 74a40 40 0 0 1 80 0z')}
    <path d="M8 72a40 40 0 0 1 80 0z" fill="#F6C453" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M14 56q4-10 10-4q4-9 11-3q4-9 11-2q5-9 12-1q6-7 12 2q6-4 10 6" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" /><path d="M14 56q4-10 10-4q4-9 11-3q4-9 11-2q5-9 12-1q6-7 12 2q6-4 10 6" fill="none" stroke="#5CB85C" strokeWidth="2.6" strokeLinecap="round" />
    <g stroke={INK} strokeWidth="1"><circle cx="30" cy="62" r="4.5" fill="#E8412B" /><circle cx="48" cy="58" r="4.5" fill="#E8412B" /><circle cx="64" cy="63" r="4.5" fill="#E8412B" /></g>
    <g fill="#7B4A2A"><circle cx="38" cy="66" r="2" /><circle cx="56" cy="67" r="2" /><circle cx="72" cy="68" r="2" /></g>
  </>,
  donut: <>
    <circle cx="54" cy="56" r="37" fill={SH} opacity=".7" />
    <circle cx="50" cy="52" r="37" fill="#D98B5F" stroke={INK} strokeWidth="1.6" />
    <path d="M17 46q-2-18 16-26q12-6 26-1q22 4 24 26q2 10-8 14q-3 10-14 8q-6 10-18 4q-12 6-20-6q-12-4-6-19z" fill="#FF7FA8" stroke={INK} strokeWidth="1.4" />
    <circle cx="50" cy="52" r="11.5" fill="#fff" stroke={INK} strokeWidth="1.5" />
    <g strokeLinecap="round" strokeWidth="3"><path d="M30 36l4-2" stroke="#2D7FF9" /><path d="M62 32l4 2" stroke="#FFC400" /><path d="M72 52l4 0" stroke="#36C5A0" /><path d="M34 68l3 3" stroke="#fff" /><path d="M64 70l3-3" stroke="#8B5CF6" /><path d="M46 26l1 4" stroke="#fff" /><path d="M26 54l-3 2" stroke="#FFC400" /></g>
  </>,
  melon: <>
    {sh('M8 36a42 42 0 0 0 84 0z')}
    <path d="M6 34a42 42 0 0 0 84 0z" fill="#3BA55D" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M11 34a37 37 0 0 0 74 0z" fill="#fff" />
    <path d="M14 34a34 34 0 0 0 68 0z" fill="#FF5C6A" />
    <g fill={INK}>{[[30, 46, 20], [48, 56, 0], [66, 46, -20], [40, 42, 10], [58, 41, -10]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx="2" ry="3.4" transform={`rotate(${r} ${x} ${y})`} />)}</g>
  </>,
  car: <>
    <path d="M0 87h100" stroke={INK} strokeWidth="1.8" strokeDasharray="10 8" className="dd-road" opacity=".55" />
    {sh('M6 64q0-9 9-11l10-15q3-4 8-4h28q6 0 9 4l9 13q9 3 9 13v4H6z')}
    <path d="M6 64q0-9 9-11l10-15q3-4 8-4h28q6 0 9 4l9 13q9 3 9 13v4H6z" fill="#FF4B2B" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M30 52l7-12h14v12z" fill="#CFE8FF" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" /><path d="M56 52V40h7l9 12z" fill="#CFE8FF" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
    <circle cx="91" cy="62" r="3.2" fill="#FFC400" stroke={INK} strokeWidth="1.2" /><path d="M6 64h6" stroke={INK} strokeWidth="1.4" />
    {[28, 74].map((x) => <g key={x} className="dd-wheel"><circle cx={x} cy="72" r="11" fill={INK} /><circle cx={x} cy="72" r="4.5" fill="#fff" /><path d={`M${x} 63v18M${x - 9} 72h18`} stroke="#fff" strokeWidth="1.6" /></g>)}
  </>,
  plane: <>
    <path d="M0 62h16M4 70h12" stroke={INK} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="3 6" opacity=".5" />
    <path d="M62 88q-2-9 7-10q3-8 12-5q9-3 12 6q7 1 6 9z" fill="#fff" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" opacity=".95" />
    <g transform="rotate(-10 50 48)">
      {sh('M10 40L20 36H72Q94 38 96 50Q94 60 72 61H26Q12 60 10 40Z')}
      <path d="M12 39L15 14H25L38 38z" fill="#FF4B2B" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 47L3 53H22z" fill="#E4E4E4" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10 40L20 36H72Q94 38 96 50Q94 60 72 61H26Q12 60 10 40Z" fill="#fff" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13 53H95Q93 60 72 61H26Q16 60 13 53z" fill="#2D7FF9" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M78 41Q89 41 93 49H78z" fill="#CFE8FF" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      {[28, 36, 44, 52, 60, 68].map((x) => <circle key={x} cx={x} cy="46" r="2.7" fill="#CFE8FF" stroke={INK} strokeWidth="1.1" />)}
      <path d="M42 54H72L50 82H28z" fill="#E4E4E4" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M36 76L60 56" stroke={INK} strokeWidth="1" opacity=".3" />
      <rect x="42" y="68" width="22" height="11" rx="5.5" fill="#fff" stroke={INK} strokeWidth="1.5" /><ellipse cx="44.5" cy="73.5" rx="3" ry="4.6" fill="#9a9a92" stroke={INK} strokeWidth="1" />
    </g>
  </>,
  backpack: <>
    {sh('M24 28h52a0 0 0 0 1 0 0v50a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8z')}
    <path d="M40 28q0-14 10-14t10 14" fill="none" stroke={INK} strokeWidth="6" strokeLinecap="round" /><path d="M40 28q0-14 10-14t10 14" fill="none" stroke="#FFC400" strokeWidth="3" strokeLinecap="round" />
    <rect x="22" y="26" width="56" height="62" rx="22" fill="#2D7FF9" stroke={INK} strokeWidth="1.6" />
    <path d="M26 44q24 14 48 0" fill="none" stroke={INK} strokeWidth="1.4" />
    <rect x="32" y="56" width="36" height="26" rx="10" fill="#FFC400" stroke={INK} strokeWidth="1.5" /><path d="M38 66h24" stroke={INK} strokeWidth="1.6" strokeLinecap="round" /><circle cx="63" cy="66" r="2" fill={INK} />
    <path d="M22 46q-9 12 0 28M78 46q9 12 0 28" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
  </>,
  suitcase: <>
    {sh('M16 36h68a8 8 0 0 1 8 8v36a8 8 0 0 1-8 8H16a8 8 0 0 1-8-8V44a8 8 0 0 1 8-8z')}
    <path d="M38 36v-9q0-5 5-5h14q5 0 5 5v9" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
    <rect x="10" y="34" width="80" height="50" rx="9" fill="#FF5C8A" stroke={INK} strokeWidth="1.6" />
    <path d="M32 34v50M68 34v50" stroke="#fff" strokeWidth="3.4" opacity=".55" />
    <rect x="43" y="54" width="14" height="9" rx="2.5" fill="#FFC400" stroke={INK} strokeWidth="1.3" />
    <circle cx="20" cy="46" r="5.5" fill="#fff" stroke={INK} strokeWidth="1.2" /><path d="M20 42.5l1 2.3 2.5.3-1.9 1.7.5 2.4-2.1-1.3-2.1 1.3.5-2.4-1.9-1.7 2.5-.3z" fill="#FF4B2B" />
    <circle cx="26" cy="90" r="4.5" fill={INK} /><circle cx="74" cy="90" r="4.5" fill={INK} />
  </>,
  mountain: <>
    {sh('M2 86L34 30l22 32l12-16l30 40z')}
    <circle cx="76" cy="24" r="11" fill="#FFC400" stroke={INK} strokeWidth="1.5" />
    <path d="M2 84L34 30l22 32l12-16l30 38z" fill="#36C5A0" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M26 44l8-14l9 14l-5-3l-4 5l-4-5z" fill="#fff" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M56 62l12-16l8 10" fill="none" stroke={INK} strokeWidth="1.2" strokeLinecap="round" opacity=".6" />
  </>,
  bike: <>
    <path d="M0 90h100" stroke={INK} strokeWidth="1.6" strokeDasharray="10 8" className="dd-road" opacity=".4" />
    {[24, 76].map((x) => <g key={x} className="dd-wheel"><circle cx={x} cy="66" r="19" fill="none" stroke={INK} strokeWidth="3.4" /><circle cx={x} cy="66" r="3" fill={INK} /><path d={`M${x} 47v38M${x - 19} 66h38M${x - 13} 53l26 26M${x + 13} 53l-26 26`} stroke={INK} strokeWidth="1" opacity=".6" /></g>)}
    <path d="M24 66L42 40h24L50 66zM66 40l10 26M42 40l-3-6M66 40l-2-8" fill="none" stroke="#8B5CF6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M34 33h12M60 30h12" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
  </>,
  ball: <>
    <circle cx="54" cy="56" r="38" fill={SH} opacity=".7" />
    <circle cx="50" cy="52" r="38" fill="#D6F04A" stroke={INK} strokeWidth="1.6" />
    <path d="M16 30q20 22 2 48M84 30q-20 22-2 48" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
  </>,
  chili: <>
    {sh('M30 22q-6-10 6-12q4 18 30 40q14 12 12 30q-30-4-46-30q-8-14-2-28z')}
    <path d="M28 20q-6-10 6-12q4 18 30 40q14 12 12 30q-30-4-46-30q-8-14-2-28z" fill="#E8412B" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M28 20q-4-10 4-16q6 2 4 8q-4 2-8 8z" fill="#3BA55D" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M38 38q10 18 30 34" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity=".6" />
  </>,
}

const SHAPES = {
  circle: (c) => <circle cx="50" cy="50" r="40" fill={c} />,
  ring: (c) => <circle cx="50" cy="50" r="32" fill="none" stroke={c} strokeWidth="14" />,
  half: (c) => <path d="M8 62a42 42 0 0 1 84 0z" fill={c} />,
  tri: (c) => <path d="M50 10L92 88H8z" fill={c} strokeLinejoin="round" stroke={c} strokeWidth="8" />,
  plus: (c) => <path d="M38 8h24v30h30v24H62v30H38V62H8V38h30z" fill={c} />,
  squig: (c) => <path d="M6 58q11-26 22 0t22 0t22 0t22 0" fill="none" stroke={c} strokeWidth="12" strokeLinecap="round" />,
  quarter: (c) => <path d="M10 90V10a80 80 0 0 1 80 80z" fill={c} />,
  square: (c) => <rect x="14" y="14" width="72" height="72" rx="12" fill={c} transform="rotate(12 50 50)" />,
}
export const PALETTE = ['#FF4B2B', '#2D7FF9', '#36C5A0', '#8B5CF6', '#FF5C8A', '#FFC400']

// Filtro de traço "feito à mão" (leve ondulação) e símbolos reutilizáveis
export function DoodleDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
      <defs><filter id="dd-wc" x="-8%" y="-8%" width="116%" height="116%"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4" result="n" /><feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" /></filter></defs>
    </svg>
  )
}

export function Doodle({ k, c, size = 110, className = '', style }) {
  const food = ART[k]
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g filter={food ? 'url(#dd-wc)' : undefined}>{food || SHAPES[k](c || PALETTE[0])}</g>
    </svg>
  )
}

// Conjuntos de elementos por seção: [peça, cor (só formas), lado, topo %, deslocamento lateral px, tamanho px, giro°, duração s, atraso s]
const SETS = {
  hero: [['ramen', 0, 'r', 12, -34, 150, 8, 9, 0], ['pizza', 0, 'l', 78, -34, 120, -12, 10, 1.2], ['circle', 1, 'l', 10, 6, 34, 0, 8, .6], ['plane', 0, 'r', 70, 40, 110, -6, 8, 2], ['plus', 2, 'r', 46, 8, 26, 14, 9, .3]],
  a: [['donut', 0, 'r', 6, -34, 120, 14, 9, 0], ['backpack', 0, 'l', 62, -10, 96, -12, 8, 1], ['bike', 0, 'r', 80, 24, 110, 0, 8, .5]],
  b: [['sushi', 0, 'l', 4, -40, 130, -8, 10, .4], ['car', 0, 'r', 70, -24, 130, 0, 9, 1.4], ['plus', 1, 'l', 84, 24, 28, 12, 8, 0]],
  c: [['coffee', 0, 'r', 2, -36, 120, 8, 9, .8], ['suitcase', 0, 'l', 72, -30, 104, -14, 10, 0], ['ring', 0, 'r', 76, 26, 44, 0, 8, 1.1]],
  d: [['taco', 0, 'l', 2, -40, 130, -10, 10, .2], ['mountain', 0, 'r', 74, -24, 120, 0, 9, 1], ['ball', 0, 'r', 8, 24, 64, 0, 8, .7]],
  e: [['melon', 0, 'r', 4, -34, 120, 10, 9, 0], ['bike', 0, 'l', 80, 4, 120, 0, 8, 1.3], ['circle', 2, 'l', 12, 28, 26, 0, 7, .4]],
  q: [['pizza', 0, 'r', 16, -20, 130, 12, 10, .4], ['donut', 0, 'l', 62, -40, 110, -10, 9, 0], ['circle', 1, 'r', 66, 40, 30, 0, 7, .6], ['ball', 0, 'l', 14, 30, 70, -6, 8, 1.2]],
  g: [['ramen', 0, 'l', 8, -10, 150, -8, 9, 0], ['sushi', 0, 'r', 14, -4, 120, 10, 10, .8], ['suitcase', 0, 'r', 66, 60, 100, -12, 9, .3], ['car', 0, 'l', 62, 40, 130, 0, 10, 1.1], ['circle', 4, 'l', 40, 8, 30, 0, 7, .5], ['plus', 1, 'r', 42, 6, 28, 12, 8, 0]],
  f: [['pizza', 0, 'l', 6, -34, 110, 12, 10, .5], ['backpack', 0, 'r', 72, -30, 100, -10, 9, 0], ['tri', 3, 'r', 10, 30, 40, 18, 8, 1]],
}
export function Floaters({ set }) {
  const items = SETS[set] || []
  return (
    <div className="fl-layer" aria-hidden="true">
      {items.map(([k, ci, side, top, off, size, rot, dur, delay], i) => (
        <Doodle key={i} k={k} c={PALETTE[ci]} size={size} className={'fl' + (i > 1 ? ' fl-x' : '')}
          style={{ [side === 'l' ? 'left' : 'right']: `max(${off}px, calc((100vw - 1200px) / 2 + ${off}px))`, top: `${top}%`, '--r': `${rot}deg`, '--dur': `${dur}s`, '--dl': `${delay}s` }} />
      ))}
    </div>
  )
}

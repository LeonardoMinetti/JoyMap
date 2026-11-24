// Horário de funcionamento de um lugar e o "aberto agora". Puro: o servidor, o painel e o mapa usam as mesmas regras.
// Formato: lista de 7 dias começando no domingo; cada dia é null (fechado) ou ["HH:MM", "HH:MM"] (abre, fecha).
// Se fecha em horário menor ou igual ao de abrir, fecha depois da meia-noite (ex.: 18:00 → 02:00).
export const DAY_NAMES = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export const DAY_LONG = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const TZ = 'America/Sao_Paulo'
const T = /^([01]\d|2[0-3]):[0-5]\d$/
const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3))

export function cleanHours(input) {
  if (!Array.isArray(input) || input.length !== 7) return null
  const out = input.map((d) => (Array.isArray(d) && T.test(d[0]) && T.test(d[1]) && d[0] !== d[1] ? [d[0], d[1]] : null))
  return out.some(Boolean) ? out : null
}

// dia da semana (0 = domingo) e minutos desde 00:00, no fuso de São Paulo
export function clockIn(date = new Date(), tz = TZ) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map((x) => [x.type, x.value]))
  return { day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), min: Number(p.hour) * 60 + Number(p.minute) }
}
const fmt = (t) => { const h = Number(t.slice(0, 2)), m = t.slice(3); return m === '00' ? `${h}h` : `${h}h${m}` }

// { open: boolean, until?: "HH:MM" } ou null se o lugar não informou horário
export function openState(hours, date = new Date()) {
  if (!hours) return null
  const { day, min } = clockIn(date)
  const prev = hours[(day + 6) % 7]
  if (prev && mins(prev[1]) < mins(prev[0]) && min < mins(prev[1])) return { open: true, until: prev[1] } // ainda no turno de ontem
  const today = hours[day]
  if (today) {
    const o = mins(today[0]), c = mins(today[1])
    if (c > o ? min >= o && min < c : min >= o) return { open: true, until: today[1] }
  }
  return { open: false }
}

export function openLabel(hours, date = new Date()) {
  const st = openState(hours, date)
  if (!st) return null
  if (st.open) return `Aberto agora · fecha às ${fmt(st.until)}`
  const { day, min } = clockIn(date)
  if (hours[day] && min < mins(hours[day][0])) return `Fechado · abre hoje às ${fmt(hours[day][0])}`
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7
    if (hours[d]) return `Fechado · abre ${i === 1 ? 'amanhã' : DAY_NAMES[d]} às ${fmt(hours[d][0])}`
  }
  return 'Fechado'
}

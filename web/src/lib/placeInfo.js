// Dados preenchidos à mão pela equipe: nota do Google (com a data em que foi vista), contato e horário.
export const DAYS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const dateOk = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d || '')
export const ratingOf = (p) => {
  const n = Number(String(p.rating ?? '').replace(',', '.'))
  return p.rating !== '' && p.rating != null && n >= 0 && n <= 5 && dateOk(p.ratingDate) ? { value: n.toFixed(1).replace('.', ','), reviews: Number(p.reviews) > 0 ? Math.round(Number(p.reviews)) : null, date: p.ratingDate.split('-').reverse().join('/') } : null
}
export const reviewsText = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',').replace(',0', '')} mil avaliações` : `${n} ${n === 1 ? 'avaliação' : 'avaliações'}`)
export const phoneLink = (v) => { const d = String(v || '').replace(/\D/g, ''); return d.length >= 8 && d.length <= 13 ? `tel:+${d.length <= 11 ? '55' : ''}${d}` : null }
export const httpsLink = (v) => (/^https:\/\/[^\s"'<>]+$/i.test(String(v || '').trim()) ? String(v).trim() : null)

// "09:00-18:00" <-> ['09:00','18:00']; vazio = fechado
export const dayText = (h) => (h ? `${h[0]}-${h[1]}` : '')
export function parseDay(t) {
  const s = String(t || '').trim().toLowerCase()
  if (!s || s === 'fechado') return null
  const m = s.match(/^(\d{1,2})(?:[:h](\d{2}))?h?\s*(?:-|–|às|as|a)\s*(\d{1,2})(?:[:h](\d{2}))?h?$/)
  if (!m || Number(m[1]) > 23 || Number(m[3]) > 24 || Number(m[2] || 0) > 59 || Number(m[4] || 0) > 59) return undefined // não entendido
  return [`${m[1].padStart(2, '0')}:${m[2] || '00'}`, `${m[3].padStart(2, '0')}:${m[4] || '00'}`]
}
const short = (t) => t.replace(':00', 'h').replace(/^(\d{2}):(\d{2})$/, '$1h$2')
export const todayText = (hours, day = new Date().getDay()) => (hours?.[day] ? `${DAYS[day]}, das ${short(hours[day][0])} às ${short(hours[day][1])}` : `${DAYS[day]}: fechado`)

// devolve os campos limpos para gravar no mapa
export function cleanInfo(e) {
  const out = {}
  if (e.rating !== undefined) { const n = Number(String(e.rating).replace(',', '.')); out.rating = e.rating !== '' && n >= 0 && n <= 5 ? Math.round(n * 10) / 10 : null }
  if (e.reviews !== undefined) { const n = Number(String(e.reviews).replace(/\D/g, '')); out.reviews = n > 0 ? n : null }
  if (e.ratingDate !== undefined) out.ratingDate = dateOk(e.ratingDate) ? e.ratingDate : null
  if (e.phone !== undefined) out.phone = phoneLink(e.phone) ? String(e.phone).trim().slice(0, 30) : null
  if (e.website !== undefined) out.website = httpsLink(e.website)
  if (e.instagramUrl !== undefined) out.instagramUrl = /^https:\/\/(www\.)?instagram\.com\/[\w.]+\/?$/i.test(String(e.instagramUrl).trim()) ? String(e.instagramUrl).trim() : null
  if (e.days !== undefined) { const h = e.days.map(parseDay); if (!h.includes(undefined)) out.hours = h.some(Boolean) ? h : null }
  return out
}

// Regras puras das descrições dos lugares.
export const cleanAbout = (t) => {
  const s = String(t || '').replace(/[#@][\w.]+/g, '').replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim()
  if (s.length <= 160) return s
  const cut = s.slice(0, 157)
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`
}
export const basicAbout = (category, hood) => `${category}${hood ? ` em ${hood}` : ''}.`

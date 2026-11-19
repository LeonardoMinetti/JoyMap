// Extração determinística (regras) de restaurante, endereço, publicidade e categoria a partir da legenda
// que o criador cola ou que a conta conectada devolver. Portado do pipeline Python da PoC (testado lá).
// Princípios: nunca inventar endereço; hashtags não viram nome; ausência de marca de publi != sem publicidade.

const MENTION = /@([A-Za-z0-9_.]{3,30})/g
const CREDIT = /(🎥|📹|cia dele|com o|com a)\s*@([\w.]+)/gi
const PIN = /📍\s*([^📍#*\n]+)/g
const STREET = /((?:R\.|Rua|Av\.?|Avenida|Al\.|Alameda|Estrada|Praça)\s+[^,#\n]{3,60}?,?\s*\d{1,5}[^#\n📍]{0,45})/
const EMOJI = /[\u{1F000}-\u{1FFFF}☀-➿‼️]/u
const CUTS = [' Fomos ', ' Do lado', ' Aceitam', '(', ' Eles ', ' Pedimos', ' Lugar ']
const LABEL = /^[A-ZÀ-Ý][A-ZÀ-Ý ]{2,19}\s+-\s+(?=\S)/
const NAME_ADDR = /^([^,\d]{3,60}?)\s+-\s+((?:R\.|Rua|Av\.|Avenida|Al\.|Alameda)(?=\s).*)$/
const AD = /(\*\s*publi\b|#\s*publi\b|\bpubli\b|#ad\b|\bparceria\b|\bpubl\w*i\b)/i
const POSITIVE = ['amamos', 'amei', 'incrível', 'incrivel', 'melhor', 'perfeit', 'apaixonad', 'maravilh', 'excepcional', 'recomend', 'vale a pena', 'delicios', 'favorit', 'premiado']
const VISIT = ['conhecemos', 'fomos', 'voltamos', 'viemos', 'conheci', 'provei', 'pedimos']
const CITIES = { alphaville: 'Barueri', osasco: 'Osasco', guarulhos: 'Guarulhos', 'santo andré': 'Santo André', atibaia: 'Atibaia', mairiporã: 'Mairiporã' }

export const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

export function normalizeAddress(addr) {
  let a = strip(addr).toLowerCase()
  a = a.replace(/\b(rua|r\.|av\.?|avenida|al\.?|alameda|praca|estrada)\b/g, (m) => ({ rua: 'r', 'r.': 'r', av: 'av', 'av.': 'av', avenida: 'av', al: 'al', 'al.': 'al', alameda: 'al', praca: 'pc', estrada: 'estr' }[m] || m))
  a = a.replace(/[^a-z0-9 ]/g, ' ')
  const m = a.match(/^\s*(?:(\w+)\s+)?(.*?)\s+(\d{1,5})\b/)
  return m ? `${(m[1] || '')} ${m[2]} ${m[3]}`.replace(/\s+/g, ' ').trim() : a.replace(/\s+/g, ' ').trim()
}

export function cleanAddress(raw) {
  let s = raw.split(EMOJI)[0]
  for (const c of CUTS) s = s.split(c)[0]
  s = s.replace(/^Local:\s*/, '').replace(/^Rua:\s*/, 'Rua ')
  return s.replace(/\s+/g, ' ').replace(/^[ \-–—.,]+|[ \-–—.,]+$/g, '')
}

export function pickHandles(text) {
  const credits = new Set([...text.matchAll(CREDIT)].map((m) => m[2].toLowerCase()))
  const counts = new Map()
  for (const m of text.matchAll(MENTION)) {
    const h = m[1].toLowerCase().replace(/\.$/, '')
    if (credits.has(h)) continue
    counts.set(h, (counts.get(h) || 0) + 1)
  }
  const order = [...counts.keys()]
  return order.sort((a, b) => counts.get(b) - counts.get(a) || order.indexOf(a) - order.indexOf(b))
}

export function humanize(handle) {
  return handle.replace(/[_.]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim()
}

export function guessCategory(text) {
  const t = strip(text.toLowerCase())
  const rules = [['cafe', /cafe|cafeteria|brunch|coffee/], ['bar', /\bbar\b|drink|coquetel|chopp|cervej/], ['cake', /doce|sobremesa|sorvete|confeitaria|bolo|brigadeiro/],
    ['pizza', /pizza/], ['fish', /sushi|japon|temaki|rodizio japa/], ['burger', /hambur|burger|lanche/], ['bread', /padaria|pao |panificadora/]]
  for (const [id, re] of rules) if (re.test(t)) return id
  return 'rest'
}

export function municipalityHint(s) {
  const low = s.toLowerCase()
  for (const [k, v] of Object.entries(CITIES)) if (low.includes(k)) return v
  return null
}

export function extract(text) {
  const handles = pickHandles(text)
  const units = []
  for (const m of text.matchAll(PIN)) {
    const raw = cleanAddress(m[1])
    if (raw) units.push(raw)
  }
  if (!units.length) {
    const m = text.match(STREET)
    if (m) units.push(cleanAddress(m[1]))
  }
  let name = null
  let nameSource = null
  if (handles.length) { name = humanize(handles[0]); nameSource = 'mention_handle' }
  const parsed = units.map((raw) => {
    const label = (raw.match(LABEL) || [null])[0]
    let address = label ? raw.replace(LABEL, '') : raw
    const na = address.match(NAME_ADDR)
    if (na && !handles.length) { name = name || na[1].trim(); nameSource = nameSource || 'pin_prefix'; address = na[2].trim() }
    return { label: label ? label.replace(/\s+-\s*$/, '').trim() : null, address }
  })
  const hasNumber = parsed.some((u) => /\d/.test(u.address))
  const confidence = name && hasNumber ? 'high' : name || parsed.length ? 'medium' : 'none'
  const low = strip(text.toLowerCase())
  const rec = !name ? 'unknown' : POSITIVE.some((p) => low.includes(strip(p))) ? 'recommendation' : VISIT.some((v) => low.includes(v)) ? 'visit_showcase' : 'mention_only'
  return {
    name, nameSource, handles, units: parsed, ad: AD.test(text), rec, confidence,
    category: guessCategory(text), hashtagCandidates: [...text.matchAll(/#([\wÀ-ÿ]+)/g)].map((m) => m[1]).slice(0, 6),
  }
}

export function tiktokId(url) {
  const m = String(url || '').match(/tiktok\.com\/@[\w.]+\/video\/(\d{8,})/)
  return m ? m[1] : null
}

// Data derivada dos 32 bits altos do ID do vídeo do TikTok (documentada na PoC).
export function dateFromTiktokId(id) {
  const ts = Number(BigInt(id) >> 32n)
  return new Date(ts * 1000).toISOString().slice(0, 10)
}

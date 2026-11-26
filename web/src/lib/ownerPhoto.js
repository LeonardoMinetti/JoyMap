// O Google não informa se uma foto é do estabelecimento. O sinal disponível é o autor: quando o próprio negócio
// envia, o crédito sai com o nome dele. Fica a primeira foto cujo autor bate com o nome do lugar.
const GENERIC = new Set('bar cafe padaria cozinha confeitaria restaurante boteco pizzaria pizza hamburgueria burger burguer bakery shop o a os as e de da do das dos'.split(' '))
const words = (s) => String(s || '').split(' (')[0].normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)

export function isOwnerName(author, place) {
  const a = words(author), p = words(place)
  if (!a.length || !p.length) return false
  if (a.join('') === p.join('')) return true
  const core = (w) => { const c = w.filter((x) => !GENERIC.has(x)); return c.length ? c : w }
  const [short, long] = [core(a), core(p)].sort((x, y) => x.join('').length - y.join('').length)
  // nome curto demais (ou só um pedaço de nome de pessoa) não basta
  return short.join('').length >= 4 && (short.join('') === long.join('') || (short.every((w) => long.includes(w)) && (short.length > 1 || long.length <= 3 || long[0] === short[0])))
}

export const ownerPhoto = (photos, place) => (photos || []).find((ph) => isOwnerName(ph.authorAttributions?.[0]?.displayName, place)) || null

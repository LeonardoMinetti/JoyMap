// Emoji para identificar o tema de uma busca (pizza → 🍕). Casa por trecho da palavra, sem acento; sem correspondência, uma lupa.
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const MAP = [
  ['pizza', '🍕'], ['hamburg', '🍔'], ['burger', '🍔'], ['lanche', '🍔'], ['hot dog', '🌭'], ['cachorro', '🌭'],
  ['cafe', '☕'], ['cafeteria', '☕'], ['brunch', '🥞'], ['padaria', '🥖'], ['pao', '🥖'], ['bolo', '🍰'], ['doce', '🍰'], ['confeitaria', '🧁'], ['sobremesa', '🍰'],
  ['sorvete', '🍦'], ['gelato', '🍦'], ['acai', '🍧'], ['chocolate', '🍫'],
  ['ramen', '🍜'], ['lamen', '🍜'], ['macarrao', '🍝'], ['massa', '🍝'], ['italian', '🍝'], ['sushi', '🍣'], ['japones', '🍣'], ['temaki', '🍣'], ['izakaya', '🏮'],
  ['churrasco', '🥩'], ['carne', '🥩'], ['steak', '🥩'], ['rodizio', '🍖'], ['costela', '🍖'], ['feijoada', '🍲'], ['sopa', '🍲'], ['caldo', '🍲'],
  ['taco', '🌮'], ['mexican', '🌮'], ['tapioca', '🫓'], ['pastel', '🥟'], ['coxinha', '🍗'], ['frango', '🍗'], ['salgado', '🥟'],
  ['vegano', '🥗'], ['vegetarian', '🥗'], ['salada', '🥗'], ['saudavel', '🥗'], ['fit', '🥗'], ['peixe', '🐟'], ['frutos do mar', '🦐'], ['camarao', '🦐'],
  ['cerveja', '🍺'], ['bar', '🍻'], ['chopp', '🍺'], ['drink', '🍹'], ['coquetel', '🍸'], ['vinho', '🍷'], ['rooftop', '🌇'], ['balada', '🪩'], ['samba', '🎶'], ['musica', '🎶'],
  ['restaurante', '🍽️'], ['jantar', '🍽️'], ['almoco', '🍽️'], ['romantic', '💕'], ['barato', '💸'], ['promocao', '🏷️'],
  ['parque', '🌳'], ['trilha', '🥾'], ['praia', '🏖️'], ['cachoeira', '💦'], ['camping', '⛺'], ['mochila', '🎒'], ['viagem', '🧳'], ['hotel', '🏨'], ['pousada', '🏨'], ['voo', '✈️'], ['aviao', '✈️'],
  ['museu', '🏛️'], ['arte', '🎨'], ['livraria', '📚'], ['loja', '🛍️'], ['brecho', '👕'], ['feira', '🧺'], ['mercado', '🛒'], ['pet', '🐶'], ['crianca', '🧸'], ['kids', '🧸'],
]
export function termEmoji(term) {
  const t = norm(term)
  const hit = MAP.find(([k]) => (k.length <= 3 ? new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(t) : t.includes(k)))
  return hit ? hit[1] : '🔎'
}

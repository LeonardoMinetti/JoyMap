// Sistema de voo da wagli: 4 níveis × 6 personalidades (proposta de gamificação da marca).
export const PERSONALITIES = [
  ['brincalhona', 'Brincalhona', 'Piscadinha e língua de fora'],
  ['ousada', 'Ousada', 'Sobrancelha arqueada, olhar de quem sabe'],
  ['descolada', 'Descolada', 'Meio de lado, sem pressa'],
  ['radiante', 'Radiante', 'Sorriso aberto'],
  ['serena', 'Serena', 'Olhos fechados, tranquila'],
  ['carinhosa', 'Carinhosa', 'Beijinho'],
]
export const LEVELS = [
  { n: 1, name: 'Primeiro voo', min: 0, max: 99, detail: 'Asas pequenas, sem listras' },
  { n: 2, name: 'Exploradora', min: 100, max: 299, detail: 'Amarelo JoyMap, asas clássicas' },
  { n: 3, name: 'Polinizadora', min: 300, max: 699, detail: 'Corpo âmbar, asas maiores em jade' },
  { n: 4, name: 'Guardiã', min: 700, max: null, detail: 'Coroa, violeta e dourado, asas lilás' },
]
export const XP_PER_VISIT = 10
export const levelOf = (xp) => [...LEVELS].reverse().find((l) => xp >= l.min) || LEVELS[0]
export const nextOf = (xp) => LEVELS.find((l) => l.min > xp) || null

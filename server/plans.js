// Planos do criador e o que cada um libera. É a única fonte de verdade: o servidor confere a permissão em cada ação
// (não só a tela) e o painel lê a mesma tabela para mostrar travas. Valores de preço ficam na página de planos.
export const TIERS = ['free', 'creator', 'pro']
export const TIER_NAMES = { free: 'Grátis', creator: 'Criador', pro: 'Pro' }
export const CAPS = {
  free: { customCategories: false, maxCategories: 9, customDomain: false, removeBrand: false, fullHistory: false, autoUpdate: false, sellRoteiros: false, roteiroFee: null, products: false },
  creator: { customCategories: false, maxCategories: 9, customDomain: false, removeBrand: false, fullHistory: true, autoUpdate: true, sellRoteiros: true, roteiroFee: 8, products: false },
  pro: { customCategories: true, maxCategories: 15, customDomain: true, removeBrand: true, fullHistory: true, autoUpdate: true, sellRoteiros: true, roteiroFee: 5, products: true },
}
// quem já existia antes dos planos (e quem está no teste) fica no Criador
export const tierOf = (t) => (TIERS.includes(t) ? t : 'creator')
export const can = (tier, cap) => !!CAPS[tierOf(tier)][cap]
export const planView = (tier) => { const t = tierOf(tier); return { tier: t, tierName: TIER_NAMES[t], can: CAPS[t] } }
// plano mínimo que libera uma permissão (para dizer "disponível no plano X")
export const minTier = (cap) => TIERS.find((t) => CAPS[t][cap]) || null

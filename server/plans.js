// Planos do criador e o que cada um libera. É a única fonte de verdade: o servidor confere a permissão em cada ação
// (não só a tela) e o painel lê a mesma tabela para mostrar travas. Valores de preço ficam na página de planos.
export const TIERS = ['free', 'creator', 'pro']
export const TIER_NAMES = { free: 'Grátis', creator: 'Criador', pro: 'Pro' }
export const CAPS = {
  free: { customCategories: false, maxCategories: 9, customDomain: false, removeBrand: false, fullHistory: false, autoUpdate: false, sellRoteiros: false, roteiroFee: null, products: false, sponsoredRoteiros: false, insights: false, studioFull: false, roteiros: false, maxPlaces: 20 },
  creator: { customCategories: false, maxCategories: 9, customDomain: false, removeBrand: false, fullHistory: true, autoUpdate: true, sellRoteiros: true, roteiroFee: 8, products: true, sponsoredRoteiros: false, insights: true, studioFull: true, roteiros: true, maxPlaces: null },
  pro: { customCategories: true, maxCategories: 15, customDomain: true, removeBrand: true, fullHistory: true, autoUpdate: true, sellRoteiros: true, roteiroFee: 5, products: true, sponsoredRoteiros: true, insights: true, studioFull: true, roteiros: true, maxPlaces: null },
}
// quem já existia antes dos planos (e quem está no teste) fica no Criador
export const tierOf = (t) => (TIERS.includes(t) ? t : 'creator')
export const can = (tier, cap) => !!CAPS[tierOf(tier)][cap]
export const planView = (tier) => { const t = tierOf(tier); return { tier: t, tierName: TIER_NAMES[t], can: CAPS[t] } }
// plano mínimo que libera uma permissão (para dizer "disponível no plano X")
export const minTier = (cap) => TIERS.find((t) => CAPS[t][cap]) || null

// Plano Grátis: o painel mostra só as visitas totais (sessões por dia). Buscas, lugares abertos, cliques em rota e público são do Criador.
export const limitStats = (s) => ({ ...s, limited: true, placeOpens: null, routeClicks: null, postOpens: null, requests: null, searches: [], topPlaces: [], featured: null, opportunity: null, audience: { enough: false, sample: 0, weekdays: [0, 0, 0, 0, 0, 0, 0], mobilePct: null, returningPct: null, origins: [], cities: null } })

// Quantos lugares ainda cabem (null = sem limite). Quem já passou do limite antes continua com o que tem, mas não adiciona novos.
export const roomFor = (tier, count) => { const m = CAPS[tierOf(tier)].maxPlaces; return m == null ? Infinity : Math.max(0, m - count) }

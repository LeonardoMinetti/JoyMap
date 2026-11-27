// Patrocínio de um roteiro. É opcional: roteiro sem `sponsor` segue como sempre.
// Aceita o formato do painel ({ brand, logo }) e o completo, abaixo.
export const SPONSOR_FIELDS = ['sponsorId', 'sponsorName', 'sponsorLogo', 'sponsorWebsite', 'sponsorDescription', 'sponsorBrandColor', 'sponsorCTA', 'sponsorProducts', 'sponsorCoupon', 'campaignStatus', 'isSponsored']
const web = (u) => (/^https?:\/\//i.test(String(u || '')) ? String(u) : '')
export function sponsorOf(route) {
  const s = route?.sponsor
  if (!s || s.isSponsored === false) return null
  const name = s.sponsorName || s.brand
  if (!name) return null
  return {
    id: s.sponsorId || null, name, logo: s.sponsorLogo || s.logo || '', website: web(s.sponsorWebsite), description: s.sponsorDescription || '',
    color: /^#[0-9a-f]{6}$/i.test(s.sponsorBrandColor || '') ? s.sponsorBrandColor : '#141414', cta: s.sponsorCTA || 'Conhecer a marca',
    products: (s.sponsorProducts || []).filter((p) => p?.name && web(p.url)), coupon: s.sponsorCoupon || null, status: s.campaignStatus || 'active',
  }
}

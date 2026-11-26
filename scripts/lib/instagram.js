// Coleta pela API oficial da Meta, no mesmo formato da coleta do Apify, para o restante do fluxo não mudar.
// Caminho "descoberta" (Business Discovery, login do Facebook): lê outro perfil profissional pela nossa conta.
// Caminho "autorizado": o próprio criador autoriza e lemos as postagens dele com o token dele.
export const VERSION = 'v27.0'
const FIELDS = 'id,caption,permalink,timestamp,thumbnail_url,media_url,media_type,username'
const TYPE = { IMAGE: 1, VIDEO: 2, CAROUSEL_ALBUM: 8 }

export const toItem = (m, owner) => ({
  url: m.permalink, caption: m.caption || '', timestamp: m.timestamp || '', type: TYPE[m.media_type] || '',
  // capa: vídeo traz thumbnail_url; foto e carrossel, media_url (que pode vir ausente)
  displayUrl: m.thumbnail_url || (m.media_type === 'VIDEO' ? '' : m.media_url || ''),
  ownerUsername: m.username || owner,
})

async function get(url, fetcher) {
  const res = await fetcher(url)
  const body = await res.json().catch(() => ({}))
  // a mensagem nunca inclui o endereço, que carrega o token
  if (!res.ok || body.error) throw new Error(`Meta ${res.status}: ${body.error?.code ?? ''} ${String(body.error?.message || 'erro').replace(/(access_token=)[^&\s]+/g, '$1***').slice(0, 200)}`)
  return body
}

export async function collect({ mode, handle, token, igUserId, since = '', fetcher = fetch, max = 5000 }) {
  if (!/^[a-z0-9_.]{1,30}$/i.test(handle)) throw new Error('usuário do Instagram inválido')
  const items = []
  let after = ''
  for (;;) {
    let page
    if (mode === 'descoberta') {
      const q = new URLSearchParams({ fields: `business_discovery.username(${handle}){media${after ? `.after(${after})` : ''}{${FIELDS}}}`, access_token: token })
      page = (await get(`https://graph.facebook.com/${VERSION}/${encodeURIComponent(igUserId)}?${q}`, fetcher)).business_discovery?.media
    } else {
      const q = new URLSearchParams({ fields: FIELDS, access_token: token, ...(after ? { after } : {}) })
      page = await get(`https://graph.instagram.com/${VERSION}/me/media?${q}`, fetcher)
    }
    const data = page?.data || []
    for (const m of data) if (m.permalink && (!since || (m.timestamp || '') >= since)) items.push(toItem(m, handle))
    const next = page?.paging?.cursors?.after
    // as postagens vêm das mais novas para as antigas: para ao passar da data pedida
    if (!data.length || !next || next === after || items.length >= max || (since && data.every((m) => (m.timestamp || '') < since))) break
    after = next
  }
  return items
}

// Publicar pelo painel, sem servidor: grava o mapa do criador direto no repositório (API do GitHub) e o deploy segue sozinho.
// A chave de acesso é do administrador, fica só no navegador e é enviada apenas para api.github.com.
import { toPlace } from '../../../scripts/lib/lugares.js'
import { findInMap, sameAddress } from '../../../scripts/lib/fluxo.js'

export const REPO = 'LeonardoMinetti/JoyMap'
const API = 'https://api.github.com'

export const hasPoint = (p) => p.lat !== undefined && p.lat !== '' && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon))

// junta os aprovados ao mapa, sem repetir lugar; devolve o mapa novo e o que entrou
export function addApproved(map, found, choices) {
  const places = [...map.places]
  let id = Math.max(0, ...places.map((p) => p.id))
  const added = []
  for (const [chave, categoria] of Object.entries(choices)) {
    const p = found.find((x) => x.chave === chave)
    if (!p || !hasPoint(p) || findInMap(p, places)) continue
    const post = p.posts[0] || {}
    const url = /^https:\/\/(www\.)?instagram\.com\//.test(post.url) ? post.url : ''
    const place = { ...toPlace({ nome: p.nome, categoria, bairro: p.bairro, lat: p.lat, lon: p.lon, rua: p.endereco, numero: '', cidade: p.cidade, post: url, publi: p.publi }, ++id), postedOn: post.data || null }
    places.push(place)
    added.push(place)
  }
  return { map: { ...map, places }, added }
}

// identificador do Google (para a foto na ficha): só o id é guardado, e só quando o endereço confere
export async function googleIds(places, key, fetcher = fetch) {
  for (const p of places) {
    try {
      const r = await fetcher('https://places.googleapis.com/v1/places:searchText', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.formattedAddress' }, body: JSON.stringify({ textQuery: `${p.name}, ${p.municipality || 'São Paulo'}`, languageCode: 'pt-BR', pageSize: 1 }) })
      const hit = (await r.json()).places?.[0]
      if (hit && sameAddress(p.address, hit.formattedAddress.replace(' - ', ', '))) p.googlePlaceId = hit.id
    } catch { /* sem foto do Google: o lugar entra do mesmo jeito */ }
  }
}

const toBase64 = (text) => { const u = new TextEncoder().encode(text); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s) }
const fromBase64 = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\s/g, '')), (c) => c.charCodeAt(0)))

export async function publishToMap({ token, handle, found, choices, googleKey, fetcher = fetch }) {
  if (!/^[a-z0-9_.]{2,40}$/.test(handle)) throw new Error('Criador inválido.')
  const url = `${API}/repos/${REPO}/contents/web/public/maps/${handle}.json`
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  const fail = (status) => new Error(status === 401 ? 'O GitHub recusou a chave. Confira se ela está certa e dentro da validade.'
    : status === 403 ? 'A chave não tem permissão de escrita no JoyMap (Contents: Read and write).'
      : status === 404 ? 'Mapa não encontrado, ou a chave não dá acesso ao JoyMap.'
        : status === 409 ? 'O mapa mudou enquanto você publicava. Tente de novo.' : `O GitHub respondeu com erro ${status}.`)
  const cur = await fetcher(`${url}?ref=main`, { headers, cache: 'no-store' })
  if (!cur.ok) throw fail(cur.status)
  const file = await cur.json()
  const { map, added } = addApproved(JSON.parse(fromBase64(file.content)), found, choices)
  if (!added.length) return { added, total: map.places.length }
  if (googleKey && map.creator?.theme?.provider === 'google') await googleIds(added, googleKey, fetcher)
  const put = await fetcher(url, { method: 'PUT', headers, body: JSON.stringify({ message: `[conteudo] Mapa de @${handle}: ${added.length} lugares aprovados no admin`, content: toBase64(JSON.stringify(map)), sha: file.sha, branch: 'main' }) })
  if (!put.ok) throw fail(put.status)
  return { added, total: map.places.length }
}

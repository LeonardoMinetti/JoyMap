import test from 'node:test'
import assert from 'node:assert/strict'
import { collect } from '../scripts/lib/instagram.js'

const reply = (body, status = 200) => ({ ok: status < 300, status, json: async () => body })
const media = (n, date, type = 'VIDEO') => ({ permalink: `https://www.instagram.com/reel/${n}/`, caption: n, timestamp: date, media_type: type, thumbnail_url: 't', media_url: 'm' })

test('descoberta pagina pelo cursor, para na data e entrega o formato da coleta', async () => {
  const urls = []
  const fetcher = async (u) => {
    urls.push(decodeURIComponent(u))
    const second = decodeURIComponent(u).includes('.after(c1)')
    return reply({ business_discovery: { media: { data: second ? [media('b', '2025-01-01')] : [media('a', '2026-02-01')], paging: { cursors: { after: second ? 'c2' : 'c1' } } } } })
  }
  const items = await collect({ mode: 'descoberta', handle: 'eu', token: 't', igUserId: '1', since: '2026-01-01', fetcher })
  assert.equal(items.length, 1)
  assert.equal(items[0].type, 2)
  assert.equal(urls.length, 2)
})
test('erro da Meta não mostra o token', async () => {
  const fetcher = async () => reply({ error: { code: 190, message: 'bad access_token=SEGREDO' } }, 400)
  await assert.rejects(collect({ mode: 'autorizado', handle: 'eu', token: 'SEGREDO', fetcher }), (e) => !e.message.includes('SEGREDO'))
})

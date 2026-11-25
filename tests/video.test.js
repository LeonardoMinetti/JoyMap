import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanVideoUrl, lockRoute } from '../server/offers.js'
import { embedOf } from '../web/src/pub/embed.js'

test('vídeo do roteiro: só Instagram, TikTok ou YouTube em https, e fica trancado junto com o roteiro pago', () => {
  assert.ok(cleanVideoUrl('https://www.instagram.com/reel/abc/'))
  assert.ok(cleanVideoUrl('https://youtu.be/abc'))
  for (const bad of ['javascript:alert(1)', 'http://instagram.com/p/a', 'https://instagram.com.evil.test/p/a', 'https://example.com', '']) assert.equal(cleanVideoUrl(bad), null)
  assert.equal(lockRoute({ price: 19, video: 'https://youtu.be/abc', stops: [], placeIds: [1] }, false).video, null)
})

test('player: monta o endereço oficial de cada plataforma e recusa o resto', () => {
  assert.equal(embedOf('https://www.instagram.com/p/abcdefghij/?hl=pt').src, 'https://www.instagram.com/p/abcdefghij/embed/')
  assert.equal(embedOf('https://www.instagram.com/reel/abcdefghijk/').net, 'Instagram')
  assert.match(embedOf('https://www.tiktok.com/@a/video/7405595760361737477').src, /player\/v1\/7405595760361737477/)
  assert.match(embedOf('https://youtu.be/dQw4w9WgXcQ').src, /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/)
  for (const bad of ['https://instagram.com.evil.test/p/abcdef', 'https://www.instagram.com/usuario/', 'nada']) assert.equal(embedOf(bad), null)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanVideoUrl, lockRoute } from '../server/offers.js'

test('vídeo do roteiro: só Instagram, TikTok ou YouTube em https, e fica trancado junto com o roteiro pago', () => {
  assert.ok(cleanVideoUrl('https://www.instagram.com/reel/abc/'))
  assert.ok(cleanVideoUrl('https://youtu.be/abc'))
  for (const bad of ['javascript:alert(1)', 'http://instagram.com/p/a', 'https://instagram.com.evil.test/p/a', 'https://example.com', '']) assert.equal(cleanVideoUrl(bad), null)
  assert.equal(lockRoute({ price: 19, video: 'https://youtu.be/abc', stops: [], placeIds: [1] }, false).video, null)
})

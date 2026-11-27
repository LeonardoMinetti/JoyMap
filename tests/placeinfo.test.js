import test from 'node:test'
import assert from 'node:assert/strict'
import { ratingOf, parseDay, cleanInfo, reviewsText, todayText } from '../web/src/lib/placeInfo.js'

test('nota só com data; horários e contatos validados', () => {
  assert.equal(ratingOf({ rating: 4.5 }), null)
  assert.deepEqual(ratingOf({ rating: '4,5', reviews: 5700, ratingDate: '2026-11-27' }), { value: '4,5', reviews: 5700, date: '27/11/2026' })
  assert.equal(reviewsText(5700), '5,7 mil avaliações')
  assert.deepEqual(parseDay('9h às 18h30'), ['09:00', '18:30'])
  assert.equal(parseDay(''), null)
  assert.equal(parseDay('cedo'), undefined)
  assert.equal(cleanInfo({ website: 'javascript:alert(1)', rating: '9' }).website, null)
  assert.equal(cleanInfo({ rating: '9' }).rating, null)
  assert.ok(!('hours' in cleanInfo({ days: ['cedo', '', '', '', '', '', ''] })))
  assert.equal(todayText([null, ['09:00', '18:00']], 1), 'Segunda-feira, das 09h às 18h')
})

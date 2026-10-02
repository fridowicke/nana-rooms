import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { reactionImages, reactionAudio, hasReactionWindow } from '../src/roomReactions.js'

test('an image, its accompanying GIF, and its sound form one response', () => {
  const response = { type: 'image', value: 'message.png', audio: 'message.mp3', gifs: ['message.gif'] }
  assert.deepEqual(reactionImages(response), ['message.png', 'message.gif'])
  assert.equal(reactionAudio(response), 'message.mp3')
  assert.equal(hasReactionWindow(response), true)
})

test('sound-only objects can be replayed without opening an empty window', () => {
  const response = { type: 'audio', value: 'clock.mp3' }
  assert.equal(reactionAudio(response), 'clock.mp3')
  assert.equal(hasReactionWindow(response), false)
  assert.deepEqual(reactionImages(response), [])
})

test('shopping and game links open a window, and old video responses still work', () => {
  assert.equal(hasReactionWindow({ type: 'link', value: 'https://example.com/item' }), true)
  assert.equal(hasReactionWindow({ type: 'video', value: 'movie.mp4' }), true)
  assert.equal(hasReactionWindow(null), false)
  assert.equal(hasReactionWindow({ type: 'link', value: '' }), false)
  assert.equal(hasReactionWindow({ type: 'link', value: 'https://example.com/game', openInNewTab: true }), false)
})

test('every published reaction has its local media and replayable camera selections', () => {
  const files = fs.readdirSync('public/hotspots').filter(file => /^room-\d+\.json$/.test(file))
  const ids = new Set()
  let total = 0
  for (const file of files) {
    const room = JSON.parse(fs.readFileSync(path.join('public/hotspots', file)))
    for (const object of room.hotspots) {
      total++
      assert.ok(!ids.has(object.id), `duplicate object ${object.id}`)
      ids.add(object.id)
      assert.ok(object.strokes.length > 0, `${object.id} has no selection`)
      for (const stroke of object.strokes) {
        assert.ok(stroke.poly.length >= 3)
        assert.ok(stroke.poly.flat().every(n => Number.isFinite(n) && n >= 0 && n <= 1))
        assert.ok(Math.abs(Math.hypot(...stroke.cam.q) - 1) < .00001)
        assert.ok(stroke.cam.aspect > 0)
      }
      const media = []
      for (const response of [object.reaction, object.hover]) {
        if (!response) continue
        if (response.value && !['text', 'link'].includes(response.type)) media.push(response.value)
        if (response.audio) media.push(response.audio)
        for (const key of ['images', 'gifs', 'surfaceGifs', 'sparkles']) media.push(...(response[key] ?? []))
      }
      for (const src of media.filter(src => !/^https?:/.test(src))) {
        assert.ok(fs.existsSync(path.join('public', src)), `${object.id}: missing ${src}`)
      }
    }
  }
  for (const id of ['suzune-gun', 'suzune-shoes', 'suzune-clock', 'suzune-wardrobe', 'suzune-curtains', 'aiko-drawers', 'aiko-nail-polish', 'aiko-bag', 'aiko-pasta', 'moene-drawing']) {
    assert.ok(ids.has(id), `missing August object ${id}`)
  }
  assert.ok(total >= 11, 'the August objects and existing TV must be published')
})

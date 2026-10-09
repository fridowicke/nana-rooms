import test from 'node:test'
import assert from 'node:assert/strict'
import { createRoomAudio } from '../src/roomAudio.js'

function setup() {
  const created = []
  const player = createRoomAudio(src => {
    const audio = {
      src, currentTime: 0, loads: 0, pauses: 0, plays: 0,
      load() { this.loads++ },
      pause() { this.pauses++ },
      play() { this.plays++; return Promise.resolve() },
      removeAttribute() { this.src = null },
    }
    created.push(audio)
    return audio
  })
  return { player, created }
}

test('room entry preloads both response formats and hover sounds, deduplicating sources', () => {
  const { player, created } = setup()
  player.preload([
    { reaction: { type: 'audio', value: 'clock.mp3' } },
    { reaction: { audio: 'drawers.mp3' }, hover: { type: 'audio', value: 'clock.mp3' } },
    { hover: { type: 'audio', value: 'hover.mp3' } },
    { reaction: { type: 'image', value: 'message.png' } },
  ])
  assert.deepEqual(created.map(a => a.src), ['clock.mp3', 'drawers.mp3', 'hover.mp3'])
  assert.ok(created.every(a => a.preload === 'auto' && a.loads === 1 && a.plays === 0))
})

test('repeated clicks replay the preloaded sound from the beginning without loading again', () => {
  const { player, created } = setup()
  player.preload([{ reaction: { audio: 'sound.mp3' } }])
  const audio = player.play('sound.mp3', { loop: true, volume: 0.7 })
  audio.currentTime = 2
  assert.equal(player.play('sound.mp3'), audio)
  assert.equal(created.length, 1)
  assert.equal(audio.currentTime, 0)
  assert.equal(audio.loop, false)
  assert.equal(audio.volume, 1)
  assert.equal(audio.plays, 2)
  assert.equal(audio.loads, 1)
  assert.equal(player.play(null), null)
})

test('leaving a room stops playback and releases its media', () => {
  const { player, created } = setup()
  player.play('sound.mp3')
  player.dispose()
  assert.equal(created[0].src, null)
  assert.equal(created[0].pauses, 2)
  assert.equal(created[0].loads, 2)
  player.play('sound.mp3')
  assert.equal(created.length, 2)
})

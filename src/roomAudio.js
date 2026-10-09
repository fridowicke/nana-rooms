import { reactionAudio } from './roomReactions.js'

// Keep each room's sounds loaded and reuse the decoded media on every click.
export function createRoomAudio(makeAudio = (src) => new Audio(src)) {
  const sounds = new Map()
  function prepare(src) {
    if (!src) return null
    if (!sounds.has(src)) {
      const audio = makeAudio(src)
      audio.preload = 'auto'
      audio.load()
      sounds.set(src, audio)
    }
    return sounds.get(src)
  }
  return {
    preload(hotspots) {
      for (const hotspot of hotspots) {
        prepare(reactionAudio(hotspot.reaction))
        if (hotspot.hover?.type === 'audio') prepare(hotspot.hover.value)
      }
    },
    play(src, { loop = false, volume = 1 } = {}) {
      try {
        const audio = prepare(src)
        if (!audio) return null
        audio.pause()
        audio.currentTime = 0
        audio.loop = loop
        audio.volume = volume
        audio.play().catch(() => {})
        return audio
      } catch { return null }
    },
    dispose() {
      for (const audio of sounds.values()) {
        audio.pause()
        audio.removeAttribute('src')
        audio.load()
      }
      sounds.clear()
    },
  }
}

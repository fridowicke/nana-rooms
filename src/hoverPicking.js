// Coalesce pointer events and keep at most one GPU read in flight. A result from an older
// position (or an old room) must never restore a hover after the pointer has moved/left.
export function createHoverPicker({ pick, apply, requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame }) {
  let frame = null
  let pending = null
  let busy = false
  let generation = 0
  let disposed = false

  const schedule = () => {
    if (disposed || busy || frame !== null || !pending) return
    frame = requestFrame(async () => {
      frame = null
      const point = pending
      const version = generation
      pending = null
      busy = true
      try {
        const face = await pick(point)
        if (!disposed && generation === version && !pending) apply(face, point)
      } catch {
        if (!disposed && generation === version && !pending) apply(-1, point)
      } finally {
        busy = false
        schedule()
      }
    })
  }
  const clear = () => {
    generation++
    pending = null
    if (frame !== null) cancelFrame(frame)
    frame = null
  }
  return {
    move(point) { if (!disposed) { pending = point; schedule() } },
    leave() { clear(); if (!disposed) apply(-1, [0, 0]) },
    dispose() { disposed = true; clear() },
  }
}

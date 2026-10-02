// Keep the active room and a small number of prepared rooms on the same renderer.
// Releasing GPU resources leaves decoded images/geometry in the model download cache.
export function createGpuRoomCache({ prepare, release, requestIdle, cancelIdle, canPrepare = () => true, limit = 2 }) {
  const resident = new Map()
  let capacity = limit
  let active = null, desired = null, candidate = null, visible = false
  let idle = null, pending = null, disposed = false
  const cancel = () => { if (idle !== null) cancelIdle(idle); idle = null }
  const trim = () => {
    while (resident.size > capacity) {
      const victim = [...resident.keys()].find(url => url !== active && url !== desired)
      if (!victim) break
      const asset = resident.get(victim)
      resident.delete(victim)
      release(asset)
    }
  }
  const schedule = () => {
    if (disposed || !visible || !candidate || pending || idle !== null || !canPrepare() || resident.has(desired)) return
    idle = requestIdle(() => {
      idle = null
      if (disposed || !visible || !canPrepare() || !candidate || resident.has(desired)) return
      const job = { url: desired, asset: candidate }
      pending = job
      Promise.resolve().then(() => prepare(job.asset)).then(() => {
        if (disposed || (job.url !== active && job.url !== desired)) release(job.asset)
        else { resident.delete(job.url); resident.set(job.url, job.asset); trim() }
      }).catch(() => {
        // Preparation is optional. A failed candidate still loads normally on navigation.
        if (job.url !== active) release(job.asset)
        if (job.url === desired) candidate = null
      }).finally(() => { if (pending === job) pending = null; schedule() })
    })
  }
  return {
    setLimit(value) { capacity = Math.max(2, value); trim() },
    enter(url, nextUrl) { cancel(); active = url; desired = nextUrl; candidate = null; visible = false },
    ready(url, asset) {
      if (disposed || url !== active) return
      visible = true
      resident.delete(url); resident.set(url, asset)
      trim(); schedule()
    },
    target(url, asset) { cancel(); desired = url; candidate = asset ?? null; trim(); schedule() },
    offer(url, asset) { if (url === desired) { candidate = asset; schedule() } },
    refresh() { if (!canPrepare()) cancel(); else schedule() },
    reset() {
      cancel()
      const current = resident.get(active)
      resident.clear()
      if (current) resident.set(active, current)
      schedule()
    },
    dispose() {
      if (disposed) return
      disposed = true; cancel()
      for (const asset of resident.values()) release(asset)
      resident.clear()
    },
  }
}

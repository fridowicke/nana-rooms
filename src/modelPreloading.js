// Share decoded models between speculative downloads and the viewer. Background work is
// sequential, starts only after the current scene is visible, and can be cancelled safely.
export function createModelPreloader({ loadAsset, disposeAsset = () => {}, canPrefetch = () => true,
  requestIdle = (fn) => setTimeout(fn, 100), cancelIdle = clearTimeout }) {
  const entries = new Map()
  let activeUrl = null
  let sceneReady = false
  let queue = []
  let background = null
  let idle = null

  const cancelScheduled = () => {
    if (idle !== null) cancelIdle(idle)
    idle = null
  }
  const cancelBackground = () => {
    if (!background) return
    const entry = background
    background = null
    if (entries.get(entry.url) === entry) entries.delete(entry.url)
    entry.controller.abort()
  }
  const request = (url, priority) => {
    const cached = entries.get(url)
    if (cached) {
      if (priority === 'high') cached.priority = 'high'
      return cached
    }
    const entry = { url, priority, controller: new AbortController(), ready: false }
    entries.set(url, entry)
    entry.promise = Promise.resolve().then(() => loadAsset(url, {
      signal: entry.controller.signal,
      getPriority: () => entry.priority,
    })).then((asset) => {
      if (entry.controller.signal.aborted) {
        disposeAsset(asset)
        throw entry.controller.signal.reason
      }
      entry.ready = true
      return asset
    }).catch((error) => {
      if (entries.get(url) === entry) entries.delete(url)
      throw error
    })
    return entry
  }
  const schedule = () => {
    if (!sceneReady || !canPrefetch() || background || idle !== null || !queue.length) return
    idle = requestIdle(() => {
      idle = null
      if (!sceneReady || !canPrefetch() || background) return
      let url
      while ((url = queue.shift())) {
        if (url === activeUrl || entries.get(url)?.ready) continue
        const entry = request(url, 'low')
        background = entry
        entry.promise.catch(() => {}).finally(() => {
          if (background === entry) background = null
          schedule()
        })
        break
      }
    })
  }
  return {
    enter(url) {
      if (url === activeUrl) return
      activeUrl = url
      sceneReady = false
      queue = []
      cancelScheduled()
      if (background?.url === url) {
        // Keep the bytes already received when the user opens the room being prepared.
        background.priority = 'high'
        background = null
      } else cancelBackground()
    },
    load(url) {
      if (background?.url !== url) cancelBackground()
      else background = null
      return request(url, 'high').promise
    },
    ready(url, plannedUrls) {
      if (url !== activeUrl) return
      sceneReady = true
      queue = [...new Set(plannedUrls)].filter((item) => item && item !== activeUrl)
      schedule()
    },
    intent(url) {
      if (!url || url === activeUrl || !sceneReady || !canPrefetch() || entries.get(url)?.ready) return
      cancelScheduled()
      if (background && background.url !== url) {
        queue.unshift(background.url)
        cancelBackground()
      }
      queue = [url, ...queue.filter((item) => item !== url)]
      schedule()
    },
    refresh() {
      if (!canPrefetch()) {
        cancelScheduled()
        if (background) queue.unshift(background.url)
        cancelBackground()
      } else schedule()
    },
  }
}

export function preloadCount({ connection, deviceMemory, isMobile = false }, home = false) {
  if (connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType)) return 0
  if (connection?.effectiveType === '3g' || deviceMemory <= 2) return 1
  if (isMobile || deviceMemory <= 4) return home ? 2 : 1
  return home ? 4 : 2
}

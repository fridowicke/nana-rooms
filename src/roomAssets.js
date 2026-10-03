import { Loader } from 'three'
import { useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { createModelPreloader, preloadCount } from './modelPreloading.js'
import { fetchPublishedRoom } from './publishedRooms.js'

export const ROOM_FILES = [
  'YUNA WEB.glb', 'SUZUNE WEB.glb', 'AIKO WEB.glb', 'MOENE WEB.glb', 'PARDIS WEB.glb',
  'KAORI WEB.glb', 'REI WEB.glb', 'YURIA WEB.glb', 'MOMOCO WEB.glb', 'KUMO&MUKI WEB.glb', 'MIMI WEB.glb',
]
export const HOME_ASSET_URL = 'assets/home.glb'
export function getRoomAssetUrl(index) {
  const file = ROOM_FILES[index]
  // The version avoids reusing an old 8K response from the browser's HTTP cache.
  return file ? `rooms/${file}?v=4k-1` : null
}
function environment() {
  return { connection: globalThis.navigator?.connection, deviceMemory: globalThis.navigator?.deviceMemory }
}
export function roomPreloadPlan(roomIndex, isMobile) {
  const home = roomIndex == null
  const count = preloadCount({ ...environment(), isMobile }, home)
  return Array.from({ length: count }, (_, offset) => getRoomAssetUrl(home ? offset : (roomIndex + offset + 1) % ROOM_FILES.length))
}
export function releaseModelGpu(model, closeImages = false) {
  const geometries = new Set(), materials = new Set(), textures = new Set()
  for (const scene of model.scenes) scene.traverse((object) => {
    if (!object.isMesh) return
    geometries.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material)
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value)
    }
  })
  for (const geometry of geometries) geometry.dispose()
  for (const material of materials) material.dispose()
  for (const texture of textures) { texture.dispose(); if (closeImages) texture.image?.close?.() }
}
const hasIdleCallback = typeof globalThis.requestIdleCallback === 'function'
export const canPrepareRooms = () => globalThis.document?.visibilityState !== 'hidden' && globalThis.navigator?.onLine !== false && preloadCount(environment()) > 0
export const modelPreloader = createModelPreloader({
  canPrefetch: canPrepareRooms,
  requestIdle: (fn) => hasIdleCallback ? globalThis.requestIdleCallback(fn, { timeout: 1500 }) : setTimeout(fn, 100),
  cancelIdle: (id) => hasIdleCallback ? globalThis.cancelIdleCallback(id) : clearTimeout(id),
  disposeAsset: (model) => releaseModelGpu(model, true),
  loadAsset: async (url, { signal, getPriority }) => {
    const roomIndex = ROOM_FILES.findIndex((_, index) => getRoomAssetUrl(index) === url)
    if (roomIndex >= 0) fetchPublishedRoom(roomIndex + 1)
    const absoluteUrl = new URL(url, document.baseURI)
    const response = await fetch(absoluteUrl, { signal, priority: getPriority(), credentials: 'same-origin' })
    if (!response.ok) throw new Error(`Model download failed: ${response.status} ${url}`)
    const bytes = await response.arrayBuffer()
    signal.throwIfAborted()
    // All current scans are self-contained GLBs, without Draco/Meshopt extensions.
    return new GLTFLoader().parseAsync(bytes, new URL('.', absoluteUrl).href)
  },
})

// R3F caches this loader's result as usual; a preloaded model resolves from the same promise.
export class RoomAssetLoader extends Loader {
  load(url, onLoad, onProgress, onError) {
    const cached = modelPreloader.getCached(url)
    if (cached) { onLoad(cached); return }
    modelPreloader.load(url).then(onLoad, onError)
  }
}

// Resolve R3F's Suspense cache before navigation too, avoiding a fallback for a decoded model.
modelPreloader.onCached((url) => useLoader.preload(RoomAssetLoader, url))

import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createHoverPicker } from '../src/hoverPicking.js'
import { ScanPicker } from '../src/scanPicker.js'

const deferred = () => {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function harness() {
  const frames = new Map(), reads = [], applied = []
  let next = 0
  const picker = createHoverPicker({
    requestFrame: (fn) => { frames.set(++next, fn); return next },
    cancelFrame: (id) => frames.delete(id),
    pick: (point) => { const read = deferred(); reads.push({ ...read, point }); return read.promise },
    apply: (...args) => applied.push(args),
  })
  const tick = () => { const [id, fn] = frames.entries().next().value; frames.delete(id); return fn() }
  return { picker, frames, reads, applied, tick }
}

test('hover coalesces events and waits for the previous read before sampling the latest point', async () => {
  const h = harness()
  h.picker.move([1, 1]); h.picker.move([2, 2])
  assert.equal(h.frames.size, 1)
  const first = h.tick()
  assert.deepEqual(h.reads[0].point, [2, 2])
  h.picker.move([3, 3]); h.picker.move([4, 4])
  assert.equal(h.frames.size, 0)
  h.reads[0].resolve(10); await first
  assert.equal(h.applied.length, 0, 'stale result must not flash an old hotspot')
  const second = h.tick()
  h.reads[1].resolve(20); await second
  assert.deepEqual(h.applied, [[20, [4, 4]]])
})

test('leaving and entering again discards the old hover, including when no movement is queued', async () => {
  const h = harness()
  h.picker.move([1, 1]); const first = h.tick()
  h.picker.leave()
  h.reads[0].resolve(12); await first
  assert.deepEqual(h.applied, [[-1, [0, 0]]])
  h.picker.move([2, 2]); const second = h.tick()
  h.reads[1].resolve(22); await second
  assert.deepEqual(h.applied.at(-1), [22, [2, 2]])
})

test('room cleanup cancels queued frames and ignores reads still in flight', async () => {
  const h = harness()
  h.picker.move([1, 1]); const first = h.tick()
  h.picker.move([2, 2]); h.picker.dispose()
  h.reads[0].resolve(7); await first
  h.picker.move([3, 3])
  assert.equal(h.frames.size, 0)
  assert.equal(h.applied.length, 0)
  const queued = harness()
  queued.picker.move([1, 1]); queued.picker.dispose()
  assert.equal(queued.frames.size, 0)
})

test('a rejected read clears hover and does not block subsequent movement', async () => {
  const h = harness()
  h.picker.move([1, 1]); const first = h.tick()
  h.reads[0].reject(new Error('read failed')); await first
  assert.deepEqual(h.applied, [[-1, [1, 1]]])
  h.picker.move([2, 2]); const second = h.tick()
  h.reads[1].resolve(3); await second
  assert.deepEqual(h.applied.at(-1), [3, [2, 2]])
})

test('clicks use a separate target during an asynchronous hover and cleanup waits for that read', async () => {
  const read = deferred(), disposed = []
  const gl = {
    domElement: { width: 2160, height: 1440 },
    readRenderTargetPixels: (target, x, y, w, h, buffer) => { buffer.set([2, 0, 0, 255]) },
    readRenderTargetPixelsAsync: (target, x, y, w, h, buffer) => read.promise.then(() => buffer.set([1, 0, 0, 255])),
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial())
  const picker = new ScanPicker(gl, mesh)
  const renders = []
  picker.renderIds = (camera, w, h, target) => { renders.push({ target, viewport: target.viewport.toArray() }); return target }
  picker.clickTarget.addEventListener('dispose', () => disposed.push('click'))
  picker.hoverTarget.addEventListener('dispose', () => disposed.push('hover'))
  const hover = picker.pickPointAsync(new THREE.PerspectiveCamera(), .25, .75)
  assert.equal(picker.pickPoint(new THREE.PerspectiveCamera(), 1, 0), 1)
  assert.notEqual(renders[0].target, renders[1].target)
  assert.deepEqual(renders[0].viewport, [-540, -360, 2160, 1440])
  assert.deepEqual(renders[1].viewport, [-2159, -1439, 2160, 1440])
  assert.equal(renders[0].target.width, 1)
  assert.equal(renders[0].target.height, 1)
  picker.dispose()
  assert.deepEqual(disposed, ['click'])
  read.resolve(); assert.equal(await hover, -1)
  assert.deepEqual(disposed, ['click', 'hover'])
})

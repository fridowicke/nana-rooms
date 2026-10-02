import test from 'node:test'
import assert from 'node:assert/strict'
import { createModelPreloader, preloadCount } from '../src/modelPreloading.js'
import { getRoomAssetUrl, roomPreloadPlan, ROOM_FILES } from '../src/roomAssets.js'

const flush = () => new Promise(resolve => setImmediate(resolve))
function harness() {
  const reads = [], tasks = new Map(), disposed = []
  let next = 0, allowed = true
  const manager = createModelPreloader({
    loadAsset: (url, options) => new Promise((resolve, reject) => reads.push({ url, ...options, resolve, reject })),
    disposeAsset: asset => disposed.push(asset),
    canPrefetch: () => allowed,
    requestIdle: fn => { tasks.set(++next, fn); return next },
    cancelIdle: id => tasks.delete(id),
  })
  return {
    manager, reads, tasks, disposed,
    setAllowed(value) { allowed = value },
    async tick() { const [id, fn] = tasks.entries().next().value; tasks.delete(id); fn(); await flush() },
  }
}

test('prepares rooms one at a time after the active room is ready, without fixed delays', async () => {
  const h = harness()
  h.manager.enter('current')
  h.manager.ready('old-room', ['one', 'two'])
  assert.equal(h.tasks.size, 0, 'an old room callback cannot start prefetches')
  h.manager.ready('current', ['one', 'one', 'two'])
  assert.equal(h.reads.length, 0, 'background work waits for idle')
  await h.tick()
  assert.deepEqual(h.reads.map(r => r.url), ['one'])
  assert.equal(h.reads[0].getPriority(), 'low')
  assert.equal(h.tasks.size, 0)
  h.reads[0].resolve({ scene: 'one' }); await flush()
  await h.tick()
  assert.deepEqual(h.reads.map(r => r.url), ['one', 'two'])
  h.reads[1].resolve({ scene: 'two' }); await flush()
  const result = await h.manager.load('one')
  assert.deepEqual(result, { scene: 'one' })
  assert.equal(h.reads.length, 2, 'visiting a warm room reuses its decoded model')
})

test('entering the room already being downloaded keeps that request and promotes it', async () => {
  const h = harness()
  h.manager.enter('current'); h.manager.ready('current', ['next', 'later']); await h.tick()
  h.manager.enter('next')
  const foreground = h.manager.load('next')
  await flush()
  assert.equal(h.reads.length, 1)
  assert.equal(h.reads[0].signal.aborted, false)
  assert.equal(h.reads[0].getPriority(), 'high')
  h.reads[0].resolve('prepared'); assert.equal(await foreground, 'prepared')
  await flush()
  assert.equal(h.tasks.size, 0, 'the following room waits until the new scene is visible')
})

test('navigation cancels unrelated downloads and a late completion cannot poison a retry', async () => {
  const h = harness()
  h.manager.enter('current'); h.manager.ready('current', ['speculative']); await h.tick()
  h.manager.enter('chosen'); const chosen = h.manager.load('chosen'); await flush()
  assert.equal(h.reads[0].signal.aborted, true)
  assert.equal(h.reads[1].url, 'chosen')
  assert.equal(h.reads[1].getPriority(), 'high')
  // Revisit while the cancelled request is still settling.
  const retry = h.manager.load('speculative'); await flush()
  h.reads[0].resolve('abandoned model'); await flush()
  assert.deepEqual(h.disposed, ['abandoned model'])
  h.reads[2].resolve('fresh model'); assert.equal(await retry, 'fresh model')
  h.reads[1].resolve('chosen model'); assert.equal(await chosen, 'chosen model')
  assert.equal(await h.manager.load('speculative'), 'fresh model')
})

test('intent takes precedence over the predicted next room', async () => {
  const h = harness()
  h.manager.enter('current'); h.manager.ready('current', ['next', 'later']); await h.tick()
  h.manager.intent('hovered-door')
  assert.equal(h.reads[0].signal.aborted, true)
  await h.tick()
  assert.equal(h.reads[1].url, 'hovered-door')
  h.reads[0].reject(h.reads[0].signal.reason); h.reads[1].resolve('hovered'); await flush()
  await h.tick()
  assert.equal(h.reads[2].url, 'next', 'the remaining plan resumes afterwards')
  h.reads[2].resolve('next'); await flush()
})

test('hidden/offline/data-saving changes stop speculative work and resume it later', async () => {
  const h = harness()
  h.manager.enter('current'); h.manager.ready('current', ['next']); await h.tick()
  h.setAllowed(false); h.manager.refresh()
  assert.equal(h.reads[0].signal.aborted, true)
  h.reads[0].reject(h.reads[0].signal.reason); await flush()
  assert.equal(h.tasks.size, 0)
  h.setAllowed(true); h.manager.refresh(); await h.tick()
  assert.equal(h.reads[1].url, 'next')
  h.reads[1].resolve('next'); await flush()
})

test('a failed background download does not prevent visiting the room later', async () => {
  const h = harness()
  h.manager.enter('current'); h.manager.ready('current', ['next']); await h.tick()
  h.reads[0].reject(new Error('network failure')); await flush()
  h.manager.enter('next'); const visited = h.manager.load('next'); await flush()
  h.reads[1].resolve('retried'); assert.equal(await visited, 'retried')
})

test('connection/memory policy keeps foreground loading available and limits speculative rooms', () => {
  assert.equal(preloadCount({ connection: { saveData: true } }, true), 0)
  assert.equal(preloadCount({ connection: { effectiveType: '2g' } }), 0)
  assert.equal(preloadCount({ connection: { effectiveType: '3g' } }, true), 1)
  assert.equal(preloadCount({ deviceMemory: 2 }, true), 1)
  assert.equal(preloadCount({ isMobile: true }, true), 2)
  assert.equal(preloadCount({ isMobile: true }), 1)
  assert.equal(preloadCount({}, true), 4)
  assert.equal(preloadCount({}), 2)
})

test('all room paths use the optimized cache version and the last room wraps to the first', () => {
  assert.equal(ROOM_FILES.length, 11)
  assert.equal(getRoomAssetUrl(2), 'rooms/AIKO WEB.glb?v=4k-1')
  assert.equal(getRoomAssetUrl(-1), null)
  assert.equal(getRoomAssetUrl(11), null)
  assert.equal(roomPreloadPlan(10, false)[0], getRoomAssetUrl(0))
})

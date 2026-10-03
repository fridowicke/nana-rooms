import test from 'node:test'
import assert from 'node:assert/strict'
import { createGpuRoomCache } from '../src/gpuRoomCache.js'

const flush = () => new Promise(resolve => setImmediate(resolve))
function harness() {
  const tasks = new Map(), prepared = [], released = []
  let id = 0, allowed = true
  const cache = createGpuRoomCache({
    prepare: asset => new Promise((resolve, reject) => prepared.push({ asset, resolve, reject })),
    release: asset => released.push(asset),
    canPrepare: () => allowed,
    requestIdle: fn => { tasks.set(++id, fn); return id },
    cancelIdle: task => tasks.delete(task),
  })
  return { cache, tasks, prepared, released, allow: value => { allowed = value },
    async tick() { const [id, fn] = tasks.entries().next().value; tasks.delete(id); fn(); await flush() },
    async finish(index) { prepared[index].resolve(); await flush() },
  }
}

test('waits for the current scene and idle time, then reuses a prepared destination', async () => {
  const h = harness()
  h.cache.enter('one', 'two'); h.cache.offer('two', 'model two')
  assert.equal(h.tasks.size, 0)
  h.cache.ready('one', 'model one'); await h.tick(); await h.finish(0)
  h.cache.enter('two', 'three'); h.cache.ready('two', 'model two')
  h.cache.target('one', 'model one')
  assert.equal(h.tasks.size, 0, 'a resident destination needs no second upload')
  assert.equal(h.prepared.length, 1)
})

test('keeps only two GPU rooms while retaining decoded assets for revisits', async () => {
  const h = harness()
  h.cache.enter('one', 'two'); h.cache.ready('one', 'model one'); h.cache.offer('two', 'model two')
  await h.tick(); await h.finish(0)
  h.cache.enter('two', 'three'); h.cache.ready('two', 'model two'); h.cache.offer('three', 'model three')
  await h.tick(); await h.finish(1)
  assert.deepEqual(h.released, ['model one'])
  h.cache.target('one', 'model one'); await h.tick(); await h.finish(2)
  assert.deepEqual(h.released, ['model one', 'model three'])
})

test('redirects queued work when intent changes and ignores stale room readiness', async () => {
  const h = harness()
  h.cache.enter('one', 'two'); h.cache.ready('old', 'old'); h.cache.offer('two', 'model two')
  assert.equal(h.tasks.size, 0)
  h.cache.ready('one', 'model one'); h.cache.target('other', 'model other')
  await h.tick()
  assert.deepEqual(h.prepared.map(x => x.asset), ['model other'])
  await h.finish(0)
})

test('a late preparation remains usable if its room became active', async () => {
  const h = harness()
  h.cache.enter('one', 'two'); h.cache.ready('one', 'model one'); h.cache.offer('two', 'model two')
  await h.tick()
  h.cache.enter('two', 'three'); h.cache.ready('two', 'model two')
  await h.finish(0)
  assert.deepEqual(h.released, [])
})

test('late or failed speculative GPU work cannot hold resources or block a new target', async () => {
  const h = harness()
  h.cache.enter('one', 'two'); h.cache.ready('one', 'model one'); h.cache.offer('two', 'model two')
  await h.tick(); h.cache.target('three', 'model three'); await h.finish(0)
  assert.deepEqual(h.released, ['model two'])
  await h.tick(); h.prepared[1].reject(new Error('GPU prep failed')); await flush()
  assert.equal(h.tasks.size, 0, 'failure does not create a retry loop')
  h.cache.target('four', 'model four'); await h.tick(); await h.finish(2)
})

test('visibility/data-saving pauses and disposal stop queued work and release late results', async () => {
  const h = harness()
  h.cache.enter('one', 'two'); h.cache.ready('one', 'model one'); h.cache.offer('two', 'model two')
  h.allow(false); h.cache.refresh(); assert.equal(h.tasks.size, 0)
  h.allow(true); h.cache.refresh(); await h.tick()
  h.cache.dispose(); await h.finish(0)
  assert.deepEqual(h.released, ['model one', 'model two'])
  assert.equal(h.tasks.size, 0)
})

test('context restoration clears residency so the destination gets uploaded again', async () => {
  const h = harness()
  h.cache.enter('one', 'two'); h.cache.ready('one', 'model one'); h.cache.offer('two', 'model two')
  await h.tick(); await h.finish(0); h.cache.reset(); await h.tick()
  assert.equal(h.prepared.length, 2); await h.finish(1)
})

test('desktop residency can retain the previous room and shrink safely on mobile', async () => {
  const h = harness()
  h.cache.setLimit(3)
  h.cache.enter('one', 'two'); h.cache.ready('one', 'model one'); h.cache.offer('two', 'model two')
  await h.tick(); await h.finish(0)
  h.cache.enter('two', 'three'); h.cache.ready('two', 'model two'); h.cache.offer('three', 'model three')
  await h.tick(); await h.finish(1)
  assert.deepEqual(h.released, [])
  h.cache.setLimit(2)
  assert.deepEqual(h.released, ['model one'], 'active room and next destination remain resident')
})

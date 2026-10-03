import test from 'node:test'
import assert from 'node:assert/strict'
import { fetchPublishedRoom, peekPublishedRoom } from '../src/publishedRooms.js'

test('preparation and navigation share the request, then a visit can revalidate published content', async () => {
  const original = globalThis.fetch
  let resolve, calls = 0
  globalThis.fetch = async () => { calls++; return new Promise(done => { resolve = done }) }
  try {
    const prepared = fetchPublishedRoom(101)
    const visited = fetchPublishedRoom(101, { refresh: true })
    assert.equal(prepared, visited)
    await new Promise(done => setImmediate(done))
    resolve({ ok: true, json: async () => ({ hotspots: ['old'] }) })
    assert.deepEqual(await prepared, { hotspots: ['old'] })
    assert.deepEqual(peekPublishedRoom(101), { hotspots: ['old'] })
    assert.deepEqual(await fetchPublishedRoom(101), { hotspots: ['old'] })
    assert.equal(calls, 1)
    const refresh = fetchPublishedRoom(101, { refresh: true })
    await new Promise(done => setImmediate(done))
    resolve({ ok: true, json: async () => ({ hotspots: ['updated'] }) })
    await refresh
    assert.deepEqual(peekPublishedRoom(101), { hotspots: ['updated'] })
    assert.equal(calls, 2)
  } finally { globalThis.fetch = original }
})

test('a failed published-room request can be retried without affecting model loading', async () => {
  const original = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => {
    if (++calls === 1) throw new Error('offline')
    return { ok: true, json: async () => ({ hotspots: [] }) }
  }
  try {
    assert.equal(await fetchPublishedRoom(102), null)
    assert.equal(peekPublishedRoom(102), undefined)
    assert.deepEqual(await fetchPublishedRoom(102), { hotspots: [] })
  } finally { globalThis.fetch = original }
})

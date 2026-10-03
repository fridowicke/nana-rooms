const cached = new Map()
const pending = new Map()

export const peekPublishedRoom = (roomNumber) => cached.get(roomNumber)

export function fetchPublishedRoom(roomNumber, { refresh = false } = {}) {
  if (pending.has(roomNumber)) return pending.get(roomNumber)
  if (!refresh && cached.has(roomNumber)) return Promise.resolve(cached.get(roomNumber))
  const request = Promise.resolve().then(async () => {
    const response = await fetch(`hotspots/room-${roomNumber}.json`, { cache: 'no-cache' })
    if (!response.ok) return null
    const room = await response.json()
    cached.set(roomNumber, room)
    return room
  }).catch(() => null).finally(() => pending.delete(roomNumber))
  pending.set(roomNumber, request)
  return request
}

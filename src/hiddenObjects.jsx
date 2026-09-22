// Hidden-object game layered over the 3D room scans, plus the in-browser editor used to mark
// the objects. Every scan is a single ~200k-triangle mesh, so an "object" cannot be addressed
// by mesh name; a hotspot is a set of triangle ids collected by drawing lassos over the scan.
// The pick goes through a GPU id buffer rendered from the lasso's camera, so only surfaces that
// were actually visible inside the lasso are selected (nothing behind walls or furniture).
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const ROOM_DATA_VERSION = 2
const draftKey = (roomNumber) => `shelest-hotspots-v2-r${roomNumber}`
const foundKey = (roomNumber) => `shelest-found-r${roomNumber}`
const EDITOR_FLAG_KEY = 'shelest-editor'
const PICK_WIDTH = 1200
const CLICK_SLOP_PX = 6

const HOVER_TYPES = [
  { value: '', label: 'ничего' },
  { value: 'text', label: 'подпись' },
  { value: 'image', label: 'картинка' },
  { value: 'gif', label: 'гифка' },
  { value: 'audio', label: 'звук' },
]

const REACTION_TYPES = [
  { value: '', label: 'нет' },
  { value: 'text', label: 'текст' },
  { value: 'image', label: 'картинка' },
  { value: 'video', label: 'видео' },
  { value: 'audio', label: 'музыка' },
  { value: 'link', label: 'ссылка' },
]

// ─── storage ─────────────────────────────────────────────────────────────────

function emptyRoom() {
  return { version: ROOM_DATA_VERSION, timerSeconds: null, hotspots: [] }
}

function normalizeRoom(raw) {
  if (!raw || typeof raw !== 'object') return null
  const hotspots = Array.isArray(raw.hotspots) ? raw.hotspots : []
  return {
    version: ROOM_DATA_VERSION,
    timerSeconds: Number.isFinite(raw.timerSeconds) && raw.timerSeconds > 0 ? Math.round(raw.timerSeconds) : null,
    hotspots: hotspots
      .filter((h) => h && Array.isArray(h.strokes) && h.strokes.length > 0)
      .map((h) => ({
        id: String(h.id),
        name: String(h.name ?? ''),
        strokes: h.strokes,
        reaction: h.reaction && h.reaction.type ? h.reaction : null,
        hover: h.hover && h.hover.type ? h.hover : null,
      })),
  }
}

async function loadPublishedRoom(roomNumber) {
  try {
    const response = await fetch(`hotspots/room-${roomNumber}.json`, { cache: 'no-cache' })
    if (!response.ok) return null
    return normalizeRoom(await response.json())
  } catch {
    return null
  }
}

function loadDraftRoom(roomNumber) {
  try {
    const raw = localStorage.getItem(draftKey(roomNumber))
    return raw ? normalizeRoom(JSON.parse(raw)) : null
  } catch {
    return null
  }
}
function saveDraftRoom(roomNumber, room) {
  try { localStorage.setItem(draftKey(roomNumber), JSON.stringify(room)) } catch { /* private mode */ }
}
function clearDraftRoom(roomNumber) {
  try { localStorage.removeItem(draftKey(roomNumber)) } catch { /* private mode */ }
}
function loadFound(roomNumber) {
  try { return JSON.parse(localStorage.getItem(foundKey(roomNumber)) || '[]') } catch { return [] }
}
function saveFound(roomNumber, found) {
  try { localStorage.setItem(foundKey(roomNumber), JSON.stringify(found)) } catch { /* private mode */ }
}

// The editor stays invisible for visitors: it only appears after a room was opened once with
// ?edit=1, which sets a flag in that browser.
function isEditorEnabled() {
  if (typeof window === 'undefined') return false
  try {
    const params = new URLSearchParams(window.location.search)
    if (params.get('edit') === '1') {
      localStorage.setItem(EDITOR_FLAG_KEY, '1')
      return true
    }
    if (params.get('edit') === '0') {
      localStorage.removeItem(EDITOR_FLAG_KEY)
      return false
    }
    return localStorage.getItem(EDITOR_FLAG_KEY) === '1'
  } catch {
    return false
  }
}

// ─── GPU face picking ────────────────────────────────────────────────────────

const PICK_VERTEX_SHADER = `
  attribute float faceId;
  varying float vFaceId;
  void main() {
    vFaceId = faceId;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
// Triangle id + 1 packed into RGB (0 = background). All three vertices of a triangle carry the
// same id, so the varying is constant across the triangle and decodes exactly.
const PICK_FRAGMENT_SHADER = `
  varying float vFaceId;
  void main() {
    float id = floor(vFaceId + 0.5);
    float r = mod(id, 256.0);
    float g = mod(floor(id / 256.0), 256.0);
    float b = floor(id / 65536.0);
    gl_FragColor = vec4(r / 255.0, g / 255.0, b / 255.0, 1.0);
  }
`

function findScanMesh(root) {
  let best = null
  let bestCount = 0
  root.traverse((object) => {
    if (!object.isMesh || !object.geometry || object.userData.isHotspotHighlight) return
    const count = object.geometry.index ? object.geometry.index.count : object.geometry.attributes.position?.count ?? 0
    if (count > bestCount) {
      bestCount = count
      best = object
    }
  })
  return bestCount >= 3000 ? best : null
}

function triangleCount(geometry) {
  return Math.floor((geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3)
}

function triangleVertexIndex(geometry, triangle, corner) {
  const flat = triangle * 3 + corner
  return geometry.index ? geometry.index.getX(flat) : flat
}

function pointInPolygon(x, y, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i]
    const [xj, yj] = polygon[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function cameraStateFrom(camera) {
  return {
    p: camera.position.toArray().map((v) => +v.toFixed(5)),
    q: camera.quaternion.toArray().map((v) => +v.toFixed(6)),
    fov: camera.fov,
    aspect: +camera.aspect.toFixed(5),
    near: camera.near,
    far: camera.far,
  }
}

function cameraFromState(state) {
  const camera = new THREE.PerspectiveCamera(state.fov, state.aspect, state.near ?? 0.1, state.far ?? 2000)
  camera.position.fromArray(state.p)
  camera.quaternion.fromArray(state.q)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  return camera
}

class ScanPicker {
  constructor(gl, mesh) {
    this.gl = gl
    this.mesh = mesh
    this.triangles = triangleCount(mesh.geometry)
    this.pickMesh = this.buildPickMesh(mesh)
    this.pickScene = new THREE.Scene()
    this.pickScene.add(this.pickMesh)
    this.faceCache = new Map()
  }

  buildPickMesh(mesh) {
    const source = mesh.geometry
    const position = source.attributes.position
    const count = this.triangles
    const positions = new Float32Array(count * 9)
    const ids = new Float32Array(count * 3)
    for (let t = 0; t < count; t++) {
      for (let corner = 0; corner < 3; corner++) {
        const vertex = triangleVertexIndex(source, t, corner)
        const flat = t * 3 + corner
        positions[flat * 3] = position.getX(vertex)
        positions[flat * 3 + 1] = position.getY(vertex)
        positions[flat * 3 + 2] = position.getZ(vertex)
        ids[flat] = t + 1
      }
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('faceId', new THREE.BufferAttribute(ids, 1))
    const material = new THREE.ShaderMaterial({
      vertexShader: PICK_VERTEX_SHADER,
      fragmentShader: PICK_FRAGMENT_SHADER,
      side: THREE.DoubleSide,
    })
    const pickMesh = new THREE.Mesh(geometry, material)
    pickMesh.matrixAutoUpdate = false
    pickMesh.frustumCulled = false
    return pickMesh
  }

  renderIds(camera, width, height) {
    const { gl } = this
    this.mesh.updateWorldMatrix(true, false)
    this.pickMesh.matrix.copy(this.mesh.matrixWorld)
    const target = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    })
    const previousTarget = gl.getRenderTarget()
    const previousClearColor = gl.getClearColor(new THREE.Color())
    const previousClearAlpha = gl.getClearAlpha()
    const previousAutoClear = gl.autoClear
    gl.setRenderTarget(target)
    gl.setClearColor(0x000000, 1)
    gl.autoClear = true
    gl.clear(true, true, false)
    gl.render(this.pickScene, camera)
    gl.setRenderTarget(previousTarget)
    gl.setClearColor(previousClearColor, previousClearAlpha)
    gl.autoClear = previousAutoClear
    return target
  }

  // polygon: [[u, v], ...] normalized to the view (v grows downwards). Returns sorted triangle ids.
  pickPolygon(cameraState, polygon) {
    const width = PICK_WIDTH
    const height = Math.max(2, Math.round(PICK_WIDTH / (cameraState.aspect || 1.5)))
    const camera = cameraFromState(cameraState)
    const target = this.renderIds(camera, width, height)
    const pixelPolygon = polygon.map(([u, v]) => [u * width, (1 - v) * height])
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const [x, y] of pixelPolygon) {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
    const x0 = Math.max(0, Math.floor(minX))
    const y0 = Math.max(0, Math.floor(minY))
    const x1 = Math.min(width - 1, Math.ceil(maxX))
    const y1 = Math.min(height - 1, Math.ceil(maxY))
    const faces = new Set()
    if (x1 >= x0 && y1 >= y0) {
      const regionWidth = x1 - x0 + 1
      const regionHeight = y1 - y0 + 1
      const pixels = new Uint8Array(regionWidth * regionHeight * 4)
      this.gl.readRenderTargetPixels(target, x0, y0, regionWidth, regionHeight, pixels)
      for (let row = 0; row < regionHeight; row++) {
        for (let column = 0; column < regionWidth; column++) {
          const offset = (row * regionWidth + column) * 4
          const id = pixels[offset] + pixels[offset + 1] * 256 + pixels[offset + 2] * 65536
          if (id === 0) continue
          if (pointInPolygon(x0 + column + 0.5, y0 + row + 0.5, pixelPolygon)) faces.add(id - 1)
        }
      }
    }
    target.dispose()
    return Uint32Array.from(faces).sort()
  }

  // u, v normalized to the live canvas (v grows downwards). Returns a triangle id or -1.
  pickPoint(camera, u, v) {
    const width = Math.max(2, this.gl.domElement.width)
    const height = Math.max(2, this.gl.domElement.height)
    const target = this.renderIds(camera, width, height)
    const x = Math.min(width - 1, Math.max(0, Math.floor(u * width)))
    const y = Math.min(height - 1, Math.max(0, Math.floor((1 - v) * height)))
    const pixel = new Uint8Array(4)
    this.gl.readRenderTargetPixels(target, x, y, 1, 1, pixel)
    target.dispose()
    const id = pixel[0] + pixel[1] * 256 + pixel[2] * 65536
    return id === 0 ? -1 : id - 1
  }

  // Replays a hotspot's lasso strokes and returns its triangle ids (memoized per hotspot).
  facesForHotspot(hotspot) {
    const key = JSON.stringify(hotspot.strokes)
    if (this.faceCache.has(key)) return this.faceCache.get(key)
    let faces = new Set()
    for (const stroke of hotspot.strokes) {
      if (!stroke?.cam || !Array.isArray(stroke.poly) || stroke.poly.length < 3) continue
      const picked = this.pickPolygon(stroke.cam, stroke.poly)
      if (stroke.op === 'sub') {
        for (const face of picked) faces.delete(face)
      } else {
        for (const face of picked) faces.add(face)
      }
    }
    const result = Uint32Array.from(faces).sort()
    this.faceCache.set(key, result)
    return result
  }

  centerOfFaces(faces) {
    const position = this.mesh.geometry.attributes.position
    const geometry = this.mesh.geometry
    const step = Math.max(1, Math.floor(faces.length / 2000))
    const sum = new THREE.Vector3()
    let count = 0
    for (let i = 0; i < faces.length; i += step) {
      const vertex = triangleVertexIndex(geometry, faces[i], 0)
      sum.x += position.getX(vertex)
      sum.y += position.getY(vertex)
      sum.z += position.getZ(vertex)
      count++
    }
    if (count === 0) return null
    sum.divideScalar(count)
    this.mesh.updateWorldMatrix(true, false)
    return sum.applyMatrix4(this.mesh.matrixWorld)
  }

  dispose() {
    this.pickMesh.geometry.dispose()
    this.pickMesh.material.dispose()
    this.faceCache.clear()
  }
}

// A translucent copy of the selected triangles, rendered as a child of the scan mesh so it
// follows the scan's transform. Position data is shared with the scan; only the index is new.
function createFaceHighlight(mesh, faces, color, opacity) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', mesh.geometry.attributes.position)
  const index = new Uint32Array(faces.length * 3)
  for (let i = 0; i < faces.length; i++) {
    index[i * 3] = triangleVertexIndex(mesh.geometry, faces[i], 0)
    index[i * 3 + 1] = triangleVertexIndex(mesh.geometry, faces[i], 1)
    index[i * 3 + 2] = triangleVertexIndex(mesh.geometry, faces[i], 2)
  }
  geometry.setIndex(new THREE.BufferAttribute(index, 1))
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  const highlight = new THREE.Mesh(geometry, material)
  highlight.userData.isHotspotHighlight = true
  highlight.raycast = () => {}
  highlight.frustumCulled = false
  highlight.renderOrder = 10
  mesh.add(highlight)
  return highlight
}

function removeHighlight(highlight) {
  if (!highlight) return
  highlight.parent?.remove(highlight)
  highlight.geometry.dispose()
  highlight.material.dispose()
}

// ─── scene bridge (lives inside <Canvas>) ────────────────────────────────────

// Finds the scan mesh once it is loaded and hands renderer, camera and mesh to the game logic,
// which does everything else imperatively (picking, highlights, pointer handling).
export function HiddenObjectScene({ engineRef, onEngineReady }) {
  const { gl, camera, scene } = useThree()

  useFrame(() => {
    const engine = engineRef.current
    if (engine && engine.mesh && engine.mesh.parent) return
    const mesh = findScanMesh(scene)
    if (!mesh) return
    engineRef.current?.picker?.dispose()
    engineRef.current = { gl, camera, mesh, picker: null, canvas: gl.domElement }
    onEngineReady?.()
  })

  useEffect(() => () => {
    const engine = engineRef.current
    if (engine) {
      engine.picker?.dispose()
      engineRef.current = null
    }
  }, [engineRef])

  return null
}

function ensurePicker(engine) {
  if (!engine) return null
  if (!engine.picker) engine.picker = new ScanPicker(engine.gl, engine.mesh)
  return engine.picker
}

// ─── reactions ───────────────────────────────────────────────────────────────

function ReactionPopup({ reaction, onClose, isMobileLayout }) {
  if (!reaction) return null
  const body = (() => {
    if (reaction.type === 'text') {
      return <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: 1.5, padding: '18px 20px' }}>{reaction.value}</div>
    }
    if (reaction.type === 'image') {
      return <img src={reaction.value} alt={reaction.title || ''} style={{ display: 'block', maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
    }
    if (reaction.type === 'video') {
      return <video src={reaction.value} controls autoPlay playsInline style={{ display: 'block', maxWidth: '100%', maxHeight: '70vh' }} />
    }
    return null
  })()
  if (!body) return null
  return (
    <div
      onClick={onClose}
      style={{ position: 'absolute', inset: 0, zIndex: 9500, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isMobileLayout ? '16px' : '40px' }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', color: '#111', borderRadius: '10px', maxWidth: '720px', width: '100%', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#ececec', fontSize: '12px' }}>
          <button type="button" onClick={onClose} style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f57', border: 'none', cursor: 'pointer', padding: 0 }} aria-label="close" />
          <span style={{ opacity: 0.6 }}>{reaction.title || ''}</span>
        </div>
        {body}
      </div>
    </div>
  )
}

function triggerReaction(reaction, setPopup) {
  if (!reaction || !reaction.type || !reaction.value) return
  if (reaction.type === 'link') {
    window.open(reaction.value, '_blank', 'noopener')
    return
  }
  if (reaction.type === 'audio') {
    try {
      const audio = new Audio(reaction.value)
      audio.play().catch(() => {})
    } catch { /* unsupported */ }
    return
  }
  setPopup(reaction)
}

// ─── game panel (2000s hidden-object style) ──────────────────────────────────

function HiddenObjectPanel({ hotspots, found, onHint, hintUsed, timeLeft, timeUp, allFound, onRestart, isMobileLayout }) {
  const remaining = hotspots.filter((s) => !found.includes(s.id))
  const foundList = hotspots.filter((s) => found.includes(s.id))

  const panelStyle = {
    position: 'absolute',
    top: isMobileLayout ? 'auto' : '30px',
    bottom: isMobileLayout ? '0' : 'auto',
    right: 0,
    width: isMobileLayout ? '100%' : '200px',
    height: isMobileLayout ? 'auto' : 'calc(100% - 30px)',
    background: 'linear-gradient(180deg, #1a0a2e 0%, #0d0520 60%, #1a0530 100%)',
    borderLeft: isMobileLayout ? 'none' : '2px solid #6b21a8',
    borderTop: isMobileLayout ? '2px solid #6b21a8' : 'none',
    zIndex: 50,
    display: 'flex',
    flexDirection: isMobileLayout ? 'row' : 'column',
    alignItems: isMobileLayout ? 'center' : 'stretch',
    padding: isMobileLayout ? '8px 12px' : '12px 10px',
    gap: isMobileLayout ? '10px' : '8px',
    overflowY: isMobileLayout ? 'hidden' : 'auto',
    overflowX: isMobileLayout ? 'auto' : 'hidden',
    boxSizing: 'border-box',
    fontFamily: '"Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif',
  }
  const titleStyle = {
    color: '#e8c96b', fontSize: isMobileLayout ? '11px' : '13px', fontWeight: 'bold', textAlign: 'center',
    textShadow: '0 0 8px rgba(232,201,107,0.6)', letterSpacing: '0.05em', marginBottom: isMobileLayout ? 0 : '4px', whiteSpace: 'nowrap',
  }
  const counterStyle = { color: '#c084fc', fontSize: isMobileLayout ? '10px' : '11px', textAlign: 'center', marginBottom: isMobileLayout ? 0 : '6px', whiteSpace: 'nowrap' }
  const itemStyle = (isFound) => ({
    padding: '4px 6px', borderRadius: '4px',
    background: isFound ? 'rgba(134,239,172,0.12)' : 'rgba(255,255,255,0.06)',
    border: `1px solid ${isFound ? 'rgba(134,239,172,0.3)' : 'rgba(255,255,255,0.1)'}`,
    color: isFound ? 'rgba(134,239,172,0.7)' : '#f0e6ff',
    fontSize: isMobileLayout ? '10px' : '12px',
    textDecoration: isFound ? 'line-through' : 'none',
    opacity: isFound ? 0.6 : 1, whiteSpace: 'nowrap', flexShrink: 0,
  })
  const buttonStyle = (disabled) => ({
    background: disabled ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #7c3aed, #4c1d95)',
    border: `1px solid ${disabled ? '#444' : '#a855f7'}`, color: disabled ? '#888' : '#e8c96b',
    padding: isMobileLayout ? '4px 10px' : '6px 8px', borderRadius: '6px', cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit', fontSize: isMobileLayout ? '10px' : '11px', textAlign: 'center',
    boxShadow: disabled ? 'none' : '0 0 8px rgba(168,85,247,0.4)', whiteSpace: 'nowrap', flexShrink: 0,
  })
  const timerLabel = timeLeft != null ? `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, '0')}` : null

  if (allFound || timeUp) {
    return (
      <div style={{ ...panelStyle, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: isMobileLayout ? 'row' : 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: isMobileLayout ? '18px' : '28px' }}>{allFound ? '✨' : '⏱'}</div>
          <div style={{ color: '#e8c96b', fontSize: isMobileLayout ? '12px' : '14px', fontWeight: 'bold', textShadow: '0 0 10px rgba(232,201,107,0.8)' }}>
            {allFound ? 'all found!' : "time's up"}
          </div>
          <div style={{ color: '#c084fc', fontSize: '11px' }}>{found.length} / {hotspots.length}</div>
          <button type="button" onClick={onRestart} style={buttonStyle(false)}>play again</button>
        </div>
      </div>
    )
  }

  return (
    <div style={panelStyle}>
      {!isMobileLayout && <div style={titleStyle}>✦ items to find ✦</div>}
      <div style={counterStyle}>
        {found.length} / {hotspots.length} found
        {timerLabel && <span style={{ color: timeLeft < 30 ? '#f87171' : '#c084fc', marginLeft: '8px' }}>⏱ {timerLabel}</span>}
      </div>
      {remaining.map((s) => <div key={s.id} style={itemStyle(false)}>{s.name}</div>)}
      {foundList.length > 0 && !isMobileLayout && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', marginTop: '2px' }}>
          {foundList.map((s) => <div key={s.id} style={itemStyle(true)}>{s.name}</div>)}
        </div>
      )}
      <button type="button" onClick={onHint} disabled={hintUsed} style={buttonStyle(hintUsed)}>
        {hintUsed ? 'hint used' : '💡 hint'}
      </button>
    </div>
  )
}

// ─── editor ──────────────────────────────────────────────────────────────────

const EDITOR_BUTTON = {
  border: 'none', borderRadius: '6px', padding: '6px 8px', fontFamily: 'monospace', fontSize: '11px', cursor: 'pointer', color: '#fff',
}

function HotspotEditorPanel({
  roomNumber, room, draft, draftFaceCount, tool, setTool, onNameChange, onReactionChange, onHoverReactionChange, onSaveDraft, onClearDraft, onUndoStroke,
  onEditHotspot, onDeleteHotspot, onHoverHotspot, onTimerChange, onCopyJson, onDownloadJson, onResetToPublished, onResetProgress,
  hasDraftOverride, faceCounts, isMobileLayout,
}) {
  const [copied, setCopied] = useState(false)
  const panelStyle = {
    position: 'absolute', top: isMobileLayout ? 'auto' : '40px', bottom: isMobileLayout ? '64px' : 'auto', right: '10px',
    zIndex: 9000, background: 'rgba(15,8,30,0.96)', color: '#fff', padding: '12px', borderRadius: '10px',
    width: isMobileLayout ? 'calc(100% - 20px)' : '270px', fontFamily: 'monospace', fontSize: '12px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.6)', maxHeight: isMobileLayout ? '45vh' : 'calc(100vh - 90px)', overflowY: 'auto', boxSizing: 'border-box',
  }
  const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff',
    padding: '5px 8px', borderRadius: '4px', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box',
  }
  const toolButton = (id, label) => (
    <button
      type="button"
      onClick={() => setTool(id)}
      style={{ ...EDITOR_BUTTON, flex: 1, background: tool === id ? '#ff69b4' : 'rgba(255,255,255,0.12)' }}
    >
      {label}
    </button>
  )
  const canSave = draftFaceCount > 0 && draft.name.trim().length > 0

  return (
    <div style={panelStyle}>
      <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px', color: '#ff69b4' }}>✏️ edit mode — room {roomNumber}</div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
        {toolButton('lasso', '➕ лассо')}
        {toolButton('erase', '➖ убрать')}
        {toolButton('camera', '🎥 камера')}
      </div>
      <div style={{ opacity: 0.7, fontSize: '11px', marginBottom: '8px', lineHeight: 1.4 }}>
        {tool === 'camera'
          ? 'двигай камеру как обычно, потом вернись к лассо'
          : tool === 'erase'
            ? 'обведи лишнее — оно уберётся из выделения'
            : 'обведи объект мышкой/пальцем — розовым подсветится то, что выбрано. можно обводить несколько раз и с разных сторон'}
      </div>

      <div style={{ background: 'rgba(255,105,180,0.12)', border: '1px solid rgba(255,105,180,0.3)', borderRadius: '6px', padding: '8px', marginBottom: '8px' }}>
        <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '6px' }}>
          {draft.id ? 'редактирую: ' : 'новый объект · '}
          выделено {draftFaceCount} треугольников · лассо: {draft.strokes.length}
        </div>
        <input value={draft.name} onChange={(e) => onNameChange(e.target.value)} placeholder="название, напр. зеркало" style={{ ...inputStyle, marginBottom: '6px' }} />
        <div style={{ fontSize: '10px', opacity: 0.7, margin: '2px 0 3px' }}>при клике</div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
          <select value={draft.reaction?.type ?? ''} onChange={(e) => onReactionChange({ type: e.target.value })} style={{ ...inputStyle, width: '40%' }}>
            {REACTION_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {draft.reaction?.type && (
            <input
              value={draft.reaction.value ?? ''}
              onChange={(e) => onReactionChange({ value: e.target.value })}
              placeholder={draft.reaction.type === 'text' ? 'текст' : 'reactions/имя-файла.mp3 или url'}
              style={{ ...inputStyle, width: '60%' }}
            />
          )}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.7, margin: '2px 0 3px' }}>при наведении (подсветка всегда, плюс:)</div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
          <select value={draft.hover?.type ?? ''} onChange={(e) => onHoverReactionChange({ type: e.target.value })} style={{ ...inputStyle, width: '40%' }}>
            {HOVER_TYPES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          {draft.hover?.type && (
            <input
              value={draft.hover.value ?? ''}
              onChange={(e) => onHoverReactionChange({ value: e.target.value })}
              placeholder={draft.hover.type === 'text' ? 'подпись' : 'reactions/имя-файла.gif'}
              style={{ ...inputStyle, width: '60%' }}
            />
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button type="button" onClick={onSaveDraft} disabled={!canSave} style={{ ...EDITOR_BUTTON, flex: 2, background: canSave ? '#ff69b4' : '#555', cursor: canSave ? 'pointer' : 'default' }}>
            {draft.id ? 'обновить' : 'добавить объект'}
          </button>
          <button type="button" onClick={onUndoStroke} disabled={draft.strokes.length === 0} style={{ ...EDITOR_BUTTON, background: 'rgba(255,255,255,0.12)' }} title="отменить последнее лассо">↶</button>
          <button type="button" onClick={onClearDraft} style={{ ...EDITOR_BUTTON, background: 'rgba(255,255,255,0.12)', color: '#f88' }} title="сбросить">✕</button>
        </div>
      </div>

      {room.hotspots.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ opacity: 0.7, marginBottom: '4px' }}>объекты ({room.hotspots.length})</div>
          {room.hotspots.map((s) => (
            <div
              key={s.id}
              onMouseEnter={() => onHoverHotspot(s.id)}
              onMouseLeave={() => onHoverHotspot(null)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px', background: draft.id === s.id ? 'rgba(255,105,180,0.2)' : 'rgba(255,255,255,0.06)', padding: '4px 6px', borderRadius: '4px' }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
                <span style={{ opacity: 0.45, fontSize: '10px' }}> · {faceCounts.get(s.id) ?? '…'}{s.reaction?.type ? ` · ${s.reaction.type}` : ''}</span>
              </span>
              <button type="button" onClick={() => onEditHotspot(s)} style={{ background: 'none', border: 'none', color: '#88f', cursor: 'pointer', padding: '0 2px', fontSize: '11px' }}>edit</button>
              <button type="button" onClick={() => onDeleteHotspot(s.id)} style={{ background: 'none', border: 'none', color: '#f88', cursor: 'pointer', padding: '0 2px', fontSize: '11px' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <span style={{ opacity: 0.7 }}>⏱ таймер</span>
        <input
          type="number" min="0" step="10" value={room.timerSeconds ?? 0}
          onChange={(e) => onTimerChange(Number(e.target.value))}
          style={{ ...inputStyle, width: '70px' }}
        />
        <span style={{ opacity: 0.5, fontSize: '10px' }}>сек (0 = выкл)</span>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ opacity: 0.6, fontSize: '10px', lineHeight: 1.4 }}>
          всё сохраняется в этом браузере. чтобы объекты увидели все — скачай файл и отправь его боту (или скопируй текст и вставь боту)
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button type="button" onClick={onDownloadJson} style={{ ...EDITOR_BUTTON, flex: 1, background: 'rgba(255,255,255,0.12)' }}>⬇ скачать room-{roomNumber}.json</button>
          <button
            type="button"
            onClick={() => { onCopyJson(); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            style={{ ...EDITOR_BUTTON, background: 'rgba(255,255,255,0.12)' }}
          >
            {copied ? '✓' : '📋'}
          </button>
        </div>
        {hasDraftOverride && (
          <button type="button" onClick={onResetToPublished} style={{ ...EDITOR_BUTTON, background: 'rgba(255,255,255,0.08)', color: '#f88' }}>
            ↺ вернуть опубликованную версию (удалить локальные правки)
          </button>
        )}
        <button type="button" onClick={onResetProgress} style={{ ...EDITOR_BUTTON, background: 'rgba(255,255,255,0.08)', color: '#ccc' }}>
          🧹 сбросить "найдено" в этом браузере
        </button>
      </div>
    </div>
  )
}

function LassoOverlay({ tool, onStroke, isMobileLayout }) {
  // The stroke in progress lives in a ref: pointer moves arrive faster than React re-renders,
  // and the state copy only feeds the SVG preview.
  const pointsRef = useRef(null)
  const [points, setPoints] = useState(null)
  const ref = useRef(null)

  const toNormalized = (e) => {
    const rect = ref.current.getBoundingClientRect()
    return [
      Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    ]
  }

  const handleDown = (e) => {
    if (e.button != null && e.button !== 0) return
    try { ref.current.setPointerCapture(e.pointerId) } catch { /* synthetic pointer */ }
    pointsRef.current = [toNormalized(e)]
    setPoints(pointsRef.current)
  }
  const handleMove = (e) => {
    const current = pointsRef.current
    if (!current) return
    const point = toNormalized(e)
    const last = current[current.length - 1]
    if (Math.hypot(point[0] - last[0], point[1] - last[1]) < 0.003) return
    pointsRef.current = [...current, point]
    setPoints(pointsRef.current)
  }
  const handleUp = () => {
    const current = pointsRef.current
    pointsRef.current = null
    setPoints(null)
    if (current && current.length >= 3) onStroke(current, tool === 'erase' ? 'sub' : 'add')
  }
  const handleCancel = () => {
    pointsRef.current = null
    setPoints(null)
  }

  const color = tool === 'erase' ? '#f87171' : '#ff69b4'
  return (
    <div
      ref={ref}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleCancel}
      style={{ position: 'absolute', inset: 0, zIndex: 40, cursor: 'crosshair', touchAction: 'none' }}
    >
      <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {points && points.length > 1 && (
          <polygon
            points={points.map(([u, v]) => `${u * 1000},${v * 1000}`).join(' ')}
            fill={tool === 'erase' ? 'rgba(248,113,113,0.18)' : 'rgba(255,105,180,0.18)'}
            stroke={color}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeDasharray="6 4"
          />
        )}
      </svg>
      <div style={{ position: 'absolute', top: '36px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,8,30,0.85)', color, padding: '4px 10px', borderRadius: '8px', fontFamily: 'monospace', fontSize: isMobileLayout ? '10px' : '11px', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
        {tool === 'erase' ? '➖ обведи, что убрать' : '➕ обведи объект'}
      </div>
    </div>
  )
}

// ─── game wrapper ────────────────────────────────────────────────────────────

function newDraft() {
  return { id: null, name: '', strokes: [], reaction: null, hover: null }
}

export function HiddenObjectGame({ roomNumber, children, isMobileLayout }) {
  const engineRef = useRef(null)
  const [engineVersion, setEngineVersion] = useState(0)
  const [room, setRoom] = useState(emptyRoom)
  const [hasDraftOverride, setHasDraftOverride] = useState(false)
  const [found, setFound] = useState(() => loadFound(roomNumber))
  const [hintId, setHintId] = useState(null)
  const [hintUsed, setHintUsed] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [timeUp, setTimeUp] = useState(false)
  const [popup, setPopup] = useState(null)
  const [editorEnabled] = useState(isEditorEnabled)
  const [editMode, setEditMode] = useState(false)
  const [tool, setTool] = useState('lasso')
  const [draft, setDraft] = useState(newDraft)
  const [draftFaces, setDraftFaces] = useState(() => new Uint32Array(0))
  const [hoverId, setHoverId] = useState(null)
  const [faceCounts, setFaceCounts] = useState(() => new Map())
  const runtimeRef = useRef({ faceToHotspot: null, hotspotFaces: new Map(), hotspotIds: [] })
  const highlightsRef = useRef({ draft: null, hover: null, visitorHover: null, hint: null, flashes: [] })
  const hotspotsSignature = JSON.stringify(room.hotspots)

  // Load hotspots: the published file is the default, a local draft (from editing) overrides it.
  useEffect(() => {
    let cancelled = false
    setFound(loadFound(roomNumber))
    setHintId(null)
    setHintUsed(false)
    setTimeUp(false)
    setDraft(newDraft())
    setDraftFaces(new Uint32Array(0))
    const draftRoom = loadDraftRoom(roomNumber)
    if (draftRoom) {
      setRoom(draftRoom)
      setHasDraftOverride(true)
    } else {
      setRoom(emptyRoom())
      setHasDraftOverride(false)
      loadPublishedRoom(roomNumber).then((published) => {
        if (cancelled || !published) return
        setRoom((current) => (loadDraftRoom(roomNumber) ? current : published))
      })
    }
    return () => { cancelled = true }
  }, [roomNumber])

  const persistRoom = useCallback((next) => {
    setRoom(next)
    saveDraftRoom(roomNumber, next)
    setHasDraftOverride(true)
  }, [roomNumber])

  useEffect(() => {
    if (!editorEnabled) return undefined
    const handler = (e) => {
      if (e.key !== 'e' && e.key !== 'E') return
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      setEditMode((previous) => !previous)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editorEnabled])

  // Replay every hotspot's lassos against the loaded scan and build the triangle → hotspot map.
  useEffect(() => {
    const engine = engineRef.current
    if (!engine?.mesh) return
    const picker = ensurePicker(engine)
    const faceToHotspot = new Int32Array(picker.triangles).fill(-1)
    const hotspotFaces = new Map()
    const counts = new Map()
    room.hotspots.forEach((hotspot, index) => {
      const faces = picker.facesForHotspot(hotspot)
      hotspotFaces.set(hotspot.id, faces)
      counts.set(hotspot.id, faces.length)
      for (const face of faces) faceToHotspot[face] = index
    })
    runtimeRef.current = { faceToHotspot, hotspotFaces, hotspotIds: room.hotspots.map((h) => h.id) }
    setFaceCounts(counts)
  }, [hotspotsSignature, engineVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // Draft selection highlight (pink) while editing.
  useEffect(() => {
    const engine = engineRef.current
    removeHighlight(highlightsRef.current.draft)
    highlightsRef.current.draft = null
    if (!engine?.mesh || !editMode || draftFaces.length === 0) return
    highlightsRef.current.draft = createFaceHighlight(engine.mesh, draftFaces, 0xff69b4, 0.55)
    return () => { removeHighlight(highlightsRef.current.draft); highlightsRef.current.draft = null }
  }, [draftFaces, editMode, engineVersion])

  // Hover highlight (blue) for the hotspot list in the editor.
  useEffect(() => {
    const engine = engineRef.current
    removeHighlight(highlightsRef.current.hover)
    highlightsRef.current.hover = null
    if (!engine?.mesh || !hoverId) return
    const faces = runtimeRef.current.hotspotFaces.get(hoverId)
    if (!faces || faces.length === 0) return
    highlightsRef.current.hover = createFaceHighlight(engine.mesh, faces, 0x60a5fa, 0.5)
    return () => { removeHighlight(highlightsRef.current.hover); highlightsRef.current.hover = null }
  }, [hoverId, hotspotsSignature, engineVersion])

  // Hint: pulse the object for a few seconds.
  useEffect(() => {
    const engine = engineRef.current
    removeHighlight(highlightsRef.current.hint)
    highlightsRef.current.hint = null
    if (!engine?.mesh || !hintId) return undefined
    const faces = runtimeRef.current.hotspotFaces.get(hintId)
    if (!faces || faces.length === 0) return undefined
    const highlight = createFaceHighlight(engine.mesh, faces, 0xffdd00, 0.7)
    highlightsRef.current.hint = highlight
    const started = performance.now()
    let frame = 0
    const tick = () => {
      const elapsed = performance.now() - started
      highlight.material.opacity = 0.35 + 0.4 * Math.abs(Math.sin(elapsed / 220))
      if (elapsed < 4000) frame = requestAnimationFrame(tick)
      else { removeHighlight(highlight); highlightsRef.current.hint = null; setHintId(null) }
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); removeHighlight(highlight); highlightsRef.current.hint = null }
  }, [hintId, engineVersion])

  const flashFaces = useCallback((faces, color = 0xffd700) => {
    const engine = engineRef.current
    if (!engine?.mesh || !faces || faces.length === 0) return
    const highlight = createFaceHighlight(engine.mesh, faces, color, 0.8)
    const started = performance.now()
    const tick = () => {
      const elapsed = performance.now() - started
      highlight.material.opacity = Math.max(0, 0.8 * (1 - elapsed / 1500))
      if (elapsed < 1500) requestAnimationFrame(tick)
      else removeHighlight(highlight)
    }
    requestAnimationFrame(tick)
  }, [])

  const handleFound = useCallback((hotspot) => {
    setFound((previous) => {
      if (previous.includes(hotspot.id)) return previous
      const next = [...previous, hotspot.id]
      saveFound(roomNumber, next)
      return next
    })
    setHintId(null)
    flashFaces(runtimeRef.current.hotspotFaces.get(hotspot.id))
    triggerReaction(hotspot.reaction, setPopup)
  }, [roomNumber, flashFaces])

  // Visitor hover: glow the hotspot under the pointer, show its name, run its hover reaction.
  const [hoverInfo, setHoverInfo] = useState(null)
  const hoverAudioRef = useRef(null)
  useEffect(() => {
    const engine = engineRef.current
    if (!engine?.canvas || editMode) { setHoverInfo(null); return undefined }
    const canvas = engine.canvas
    let last = null
    let frame = 0
    let pending = null
    const apply = (hotspot, clientX, clientY) => {
      const id = hotspot?.id ?? null
      if (id !== last) {
        last = id
        removeHighlight(highlightsRef.current.visitorHover)
        highlightsRef.current.visitorHover = null
        if (hoverAudioRef.current) { hoverAudioRef.current.pause(); hoverAudioRef.current = null }
        if (hotspot) {
          const faces = runtimeRef.current.hotspotFaces.get(hotspot.id)
          if (faces) highlightsRef.current.visitorHover = createFaceHighlight(engine.mesh, faces, 0xff69b4, 0.35)
          if (hotspot.hover?.type === 'audio' && hotspot.hover.value) {
            try { const a = new Audio(hotspot.hover.value); a.loop = true; a.volume = 0.7; a.play().catch(() => {}); hoverAudioRef.current = a } catch { /* ignore */ }
          }
        }
        canvas.style.cursor = hotspot ? 'pointer' : ''
      }
      setHoverInfo(hotspot ? { hotspot, x: clientX, y: clientY } : null)
    }
    const onMove = (e) => {
      pending = [e.clientX, e.clientY]
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!pending) return
        const [cx, cy] = pending
        const rect = canvas.getBoundingClientRect()
        const picker = ensurePicker(engine)
        const face = picker.pickPoint(engine.camera, (cx - rect.left) / rect.width, (cy - rect.top) / rect.height)
        const { faceToHotspot, hotspotIds } = runtimeRef.current
        let hotspot = null
        if (face >= 0 && faceToHotspot && face < faceToHotspot.length) {
          const index = faceToHotspot[face]
          if (index >= 0) hotspot = room.hotspots.find((h) => h.id === hotspotIds[index]) ?? null
        }
        apply(hotspot, cx, cy)
      })
    }
    const onLeave = () => apply(null, 0, 0)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    return () => {
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      if (frame) cancelAnimationFrame(frame)
      apply(null, 0, 0)
    }
  }, [editMode, room, hotspotsSignature, engineVersion])

  // Game clicks: a press without drag picks the triangle under the pointer through the id buffer.
  useEffect(() => {
    const engine = engineRef.current
    if (!engine?.canvas) return undefined
    const canvas = engine.canvas
    let pressed = null
    const onDown = (e) => { pressed = [e.clientX, e.clientY] }
    const onUp = (e) => {
      if (!pressed) return
      const [x, y] = pressed
      pressed = null
      if (Math.hypot(e.clientX - x, e.clientY - y) > CLICK_SLOP_PX) return
      if (editMode || timeUp) return
      const rect = canvas.getBoundingClientRect()
      const picker = ensurePicker(engine)
      const face = picker.pickPoint(engine.camera, (e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
      if (face < 0) return
      const { faceToHotspot, hotspotIds } = runtimeRef.current
      if (!faceToHotspot || face >= faceToHotspot.length) return
      const index = faceToHotspot[face]
      if (index < 0) return
      const hotspot = room.hotspots.find((h) => h.id === hotspotIds[index])
      if (hotspot) handleFound(hotspot)
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointerup', onUp)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointerup', onUp)
    }
  }, [editMode, timeUp, room.hotspots, handleFound, engineVersion])

  const gameMode = room.hotspots.length > 0 && !editMode
  const allFound = room.hotspots.length > 0 && room.hotspots.every((s) => found.includes(s.id))

  // Optional per-room countdown; runs only while the game is on screen and unfinished.
  useEffect(() => {
    if (!gameMode || !room.timerSeconds || allFound) { setTimeLeft(null); return undefined }
    setTimeLeft(room.timerSeconds)
    setTimeUp(false)
    const started = Date.now()
    const interval = setInterval(() => {
      const left = room.timerSeconds - Math.floor((Date.now() - started) / 1000)
      if (left <= 0) { setTimeLeft(0); setTimeUp(true); clearInterval(interval) } else setTimeLeft(left)
    }, 500)
    return () => clearInterval(interval)
  }, [gameMode, room.timerSeconds, allFound, roomNumber])

  const handleHint = () => {
    if (hintUsed) return
    const unfound = room.hotspots.filter((s) => !found.includes(s.id))
    if (unfound.length === 0) return
    setHintId(unfound[Math.floor(Math.random() * unfound.length)].id)
    setHintUsed(true)
  }

  const handleRestart = () => {
    setFound([])
    saveFound(roomNumber, [])
    setHintUsed(false)
    setHintId(null)
    setTimeUp(false)
    setTimeLeft(room.timerSeconds)
  }

  // ── editor actions ──
  const applyStroke = useCallback((polygon, op) => {
    const engine = engineRef.current
    if (!engine?.mesh) return
    const picker = ensurePicker(engine)
    const cam = cameraStateFrom(engine.camera)
    const poly = polygon.map(([u, v]) => [+u.toFixed(4), +v.toFixed(4)])
    const picked = picker.pickPolygon(cam, poly)
    const faces = new Set(draftFaces)
    if (op === 'sub') for (const face of picked) faces.delete(face)
    else for (const face of picked) faces.add(face)
    setDraftFaces(Uint32Array.from(faces).sort())
    setDraft((current) => ({ ...current, strokes: [...current.strokes, { op, cam, poly }] }))
  }, [draftFaces])

  const recomputeDraftFaces = useCallback((strokes) => {
    const engine = engineRef.current
    if (!engine?.mesh) return new Uint32Array(0)
    return ensurePicker(engine).facesForHotspot({ strokes })
  }, [])

  const handleUndoStroke = () => {
    const strokes = draft.strokes.slice(0, -1)
    setDraft({ ...draft, strokes })
    setDraftFaces(recomputeDraftFaces(strokes))
  }
  const handleClearDraft = () => { setDraft(newDraft()); setDraftFaces(new Uint32Array(0)) }
  const handleSaveDraft = () => {
    if (draftFaces.length === 0 || !draft.name.trim()) return
    const hotspot = {
      id: draft.id ?? `${roomNumber}-${Date.now().toString(36)}`,
      name: draft.name.trim(),
      strokes: draft.strokes,
      reaction: draft.reaction?.type && draft.reaction?.value ? draft.reaction : null,
      hover: draft.hover?.type && draft.hover?.value ? draft.hover : null,
    }
    const hotspots = draft.id ? room.hotspots.map((s) => (s.id === draft.id ? hotspot : s)) : [...room.hotspots, hotspot]
    persistRoom({ ...room, hotspots })
    handleClearDraft()
  }
  const handleEditHotspot = (hotspot) => {
    setDraft({ id: hotspot.id, name: hotspot.name, strokes: hotspot.strokes, reaction: hotspot.reaction, hover: hotspot.hover ?? null })
    setDraftFaces(recomputeDraftFaces(hotspot.strokes))
  }
  const handleDeleteHotspot = (id) => {
    persistRoom({ ...room, hotspots: room.hotspots.filter((s) => s.id !== id) })
    if (draft.id === id) handleClearDraft()
  }
  const handleTimerChange = (seconds) => persistRoom({ ...room, timerSeconds: seconds > 0 ? Math.round(seconds) : null })
  const roomJson = () => JSON.stringify({ version: ROOM_DATA_VERSION, room: roomNumber, timerSeconds: room.timerSeconds, hotspots: room.hotspots }, null, 2)
  const handleCopyJson = () => { navigator.clipboard?.writeText(roomJson()).catch(() => {}) }
  const handleDownloadJson = () => {
    const blob = new Blob([roomJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `room-${roomNumber}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }
  const handleResetToPublished = () => {
    clearDraftRoom(roomNumber)
    setHasDraftOverride(false)
    handleClearDraft()
    loadPublishedRoom(roomNumber).then((published) => setRoom(published ?? emptyRoom()))
  }
  const handleResetProgress = () => { setFound([]); saveFound(roomNumber, []); setHintUsed(false); setTimeUp(false) }

  const sceneProps = useMemo(() => ({
    engineRef,
    onEngineReady: () => setEngineVersion((v) => v + 1),
  }), [])

  const panelWidth = isMobileLayout ? 0 : 200
  const lassoActive = editMode && tool !== 'camera'

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex' }}>
      <div style={{ flex: 1, position: 'relative', marginRight: gameMode ? `${panelWidth}px` : 0 }}>
        {children({ sceneProps, editMode, cameraLocked: lassoActive })}
        {lassoActive && <LassoOverlay tool={tool} onStroke={applyStroke} isMobileLayout={isMobileLayout} />}
      </div>

      {gameMode && (
        <HiddenObjectPanel
          hotspots={room.hotspots}
          found={found}
          onHint={handleHint}
          hintUsed={hintUsed}
          timeLeft={timeLeft}
          timeUp={timeUp}
          allFound={allFound}
          onRestart={handleRestart}
          isMobileLayout={isMobileLayout}
        />
      )}

      {editorEnabled && (
        <button
          type="button"
          onClick={() => setEditMode((p) => !p)}
          title={editMode ? 'exit edit mode (E)' : 'edit hidden objects (E)'}
          style={{
            position: 'absolute', bottom: isMobileLayout ? '72px' : '12px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
            background: editMode ? '#ff69b4' : 'rgba(0,0,0,0.18)', border: 'none', color: editMode ? '#fff' : 'rgba(255,255,255,0.7)',
            fontSize: '10px', padding: '3px 8px', borderRadius: '8px', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '0.05em',
          }}
        >
          {editMode ? '✏️ editing — выйти' : '✏️'}
        </button>
      )}

      {editMode && (
        <HotspotEditorPanel
          roomNumber={roomNumber}
          room={room}
          draft={draft}
          draftFaceCount={draftFaces.length}
          tool={tool}
          setTool={setTool}
          onNameChange={(name) => setDraft({ ...draft, name })}
          onReactionChange={(patch) => setDraft({ ...draft, reaction: patch.type === '' ? null : { ...(draft.reaction ?? {}), ...patch } })}
          onHoverReactionChange={(patch) => setDraft({ ...draft, hover: patch.type === '' ? null : { ...(draft.hover ?? {}), ...patch } })}
          onSaveDraft={handleSaveDraft}
          onClearDraft={handleClearDraft}
          onUndoStroke={handleUndoStroke}
          onEditHotspot={handleEditHotspot}
          onDeleteHotspot={handleDeleteHotspot}
          onHoverHotspot={setHoverId}
          onTimerChange={handleTimerChange}
          onCopyJson={handleCopyJson}
          onDownloadJson={handleDownloadJson}
          onResetToPublished={handleResetToPublished}
          onResetProgress={handleResetProgress}
          hasDraftOverride={hasDraftOverride}
          faceCounts={faceCounts}
          isMobileLayout={isMobileLayout}
        />
      )}

      {hoverInfo && !editMode && (() => {
        const { hotspot, x, y } = hoverInfo
        const hv = hotspot.hover
        const media = hv?.type === 'image' || hv?.type === 'gif' ? hv.value : null
        const text = hv?.type === 'text' ? hv.value : null
        const W = media ? 220 : 'auto'
        const left = Math.min(x + 16, (typeof window !== 'undefined' ? window.innerWidth : 9999) - (media ? 240 : 200))
        const top = Math.max(8, y - (media ? 190 : 40))
        return (
          <div style={{ position: 'fixed', left, top, width: W, zIndex: 9400, pointerEvents: 'none', background: '#fff', border: '1px solid #111', padding: media ? '6px' : '4px 9px', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '12px', fontWeight: 300, color: '#111', boxShadow: '0 6px 20px rgba(0,0,0,0.18)' }}>
            {media && <img src={media} alt="" style={{ display: 'block', width: '100%', height: '150px', objectFit: 'cover', marginBottom: '5px' }} />}
            <div>{hotspot.name}</div>
            {text && <div style={{ opacity: 0.7, marginTop: '2px' }}>{text}</div>}
          </div>
        )
      })()}

      <ReactionPopup reaction={popup} onClose={() => setPopup(null)} isMobileLayout={isMobileLayout} />
    </div>
  )
}

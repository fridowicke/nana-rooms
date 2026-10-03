import * as THREE from 'three'

const PICK_WIDTH = 2000

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

function triangleCount(geometry) {
  return Math.floor((geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3)
}

export function triangleVertexIndex(geometry, triangle, corner) {
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

export function cameraStateFrom(camera) {
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

export class ScanPicker {
  constructor(gl, mesh) {
    this.gl = gl
    this.mesh = mesh
    this.triangles = triangleCount(mesh.geometry)
    this.pickMesh = this.buildPickMesh(mesh)
    this.pickScene = new THREE.Scene()
    this.pickScene.add(this.pickMesh)
    this.faceCache = new Map()
    this.clickTarget = this.createTarget(1, 1)
    this.hoverTarget = this.createTarget(1, 1)
    this.clickPixel = new Uint8Array(4)
    this.hoverPixel = new Uint8Array(4)
    this.hoverRead = null
    this.disposed = false
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

  createTarget(width, height) {
    return new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      stencilBuffer: false,
    })
  }

  renderIds(camera, width, height, target = this.createTarget(width, height)) {
    const { gl } = this
    this.mesh.updateWorldMatrix(true, false)
    this.pickMesh.matrix.copy(this.mesh.matrixWorld)
    // Match the visible scan: back-facing ceilings must not mask the objects
    // when a lasso was drawn from above or outside an open scan.
    const scanMaterial = Array.isArray(this.mesh.material) ? this.mesh.material[0] : this.mesh.material
    if (this.pickMesh.material.side !== scanMaterial.side) {
      this.pickMesh.material.side = scanMaterial.side
      this.pickMesh.material.needsUpdate = true
    }
    const previousTarget = gl.getRenderTarget()
    const previousClearColor = gl.getClearColor(new THREE.Color())
    const previousClearAlpha = gl.getClearAlpha()
    const previousAutoClear = gl.autoClear
    try {
      gl.setRenderTarget(target)
      gl.setClearColor(0x000000, 1)
      gl.autoClear = true
      gl.clear(true, true, false)
      gl.render(this.pickScene, camera)
    } finally {
      gl.setRenderTarget(previousTarget)
      gl.setClearColor(previousClearColor, previousClearAlpha)
      gl.autoClear = previousAutoClear
    }
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
    // Read a margin around the lasso too, so we can see how much of each triangle lies outside.
    const marginX = Math.max(24, (maxX - minX) * 0.5)
    const marginY = Math.max(24, (maxY - minY) * 0.5)
    const x0 = Math.max(0, Math.floor(minX - marginX))
    const y0 = Math.max(0, Math.floor(minY - marginY))
    const x1 = Math.min(width - 1, Math.ceil(maxX + marginX))
    const y1 = Math.min(height - 1, Math.ceil(maxY + marginY))
    const faces = new Set()
    if (x1 >= x0 && y1 >= y0) {
      const regionWidth = x1 - x0 + 1
      const regionHeight = y1 - y0 + 1
      const pixels = new Uint8Array(regionWidth * regionHeight * 4)
      this.gl.readRenderTargetPixels(target, x0, y0, regionWidth, regionHeight, pixels)
      const inside = new Map()
      const total = new Map()
      for (let row = 0; row < regionHeight; row++) {
        for (let column = 0; column < regionWidth; column++) {
          const offset = (row * regionWidth + column) * 4
          const id = pixels[offset] + pixels[offset + 1] * 256 + pixels[offset + 2] * 65536
          if (id === 0) continue
          const face = id - 1
          total.set(face, (total.get(face) ?? 0) + 1)
          if (pointInPolygon(x0 + column + 0.5, y0 + row + 0.5, pixelPolygon)) inside.set(face, (inside.get(face) ?? 0) + 1)
        }
      }
      // A triangle counts as selected only when most of its visible area is inside the lasso.
      // This stops big flat scan triangles (bedding, floor) from bleeding out past the outline.
      for (const [face, count] of inside) {
        const all = total.get(face) ?? count
        if (count / all >= 0.6 || (all <= 6 && count >= 1)) faces.add(face)
      }
    }
    target.dispose()
    return Uint32Array.from(faces).sort()
  }

  renderPoint(camera, u, v, target) {
    const width = Math.max(2, this.gl.domElement.width)
    const height = Math.max(2, this.gl.domElement.height)
    const x = Math.min(width - 1, Math.max(0, Math.floor(u * width)))
    const y = Math.min(height - 1, Math.max(0, Math.floor((1 - v) * height)))
    // Translate the original full-resolution viewport so the requested pixel lands at (0, 0)
    // in a 1×1 buffer. Projection, pixel rounding, depth and triangle IDs stay unchanged.
    target.viewport.set(-x, -y, width, height)
    this.renderIds(camera, 1, 1, target)
  }

  decode(pixel) {
    const id = pixel[0] + pixel[1] * 256 + pixel[2] * 65536
    return id === 0 ? -1 : id - 1
  }

  // Clicks stay synchronous so game tabs/audio still run inside the browser's user gesture.
  pickPoint(camera, u, v) {
    if (this.disposed) return -1
    this.renderPoint(camera, u, v, this.clickTarget)
    this.gl.readRenderTargetPixels(this.clickTarget, 0, 0, 1, 1, this.clickPixel)
    return this.decode(this.clickPixel)
  }

  async pickPointAsync(camera, u, v) {
    if (this.disposed) return -1
    // The hover scheduler allows one read in flight. Clicks have their own buffer.
    if (this.hoverRead) throw new Error('A hover pick is already pending')
    this.renderPoint(camera, u, v, this.hoverTarget)
    this.hoverRead = this.gl.readRenderTargetPixelsAsync(this.hoverTarget, 0, 0, 1, 1, this.hoverPixel)
    try {
      await this.hoverRead
      return this.disposed ? -1 : this.decode(this.hoverPixel)
    } finally {
      this.hoverRead = null
      if (this.disposed) this.hoverTarget.dispose()
    }
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
    if (this.disposed) return
    this.disposed = true
    this.clickTarget.dispose()
    if (!this.hoverRead) this.hoverTarget.dispose()
    this.pickMesh.geometry.dispose()
    this.pickMesh.material.dispose()
    this.faceCache.clear()
  }
}

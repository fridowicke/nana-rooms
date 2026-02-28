import React, { useState, Suspense, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF, KeyboardControls, useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
]

const LANDING_CAMERA_POSITION = [-0.55, 0.24, 0.48]
const ROOM_CAMERA_POSITION = [0, 0, 10]
const ROOM_FILES = [
  'AIKO DETAILS WEB.glb',
  'AIKO WEB.glb',
  'ANDREA WEB.glb',
  'EIKO WEB.glb',
]
const HOME_HASH = '#home'
const ROOM_HASH_PREFIX = 'room-'

const DOOR_LINKS = [
  {
    id: 'door-1',
    label: 'Door 1',
    roomIndex: 0,
    corners: [
      [0.154, 0.129, 0.028],
      [0.103, 0.131, -0.02],
      [0.106, 0.011, -0.018],
      [0.153, 0.01, 0.027],
    ],
  },
  {
    id: 'door-2',
    label: 'Door 2',
    roomIndex: 1,
    corners: [
      [-0.083, 0.126, 0.157],
      [-0.035, 0.126, 0.108],
      [-0.034, 0.009, 0.113],
      [-0.084, 0.008, 0.161],
    ],
  },
  {
    id: 'door-3',
    label: 'Door 3',
    roomIndex: 2,
    corners: [
      [-0.161, 0.13, -0.019],
      [-0.131, 0.133, 0.047],
      [-0.138, 0.005, 0.045],
      [-0.167, 0.012, -0.017],
    ],
  },
  {
    id: 'door-4',
    label: 'Door 4',
    roomIndex: 3,
    corners: [
      [-0.018, 0.012, -0.087],
      [0.026, 0.01, -0.133],
      [0.028, 0.124, -0.125],
      [-0.021, 0.118, -0.082],
    ],
  },
]

function Model({ url, children, onLoaded }) {
  const { scene } = useGLTF(url)

  useEffect(() => {
    if (onLoaded) onLoaded()
  }, [onLoaded, scene])

  return <primitive object={scene}>{children}</primitive>
}

function parseRouteFromHash(hashValue) {
  const normalized = (hashValue || '').replace(/^#/, '')
  if (normalized.startsWith(ROOM_HASH_PREFIX)) {
    const roomNumber = Number(normalized.slice(ROOM_HASH_PREFIX.length))
    if (Number.isInteger(roomNumber) && roomNumber >= 1 && roomNumber <= ROOM_FILES.length) {
      return { type: 'room', roomIndex: roomNumber - 1 }
    }
  }

  return { type: 'home' }
}

function navigateWithHash(nextHash) {
  if (typeof window === 'undefined') return
  if (window.location.hash === nextHash) return
  window.location.hash = nextHash
}

function Controls() {
  const [, get] = useKeyboardControls()
  const { camera } = useThree()
  const controlsRef = useRef()
  const moveSpeed = 0.2

  useFrame(() => {
    const { forward, backward, left, right } = get()

    if (!(forward || backward || left || right)) return

    const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    forwardDir.y = 0
    forwardDir.normalize()

    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    rightDir.y = 0
    rightDir.normalize()

    const moveDir = new THREE.Vector3(0, 0, 0)
    if (forward) moveDir.add(forwardDir)
    if (backward) moveDir.sub(forwardDir)
    if (left) moveDir.sub(rightDir)
    if (right) moveDir.add(rightDir)

    if (moveDir.length() === 0) return

    moveDir.normalize().multiplyScalar(moveSpeed)
    camera.position.add(moveDir)

    if (controlsRef.current) {
      controlsRef.current.target.add(moveDir)
      controlsRef.current.update()
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      rotateSpeed={0.4}
      zoomSpeed={1}
      panSpeed={0.4}
      enableDamping
      dampingFactor={0.05}
    />
  )
}

function CameraReset({ position }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)

  useLayoutEffect(() => {
    camera.position.set(...position)
    if (controls?.target) {
      controls.target.set(0, 0, 0)
      controls.update()
    } else {
      camera.lookAt(0, 0, 0)
    }
  }, [camera, controls, position])

  return null
}

function DoorLinkArea({ door, onOpenRoom }) {
  const corners = Array.isArray(door.corners) ? door.corners : []

  const geometry = useMemo(() => {
    if (corners.length !== 4) return null

    const vertices = new Float32Array([
      ...corners[0],
      ...corners[1],
      ...corners[2],
      ...corners[0],
      ...corners[2],
      ...corners[3],
    ])

    const next = new THREE.BufferGeometry()
    next.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    next.computeVertexNormals()
    return next
  }, [corners])

  useEffect(() => () => geometry?.dispose(), [geometry])

  if (!geometry) return null

  return (
    <mesh
      geometry={geometry}
      renderOrder={1000}
      onPointerDown={(event) => {
        event.stopPropagation()
      }}
      onClick={(event) => {
        event.stopPropagation()
        onOpenRoom(door.roomIndex + 1)
      }}
    >
      <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
    </mesh>
  )
}

function DoorLinks({ doors, onOpenRoom }) {
  return (
    <group>
      {doors.map((door) => (
        <DoorLinkArea key={door.id} door={door} onOpenRoom={onOpenRoom} />
      ))}
    </group>
  )
}

function RoomPage({ roomNumber, roomFile, onBack }) {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#fff',
        color: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          border: 'none',
          background: 'transparent',
          color: '#fff',
          padding: 0,
          fontFamily: 'monospace',
          fontSize: '18px',
          fontWeight: 600,
          zIndex: 20,
          cursor: 'auto',
        }}
      >
        back
      </button>

      <KeyboardControls map={keyboardMap}>
        <Canvas shadows camera={{ position: ROOM_CAMERA_POSITION, fov: 47.5 }} style={{ cursor: 'auto' }}>
          <color attach="background" args={['#000']} />
          <Suspense fallback={null}>
            <Stage environment="city" intensity={0.5} contactShadows={{ opacity: 0.7, blur: 2 }} adjustCamera={false}>
              <Model url={`rooms/${roomFile}`} />
            </Stage>
            <Controls />
            <CameraReset position={ROOM_CAMERA_POSITION} />
          </Suspense>
        </Canvas>
      </KeyboardControls>
    </div>
  )
}

export default function App() {
  const [activeModal, setActiveModal] = useState(null)
  const [route, setRoute] = useState(() =>
    parseRouteFromHash(typeof window !== 'undefined' ? window.location.hash : ''),
  )
  const [homeModelLoaded, setHomeModelLoaded] = useState(false)
  const roomsPreloadedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    if (!window.location.hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${HOME_HASH}`)
    }

    const syncFromHash = () => {
      setRoute(parseRouteFromHash(window.location.hash))
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  const openRoom = useCallback((roomNumber) => {
    setActiveModal(null)
    navigateWithHash(`#${ROOM_HASH_PREFIX}${roomNumber}`)
  }, [])

  const closeRoom = useCallback(() => {
    navigateWithHash(HOME_HASH)
  }, [])

  const handleHomeModelLoaded = useCallback(() => {
    setHomeModelLoaded(true)
  }, [])

  useEffect(() => {
    if (!homeModelLoaded || route.type !== 'home' || roomsPreloadedRef.current) return
    if (typeof window === 'undefined') return

    roomsPreloadedRef.current = true

    const preloadRooms = () => {
      ROOM_FILES.forEach((roomFile) => {
        useGLTF.preload(`rooms/${roomFile}`)
      })
    }

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(preloadRooms)
      return () => window.cancelIdleCallback?.(idleId)
    }

    const timeoutId = window.setTimeout(preloadRooms, 0)
    return () => window.clearTimeout(timeoutId)
  }, [homeModelLoaded, route.type])

  if (route.type === 'room') {
    const roomNumber = route.roomIndex + 1
    const roomFile = ROOM_FILES[route.roomIndex]
    return <RoomPage roomNumber={roomNumber} roomFile={roomFile} onBack={closeRoom} />
  }

  const cornerStyle = {
    position: 'absolute',
    color: '#000',
    fontWeight: '600',
    fontSize: '18px',
    cursor: 'auto',
    zIndex: 10,
    padding: '30px',
    userSelect: 'none',
    transition: 'opacity 0.2s',
  }

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(255,255,255,0.85)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#000',
    backdropFilter: 'blur(5px)',
  }

  const modalContentStyle = {
    maxWidth: '600px',
    padding: '40px',
    border: '1px solid #000',
    borderRadius: '20px',
    position: 'relative',
    backgroundColor: '#fff',
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        cursor: 'auto',
        backgroundColor: '#fff',
      }}
    >
      <div
        style={{ ...cornerStyle, top: 0, left: 0 }}
        onClick={() => setActiveModal('cv')}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        CV
      </div>

      <div
        style={{ ...cornerStyle, top: 0, right: 0 }}
        onClick={() => setActiveModal('publications')}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        Works
      </div>

      <div
        style={{ ...cornerStyle, bottom: 0, right: 0 }}
        onClick={() => setActiveModal('knock')}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
      >
        knock knock
      </div>

      {activeModal && (
        <div style={modalOverlayStyle} onClick={() => setActiveModal(null)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div
              style={{ position: 'absolute', top: '20px', right: '20px', cursor: 'auto', fontSize: '24px' }}
              onClick={() => setActiveModal(null)}
            >
              ×
            </div>

            {activeModal === 'cv' && (
              <div>
                <h2 style={{ marginTop: 0 }}>[NAME/TITLE]</h2>
                <p>
                  <strong>[PROFESSIONAL TITLE]</strong>
                </p>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore
                  et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
                  aliquip ex ea commodo consequat.
                </p>
                <h3 style={{ borderBottom: '1px solid' }}>Experience</h3>
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  <li>• [Position Name] (20XX–Present)</li>
                  <li>• [Position Name] (20XX–20XX)</li>
                  <li>• [Position Name] (20XX–20XX)</li>
                </ul>
              </div>
            )}

            {activeModal === 'publications' && (
              <div>
                <h2 style={{ marginTop: 0 }}>Works</h2>
                <ul style={{ listStyleType: 'none', padding: 0, lineHeight: '2' }}>
                  <li>
                    <em>"[Project/Work Title]"</em> — [Venue/Publisher], [Year]
                  </li>
                  <li>
                    <em>"[Project/Work Title]"</em> — [Venue/Publisher], [Year]
                  </li>
                  <li>
                    <em>"[Project/Work Title]"</em> — [Venue/Publisher], [Year]
                  </li>
                  <li>
                    <em>"[Project/Work Title]"</em> — [Venue/Publisher], [Year]
                  </li>
                </ul>
              </div>
            )}

            {activeModal === 'knock' && (
              <div>
                <h2 style={{ marginTop: 0 }}>knock knock...</h2>
                <p>Who's there?</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
                  <input
                    type="text"
                    placeholder="Your Name"
                    style={{
                      background: 'transparent',
                      border: '1px solid #000',
                      padding: '10px',
                      color: '#000',
                      borderRadius: '5px',
                      cursor: 'auto',
                    }}
                  />
                  <textarea
                    placeholder="Tell me about your room..."
                    rows="4"
                    style={{
                      background: 'transparent',
                      border: '1px solid #000',
                      padding: '10px',
                      color: '#000',
                      borderRadius: '5px',
                      cursor: 'auto',
                    }}
                  />
                  <button
                    style={{
                      background: '#000',
                      color: '#fff',
                      border: 'none',
                      padding: '10px',
                      borderRadius: '5px',
                      fontWeight: 'bold',
                      cursor: 'auto',
                    }}
                  >
                    Send message
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <KeyboardControls map={keyboardMap}>
        <Canvas shadows camera={{ position: LANDING_CAMERA_POSITION, fov: 47.5 }} style={{ cursor: 'auto' }}>
          <color attach="background" args={['#fff']} />
          <Suspense fallback={null}>
            <Stage environment="city" intensity={0.5} contactShadows={{ opacity: 0.7, blur: 2 }} adjustCamera={false}>
              <Model url="assets/home.glb" onLoaded={handleHomeModelLoaded}>
                <DoorLinks doors={DOOR_LINKS} onOpenRoom={openRoom} />
              </Model>
            </Stage>
            <Controls />
            <CameraReset position={LANDING_CAMERA_POSITION} />
          </Suspense>
        </Canvas>
      </KeyboardControls>
    </div>
  )
}

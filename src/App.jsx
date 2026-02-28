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
const CONTACT_EMAIL = 'placeholder@example.com'
const HOME_HASH = '#home'
const ABOUT_HASH = '#about'
const ROOM_HASH_PREFIX = 'room-'
const FOLDER_HASH_PREFIX = 'folder-'

const FOLDER_DEFINITIONS = [
  {
    id: 'performance',
    label: 'performance',
    title: 'Performance',
    description: 'Live works and time-based actions.',
    items: ['Live set (placeholder)', 'Site-specific piece (placeholder)', 'Collaborative action (placeholder)'],
  },
  {
    id: 'writing',
    label: 'writing',
    title: 'Writing',
    description: 'Texts, essays, and notes.',
    items: ['Essay draft (placeholder)', 'Artist note (placeholder)', 'Publication text (placeholder)'],
  },
  {
    id: 'press',
    label: 'press',
    title: 'Press',
    description: 'Interviews, mentions, and publications.',
    items: ['Interview link (placeholder)', 'Press clipping (placeholder)', 'Feature mention (placeholder)'],
  },
  {
    id: 'filmmaking',
    label: 'filmmaking',
    title: 'Filmmaking',
    description: 'Films, shorts, and moving-image works.',
    items: ['Short film (placeholder)', 'Behind-the-scenes note (placeholder)', 'Screening entry (placeholder)'],
  },
  {
    id: 'cv',
    label: 'cv',
    title: 'CV',
    description: 'Selected biography and timeline.',
    items: ['Education (placeholder)', 'Exhibitions (placeholder)', 'Awards (placeholder)'],
  },
]
const FOLDER_MAP = new Map(FOLDER_DEFINITIONS.map((folder) => [folder.id, folder]))

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
  if (normalized === 'about') {
    return { type: 'about' }
  }

  if (normalized.startsWith(FOLDER_HASH_PREFIX)) {
    const folderId = normalized.slice(FOLDER_HASH_PREFIX.length)
    if (FOLDER_MAP.has(folderId)) {
      return { type: 'folder', folderId }
    }
  }

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

function AboutPage({ onBackHome, onOpenFolder }) {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#fff',
        color: '#000',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      >
        <img
          src="assets/nana_tabs.png"
          alt="nana tabs"
          style={{
            width: '100%',
            maxWidth: '1200px',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <img
          src="assets/nana_house.jpeg"
          alt="nana house"
          style={{
            width: '140px',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
        <button
          type="button"
          onClick={onBackHome}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#000',
            padding: 0,
            fontFamily: 'monospace',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'auto',
          }}
        >
          back home
        </button>

        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('knock knock')}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <img
            src="assets/nana_knockknock.jpeg"
            alt="knock knock"
            style={{
              width: '140px',
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </a>
      </div>

      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '72px',
          boxSizing: 'border-box',
        }}
      >
        <img
          src="assets/nana_hero.jpeg"
          alt="nana hero"
          style={{
            maxWidth: 'min(78vw, 980px)',
            maxHeight: 'min(72vh, 760px)',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: '24px',
          bottom: '24px',
          zIndex: 20,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px 24px',
          maxWidth: '520px',
        }}
      >
        {FOLDER_DEFINITIONS.map((folder) => (
          <button
            key={folder.id}
            type="button"
            onClick={() => onOpenFolder(folder.id)}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              width: '84px',
              cursor: 'auto',
            }}
          >
            <img
              src="assets/folder-icon-macos.webp"
              alt={`${folder.label} folder`}
              style={{
                width: '64px',
                height: '52px',
                objectFit: 'contain',
              }}
            />
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '13px',
                fontWeight: 600,
                color: '#111',
                textAlign: 'center',
                lineHeight: 1.1,
              }}
            >
              {folder.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function FolderPage({ folder, onBackToAbout }) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsOpen(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#e9ecef',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: 'min(980px, 94vw)',
          height: 'min(700px, 90vh)',
          backgroundColor: '#fff',
          borderRadius: '14px',
          border: '1px solid #d8d8d8',
          boxShadow: '0 24px 60px rgba(0,0,0,0.16)',
          overflow: 'hidden',
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(30px)',
          opacity: isOpen ? 1 : 0,
          transition: 'transform 320ms ease, opacity 320ms ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            height: '44px',
            borderBottom: '1px solid #e5e5e5',
            background: '#f7f7f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f57' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#febc2e' }} />
            <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#28c840' }} />
          </div>
          <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#333' }}>
            {folder.title}
          </span>
          <button
            type="button"
            onClick={onBackToAbout}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#333',
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'auto',
            }}
          >
            back
          </button>
        </div>

        <div
          style={{
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            overflow: 'auto',
          }}
        >
          <h1 style={{ margin: 0, fontFamily: 'monospace', fontSize: '34px', fontWeight: 700 }}>{folder.title}</h1>
          <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '16px', color: '#555' }}>{folder.description}</p>
          <ul style={{ margin: 0, paddingLeft: '22px', display: 'grid', gap: '10px' }}>
            {folder.items.map((item) => (
              <li key={item} style={{ fontFamily: 'monospace', fontSize: '16px', color: '#222' }}>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function App() {
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
    navigateWithHash(`#${ROOM_HASH_PREFIX}${roomNumber}`)
  }, [])

  const closeRoom = useCallback(() => {
    navigateWithHash(HOME_HASH)
  }, [])

  const openAbout = useCallback(() => {
    navigateWithHash(ABOUT_HASH)
  }, [])

  const closeAbout = useCallback(() => {
    navigateWithHash(HOME_HASH)
  }, [])

  const openFolder = useCallback((folderId) => {
    navigateWithHash(`#${FOLDER_HASH_PREFIX}${folderId}`)
  }, [])

  const closeFolder = useCallback(() => {
    navigateWithHash(ABOUT_HASH)
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

  if (route.type === 'about') {
    return <AboutPage onBackHome={closeAbout} onOpenFolder={openFolder} />
  }

  if (route.type === 'folder') {
    const folder = FOLDER_MAP.get(route.folderId)
    if (!folder) {
      return <AboutPage onBackHome={closeAbout} onOpenFolder={openFolder} />
    }
    return <FolderPage folder={folder} onBackToAbout={closeFolder} />
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
      <button
        type="button"
        onClick={openAbout}
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          zIndex: 20,
          border: 'none',
          background: 'transparent',
          color: '#000',
          padding: 0,
          fontFamily: 'monospace',
          fontSize: '18px',
          fontWeight: 600,
          cursor: 'auto',
        }}
      >
        about
      </button>

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

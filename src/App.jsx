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
const CONTACT_EMAIL = 'shelestvetrovki@gmail.com'
const HOME_HASH = '#home'
const ABOUT_HASH = '#about'
const ROOM_HASH_PREFIX = 'room-'
const FOLDER_HASH_PREFIX = 'folder-'
const MAC_LIGHT_FONT_STACK = "'Helvetica', Arial, sans-serif"
const DEFAULT_ABOUT_HTML = `Anastasiia Pishchanska is a Ukrainian-born, Tokyo-based artist, filmmaker, and art director. She is the co-founder of the established Ukrainian art print publication localstickerbook (<a href="https://localgr0up.com/" target="_blank" rel="noreferrer">local.group</a>), which curates exhibitions, events, and fundraisers worldwide, presenting contemporary artists through the lens of post-internet culture. In 2023, following the full-scale invasion of Ukraine, she was awarded a research scholarship at...

<br><br>Her practice moves between moving image, installation, and art direction, focusing on digital memory, migration, and cultural identity.`

const SONGS = [
  { title: 'Hysterical Love Project', artist: 'Motion Ward', src: 'assets/music/song1.mp3' },
  { title: 'oral', artist: 'björk ft. rosalía', src: 'assets/music/song2.m4a' },
  { title: 'love again', artist: 'DJ LOSTBOI x Young Thug', src: 'assets/music/song3.mp3' },
]

const FOLDER_DEFINITIONS = [
  {
    id: 'cv',
    label: 'cv',
    title: 'CV',
    bio: {
      name: 'SHELESTVETROVKI',
      born: 'Born Anastasiia Pishchanska, 2000, Odesa Ukraine',
      lives: 'Lives and works in Tokyo, Japan',
    },
    sections: [
      {
        heading: 'EDUCATION',
        entries: [
          { year: '2023 – 2024', item: 'Research Program, Media Arts; Dance&Performance, Tama Art University, Tokyo, Japan' },
          { year: '2018 – 2022', item: 'B.F.A, Filmmaking and Screenwriting, International Humanitarian University, Odesa Ukraine' },
          { year: '2005 – 2013', item: 'Diploma of Odesa Ballet Choreographic School, Odesa, Ukraine' },
        ],
      },
      {
        heading: 'CERTIFICATIONS',
        entries: [
          { year: '2021', item: 'Erasmus+ Producers Film Industry Leaders Lab, Warsaw, Poland' },
        ],
      },
      {
        heading: 'SELECTED GROUP EXHIBITIONS',
        entries: [
          { year: '2026', item: 'Women by Women, PhotoVogue, Biblioteca Nazionale Braidense, Milan, Italy' },
          { year: '2025', item: "Bed doesn't ask questions, PanoramicFestival, Barcelona, Spain" },
          { year: '', item: 'Localstickerbook, Tokyo Art Book Fair, Tokyo, Japan' },
          { year: '', item: "Spilka Paris x Local Group, Kolektiv Radieuse, Le Corbusier's Cité Radieuse, Marseille, France" },
          { year: '2024', item: 'MOM, POST-INTERNET IS NOT A PHASE ;(, Okay Space Gallery, Athens, Greece' },
          { year: '', item: 'Book Exhibition, UNTITLED SPACE, Tokyo, Japan' },
          { year: '2023', item: 'bezzvuchnodohlukhoty, National Academy of Fine Arts, Kyiv, Ukraine' },
          { year: '', item: 'Multimedia interactive installation, Tama Art University Tokyo, Japan' },
          { year: '', item: 'Svitlo x Moya Ridna, Photo Fundraising, Maison France-Montréal, Montreal, Québec' },
        ],
      },
      {
        heading: 'AWARDS HONORS RESIDENCIES',
        entries: [
          { year: '2026', item: 'Women By Women Shortlist, PhotoVogue Global' },
          { year: '2025', item: 'Grantee, Media Arts, PanoramicFestival, Barcelona, Spain' },
          { year: '2023 – 2026', item: 'Grantee, Artist at Risk Program, Nippon Foundation, Tokyo, Japan' },
          { year: '2023', item: 'MEXT Scholarship, Media Arts, Research Program, Tama Art University, Tokyo, Japan' },
        ],
      },
    ],
  },
  {
    id: 'performance',
    label: 'performance',
    title: 'Performance',
    sections: [
      {
        heading: 'SELECTED ARTIST TALKS + PANELS',
        entries: [
          { year: '2026', item: 'Girlhood: Fantasy and the Inner Life — A conversation between Laura Pelissier, Anastasiia Pischanska, and Lean Lui, moderated by Francesca Faccani, PhotoVogue, Milan, Italy' },
          { year: '2023', item: 'Art In The Wartime: lecture for Japanese art students between Anastasiia Pishchanska and Alisa Chen, Tama Art University, Tokyo, Japan' },
        ],
      },
    ],
  },
  {
    id: 'writing',
    label: 'writing',
    title: 'Writing',
    sections: [
      {
        heading: 'PRINTED PUBLICATIONS AND WRITING',
        entries: [
          { year: '2024', item: '"Dialogues on CoreCore & the Contemporary Online Avant-Garde", Becoming Press Publishing' },
          { year: '', item: '"NPC Collapse", Localstickerbook ISSUE 04, Readellion Publishing' },
          { year: '', item: '"Spiritual Ecocides", Lexicon Of Nature, LocalGroup, Readellion Publishing' },
        ],
      },
    ],
  },
  {
    id: 'press',
    label: 'press',
    title: 'Press',
    sections: [
      {
        heading: 'SELECTED PRESS',
        links: [
          { url: 'https://www.vogue.com/article/a-project-about-gen-z-youth-in-ukraine', label: 'Vogue — A Project About Gen-Z Youth in Ukraine' },
          { url: 'https://www.vogue.com/article/women-by-women-the-shortlist', label: 'Vogue — Women By Women: The Shortlist' },
          { url: 'https://festivalpanoramic.cat/en/project/panoramic-review-2025/', label: 'Festival Panoramic — Panoramic Review 2025' },
          { url: 'https://queerwararchive.com/2026/02/18/shelest-vetrovki-anastasiia-pischanska-gen-z/', label: 'Queer War Archive — Shelest Vetrovki' },
          { url: 'https://www.yokogaomag.com/editorial/shes-so-hot-i-wanna-clean-her-room-shelestvetrovki', label: "Yokogao Mag — She's So Hot I Wanna Clean Her Room" },
          { url: 'https://goodpress.co.uk/products/dialogues-on-corecore-the-contemporary-online-avant-garde-edited-by-0nty-onmycomputer', label: 'Good Press — Dialogues on CoreCore' },
          { url: 'https://www.kubaparis.com/submission/469655', label: 'Kuba Paris' },
          { url: 'https://becoming.press/dialogues-on-corecore', label: 'Becoming Press — Dialogues on CoreCore' },
          { url: 'https://www.instagram.com/p/DDmLc2Th1PV/', label: 'Instagram' },
          { url: 'https://www.tamabi.ac.jp/news/55772/', label: 'Tama Art University' },
          { url: 'https://i-d.co/article/daria-svertilova-photography-ukraine/', label: 'i-D — Daria Svertilova Photography Ukraine' },
        ],
      },
    ],
  },
  {
    id: 'filmmaking',
    label: 'filmmaking',
    title: 'Filmmaking',
    sections: [
      {
        heading: 'SCREENINGS',
        entries: [
          { year: '2025', item: '"Dream Wanders By The Window", BurningMagazine, Tokyo, Japan' },
          { year: '', item: "SpilkaParis x Local Group, Kolektiv Radieuse, Le Corbusier's Cité Radieuse, Marseille, France" },
          { year: '2024', item: 'Localstickerbook, Films Fundraiser, Datsuijo Gallery, Tokyo, Japan' },
          { year: '2023', item: 'Short Poetic Film Festival, Lviv, Ukraine' },
        ],
      },
      {
        heading: 'CURATING EXHIBITIONS + SCREENINGS',
        entries: [
          { year: '2025', item: "SpilkaParis x Local Group, Kolektiv Radieuse, Le Corbusier's Cité Radieuse, Marseille, France" },
          { year: '', item: 'Localstickerbook, Films fundraiser, Domicile Gallery, Tokyo, Japan' },
          { year: '', item: 'OpenSecret x Localstickerbook, Internet Cinema, Untitled Space Gallery, Tokyo, Japan' },
          { year: '2024', item: 'Localstickerbook, Films Fundraiser, Datsuijo Gallery, Tokyo, Japan' },
          { year: '2022', item: 'Localstickerbook, Experimental Film Screening, Filaret 16, Bucharest, Romania' },
        ],
      },
    ],
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

function CameraTracker({ onUpdate }) {
  const { camera, controls } = useThree()
  const lastRef = useRef('')

  useFrame(() => {
    const p = camera.position
    const t = controls?.target
    const str = `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}|${t ? `${t.x.toFixed(3)},${t.y.toFixed(3)},${t.z.toFixed(3)}` : '0,0,0'}`
    if (str !== lastRef.current) {
      lastRef.current = str
      onUpdate({
        position: [p.x, p.y, p.z],
        target: t ? [t.x, t.y, t.z] : [0, 0, 0],
      })
    }
  })

  return null
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

function fmt3(v) {
  return v.map((n) => n.toFixed(3)).join(', ')
}

function RoomPage({ roomNumber, roomFile, onBack }) {
  const [camInfo, setCamInfo] = useState({ position: ROOM_CAMERA_POSITION, target: [0, 0, 0] })
  const handleCamUpdate = useCallback((info) => setCamInfo(info), [])

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
          fontFamily: MAC_LIGHT_FONT_STACK,
          fontSize: '18px',
          fontWeight: 300,
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
            <CameraTracker onUpdate={handleCamUpdate} />
          </Suspense>
        </Canvas>
      </KeyboardControls>

      {/* Camera info overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          zIndex: 30,
          background: 'rgba(0,0,0,0.65)',
          color: '#e8e8e8',
          fontFamily: 'monospace',
          fontSize: '11px',
          lineHeight: 1.6,
          padding: '8px 12px',
          borderRadius: '6px',
          pointerEvents: 'none',
          userSelect: 'text',
          minWidth: '220px',
        }}
      >
        <div style={{ color: '#aaa', marginBottom: '2px' }}>camera</div>
        <div>pos&nbsp;&nbsp;[{fmt3(camInfo.position)}]</div>
        <div>look [{fmt3(camInfo.target)}]</div>
      </div>
    </div>
  )
}

function TinyPlayer({ onTitleBarMouseDown }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)

  const song = SONGS[currentIndex]

  const fmt = (s) => {
    if (!isFinite(s) || s < 0) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const fmtNeg = (cur, dur) => {
    if (!isFinite(dur) || dur <= 0) return '-0:00'
    const remaining = Math.max(dur - cur, 0)
    const m = Math.floor(remaining / 60)
    const sec = Math.floor(remaining % 60)
    return `-${m}:${sec.toString().padStart(2, '0')}`
  }

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().catch(() => {})
      setIsPlaying(true)
    }
  }, [isPlaying])

  const prevSong = useCallback(() => {
    const audio = audioRef.current
    if (audio) { audio.pause(); audio.currentTime = 0 }
    setIsPlaying(false)
    setCurrentTime(0)
    setCurrentIndex((i) => (i - 1 + SONGS.length) % SONGS.length)
  }, [])

  const nextSong = useCallback(() => {
    const audio = audioRef.current
    if (audio) { audio.pause(); audio.currentTime = 0 }
    setIsPlaying(false)
    setCurrentTime(0)
    setCurrentIndex((i) => (i + 1) % SONGS.length)
  }, [])

  const handleSeek = useCallback((e) => {
    const audio = audioRef.current
    if (!audio || !isFinite(duration) || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * duration
    setCurrentTime(audio.currentTime)
  }, [duration])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = SONGS[currentIndex].src
    audio.currentTime = 0
    setCurrentTime(0)
    setDuration(0)
    if (isPlaying) {
      audio.play().catch(() => {})
    }
  }, [currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentTime(audio.currentTime)
    const onDuration = () => setDuration(audio.duration)
    const onEnded = () => {
      setIsPlaying(false)
      setCurrentIndex((i) => (i + 1) % SONGS.length)
    }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('durationchange', onDuration)
    audio.addEventListener('loadedmetadata', onDuration)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('durationchange', onDuration)
      audio.removeEventListener('loadedmetadata', onDuration)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])


  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div style={{ width: '290px', userSelect: 'none', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', fontFamily: MAC_LIGHT_FONT_STACK }}>
      {/* Title bar */}
      <div onMouseDown={onTitleBarMouseDown} style={{ background: 'linear-gradient(180deg,#e8e8e8 0%,#d0d0d0 100%)', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #b0b0b0', cursor: onTitleBarMouseDown ? 'grab' : 'default', userSelect: 'none' }}>
        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57', border: '0.5px solid #e0443e', display: 'inline-block' }} />
        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e', border: '0.5px solid #d4a017', display: 'inline-block' }} />
        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840', border: '0.5px solid #1aab29', display: 'inline-block' }} />
        <span style={{ flex: 1, textAlign: 'center', fontSize: '11px', fontWeight: 500, color: '#333', marginRight: '30px' }}>Tiny Player</span>
      </div>

      {/* Body */}
      <div style={{ background: '#f5f5f5', padding: '8px 10px 6px' }}>
        <div style={{ fontWeight: 700, fontSize: '12px', color: '#1a1a1a', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textAlign: 'center' }}>{song.title}</div>
        <div style={{ fontWeight: 300, fontSize: '11px', color: '#666', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textAlign: 'center', marginTop: '1px' }}>{song.artist}</div>

        {/* Transport buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', margin: '7px 0 6px' }}>
          <button type="button" aria-label="Previous" onClick={prevSong} style={{ background: 'none', border: 'none', padding: 0, fontSize: '16px', color: '#333', lineHeight: 1 }}>⏮</button>
          <button type="button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} style={{ background: 'none', border: 'none', padding: 0, fontSize: '18px', color: '#333', lineHeight: 1 }}>{isPlaying ? '⏸' : '▶'}</button>
          <button type="button" aria-label="Next" onClick={nextSong} style={{ background: 'none', border: 'none', padding: 0, fontSize: '16px', color: '#333', lineHeight: 1 }}>⏭</button>
        </div>

        {/* Seek bar */}
        <div
          onClick={handleSeek}
          style={{ position: 'relative', height: '6px', background: '#ccc', borderRadius: '3px', margin: '0 2px 4px', cursor: 'pointer' }}
        >
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: '#4a90d9', borderRadius: '3px' }} />
          <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%,-50%)', width: '10px', height: '10px', borderRadius: '50%', background: '#fff', border: '1.5px solid #4a90d9', pointerEvents: 'none' }} />
        </div>

        {/* Time display */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888', padding: '0 2px' }}>
          <span>{fmt(currentTime)}</span>
          <span>{fmtNeg(currentTime, duration)}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#e0e0e0', borderTop: '1px solid #c0c0c0', padding: '3px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#888' }}>
        <span>320kbps</span>
        <span>{currentIndex + 1} / {SONGS.length}</span>
      </div>

      <audio ref={audioRef} />
    </div>
  )
}

function AboutPage({ onBackHome, onOpenFolder }) {
  const editorContentRef = useRef(null)
  const [editorScrollbar, setEditorScrollbar] = useState({ top: 0, height: 100, enabled: false })
  const rightStageRef = useRef(null)

  const folderArcLayout = [
    { id: 'performance', left: '15%', top: '60%' },
    { id: 'writing', left: '30%', top: '34%' },
    { id: 'press', left: '52%', top: '22%' },
    { id: 'filmmaking', left: '73%', top: '40%' },
    { id: 'cv', left: '89%', top: '63%' },
  ]
  const [folderPositions, setFolderPositions] = useState(
    () => new Map(folderArcLayout.map((p) => [p.id, { left: p.left, top: p.top }]))
  )
  const rightStageWidth = 'min(88.8vw, 1344px)'

  const [aboutWinPos, setAboutWinPos] = useState({ x: 24, y: 137 })
  const aboutWinPosRef = useRef(aboutWinPos)
  aboutWinPosRef.current = aboutWinPos

  const [playerPos, setPlayerPos] = useState(() => ({
    x: 24,
    y: typeof window !== 'undefined' ? window.innerHeight - 200 : 400,
  }))
  const playerPosRef = useRef(playerPos)
  playerPosRef.current = playerPos

  const makeTitleBarDrag = useCallback((posRef, setPos) => (e) => {
    if (e.button !== 0) return
    e.preventDefault()
    const startMx = e.clientX
    const startMy = e.clientY
    const startPx = posRef.current.x
    const startPy = posRef.current.y
    const onMove = (me) => setPos({ x: startPx + me.clientX - startMx, y: startPy + me.clientY - startMy })
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const startFolderDrag = useCallback((folderId, e, onClickCb) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const container = rightStageRef.current
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const el = e.currentTarget
    const elRect = el.getBoundingClientRect()
    const startPx = elRect.left + elRect.width / 2 - containerRect.left
    const startPy = elRect.top + elRect.height / 2 - containerRect.top
    const startMx = e.clientX
    const startMy = e.clientY
    let moved = false
    const onMove = (me) => {
      const dx = me.clientX - startMx
      const dy = me.clientY - startMy
      if (!moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      moved = true
      setFolderPositions((prev) => {
        const next = new Map(prev)
        next.set(folderId, { left: startPx + dx, top: startPy + dy, isPx: true })
        return next
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (!moved) onClickCb()
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const updateEditorScrollbar = useCallback(() => {
    const editorContent = editorContentRef.current
    if (!editorContent) return

    const { scrollTop, scrollHeight, clientHeight } = editorContent
    const maxScroll = Math.max(scrollHeight - clientHeight, 0)

    const next = maxScroll > 0
      ? {
          top: (scrollTop / maxScroll) * (100 - Math.max((clientHeight / scrollHeight) * 100, 12)),
          height: Math.max((clientHeight / scrollHeight) * 100, 12),
          enabled: true,
        }
      : {
          top: 0,
          height: 100,
          enabled: false,
        }

    setEditorScrollbar((prev) => {
      if (
        Math.abs(prev.top - next.top) < 0.2 &&
        Math.abs(prev.height - next.height) < 0.2 &&
        prev.enabled === next.enabled
      ) {
        return prev
      }
      return next
    })
  }, [])

  useEffect(() => {
    const el = editorContentRef.current
    if (el && !el.innerHTML) el.innerHTML = DEFAULT_ABOUT_HTML
    if (typeof window === 'undefined') return undefined
    const frame = window.requestAnimationFrame(updateEditorScrollbar)
    return () => window.cancelAnimationFrame(frame)
  }, [updateEditorScrollbar])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onResize = () => updateEditorScrollbar()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [updateEditorScrollbar])

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
      {/* ── Welcome gif (static) ── */}
      <div style={{ position: 'absolute', left: '24px', top: '64px', zIndex: 21, pointerEvents: 'none' }}>
        <img
          src="assets/welcome.webp"
          alt="welcome to my page"
          style={{ width: '160px', maxWidth: 'min(22vw, 290px)', height: 'auto', objectFit: 'contain' }}
        />
      </div>

      {/* ── About window (draggable) ── */}
      <div
        style={{
          position: 'fixed',
          left: aboutWinPos.x,
          top: aboutWinPos.y,
          zIndex: 21,
          width: 'min(22vw, 290px)',
        }}
        onClick={(event) => event.stopPropagation()}
      >

        <div
          style={{
            width: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            fontFamily: MAC_LIGHT_FONT_STACK,
          }}
        >
          {/* Title bar */}
          <div
            onMouseDown={makeTitleBarDrag(aboutWinPosRef, setAboutWinPos)}
            style={{ background: 'linear-gradient(180deg,#e8e8e8 0%,#d0d0d0 100%)', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #b0b0b0', cursor: 'grab', userSelect: 'none' }}
          >
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57', border: '0.5px solid #e0443e', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e', border: '0.5px solid #d4a017', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840', border: '0.5px solid #1aab29', display: 'inline-block' }} />
            <span style={{ flex: 1, textAlign: 'center', fontSize: '11px', fontWeight: 500, color: '#333', marginRight: '30px' }}>About</span>
          </div>

          {/* Body */}
          <div style={{ background: '#f5f5f5', position: 'relative', height: '300px' }}>
            <div
              ref={editorContentRef}
              className="classic-textedit-scroll"
              contentEditable
              suppressContentEditableWarning
              onInput={updateEditorScrollbar}
              onScroll={updateEditorScrollbar}
              onClick={(event) => {
                const anchor = event.target.closest?.('a')
                if (!anchor) return
                event.preventDefault()
                event.stopPropagation()
                window.open(anchor.href, '_blank', 'noopener,noreferrer')
              }}
              style={{
                position: 'absolute',
                inset: 0,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: '#1a1a1a',
                fontFamily: MAC_LIGHT_FONT_STACK,
                fontSize: '13px',
                fontWeight: 300,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                overflowX: 'hidden',
                overflowY: 'auto',
                padding: '8px 22px 8px 10px',
                boxSizing: 'border-box',
              }}
            />

            <div
              style={{
                position: 'absolute',
                top: '2px',
                bottom: '2px',
                right: '3px',
                width: '14px',
                pointerEvents: 'none',
                opacity: editorScrollbar.enabled ? 1 : 0.55,
              }}
            >
              <img
                src="assets/nana_scroll.png"
                alt=""
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: `${editorScrollbar.top}%`,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '14px',
                  height: `${editorScrollbar.height}%`,
                  objectFit: 'fill',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Safety pin (between left col and right stage) ── */}
      <div style={{ position: 'absolute', left: 'min(25vw, 330px)', top: '36%', zIndex: 20, pointerEvents: 'none' }}>
        <img
          src="assets/safety-pin.gif"
          alt=""
          aria-hidden="true"
          style={{ width: '56px', height: 'auto', objectFit: 'contain' }}
        />
      </div>

      {/* ── Radio gif (static) ── */}
      <div style={{ position: 'absolute', left: '24px', bottom: '247px', zIndex: 21, pointerEvents: 'none', width: 'min(22vw, 290px)', display: 'flex', justifyContent: 'center' }}>
        <img src="assets/radio.gif" alt="" aria-hidden="true" style={{ width: '48px', height: 'auto', objectFit: 'contain' }} />
      </div>

      {/* ── Player (draggable) ── */}
      <div
        style={{
          position: 'fixed',
          left: playerPos.x,
          top: playerPos.y,
          zIndex: 21,
          width: 'min(22vw, 290px)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <TinyPlayer onTitleBarMouseDown={makeTitleBarDrag(playerPosRef, setPlayerPos)} />
      </div>

      {/* ── Right stage ── */}
      <div
        ref={rightStageRef}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: rightStageWidth,
          height: '100%',
          zIndex: 8,
        }}
      >
        {/* Browser tabs */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100%',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <img
            src="assets/nana_tabs.png"
            alt="nana tabs"
            style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
          />
        </div>

        {/* Title banner + subtitle */}
        <div
          style={{
            position: 'absolute',
            top: '88px',
            left: '2%',
            right: '8%',
            zIndex: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '3px',
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src="assets/zodiac.gif"
              alt=""
              aria-hidden="true"
              style={{ width: '40px', height: 'auto', objectFit: 'contain' }}
            />
            <img
              src="assets/shelestvetrovki-glitter.gif"
              alt="shelestvetrovki"
              style={{ width: 'min(280px, 40%)', height: 'auto', objectFit: 'contain' }}
            />
            <img
              src="assets/7ADo.gif"
              alt=""
              aria-hidden="true"
              style={{ width: '40px', height: 'auto', objectFit: 'contain' }}
            />
          </div>
          <span
            style={{
              fontFamily: MAC_LIGHT_FONT_STACK,
              fontSize: '12px',
              fontWeight: 300,
              color: '#444',
              letterSpacing: '0.01em',
            }}
          >
            Anastasiia Pishchanska b.2000
          </span>
        </div>

        {/* Home button */}
        <div
          style={{
            position: 'absolute',
            top: '80px',
            right: '16px',
            zIndex: 22,
            width: '100px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
          }}
        >
          <a
            href={HOME_HASH}
            style={{
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              width: '100%',
            }}
          >
            <img
              src="assets/house.gif"
              alt="back home"
              style={{ width: '64px', height: 'auto', objectFit: 'contain' }}
            />
            <span
              style={{
                fontFamily: MAC_LIGHT_FONT_STACK,
                fontSize: '11px',
                fontWeight: 300,
                color: '#333',
                textAlign: 'center',
                display: 'block',
                width: '100%',
              }}
            >
              home
            </span>
          </a>
        </div>

        {/* Knock knock button */}
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('knock knock')}`}
          style={{
            position: 'absolute',
            right: '16px',
            bottom: '16px',
            zIndex: 22,
            width: '100px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <img
            src="assets/envelope.gif"
            alt="knock knock"
            style={{ width: '56px', height: 'auto', objectFit: 'contain' }}
          />
          <img
            src="assets/knock-knock.gif"
            alt="knock knock"
            style={{ width: '100px', height: 'auto', objectFit: 'contain' }}
          />
        </a>

        {/* Folders */}
        {folderArcLayout.map((placement) => {
          const folder = FOLDER_MAP.get(placement.id)
          if (!folder) return null
          const pos = folderPositions.get(folder.id) ?? placement
          const posLeft = pos.isPx ? `${pos.left}px` : pos.left
          const posTop = pos.isPx ? `${pos.top}px` : pos.top

          return (
            <button
              key={folder.id}
              type="button"
              onMouseDown={(e) => startFolderDrag(folder.id, e, () => onOpenFolder(folder.id))}
              style={{
                position: 'absolute',
                left: posLeft,
                top: posTop,
                transform: 'translate(-50%, -50%)',
                zIndex: 25,
                border: '1px solid transparent',
                background: 'transparent',
                borderRadius: '3px',
                padding: '6px 8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
                width: '92px',
                cursor: 'grab',
                userSelect: 'none',
              }}
            >
              <img
                src="assets/folder-icon-macos.webp"
                alt={`${folder.label} folder`}
                style={{ width: '68px', height: '56px', objectFit: 'contain' }}
              />
              <span
                style={{
                  fontFamily: MAC_LIGHT_FONT_STACK,
                  fontSize: '13px',
                  fontWeight: 300,
                  color: '#111',
                  textAlign: 'center',
                  lineHeight: 1.1,
                }}
              >
                {folder.label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FolderPage({ folder, onBackToAbout }) {
  const [isOpen, setIsOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [enlarged, setEnlarged] = useState(false)
  const [dotsHovered, setDotsHovered] = useState(false)
  const [pos, setPos] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 - 230 : 200,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 - 200 : 150,
  }))
  const posRef = useRef(pos)
  posRef.current = pos

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsOpen(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  const onTitleBarMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    e.preventDefault()
    const startMx = e.clientX
    const startMy = e.clientY
    const startPx = posRef.current.x
    const startPy = posRef.current.y
    const onMove = (me) => setPos({ x: startPx + me.clientX - startMx, y: startPy + me.clientY - startMy })
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: enlarged ? 'min(820px, 92vw)' : '460px',
        maxWidth: '92vw',
        maxHeight: minimized ? 'none' : (enlarged ? '88vh' : '72vh'),
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
        fontFamily: MAC_LIGHT_FONT_STACK,
        display: 'flex',
        flexDirection: 'column',
        transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(12px)',
        opacity: isOpen ? 1 : 0,
        transition: 'transform 280ms ease, opacity 280ms ease, width 220ms ease, max-height 220ms ease',
        pointerEvents: 'auto',
      }}
    >
      {/* Title bar */}
      <div
        onMouseDown={onTitleBarMouseDown}
        style={{ background: 'linear-gradient(180deg,#e8e8e8 0%,#d0d0d0 100%)', padding: '5px 8px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #b0b0b0', flexShrink: 0, cursor: 'grab', userSelect: 'none' }}
      >
        <span
          onMouseEnter={() => setDotsHovered(true)}
          onMouseLeave={() => setDotsHovered(false)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span
            role="button"
            tabIndex={0}
            onClick={onBackToAbout}
            onKeyDown={(e) => e.key === 'Enter' && onBackToAbout()}
            style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57', border: '0.5px solid #e0443e', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '9px', color: '#7a0c00', fontWeight: 900, lineHeight: 1 }}
          >{dotsHovered ? '×' : ''}</span>
          <span
            role="button"
            tabIndex={0}
            onClick={() => setMinimized((m) => !m)}
            onKeyDown={(e) => e.key === 'Enter' && setMinimized((m) => !m)}
            style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e', border: '0.5px solid #d4a017', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '9px', color: '#7a4800', fontWeight: 900, lineHeight: 1 }}
          >{dotsHovered ? '−' : ''}</span>
          <span
            role="button"
            tabIndex={0}
            onClick={() => setEnlarged((z) => !z)}
            onKeyDown={(e) => e.key === 'Enter' && setEnlarged((z) => !z)}
            style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840', border: '0.5px solid #1aab29', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px', color: '#0a4a0a', fontWeight: 900, lineHeight: 1 }}
          >{dotsHovered ? (enlarged ? '⤡' : '⤢') : ''}</span>
        </span>
        <span style={{ flex: 1, textAlign: 'center', fontSize: '11px', fontWeight: 500, color: '#333', marginRight: '30px' }}>{folder.title}</span>
      </div>

      {/* Body */}
      <div style={{ background: '#f5f5f5', overflowY: 'auto', flex: 1, padding: '14px 16px', display: minimized ? 'none' : undefined }}>
        {folder.bio && (
          <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #ddd' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', letterSpacing: '0.05em', marginBottom: '4px' }}>{folder.bio.name}</div>
            <div style={{ fontSize: '11px', fontWeight: 300, color: '#555', lineHeight: 1.5 }}>{folder.bio.born}</div>
            <div style={{ fontSize: '11px', fontWeight: 300, color: '#555', lineHeight: 1.5 }}>{folder.bio.lives}</div>
          </div>
        )}
        {folder.sections.map((section) => (
          <div key={section.heading} style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#888', letterSpacing: '0.08em', marginBottom: '8px', borderBottom: '1px solid #ddd', paddingBottom: '3px' }}>
              {section.heading}
            </div>
            {section.entries && section.entries.map((entry, i) => (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '76px 1fr', gap: '6px', marginBottom: '5px' }}>
                <div style={{ fontSize: '11px', fontWeight: 300, color: '#888', lineHeight: 1.4 }}>{entry.year}</div>
                <div style={{ fontSize: '11px', fontWeight: 300, color: '#1a1a1a', lineHeight: 1.4 }}>{entry.item}</div>
              </div>
            ))}
            {section.links && section.links.map((link) => (
              <div key={link.url} style={{ marginBottom: '5px' }}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: '11px', fontWeight: 300, color: '#4a90d9', textDecoration: 'none', lineHeight: 1.6 }}
                >
                  {link.label}
                </a>
              </div>
            ))}
          </div>
        ))}
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
    return (
      <>
        <AboutPage onBackHome={closeAbout} onOpenFolder={openFolder} />
        {folder && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none' }}>
            <FolderPage folder={folder} onBackToAbout={closeFolder} />
          </div>
        )}
      </>
    )
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
          fontFamily: MAC_LIGHT_FONT_STACK,
          fontSize: '18px',
          fontWeight: 300,
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

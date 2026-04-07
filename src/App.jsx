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
const ROOM_CAMERA_POSITIONS = [
  [0.096, 0.513, 0.403],
  [0, 0, 10],
  [0, 0, 10],
  [0, 0, 10],
]
const ROOM_FILES = [
  'YUNA WEB.glb',
  'SUZUNE WEB.glb',
  'AIKO WEB.glb',
  'MOENE WEB.glb',
]
const CONTACT_EMAIL = 'shelestvetrovki@gmail.com'
const HOME_TITLE = 'shelestvetrovki'
const PREVIEW_FILENAME = 'shelestvetrovki.mp4'
const HOME_HASH = '#home'
const HOME_EDITOR_HASH = '#home-editor'
const HOME_EDITOR_ENABLED = false
const ABOUT_HASH = '#about'
const ROOM_HASH_PREFIX = 'room-'
const FOLDER_HASH_PREFIX = 'folder-'
const MAC_LIGHT_FONT_STACK = "'Helvetica', Arial, sans-serif"
const ARIAL_FONT_STACK = 'Arial, Helvetica, sans-serif'
const HOME_PREVIEW_VIDEO = 'assets/shelestvetrovki-scan-web.mp4'
const HOME_WELCOME_GIF = 'assets/home-welcome.gif'
const NEXT_DOOR_GIF = 'assets/next-door.gif'
const GO_BACK_GIF = 'assets/go-back.gif'
const ABOUT_HOME_GIF = new URL('../target/gifs/navigation buttons/home.gif', import.meta.url).href
const CURSOR_TRAIL_GIFS = [
  new URL('../target/cursor/sparkle_a.gif', import.meta.url).href,
  new URL('../target/cursor/sparkle_b.gif', import.meta.url).href,
  new URL('../target/cursor/sparkle_c.gif', import.meta.url).href,
  new URL('../target/cursor/sparkle_d.gif', import.meta.url).href,
  new URL('../target/cursor/sparkle_e.gif', import.meta.url).href,
  new URL('../target/cursor/sparkle_f.gif', import.meta.url).href,
  new URL('../target/cursor/sparkle_g.gif', import.meta.url).href,
  new URL('../target/cursor/sparkle_h.gif', import.meta.url).href,
]
const CURSOR_CLICK_GIF = new URL('../target/cursor/sparkle_click.gif', import.meta.url).href
const MAIN_KEY_CURSOR_URL = new URL('../target/keys/key_main.ani', import.meta.url).href
const ROOM_KEY_CURSOR_URLS = [
  new URL('../target/keys/key_christalhearts1.ani', import.meta.url).href,
  new URL('../target/keys/key_christalhearts2.ani', import.meta.url).href,
  new URL('../target/keys/key_link.ani', import.meta.url).href,
  new URL('../target/keys/key_working.ani', import.meta.url).href,
]
const MAIN_KEY_CURSOR_FALLBACK_URL = new URL('../target/magic-key/alternate magic key.cur', import.meta.url).href
const ROOM_KEY_CURSOR_FALLBACKS = [
  new URL('../target/magic-key/Crystal heart.cur', import.meta.url).href,
  new URL('../target/magic-key/Locked heart.cur', import.meta.url).href,
  new URL('../target/magic-key/Gold cross.cur', import.meta.url).href,
  new URL('../target/magic-key/Help magic key.cur', import.meta.url).href,
]
const CURSOR_TRAIL_LIFETIME_MS = 850
const CURSOR_CLICK_LIFETIME_MS = 700
const CURSOR_TRAIL_MIN_DISTANCE = 14
const CURSOR_TRAIL_MIN_INTERVAL_MS = 24
const HOME_HEADER_TOP = 24
const PREVIEW_WINDOW_TOP = 190
const KEY_CURSOR_HOTSPOT = '11 0'
const HOME_EDITOR_STORAGE_KEY = 'nana-home-editor-state'
const DEFAULT_ABOUT_HTML = `Anastasiia Pishchanska is a Ukrainian-born, Tokyo-based artist, filmmaker, and art director. She is the co-founder of the established Ukrainian art print publication localstickerbook (<a href="https://localgr0up.com/" target="_blank" rel="noreferrer">local.group</a>), which curates exhibitions, events, and fundraisers worldwide, presenting contemporary artists through the lens of post-internet culture. In 2023, following the full-scale invasion of Ukraine, she was awarded a research scholarship at...

<br><br>Her practice moves between moving image, installation, and art direction, focusing on digital memory, migration, and cultural identity.`
const ABOUT_BASE_URL = 'http://shelestvetrovki.com/'
const ABOUT_BROWSER_TABS = [
  { id: 'about', label: 'About', address: `${ABOUT_BASE_URL}about`, kind: 'about' },
  { id: 'works', label: 'Works', address: `${ABOUT_BASE_URL}works`, kind: 'works' },
  { id: 'writing', label: 'Writing', address: `${ABOUT_BASE_URL}writing`, kind: 'folder', folderId: 'writing' },
  { id: 'press', label: 'Press', address: `${ABOUT_BASE_URL}press`, kind: 'folder', folderId: 'press' },
  { id: 'films', label: 'Films', address: `${ABOUT_BASE_URL}filmmaking`, kind: 'folder', folderId: 'filmmaking' },
  { id: 'cv', label: 'CV', address: `${ABOUT_BASE_URL}cv`, kind: 'folder', folderId: 'cv' },
]

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

function buildCursorValue(cursorUrl, fallback = 'auto', fallbackCursorUrl) {
  const cursorStack = [`url("${cursorUrl}") ${KEY_CURSOR_HOTSPOT}`]

  if (fallbackCursorUrl) {
    cursorStack.push(`url("${fallbackCursorUrl}") ${KEY_CURSOR_HOTSPOT}`)
  }

  cursorStack.push(fallback)
  return cursorStack.join(', ')
}

const MAIN_KEY_CURSOR = buildCursorValue(MAIN_KEY_CURSOR_URL, 'auto', MAIN_KEY_CURSOR_FALLBACK_URL)

const DOOR_LINKS = [
  {
    id: 'door4-inner',
    label: 'Door 4 Inner',
    roomIndex: 3,
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[3], 'pointer', ROOM_KEY_CURSOR_FALLBACKS[3]),
    corners: [
      [0.053, 0.121, -0.081],
      [-0.024, 0.118, -0.083],
      [-0.022, 0.003, -0.083],
      [0.049, 0.003, -0.082],
    ],
  },
  {
    id: 'door4-door',
    label: 'Door 4 Door',
    roomIndex: 3,
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[3], 'pointer', ROOM_KEY_CURSOR_FALLBACKS[3]),
    corners: [
      [0.033, 0.126, -0.133],
      [-0.024, 0.118, -0.083],
      [-0.022, 0.003, -0.083],
      [0.028, 0.003, -0.133],
    ],
  },
  {
    id: 'door3-inner',
    label: 'Door 3 Inner',
    roomIndex: 2,
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[2], 'pointer', ROOM_KEY_CURSOR_FALLBACKS[2]),
    corners: [
      [0.099, 0.131, 0.056],
      [0.102, 0.134, -0.02],
      [0.103, 0.002, -0.016],
      [0.106, 0.006, 0.053],
    ],
  },
  {
    id: 'door3-door',
    label: 'Door 3 Door',
    roomIndex: 2,
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[2], 'pointer', ROOM_KEY_CURSOR_FALLBACKS[2]),
    corners: [
      [0.15, 0.131, 0.031],
      [0.101, 0.134, -0.02],
      [0.103, 0.002, -0.016],
      [0.154, 0.006, 0.03],
    ],
  },
  {
    id: 'door2-inner',
    label: 'Door 2 Inner',
    roomIndex: 1,
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[1], 'pointer', ROOM_KEY_CURSOR_FALLBACKS[1]),
    corners: [
      [-0.103, 0.128, 0.108],
      [-0.032, 0.13, 0.11],
      [-0.034, 0.006, 0.113],
      [-0.104, 0.006, 0.106],
    ],
  },
  {
    id: 'door2-door',
    label: 'Door 2 Door',
    roomIndex: 1,
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[1], 'pointer', ROOM_KEY_CURSOR_FALLBACKS[1]),
    corners: [
      [-0.084, 0.128, 0.161],
      [-0.032, 0.13, 0.11],
      [-0.034, 0.006, 0.113],
      [-0.084, 0.006, 0.161],
    ],
  },
  {
    id: 'door1-inner',
    label: 'Door 1 Inner',
    roomIndex: 0,
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[0], 'pointer', ROOM_KEY_CURSOR_FALLBACKS[0]),
    corners: [
      [-0.126, 0.132, -0.027],
      [-0.131, 0.132, 0.046],
      [-0.138, 0.005, 0.047],
      [-0.133, 0.004, -0.025],
    ],
  },
  {
    id: 'door1-door',
    label: 'Door 1 Door',
    roomIndex: 0,
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[0], 'pointer', ROOM_KEY_CURSOR_FALLBACKS[0]),
    corners: [
      [-0.162, 0.132, -0.019],
      [-0.131, 0.132, 0.046],
      [-0.138, 0.005, 0.047],
      [-0.166, 0.004, -0.018],
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
  if (HOME_EDITOR_ENABLED && normalized === 'home-editor') {
    return { type: 'home-editor' }
  }

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

function LoadingCursor() {
  const { gl } = useThree()
  useEffect(() => {
    const el = gl.domElement
    el.classList.add('cursor-working')
    return () => el.classList.remove('cursor-working')
  }, [gl])
  return null
}

function navigateWithHash(nextHash) {
  if (typeof window === 'undefined') return
  if (window.location.hash === nextHash) return
  window.location.hash = nextHash
}

function getAboutAddress(folderId, tabId = 'about') {
  if (folderId && FOLDER_MAP.has(folderId)) {
    return `${ABOUT_BASE_URL}${folderId}`
  }

  const tab = ABOUT_BROWSER_TABS.find((item) => item.id === tabId)
  return tab?.address ?? ABOUT_BROWSER_TABS[0].address
}

function getAboutTabId(folderId) {
  if (!folderId) return 'about'
  if (folderId === 'filmmaking') return 'films'
  if (ABOUT_BROWSER_TABS.some((tab) => tab.id === folderId)) return folderId
  return 'works'
}

function AboutBrowserChrome({ activeTabId, addressValue, onSelectTab }) {
  return (
    <div
      style={{
        width: '100%',
        padding: '6px 10px 8px',
        background: 'linear-gradient(180deg, #efefef 0%, #cfcfcf 58%, #bcbcbc 100%)',
        borderBottom: '1px solid #8f8f8f',
        boxSizing: 'border-box',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', overflow: 'hidden' }}>
        {ABOUT_BROWSER_TABS.map((tab) => {
          const isActive = tab.id === activeTabId

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab)}
              style={{
                border: '1px solid #7f7f7f',
                borderBottom: isActive ? '1px solid #e9e9e9' : '1px solid #707070',
                borderTopLeftRadius: '6px',
                borderTopRightRadius: '6px',
                background: isActive
                  ? 'linear-gradient(180deg, #fdfdfd 0%, #ebebeb 100%)'
                  : 'linear-gradient(180deg, #c8c8c8 0%, #a9a9a9 100%)',
                boxShadow: isActive
                  ? 'inset 0 1px 0 rgba(255,255,255,0.95)'
                  : 'inset 0 1px 0 rgba(255,255,255,0.45)',
                color: '#222',
                padding: '4px 10px 5px',
                fontFamily: MAC_LIGHT_FONT_STACK,
                fontSize: '11px',
                fontWeight: 400,
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      <div
        style={{
          marginTop: '-1px',
          border: '1px solid #8c8c8c',
          background: 'linear-gradient(180deg, #f8f8f8 0%, #d8d8d8 100%)',
          padding: '5px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {['<', '>', 'R'].map((symbol, index) => (
            <span
              key={`${symbol}-${index}`}
              aria-hidden="true"
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '1px solid #8e8e8e',
                background: 'linear-gradient(180deg, #fbfbfb 0%, #cfcfcf 100%)',
                color: '#666',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                lineHeight: 1,
              }}
            >
              {symbol}
            </span>
          ))}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            border: '1px solid #949494',
            borderRadius: '12px',
            background: '#fff',
            padding: '3px 10px',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.12)',
          }}
        >
          <span
            style={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontFamily: ARIAL_FONT_STACK,
              fontSize: '12px',
              color: '#333',
            }}
          >
            {addressValue}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <span
            aria-hidden="true"
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              border: '1px solid #919191',
              background: 'linear-gradient(180deg, #fafafa 0%, #cecece 100%)',
            }}
          />
          <span
            aria-hidden="true"
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              border: '1px solid #919191',
              background: 'linear-gradient(180deg, #fafafa 0%, #cecece 100%)',
            }}
          />
        </div>
      </div>
    </div>
  )
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

function EditorControls() {
  return (
    <OrbitControls
      makeDefault
      rotateSpeed={0.4}
      zoomSpeed={1}
      panSpeed={0.4}
      enableDamping
      dampingFactor={0.05}
    />
  )
}

function HomeScene({ onModelLoaded, onOpenRoom }) {
  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas shadows camera={{ position: LANDING_CAMERA_POSITION, fov: 47.5 }} style={{ cursor: 'inherit' }}>
        <color attach="background" args={['#fff']} />
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.5} contactShadows={{ opacity: 0.7, blur: 2 }} adjustCamera={false}>
            <Model url="assets/home.glb" onLoaded={onModelLoaded}>
              <DoorLinks doors={DOOR_LINKS} onOpenRoom={onOpenRoom} />
            </Model>
          </Stage>
          <Controls />
          <CameraReset position={LANDING_CAMERA_POSITION} />
        </Suspense>
      </Canvas>
    </KeyboardControls>
  )
}

function buildCornerPreviewGeometry(corners) {
  if (!Array.isArray(corners) || corners.length !== 4 || corners.some((corner) => !corner)) return null

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
}

function buildCornerLoopGeometry(corners) {
  if (!Array.isArray(corners) || corners.some((corner) => !corner)) return null

  const ordered = [...corners, corners[0]].flat()
  const next = new THREE.BufferGeometry()
  next.setAttribute('position', new THREE.Float32BufferAttribute(ordered, 3))
  return next
}

function CornerPreview({ corners, activeCornerIndex }) {
  const meshGeometry = useMemo(() => buildCornerPreviewGeometry(corners), [corners])
  const lineGeometry = useMemo(() => buildCornerLoopGeometry(corners), [corners])

  useEffect(() => () => meshGeometry?.dispose(), [meshGeometry])
  useEffect(() => () => lineGeometry?.dispose(), [lineGeometry])

  return (
    <group>
      {meshGeometry ? (
        <mesh geometry={meshGeometry} renderOrder={900}>
          <meshBasicMaterial
            color="#ff6b6b"
            transparent
            opacity={0.22}
            side={THREE.DoubleSide}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      ) : null}

      {lineGeometry ? (
        <line geometry={lineGeometry} renderOrder={901}>
          <lineBasicMaterial color="#ff6b6b" transparent opacity={0.95} depthTest={false} />
        </line>
      ) : null}

      {corners.map((corner, index) => {
        if (!corner) return null

        return (
          <mesh key={`corner-preview-${index}`} position={corner} renderOrder={902}>
            <sphereGeometry args={[activeCornerIndex === index ? 0.009 : 0.007, 24, 24]} />
            <meshBasicMaterial color={activeCornerIndex === index ? '#ffffff' : '#ff6b6b'} depthTest={false} />
          </mesh>
        )
      })}
    </group>
  )
}

function HomeEditorScene({ corners, activeCornerIndex, onPickPoint }) {
  return (
    <Canvas shadows camera={{ position: LANDING_CAMERA_POSITION, fov: 47.5 }} style={{ cursor: 'crosshair' }}>
      <color attach="background" args={['#fff']} />
      <Suspense fallback={null}>
        <Stage environment="city" intensity={0.5} contactShadows={{ opacity: 0.7, blur: 2 }} adjustCamera={false}>
          <group
            onClick={(event) => {
              if (activeCornerIndex == null) return
              event.stopPropagation()
              onPickPoint([event.point.x, event.point.y, event.point.z])
            }}
          >
            <Model url="assets/home.glb">
              <CornerPreview corners={corners} activeCornerIndex={activeCornerIndex} />
            </Model>
          </group>
        </Stage>
        <EditorControls />
        <CameraReset position={LANDING_CAMERA_POSITION} />
      </Suspense>
    </Canvas>
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

  const applyDoorCursor = (event, cursorValue) => {
    const target = event?.nativeEvent?.target
    if (target?.style) target.style.cursor = cursorValue
  }

  return (
    <mesh
      geometry={geometry}
      renderOrder={1000}
      onPointerOver={(event) => {
        event.stopPropagation()
        applyDoorCursor(event, door.cursor || MAIN_KEY_CURSOR)
      }}
      onPointerOut={(event) => {
        applyDoorCursor(event, 'inherit')
      }}
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

function RoomPage({ roomNumber, roomFile, cameraPosition, onBack, onOpenNextRoom }) {
  const [camInfo, setCamInfo] = useState({ position: cameraPosition, target: [0, 0, 0] })
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
          bottom: '48px',
          left: '24px',
          border: 'none',
          background: 'transparent',
          padding: 0,
          zIndex: 20,
          cursor: 'inherit',
        }}
        aria-label="Go back to house view"
      >
        <img
          src={GO_BACK_GIF}
          alt="Go back"
          style={{ width: 'min(55px, 9vw)', height: 'auto', display: 'block', objectFit: 'contain' }}
        />
      </button>

      <KeyboardControls map={keyboardMap}>
        <Canvas shadows camera={{ position: cameraPosition, fov: 47.5 }} style={{ cursor: 'inherit' }} gl={{ toneMapping: THREE.NoToneMapping }}>
          <color attach="background" args={['#fff']} />
          <Suspense fallback={<LoadingCursor />}>
            <Stage environment="studio" intensity={0.6} contactShadows={{ opacity: 0.7, blur: 2 }} adjustCamera={false}>
              <Model url={`rooms/${roomFile}`} />
            </Stage>
            <Controls />
            <CameraReset position={cameraPosition} />
            <CameraTracker onUpdate={handleCamUpdate} />
          </Suspense>
        </Canvas>
      </KeyboardControls>

      <div
        style={{
          position: 'absolute',
          top: '24px',
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

      <button
        type="button"
        onClick={onOpenNextRoom}
        aria-label={`Go to room ${roomNumber === ROOM_FILES.length ? 1 : roomNumber + 1}`}
        style={{
          position: 'absolute',
          bottom: '48px',
          right: '24px',
          zIndex: 20,
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'inherit',
        }}
      >
        <img
          src={NEXT_DOOR_GIF}
          alt="Go to the next door"
          style={{ width: 'min(55px, 9vw)', height: 'auto', display: 'block', objectFit: 'contain' }}
        />
      </button>
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
      <div onMouseDown={onTitleBarMouseDown} className={onTitleBarMouseDown ? 'cursor-grab' : ''} style={{ background: 'linear-gradient(180deg,#e8e8e8 0%,#d0d0d0 100%)', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #b0b0b0', userSelect: 'none' }}>
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '18px', margin: '9px 0 8px' }}>
          <button type="button" aria-label="Previous" onClick={prevSong} style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 0, fontSize: '16px', color: '#333', lineHeight: 1, cursor: 'pointer' }}>⏮</button>
          <button type="button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} style={{ width: '36px', height: '36px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 0, fontSize: '18px', color: '#333', lineHeight: 1, cursor: 'pointer' }}>{isPlaying ? '⏸' : '▶'}</button>
          <button type="button" aria-label="Next" onClick={nextSong} style={{ width: '32px', height: '32px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 0, fontSize: '16px', color: '#333', lineHeight: 1, cursor: 'pointer' }}>⏭</button>
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

function AboutPage({ onBackHome, onShowAbout, onOpenFolder, activeFolderId = null }) {
  const editorContentRef = useRef(null)
  const [editorScrollbar, setEditorScrollbar] = useState({ top: 0, height: 100, enabled: false })
  const rightStageRef = useRef(null)
  const [activeBrowserTab, setActiveBrowserTab] = useState(getAboutTabId(activeFolderId))
  const [browserAddress, setBrowserAddress] = useState(() => getAboutAddress(activeFolderId, getAboutTabId(activeFolderId)))

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
  const rightStageWidth = '100vw'

  const [aboutWinPos, setAboutWinPos] = useState({ x: 24, y: 168 })
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

  useEffect(() => {
    const nextTab = getAboutTabId(activeFolderId)
    setActiveBrowserTab(nextTab)
    setBrowserAddress(getAboutAddress(activeFolderId, nextTab))
  }, [activeFolderId])

  const handleBrowserTabSelect = useCallback((tab) => {
    setActiveBrowserTab(tab.id)
    setBrowserAddress(tab.address)

    if (tab.kind === 'about') {
      onShowAbout()
      return
    }

    if (tab.kind === 'folder' && tab.folderId) {
      onOpenFolder(tab.folderId)
    }
  }, [onOpenFolder, onShowAbout])

  const handleFolderOpen = useCallback((folderId) => {
    setActiveBrowserTab(getAboutTabId(folderId))
    setBrowserAddress(getAboutAddress(folderId, getAboutTabId(folderId)))
    onOpenFolder(folderId)
  }, [onOpenFolder])

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
      <div style={{ position: 'absolute', left: '24px', top: '96px', zIndex: 21, pointerEvents: 'none' }}>
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
            className="cursor-grab"
            style={{ background: 'linear-gradient(180deg,#e8e8e8 0%,#d0d0d0 100%)', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #b0b0b0', userSelect: 'none' }}
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
          }}
        >
          <AboutBrowserChrome
            activeTabId={activeBrowserTab}
            addressValue={browserAddress}
            onSelectTab={handleBrowserTabSelect}
          />
        </div>

        {/* Title banner + subtitle */}
        <div
          style={{
            position: 'absolute',
            top: '118px',
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
        </div>

        <button
          type="button"
          onClick={onBackHome}
          aria-label="Go back home"
          style={{
            position: 'absolute',
            top: '56px',
            right: '18px',
            zIndex: 13,
            border: 'none',
            background: 'transparent',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <img
            src={ABOUT_HOME_GIF}
            alt="home"
            style={{ width: '78px', height: 'auto', display: 'block', objectFit: 'contain' }}
          />
        </button>

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
              onMouseDown={(e) => startFolderDrag(folder.id, e, () => handleFolderOpen(folder.id))}
              className="cursor-grab"
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
                cursor: 'inherit',
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
        className="cursor-grab"
        style={{ background: 'linear-gradient(180deg,#e8e8e8 0%,#d0d0d0 100%)', padding: '5px 8px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #b0b0b0', flexShrink: 0, userSelect: 'none' }}
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

function ProjectPreviewWindow({ onClose }) {
  const videoRef = useRef(null)
  const [animateIn, setAnimateIn] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [windowPos, setWindowPos] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 - 492 : 120,
    y: PREVIEW_WINDOW_TOP,
  }))
  const windowPosRef = useRef(windowPos)
  windowPosRef.current = windowPos

  const startDrag = useCallback((event) => {
    if (event.button !== 0) return
    event.preventDefault()
    const startMx = event.clientX
    const startMy = event.clientY
    const startPx = windowPosRef.current.x
    const startPy = windowPosRef.current.y
    const onMove = (moveEvent) => {
      setWindowPos({
        x: startPx + moveEvent.clientX - startMx,
        y: startPy + moveEvent.clientY - startMy,
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => setAnimateIn(true))
    const video = videoRef.current
    if (video) {
      video.muted = false
      video.defaultMuted = false
      video.volume = 0.5
      video.loop = true
      video.currentTime = 0
      video.play().catch(() => {})
    }

    return () => window.cancelAnimationFrame(frameId)
  }, [])

  const handleToggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const nextMuted = !isMuted
    video.muted = nextMuted
    if (!nextMuted) video.volume = 0.5
    setIsMuted(nextMuted)
  }, [isMuted])

  return (
    <div
      style={{
        position: 'fixed',
        left: windowPos.x,
        top: windowPos.y,
        transform: animateIn ? 'scale(1)' : 'scale(0.94)',
        transformOrigin: 'top left',
        width: 'min(76.8vw, 984px)',
        aspectRatio: '16 / 10',
        maxHeight: '86.4vh',
        borderRadius: '28px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #f5f5f5 0%, #dddddd 100%)',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 36px 100px rgba(0,0,0,0.28), 0 12px 40px rgba(0,0,0,0.16)',
        opacity: animateIn ? 1 : 0,
        transition: 'transform 360ms ease, opacity 360ms ease',
        zIndex: 30,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          background: 'linear-gradient(180deg, #efefef 0%, #dbdbdb 100%)',
          userSelect: 'none',
          cursor: 'grab',
        }}
        onMouseDown={startDrag}
      >
        <button
          type="button"
          aria-label="Close preview"
          onClick={onClose}
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '999px',
            background: '#ff5f57',
            border: '1px solid #df4d43',
            padding: 0,
          }}
        />
        <span style={{ width: '12px', height: '12px', borderRadius: '999px', background: '#febc2e', border: '1px solid #d6a024' }} />
        <span style={{ width: '12px', height: '12px', borderRadius: '999px', background: '#28c840', border: '1px solid #1ea933' }} />
        <span style={{ flex: 1, textAlign: 'center', marginRight: '76px', fontFamily: MAC_LIGHT_FONT_STACK, fontSize: '12px', color: '#555' }}>
          {PREVIEW_FILENAME}
        </span>
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(100% - 49px)',
          background: '#050505',
        }}
      >
        <video
          ref={videoRef}
          src={HOME_PREVIEW_VIDEO}
          autoPlay
          muted
          playsInline
          loop
          preload="auto"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />

        <button
          type="button"
          onClick={handleToggleMute}
          style={{
            position: 'absolute',
            right: '18px',
            bottom: '18px',
            border: '1px solid rgba(255,255,255,0.22)',
            borderRadius: '999px',
            background: 'rgba(15,15,15,0.45)',
            backdropFilter: 'blur(8px)',
            color: 'rgba(255,255,255,0.92)',
            padding: '9px 14px',
            fontFamily: ARIAL_FONT_STACK,
            fontSize: '12px',
            fontWeight: 400,
            letterSpacing: '0.02em',
          }}
        >
          {isMuted ? 'unmute' : 'mute'}
        </button>

      </div>
    </div>
  )
}

function PreviewLauncher({ onOpen }) {
  const [iconPos, setIconPos] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 - 220 : 180,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 - 10 : 320,
  }))
  const iconPosRef = useRef(iconPos)
  iconPosRef.current = iconPos

  const startDrag = useCallback((event) => {
    if (event.button !== 0) return
    event.preventDefault()
    const startMx = event.clientX
    const startMy = event.clientY
    const startPx = iconPosRef.current.x
    const startPy = iconPosRef.current.y
    const onMove = (moveEvent) => {
      setIconPos({
        x: startPx + moveEvent.clientX - startMx,
        y: startPy + moveEvent.clientY - startMy,
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        position: 'absolute',
        left: `${iconPos.x}px`,
        top: `${iconPos.y}px`,
        border: 'none',
        background: 'transparent',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        width: '120px',
        cursor: 'pointer',
      }}
      onMouseDown={startDrag}
      onDragStart={(event) => event.preventDefault()}
    >
      <div
        style={{
          position: 'relative',
          width: '52px',
          height: '48px',
          imageRendering: 'pixelated',
          background: 'linear-gradient(180deg,#d8ebff 0%,#9ecbff 100%)',
          border: '1px solid #6e97c8',
          boxShadow: '2px 2px 0 rgba(0,0,0,0.14)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-1px',
            left: '6px',
            width: '18px',
            height: '8px',
            background: '#f4f8ff',
            border: '1px solid #6e97c8',
            borderBottom: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: '8px 6px 6px',
            background: '#eef6ff',
            border: '1px solid rgba(110,151,200,0.9)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-42%, -50%)',
              width: 0,
              height: 0,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderLeft: '13px solid #285a93',
            }}
          />
        </div>
      </div>
      <span
        style={{
          maxWidth: '120px',
          color: '#000',
          fontFamily: MAC_LIGHT_FONT_STACK,
          fontSize: '13px',
          fontWeight: 300,
          lineHeight: 1.15,
          textAlign: 'center',
          textShadow: '1px 1px 0 rgba(255,255,255,0.9)',
          wordBreak: 'break-word',
        }}
      >
        {PREVIEW_FILENAME}
      </span>
    </button>
  )
}

function CursorSparkles() {
  const [sparkles, setSparkles] = useState([])
  const nextSparkleId = useRef(0)
  const nextTrailIndex = useRef(0)
  const lastTrailPoint = useRef({ x: 0, y: 0, time: 0, active: false })
  const sparkleTimeouts = useRef([])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const spawnSparkle = ({ x, y, src, size, lifetime, kind }) => {
      const id = nextSparkleId.current++
      setSparkles((current) => [...current, { id, x, y, src, size, kind }])
      const timeoutId = window.setTimeout(() => {
        setSparkles((current) => current.filter((sparkle) => sparkle.id !== id))
      }, lifetime)
      sparkleTimeouts.current.push(timeoutId)
    }

    const onPointerMove = (event) => {
      const now = performance.now()
      const previous = lastTrailPoint.current
      const dx = event.clientX - previous.x
      const dy = event.clientY - previous.y
      const distance = Math.hypot(dx, dy)

      if (
        previous.active &&
        distance < CURSOR_TRAIL_MIN_DISTANCE &&
        now - previous.time < CURSOR_TRAIL_MIN_INTERVAL_MS
      ) {
        return
      }

      const src = CURSOR_TRAIL_GIFS[nextTrailIndex.current % CURSOR_TRAIL_GIFS.length]
      nextTrailIndex.current += 1
      lastTrailPoint.current = { x: event.clientX, y: event.clientY, time: now, active: true }

      spawnSparkle({
        x: event.clientX,
        y: event.clientY,
        src,
        size: 26,
        lifetime: CURSOR_TRAIL_LIFETIME_MS,
        kind: 'trail',
      })
    }

    const onClick = (event) => {
      spawnSparkle({
        x: event.clientX,
        y: event.clientY,
        src: CURSOR_CLICK_GIF,
        size: 44,
        lifetime: CURSOR_CLICK_LIFETIME_MS,
        kind: 'click',
      })
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('click', onClick, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('click', onClick)
      sparkleTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      sparkleTimeouts.current = []
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2147483647,
        overflow: 'hidden',
      }}
    >
      {sparkles.map((sparkle) => (
        <img
          key={sparkle.id}
          src={sparkle.src}
          alt=""
          style={{
            position: 'absolute',
            left: `${sparkle.x}px`,
            top: `${sparkle.y}px`,
            width: `${sparkle.size}px`,
            height: `${sparkle.size}px`,
            transform: sparkle.kind === 'click' ? 'translate(-50%, -50%)' : 'translate(-35%, -70%)',
            objectFit: 'contain',
            userSelect: 'none',
          }}
        />
      ))}
    </div>
  )
}

export default function App() {
  const [route, setRoute] = useState(() =>
    parseRouteFromHash(typeof window !== 'undefined' ? window.location.hash : ''),
  )
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [hasOpenedPreview, setHasOpenedPreview] = useState(false)
  const [editorCorners, setEditorCorners] = useState([null, null, null, null])
  const [activeEditorCorner, setActiveEditorCorner] = useState(0)
  const [snapshotLabel, setSnapshotLabel] = useState('')
  const [savedSnapshots, setSavedSnapshots] = useState([])

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const storedValue = window.localStorage.getItem(HOME_EDITOR_STORAGE_KEY)
      if (!storedValue) return

      const parsedValue = JSON.parse(storedValue)

      if (Array.isArray(parsedValue.editorCorners) && parsedValue.editorCorners.length === 4) {
        setEditorCorners(
          parsedValue.editorCorners.map((corner) =>
            Array.isArray(corner) && corner.length === 3 && corner.every((value) => Number.isFinite(value)) ? corner : null,
          ),
        )
      }

      if (parsedValue.activeEditorCorner == null || Number.isInteger(parsedValue.activeEditorCorner)) {
        setActiveEditorCorner(parsedValue.activeEditorCorner ?? null)
      }

      if (typeof parsedValue.snapshotLabel === 'string') {
        setSnapshotLabel(parsedValue.snapshotLabel)
      }

      if (Array.isArray(parsedValue.savedSnapshots)) {
        setSavedSnapshots(
          parsedValue.savedSnapshots
            .filter(
              (snapshot) =>
                snapshot &&
                typeof snapshot.label === 'string' &&
                Array.isArray(snapshot.corners) &&
                snapshot.corners.length === 4 &&
                snapshot.corners.every(
                  (corner) => Array.isArray(corner) && corner.length === 3 && corner.every((value) => Number.isFinite(value)),
                ),
            )
            .map((snapshot, index) => ({
              id: typeof snapshot.id === 'string' ? snapshot.id : `stored-${index}`,
              label: snapshot.label,
              corners: snapshot.corners,
            })),
        )
      }
    } catch {
      // Ignore malformed persisted editor state and continue with defaults.
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const payload = {
      editorCorners,
      activeEditorCorner,
      snapshotLabel,
      savedSnapshots,
    }

    try {
      window.localStorage.setItem(HOME_EDITOR_STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // Ignore storage write failures.
    }
  }, [activeEditorCorner, editorCorners, savedSnapshots, snapshotLabel])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    if (!window.location.hash) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${HOME_HASH}`)
    } else if (!HOME_EDITOR_ENABLED && window.location.hash === HOME_EDITOR_HASH) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${HOME_HASH}`)
    }

    const syncFromHash = () => {
      setRoute(parseRouteFromHash(window.location.hash))
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  useEffect(() => {
    useGLTF.preload('assets/home.glb')
    ROOM_FILES.forEach((roomFile) => {
      useGLTF.preload(`rooms/${roomFile}`)
    })
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const previousCursor = document.documentElement.style.getPropertyValue('--app-cursor')
    if (route.type === 'home-editor') {
      document.documentElement.style.removeProperty('--app-cursor')
    } else {
      document.documentElement.style.setProperty('--app-cursor', MAIN_KEY_CURSOR)
    }

    return () => {
      if (previousCursor) {
        document.documentElement.style.setProperty('--app-cursor', previousCursor)
      } else {
        document.documentElement.style.removeProperty('--app-cursor')
      }
    }
  }, [route.type])

  const openRoom = useCallback((roomNumber) => {
    navigateWithHash(`#${ROOM_HASH_PREFIX}${roomNumber}`)
  }, [])

  const openNextRoom = useCallback((roomNumber) => {
    const nextRoomNumber = roomNumber >= ROOM_FILES.length ? 1 : roomNumber + 1
    navigateWithHash(`#${ROOM_HASH_PREFIX}${nextRoomNumber}`)
  }, [])

  const closeRoom = useCallback(() => {
    setIsPreviewOpen(false)
    setHasOpenedPreview(true)
    navigateWithHash(HOME_HASH)
  }, [])

  const openAbout = useCallback(() => {
    navigateWithHash(ABOUT_HASH)
  }, [])

  const closeAbout = useCallback(() => {
    setIsPreviewOpen(false)
    setHasOpenedPreview(true)
    navigateWithHash(HOME_HASH)
  }, [])

  const openFolder = useCallback((folderId) => {
    navigateWithHash(`#${FOLDER_HASH_PREFIX}${folderId}`)
  }, [])

  const closeFolder = useCallback(() => {
    navigateWithHash(ABOUT_HASH)
  }, [])

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false)
    setHasOpenedPreview(true)
    navigateWithHash(HOME_HASH)
  }, [])

  const openPreview = useCallback(() => {
    setHasOpenedPreview(true)
    setIsPreviewOpen(true)
    navigateWithHash(HOME_HASH)
  }, [])

  const openHomeEditor = useCallback(() => {
    navigateWithHash(HOME_EDITOR_HASH)
  }, [])

  const closeHomeEditor = useCallback(() => {
    navigateWithHash(HOME_HASH)
  }, [])

  const setEditorCornerPoint = useCallback(
    (point) => {
      if (activeEditorCorner == null) return

      setEditorCorners((currentCorners) =>
        currentCorners.map((corner, index) => (index === activeEditorCorner ? point : corner)),
      )
      setActiveEditorCorner(null)
    },
    [activeEditorCorner],
  )

  const setEditorCornerValue = useCallback((cornerIndex, axisIndex, rawValue) => {
    setEditorCorners((currentCorners) => {
      const nextCorners = [...currentCorners]
      const currentCorner = currentCorners[cornerIndex] ? [...currentCorners[cornerIndex]] : [0, 0, 0]
      const parsedValue = Number.parseFloat(rawValue)
      currentCorner[axisIndex] = Number.isFinite(parsedValue) ? parsedValue : 0
      nextCorners[cornerIndex] = currentCorner
      return nextCorners
    })
  }, [])

  const resetEditorCorner = useCallback((cornerIndex) => {
    setEditorCorners((currentCorners) => currentCorners.map((corner, index) => (index === cornerIndex ? null : corner)))
  }, [])

  const resetAllEditorCorners = useCallback(() => {
    setEditorCorners([null, null, null, null])
    setActiveEditorCorner(0)
  }, [])

  const writeSnapshot = useCallback(() => {
    if (!snapshotLabel.trim()) return
    if (editorCorners.some((corner) => !corner)) return

    setSavedSnapshots((currentSnapshots) => [
      {
        id: `${Date.now()}`,
        label: snapshotLabel.trim(),
        corners: editorCorners.map((corner) => [...corner]),
      },
      ...currentSnapshots,
    ])
    setSnapshotLabel('')
  }, [editorCorners, snapshotLabel])

  const snapshotExport = JSON.stringify(
    savedSnapshots.map((snapshot) => ({
      label: snapshot.label,
      corners: snapshot.corners.map((corner) => corner.map((value) => Number(value.toFixed(3)))),
    })),
    null,
    2,
  )

  if (route.type === 'room') {
    const roomNumber = route.roomIndex + 1
    const roomFile = ROOM_FILES[route.roomIndex]
    return (
      <>
        <RoomPage roomNumber={roomNumber} roomFile={roomFile} cameraPosition={ROOM_CAMERA_POSITIONS[route.roomIndex]} onBack={closeRoom} onOpenNextRoom={() => openNextRoom(roomNumber)} />
      </>
    )
  }

  if (route.type === 'about') {
    return (
      <>
        <AboutPage onBackHome={closeAbout} onShowAbout={openAbout} onOpenFolder={openFolder} />
        <CursorSparkles />
      </>
    )
  }

  if (route.type === 'folder') {
    const folder = FOLDER_MAP.get(route.folderId)
    return (
      <>
        <AboutPage onBackHome={closeAbout} onShowAbout={closeFolder} onOpenFolder={openFolder} activeFolderId={route.folderId} />
        {folder && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 200, pointerEvents: 'none' }}>
            <FolderPage folder={folder} onBackToAbout={closeFolder} />
          </div>
        )}
        <CursorSparkles />
      </>
    )
  }

  if (route.type === 'home-editor') {
    const canWriteSnapshot = snapshotLabel.trim().length > 0 && editorCorners.every((corner) => Boolean(corner))

    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          position: 'relative',
          backgroundColor: '#fff',
          overflow: 'hidden',
        }}
      >
        <HomeEditorScene
          corners={editorCorners}
          activeCornerIndex={activeEditorCorner}
          onPickPoint={setEditorCornerPoint}
        />

        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            zIndex: 50,
            width: 'min(420px, calc(100vw - 48px))',
            maxHeight: 'calc(100vh - 48px)',
            overflowY: 'auto',
            padding: '16px',
            background: 'rgba(255,255,255,0.94)',
            border: '1px solid rgba(0,0,0,0.14)',
            borderRadius: '16px',
            boxShadow: '0 14px 34px rgba(0,0,0,0.14)',
            fontFamily: ARIAL_FONT_STACK,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '18px', lineHeight: 1.1, color: '#111' }}>home editor</div>
              <div style={{ fontSize: '12px', color: 'rgba(0,0,0,0.65)', marginTop: '4px' }}>
                Pick a corner, then click somewhere on the house to set it.
              </div>
            </div>
            <button
              type="button"
              onClick={closeHomeEditor}
              style={{
                border: '1px solid rgba(0,0,0,0.14)',
                background: '#fff',
                color: '#111',
                borderRadius: '999px',
                padding: '6px 10px',
                fontSize: '12px',
              }}
            >
              back home
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px', marginBottom: '10px' }}>
            {editorCorners.map((corner, index) => {
              const isSelected = activeEditorCorner === index
              const isSet = Boolean(corner)
              return (
                <button
                  key={`corner-button-${index}`}
                  type="button"
                  onClick={() => setActiveEditorCorner(index)}
                  style={{
                    border: isSelected ? '2px solid #ff6b6b' : '1px solid rgba(0,0,0,0.14)',
                    background: isSelected ? 'rgba(255,107,107,0.08)' : '#fff',
                    color: '#111',
                    borderRadius: '999px',
                    padding: '6px 10px',
                    fontSize: '12px',
                  }}
                >
                  {`corner ${index + 1}${isSet ? ' set' : ''}`}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {editorCorners.map((_, index) => (
              <button
                key={`corner-reset-${index}`}
                type="button"
                onClick={() => resetEditorCorner(index)}
                style={{
                  border: '1px solid rgba(0,0,0,0.14)',
                  background: '#fff',
                  color: '#111',
                  borderRadius: '999px',
                  padding: '6px 10px',
                  fontSize: '12px',
                }}
              >
                {`reset ${index + 1}`}
              </button>
            ))}
            <button
              type="button"
              onClick={resetAllEditorCorners}
              style={{
                border: '1px solid rgba(0,0,0,0.14)',
                background: '#fff',
                color: '#111',
                borderRadius: '999px',
                padding: '6px 10px',
                fontSize: '12px',
              }}
            >
              reset all
            </button>
          </div>

          <div style={{ marginBottom: '12px', fontSize: '12px', lineHeight: 1.55, color: '#222' }}>
            <div style={{ marginBottom: '6px', color: 'rgba(0,0,0,0.65)' }}>
              {activeEditorCorner == null ? 'no corner armed' : `waiting for click to set corner ${activeEditorCorner + 1}`}
            </div>
            {editorCorners.map((corner, index) => (
              <div key={`corner-readout-${index}`}>
                {corner
                  ? `corner ${index + 1}: [${corner.map((value) => value.toFixed(3)).join(', ')}]`
                  : `corner ${index + 1}: not set`}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '12px' }}>
            {editorCorners.map((corner, index) => (
              <div
                key={`corner-inputs-${index}`}
                style={{
                  padding: '10px',
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '12px',
                  marginBottom: '8px',
                  background: activeEditorCorner === index ? 'rgba(255,107,107,0.06)' : 'rgba(255,255,255,0.8)',
                }}
              >
                <div style={{ fontSize: '12px', color: '#111', marginBottom: '8px' }}>{`corner ${index + 1}`}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                  {['x', 'y', 'z'].map((axisLabel, axisIndex) => (
                    <label key={`${index}-${axisLabel}`} style={{ display: 'block', fontSize: '11px', color: 'rgba(0,0,0,0.65)' }}>
                      {axisLabel}
                      <input
                        type="number"
                        step="0.001"
                        value={corner ? corner[axisIndex] : 0}
                        onChange={(event) => setEditorCornerValue(index, axisIndex, event.target.value)}
                        style={{
                          width: '100%',
                          marginTop: '4px',
                          border: '1px solid rgba(0,0,0,0.14)',
                          borderRadius: '8px',
                          padding: '7px 8px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          boxSizing: 'border-box',
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="text"
              value={snapshotLabel}
              onChange={(event) => setSnapshotLabel(event.target.value)}
              placeholder="snapshot label"
              style={{
                flex: 1,
                border: '1px solid rgba(0,0,0,0.14)',
                borderRadius: '999px',
                padding: '8px 12px',
                fontSize: '12px',
                fontFamily: ARIAL_FONT_STACK,
              }}
            />
            <button
              type="button"
              onClick={writeSnapshot}
              disabled={!canWriteSnapshot}
              style={{
                border: '1px solid rgba(0,0,0,0.14)',
                background: canWriteSnapshot ? '#111' : 'rgba(0,0,0,0.08)',
                color: canWriteSnapshot ? '#fff' : 'rgba(0,0,0,0.45)',
                borderRadius: '999px',
                padding: '8px 12px',
                fontSize: '12px',
              }}
            >
              write snapshot
            </button>
          </div>

          <div style={{ fontSize: '12px', lineHeight: 1.5, color: 'rgba(0,0,0,0.65)', marginBottom: '10px' }}>
            Snapshot writing is enabled once all four corners are set and the label field is filled in.
          </div>

          <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: '#111' }}>saved snapshots</div>
          <div style={{ marginBottom: '10px', fontSize: '12px', lineHeight: 1.5, color: '#222' }}>
            {savedSnapshots.length === 0
              ? 'No snapshots yet.'
              : savedSnapshots.map((snapshot, index) => (
                  <div key={snapshot.id}>
                    {`${index + 1}. ${snapshot.label}: ${snapshot.corners.map((corner) => `[${corner.map((value) => value.toFixed(3)).join(', ')}]`).join(' ')}`}
                  </div>
                ))}
          </div>

          <textarea
            readOnly
            value={snapshotExport}
            aria-label="Saved snapshot coordinates"
            style={{
              width: '100%',
              minHeight: '180px',
              resize: 'vertical',
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: '10px',
              padding: '10px',
              fontFamily: 'monospace',
              fontSize: '11px',
              lineHeight: 1.45,
              background: 'rgba(255,255,255,0.9)',
              color: '#111',
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        cursor: 'inherit',
        backgroundColor: '#fff',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: hasOpenedPreview && !isPreviewOpen ? 1 : 0,
          pointerEvents: hasOpenedPreview && !isPreviewOpen ? 'auto' : 'none',
          transition: 'opacity 180ms ease',
        }}
        aria-hidden={!hasOpenedPreview || isPreviewOpen}
      >
        <HomeScene onModelLoaded={undefined} onOpenRoom={openRoom} />
      </div>

      {hasOpenedPreview && !isPreviewOpen && (
        <button
          type="button"
          onClick={openAbout}
          style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            zIndex: 41,
            border: 'none',
            background: 'transparent',
            color: '#000',
            padding: 0,
            fontFamily: MAC_LIGHT_FONT_STACK,
            fontSize: '18px',
            fontWeight: 300,
          }}
        >
          about
        </button>
      )}

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: `${HOME_HEADER_TOP}px`,
          transform: 'translateX(-50%)',
          zIndex: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {hasOpenedPreview && !isPreviewOpen && (
          <img
            src={HOME_WELCOME_GIF}
            alt=""
            aria-hidden="true"
            style={{ width: 'min(124px, 18vw)', height: 'auto', display: 'block' }}
          />
        )}
        {(!hasOpenedPreview || isPreviewOpen) && (
          <img
            src={HOME_WELCOME_GIF}
            alt=""
            aria-hidden="true"
            style={{ width: 'min(124px, 18vw)', height: 'auto', display: 'block', visibility: 'hidden' }}
          />
        )}

        <div
          style={{
            color: '#000',
            padding: 0,
            width: 'min(220px, 32vw)',
            fontFamily: ARIAL_FONT_STACK,
            fontSize: '25px',
            fontWeight: 400,
            letterSpacing: '0.01em',
            lineHeight: 1,
            textAlign: 'center',
            textTransform: 'lowercase',
          }}
        >
          {HOME_TITLE}
        </div>
      </div>

      {!hasOpenedPreview && !isPreviewOpen && <PreviewLauncher onOpen={openPreview} />}
      {isPreviewOpen && <ProjectPreviewWindow onClose={closePreview} />}
    </div>
  )
}

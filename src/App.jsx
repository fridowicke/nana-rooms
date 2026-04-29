import React, { useState, Suspense, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stage, Html, useGLTF, KeyboardControls, useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { GLTFLoader } from 'three-stdlib'
import { peek } from 'suspend-react'

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'w', 'W'] },
  { name: 'backward', keys: ['ArrowDown', 's', 'S'] },
  { name: 'left', keys: ['ArrowLeft', 'a', 'A'] },
  { name: 'right', keys: ['ArrowRight', 'd', 'D'] },
]

const LANDING_CAMERA_POSITION = [-0.55, 0.24, 0.48]
const DEFAULT_CAMERA_TARGET = [0, 0, 0]
const ROOM_CAMERA_DEFAULTS = [
  {
    position: [0.581, 0.731, -0.849],
    target: [0.675, 0.381, -1.095],
  },
  {
    position: [-0.494, 0.854, -1.423],
    target: [1.119, 0.027, -1.104],
  },
  {
    position: [0.060, -0.227, 0.230],
    target: [0.049, -0.253, 0.150],
  },
  {
    position: [-0.509, 1.244, -0.583],
    target: [-0.607, 0.029, -0.652],
  },
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
const MAIN_KEY_CURSOR_URL = 'assets/cursors/key-main-aligned.png'
const ROOM_KEY_CURSOR_URLS = [
  'assets/cursors/key-room-1-aligned.png',
  'assets/cursors/key-room-2-aligned.png',
  'assets/cursors/key-room-3-hover-aligned.png',
  'assets/cursors/key-room-4-hover-aligned.png',
]
const HOVER_KEY_CURSOR_URL = 'assets/cursors/key-hover-aligned.png'
const CURSOR_TRAIL_LIFETIME_MS = 850
const CURSOR_CLICK_LIFETIME_MS = 700
const CURSOR_TRAIL_MIN_DISTANCE = 14
const CURSOR_TRAIL_MIN_INTERVAL_MS = 24
const LOADING_SPARKLE_LIFETIME_MS = 1750
const LOADING_SPARKLE_INTERVAL_MS = 42
const LOADING_SPARKLE_BURST_COUNT = 18
const LOADING_SPARKLE_MAX_COUNT = 420
const LOADING_SPARKLE_INITIAL_WAVES = 14
const HOME_HEADER_TOP = 24
const PREVIEW_WINDOW_TOP = 190
const DOOR_OCCLUSION_CLEARANCE = 0.04
const ROOM_PRELOAD_POLL_INTERVAL_MS = 50
const MAIN_KEY_CURSOR_HOTSPOT = '28 24'
const HOVER_KEY_CURSOR_HOTSPOT = '13 12'
const HOME_EDITOR_STORAGE_KEY = 'nana-home-editor-state'
const FOLDER_DRAG_THRESHOLD_PX = 4
const DEFAULT_ABOUT_HTML = `Anastasiia Pishchanska is a Ukrainian-born, Tokyo-based artist, filmmaker, and art director. She is the co-founder of the established Ukrainian art print publication localstickerbook (<a href="https://localgr0up.com/" target="_blank" rel="noreferrer">local.group</a>), which curates exhibitions, events, and fundraisers worldwide, presenting contemporary artists through the lens of post-internet culture. In 2023, following the full-scale invasion of Ukraine, she was awarded a research scholarship at...

<br><br>Her practice moves between moving image, installation, and art direction, focusing on digital memory, migration, and cultural identity.`
const ABOUT_BASE_URL = 'http://shelestvetrovki.com/'
const ABOUT_HOME_TAB = { id: 'about', label: 'About', address: `${ABOUT_BASE_URL}about`, kind: 'about' }

const SONGS = [
  { title: 'Hysterical Love Project', artist: 'Motion Ward', src: 'assets/music/song1.mp3' },
  { title: 'oral', artist: 'björk ft. rosalía', src: 'assets/music/song2.m4a' },
  { title: 'love again', artist: 'DJ LOSTBOI x Young Thug', src: 'assets/music/song3.mp3' },
]
const DIARY_PHOTO_MODULES = import.meta.glob('../target/diary photos/*.{jpeg,jpg,png,webp}', { eager: true, import: 'default' })
const DIARY_PHOTOS = Object.entries(DIARY_PHOTO_MODULES)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([path, src], index) => {
    const filename = path.split('/').pop() ?? `entry-${index + 1}`
    const stem = filename.replace(/\.[^.]+$/, '')
    return {
      src,
      alt: `Diary photo ${index + 1}`,
      label: stem.replace(/_/g, ' '),
    }
  })
const EXHIBITION_IMAGE_MODULES = import.meta.glob('../target/exhibitions/**/*.{jpeg,jpg,png,webp,JPEG,JPG,PNG,WEBP}', { eager: true, import: 'default' })
const EXHIBITIONS = [
  {
    id: 'bed-doesnt-ask-questions',
    title: "Bed doesn't ask questions",
    year: '2025',
    venue: 'Festival Panoramic',
    location: 'Barcelona, Spain',
    medium: '6x3m digital print',
    artists: 'Chantal Akerman · Anne Glassner · Naked Space · shelestvetrovki',
    curators: 'Estela Ortiz & Juan Evaristo Valls Boix',
    description: [
      'The exhibition reflects on rest, centering on the bed and the private room, taking Chantal Akerman’s La chambre as its point of departure.',
      'Through a dialogue between artistic works and memetic expressions from recent years, this group show explores which bodies have access to rest and highlights the public dimension of practices that, at first glance, appear to be private.',
      'In the contemporary world, the imperatives of work infiltrate our beds and encroach upon our intimacy, while idleness and pause too often remain privileges accessible to only a few. For this reason, a sleeping body today stands as a radical image of freedom, yet also the most elusive: the embrace of time without purpose.',
    ],
    links: [
      { url: 'https://festivalpanoramic.cat/en/project/panoramic-review-2025/', label: 'Festival Panoramic — Panoramic Review 2025' },
    ],
    imageFolder: 'Bed Doesn_t Ask Questions - Panoramic Photo Festival Barcelona',
  },
  {
    id: 'mom-post-internet-is-not-a-phase',
    title: 'MOM, POST-INTERNET IS NOT A PHASE ;(',
    year: '2024',
    venue: 'Okay Initiative Space',
    location: 'Athens, Greece',
    curators: 'Yan Tashtoush',
    description: [
      '"Mom, post-internet is not a phase ;(" is a group exhibition exploring the shifting relationship between humans and our digital landscapes amidst visceral cry against the erasure of lives, bombed-out cities and abandoned homes in a global apathy that watches wars unfold, as entire populations are reduced to digital fragments, while the cries for justice are drowned by the endless cycle of "click, scroll, refresh."',
    ],
    links: [
      { url: 'https://www.kubaparis.com/submission/469655', label: 'Kuba Paris' },
    ],
    imageFolder: 'MOM, POST-INTERNET IS NOT A PHASE _(',
  },
]
const EXHIBITION_IMAGES_BY_FOLDER = Object.entries(EXHIBITION_IMAGE_MODULES).reduce((collection, [path, src], index) => {
  const normalizedPath = path.replace(/\\/g, '/')
  const segments = normalizedPath.split('/')
  const folderName = segments[segments.length - 2] ?? 'exhibition'
  const filename = segments[segments.length - 1] ?? `image-${index + 1}`
  const stem = filename.replace(/\.[^.]+$/, '')

  if (!collection.has(folderName)) {
    collection.set(folderName, [])
  }

  collection.get(folderName).push({
    src,
    alt: stem.replace(/_/g, ' '),
    sortKey: filename,
  })

  return collection
}, new Map())

EXHIBITION_IMAGES_BY_FOLDER.forEach((images) => {
  images.sort((a, b) => a.sortKey.localeCompare(b.sortKey, undefined, { numeric: true }))
})

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
        heading: 'WRITING BY AND ABOUT',
        entries: [
          { year: '2024', item: '"Dialogues on CoreCore & the Contemporary Online Avant-Garde", Becoming Press Publishing' },
          { year: '', item: '"NPC Collapse", Localstickerbook ISSUE 04, Readellion Publishing' },
          { year: '', item: '"Spiritual Ecocides", Lexicon Of Nature, LocalGroup, Readellion Publishing' },
        ],
      },
      {
        heading: 'WRITING ABOUT',
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
  {
    id: 'exhibitions',
    label: 'exhibitions',
    title: 'Exhibitions',
    sections: [],
  },
  {
    id: 'submit-room',
    label: 'submit room',
    title: 'Submit Room',
    sections: [],
  },
]
const FOLDER_MAP = new Map(FOLDER_DEFINITIONS.map((folder) => [folder.id, folder]))
const TONE_MAPPING_OPTIONS = [
  { value: 'none', label: 'None', threeValue: THREE.NoToneMapping },
  { value: 'linear', label: 'Linear', threeValue: THREE.LinearToneMapping },
  { value: 'reinhard', label: 'Reinhard', threeValue: THREE.ReinhardToneMapping },
  { value: 'cineon', label: 'Cineon', threeValue: THREE.CineonToneMapping },
  { value: 'aces', label: 'ACES', threeValue: THREE.ACESFilmicToneMapping },
  { value: 'agx', label: 'AgX', threeValue: THREE.AgXToneMapping },
  { value: 'neutral', label: 'Neutral', threeValue: THREE.NeutralToneMapping },
]
const DEFAULT_ROOM_RENDER_SETTINGS = {
  shadingMode: 'shadeless',
  toneMapping: 'linear',
  exposure: 1,
  environmentIntensity: 1.95,
  baseColorIntensity: 1,
  metalness: 0,
  roughness: 1,
  envMapIntensity: 1,
  opacity: 1,
  emissiveIntensity: 5,
  textureColorSpace: 'srgb',
  transparent: true,
  depthWrite: true,
  doubleSided: false,
  flatShading: false,
  wireframe: false,
}
const CANVAS_GL_OPTIONS = { preserveDrawingBuffer: true }

function buildCursorValue(cursorUrl, fallback = 'auto', hotspot = MAIN_KEY_CURSOR_HOTSPOT) {
  const cursorStack = [`url("${cursorUrl}") ${hotspot}`]
  cursorStack.push(fallback)
  return cursorStack.join(', ')
}

const MAIN_KEY_CURSOR = buildCursorValue(MAIN_KEY_CURSOR_URL, 'auto')
const HOVER_KEY_CURSOR = buildCursorValue(HOVER_KEY_CURSOR_URL, 'pointer', HOVER_KEY_CURSOR_HOTSPOT)
const DEFAULT_RESPONSIVE_STATE = {
  viewportWidth: 1440,
  viewportHeight: 900,
  isTouch: false,
  prefersReducedMotion: false,
}
const preloadedRoomAssets = new Set()

function getRoomAssetUrl(roomIndex) {
  const roomFile = ROOM_FILES[roomIndex]
  return roomFile ? `rooms/${roomFile}` : null
}

function addMediaQueryListener(query, listener) {
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }

  query.addListener(listener)
  return () => query.removeListener(listener)
}

function readResponsiveState() {
  if (typeof window === 'undefined') {
    return DEFAULT_RESPONSIVE_STATE
  }

  const coarsePointerQuery = window.matchMedia('(hover: none), (pointer: coarse)')
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

  return {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    isTouch: coarsePointerQuery.matches,
    prefersReducedMotion: reducedMotionQuery.matches,
  }
}

function useResponsiveShell() {
  const [responsiveState, setResponsiveState] = useState(readResponsiveState)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const coarsePointerQuery = window.matchMedia('(hover: none), (pointer: coarse)')
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateResponsiveState = () => {
      setResponsiveState({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        isTouch: coarsePointerQuery.matches,
        prefersReducedMotion: reducedMotionQuery.matches,
      })
    }

    updateResponsiveState()
    window.addEventListener('resize', updateResponsiveState)

    const detachCoarsePointerListener = addMediaQueryListener(coarsePointerQuery, updateResponsiveState)
    const detachReducedMotionListener = addMediaQueryListener(reducedMotionQuery, updateResponsiveState)

    return () => {
      window.removeEventListener('resize', updateResponsiveState)
      detachCoarsePointerListener()
      detachReducedMotionListener()
    }
  }, [])

  return responsiveState
}

function preloadRoomAsset(roomIndex) {
  const roomUrl = getRoomAssetUrl(roomIndex)
  if (!roomUrl || preloadedRoomAssets.has(roomUrl)) return
  preloadedRoomAssets.add(roomUrl)
  useGLTF.preload(roomUrl)
}

function isRoomAssetReady(roomIndex) {
  const roomUrl = getRoomAssetUrl(roomIndex)
  return Boolean(roomUrl && peek([GLTFLoader, roomUrl]))
}

function waitForRoomAsset(roomIndex) {
  if (isRoomAssetReady(roomIndex)) return Promise.resolve()

  preloadRoomAsset(roomIndex)

  return new Promise((resolve) => {
    const poll = () => {
      if (isRoomAssetReady(roomIndex)) {
        resolve()
        return
      }

      window.setTimeout(poll, ROOM_PRELOAD_POLL_INTERVAL_MS)
    }

    poll()
  })
}

function captureCurrentCanvasFrame() {
  if (typeof document === 'undefined') return null

  const canvas = document.querySelector('canvas')
  if (!canvas) return null

  try {
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

function runWhenIdle(callback) {
  if (typeof window === 'undefined') return undefined

  if ('requestIdleCallback' in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: 2500 })
    return () => window.cancelIdleCallback(idleId)
  }

  const timeoutId = window.setTimeout(callback, 250)
  return () => window.clearTimeout(timeoutId)
}

const DOOR_LINKS = [
  {
    id: 'door4-inner',
    label: 'Door 4 Inner',
    roomIndex: 3,
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[3], 'pointer'),
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
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[3], 'pointer'),
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
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[2], 'pointer'),
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
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[2], 'pointer'),
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
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[1], 'pointer'),
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
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[1], 'pointer'),
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
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[0], 'pointer'),
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
    cursor: buildCursorValue(ROOM_KEY_CURSOR_URLS[0], 'pointer'),
    corners: [
      [-0.162, 0.132, -0.019],
      [-0.131, 0.132, 0.046],
      [-0.138, 0.005, 0.047],
      [-0.166, 0.004, -0.018],
    ],
  },
]

function Model({ url, children, onLoaded, prepareScene }) {
  const { scene } = useGLTF(url)
  const { gl, camera } = useThree()

  useLayoutEffect(() => {
    prepareScene?.(scene)
    gl.compile(scene, camera)
    if (onLoaded) onLoaded(scene)
  }, [camera, gl, onLoaded, prepareScene, scene])

  return <primitive object={scene}>{children}</primitive>
}

function RendererSettings({ toneMapping, exposure }) {
  const { gl, scene } = useThree()

  useEffect(() => {
    const toneMappingMode = TONE_MAPPING_OPTIONS.find((option) => option.value === toneMapping)?.threeValue ?? THREE.NoToneMapping
    gl.toneMapping = toneMappingMode
    gl.toneMappingExposure = exposure
    gl.outputColorSpace = THREE.SRGBColorSpace
    scene.environmentIntensity = 1
  }, [exposure, gl, scene, toneMapping])

  return null
}

function isWithinDoorHitArea(object) {
  let current = object

  while (current) {
    if (current.userData?.isDoorHitArea) return true
    current = current.parent
  }

  return false
}

function applyRoomMaterialOverrides(sceneRoot, settings) {
  if (!sceneRoot) return

  const touchedMaterials = new Set()

  sceneRoot.traverse((child) => {
    if (!child?.isMesh || isWithinDoorHitArea(child)) return

    if (!child.userData.__roomOriginalMaterial) {
      child.userData.__roomOriginalMaterial = child.material
    }

    const originalMaterials = Array.isArray(child.userData.__roomOriginalMaterial)
      ? child.userData.__roomOriginalMaterial
      : [child.userData.__roomOriginalMaterial]

    const resolvedMaterials = originalMaterials.map((originalMaterial) => {
      if (!originalMaterial) return originalMaterial

      if (settings.shadingMode !== 'shadeless') {
        return originalMaterial
      }

      if (!originalMaterial.userData.__roomShadelessMaterial) {
        const basicMaterial = new THREE.MeshBasicMaterial()

        if (originalMaterial.color) basicMaterial.color.copy(originalMaterial.color)
        if (originalMaterial.map) basicMaterial.map = originalMaterial.map
        if (originalMaterial.alphaMap) basicMaterial.alphaMap = originalMaterial.alphaMap
        if (originalMaterial.transparent != null) basicMaterial.transparent = originalMaterial.transparent
        if (originalMaterial.opacity != null) basicMaterial.opacity = originalMaterial.opacity
        if (originalMaterial.side != null) basicMaterial.side = originalMaterial.side
        if (originalMaterial.wireframe != null) basicMaterial.wireframe = originalMaterial.wireframe

        originalMaterial.userData.__roomShadelessMaterial = basicMaterial
      }

      return originalMaterial.userData.__roomShadelessMaterial
    })

    child.material = Array.isArray(child.userData.__roomOriginalMaterial) ? resolvedMaterials : resolvedMaterials[0]

    const materials = Array.isArray(child.material) ? child.material : [child.material]
    materials.forEach((material) => {
      if (!material || touchedMaterials.has(material)) return
      touchedMaterials.add(material)

      if (!material.userData.__roomDefaults) {
        material.userData.__roomDefaults = {
          color: material.color?.clone?.() ?? null,
          metalness: material.metalness,
          roughness: material.roughness,
          envMapIntensity: material.envMapIntensity,
          opacity: material.opacity,
          emissiveIntensity: material.emissiveIntensity,
          transparent: material.transparent,
          depthWrite: material.depthWrite,
          side: material.side,
          flatShading: material.flatShading,
          wireframe: material.wireframe,
          mapColorSpace: material.map?.colorSpace,
        }
      }

      const defaults = material.userData.__roomDefaults
      const intensityColor = defaults.color?.clone?.() ?? new THREE.Color('#ffffff')
      intensityColor.multiplyScalar(settings.baseColorIntensity)
      const nextTransparent = settings.transparent || settings.opacity < 1
      const nextSide = settings.doubleSided ? THREE.DoubleSide : THREE.FrontSide
      const materialProgramChanged =
        material.transparent !== nextTransparent ||
        material.side !== nextSide ||
        material.flatShading !== settings.flatShading ||
        material.wireframe !== settings.wireframe

      if (material.color) material.color.copy(intensityColor)
      if (typeof material.metalness === 'number') material.metalness = settings.metalness
      if (typeof material.roughness === 'number') material.roughness = settings.roughness
      if (typeof material.envMapIntensity === 'number') material.envMapIntensity = settings.envMapIntensity
      if (typeof material.opacity === 'number') material.opacity = settings.opacity
      if (typeof material.emissiveIntensity === 'number') material.emissiveIntensity = settings.emissiveIntensity

      material.transparent = nextTransparent
      material.depthWrite = settings.depthWrite
      material.side = nextSide
      material.flatShading = settings.flatShading
      material.wireframe = settings.wireframe

      if (material.map) {
        const nextColorSpace = settings.textureColorSpace === 'linear' ? THREE.LinearSRGBColorSpace : THREE.SRGBColorSpace
        if (material.map.colorSpace !== nextColorSpace) {
          material.map.colorSpace = nextColorSpace
          material.map.needsUpdate = true
        }
      }

      if (materialProgramChanged) {
        material.needsUpdate = true
      }
    })
  })
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

function LoadingCanvasFallback() {
  return (
    <>
      <LoadingCursor />
      <Html fullscreen zIndexRange={[1000, 1000]} pointerEvents="none">
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: MAC_LIGHT_FONT_STACK,
            fontSize: '12px',
            color: 'rgba(0,0,0,0.56)',
            textTransform: 'lowercase',
            letterSpacing: '0.08em',
            background: 'rgba(255,255,255,0.18)',
          }}
        >
          loading
        </div>
      </Html>
    </>
  )
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

  if (tabId === ABOUT_HOME_TAB.id) {
    return ABOUT_HOME_TAB.address
  }

  const folder = FOLDER_MAP.get(tabId)
  if (folder) {
    return `${ABOUT_BASE_URL}${folder.id}`
  }

  return ABOUT_HOME_TAB.address
}

function getAboutTabId(folderId) {
  if (!folderId) return ABOUT_HOME_TAB.id
  if (FOLDER_MAP.has(folderId)) return folderId
  return ABOUT_HOME_TAB.id
}

function getAboutHistoryEntry(route) {
  if (route?.type === 'folder' && route.folderId && FOLDER_MAP.has(route.folderId)) {
    return route.folderId
  }

  return ABOUT_HOME_TAB.id
}

function getHashForAboutHistoryEntry(entryId) {
  if (entryId && entryId !== ABOUT_HOME_TAB.id && FOLDER_MAP.has(entryId)) {
    return `#${FOLDER_HASH_PREFIX}${entryId}`
  }

  return ABOUT_HASH
}

function AboutBrowserChrome({
  tabs,
  activeTabId,
  addressValue,
  onSelectTab,
  onBack,
  onForward,
  onReload,
  canGoBack,
  canGoForward,
}) {
  const navButtons = [
    { id: 'back', label: '<', onClick: onBack, disabled: !canGoBack },
    { id: 'forward', label: '>', onClick: onForward, disabled: !canGoForward },
    { id: 'reload', label: 'R', onClick: onReload, disabled: false },
  ]

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
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '4px',
          overflowX: 'hidden',
          overflowY: 'hidden',
          paddingBottom: 0,
          scrollbarWidth: 'none',
        }}
      >
        {tabs.map((tab) => {
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
                flexShrink: 0,
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
          flexWrap: 'nowrap',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {navButtons.map((button) => (
            <button
              key={button.id}
              type="button"
              onClick={button.onClick}
              disabled={button.disabled}
              aria-label={button.id}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '1px solid #8e8e8e',
                background: 'linear-gradient(180deg, #fbfbfb 0%, #cfcfcf 100%)',
                color: button.disabled ? '#9a9a9a' : '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                lineHeight: 1,
                opacity: button.disabled ? 0.55 : 1,
                cursor: button.disabled ? 'default' : HOVER_KEY_CURSOR,
                padding: 0,
              }}
            >
              {button.label}
            </button>
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

function TallyEmbed() {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const scriptSrc = 'https://tally.so/widgets/embed.js'
    const loadEmbeds = () => {
      if (typeof window !== 'undefined' && window.Tally && typeof window.Tally.loadEmbeds === 'function') {
        window.Tally.loadEmbeds()
        return
      }

      document.querySelectorAll('iframe[data-tally-src]:not([src])').forEach((iframe) => {
        iframe.src = iframe.dataset.tallySrc
      })
    }

    const existingScript = document.querySelector(`script[src="${scriptSrc}"]`)
    if (existingScript) {
      loadEmbeds()
      return undefined
    }

    const script = document.createElement('script')
    script.src = scriptSrc
    script.async = true
    script.onload = loadEmbeds
    script.onerror = loadEmbeds
    document.body.appendChild(script)

    return undefined
  }, [])

  return (
    <iframe
      data-tally-src="https://tally.so/embed/LZYxkJ?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
      loading="lazy"
      width="100%"
      height="3693"
      frameBorder="0"
      marginHeight="0"
      marginWidth="0"
      title="girl is a spectrum: open archive of 3D messes"
      style={{
        display: 'block',
        width: '100%',
        minHeight: '3693px',
        border: 'none',
        background: 'transparent',
      }}
    />
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

function HomeScene({ onModelLoaded, onOpenRoom, onReady }) {
  const [homeOccluderRoot, setHomeOccluderRoot] = useState(null)
  const prepareHomeScene = useCallback((scene) => {
    applyRoomMaterialOverrides(scene, DEFAULT_ROOM_RENDER_SETTINGS)
  }, [])
  const handleHomeModelLoaded = useCallback((scene) => {
    setHomeOccluderRoot(scene)
    const roomIndexes = new Set(DOOR_LINKS.map((door) => door.roomIndex))
    roomIndexes.forEach(preloadRoomAsset)
    if (onModelLoaded) onModelLoaded(scene)
  }, [onModelLoaded])

  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas gl={CANVAS_GL_OPTIONS} camera={{ position: LANDING_CAMERA_POSITION, fov: 47.5 }} style={{ cursor: 'inherit', touchAction: 'auto' }}>
        <color attach="background" args={['#fff']} />
        <Suspense fallback={<LoadingCanvasFallback />}>
          <RendererSettings toneMapping={DEFAULT_ROOM_RENDER_SETTINGS.toneMapping} exposure={DEFAULT_ROOM_RENDER_SETTINGS.exposure} />
          <Stage environment={null} intensity={DEFAULT_ROOM_RENDER_SETTINGS.environmentIntensity} shadows={false} adjustCamera={false}>
            <Model url="assets/home.glb" onLoaded={handleHomeModelLoaded} prepareScene={prepareHomeScene}>
              <DoorLinks doors={DOOR_LINKS} onOpenRoom={onOpenRoom} occluderRoot={homeOccluderRoot} />
            </Model>
          </Stage>
          <Controls />
          <CameraReset position={LANDING_CAMERA_POSITION} />
          <FirstFrameSignal onReady={onReady} />
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
    <Canvas gl={CANVAS_GL_OPTIONS} camera={{ position: LANDING_CAMERA_POSITION, fov: 47.5 }} style={{ cursor: 'crosshair' }}>
      <color attach="background" args={['#fff']} />
      <Suspense fallback={<LoadingCanvasFallback />}>
        <Stage environment="city" intensity={0.5} shadows={false} adjustCamera={false}>
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

function CameraReset({ position, target = DEFAULT_CAMERA_TARGET }) {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)

  useLayoutEffect(() => {
    camera.position.set(...position)
    if (controls?.target) {
      controls.target.set(...target)
      controls.update()
    } else {
      camera.lookAt(...target)
    }
  }, [camera, controls, position, target])

  return null
}

function FirstFrameSignal({ onReady }) {
  const hasSignaledRef = useRef(false)

  useFrame(() => {
    if (hasSignaledRef.current) return
    hasSignaledRef.current = true
    onReady?.()
  })

  return null
}

function DoorLinkArea({ door, onOpenRoom, occluderMeshes, isHovered = false, onHoverChange }) {
  const corners = Array.isArray(door.corners) ? door.corners : []
  const meshRef = useRef(null)
  const occlusionRaycaster = useMemo(() => new THREE.Raycaster(), [])

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

  const isDoorClearlyOccluded = useCallback((raycaster, doorDistance) => {
    if (!occluderMeshes?.length) return false

    const maxVisibleDistance = doorDistance - DOOR_OCCLUSION_CLEARANCE
    if (maxVisibleDistance <= raycaster.near) return false

    occlusionRaycaster.ray.copy(raycaster.ray)
    occlusionRaycaster.near = raycaster.near
    occlusionRaycaster.far = maxVisibleDistance
    occlusionRaycaster.layers.mask = raycaster.layers.mask

    return occlusionRaycaster.intersectObjects(occluderMeshes, false).length > 0
  }, [occluderMeshes, occlusionRaycaster])

  const raycast = useCallback((raycaster, intersects) => {
    if (!meshRef.current) return

    const nextHits = []
    THREE.Mesh.prototype.raycast.call(meshRef.current, raycaster, nextHits)

    nextHits.forEach((hit) => {
      if (!isDoorClearlyOccluded(raycaster, hit.distance)) {
        intersects.push(hit)
      }
    })
  }, [isDoorClearlyOccluded])

  if (!geometry) return null

  const applyDoorCursor = (event, cursorValue) => {
    const target = event?.nativeEvent?.target
    if (target?.style) target.style.cursor = cursorValue
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      renderOrder={1000}
      raycast={raycast}
      userData={{ isDoorHitArea: true }}
      onPointerOver={(event) => {
        event.stopPropagation()
        onHoverChange?.(door.roomIndex)
        applyDoorCursor(event, door.cursor || MAIN_KEY_CURSOR)
      }}
      onPointerOut={(event) => {
        onHoverChange?.(null)
        applyDoorCursor(event, MAIN_KEY_CURSOR)
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
      <DoorHoverSparkles corners={corners} visible={isHovered} />
    </mesh>
  )
}

function DoorHoverSparkles({ corners, visible }) {
  const [sparkles, setSparkles] = useState([])
  const nextSparkleId = useRef(0)
  const sparkleTimeouts = useRef([])
  const sparkleInterval = useRef(null)
  const sparkleGifIndex = useRef(Math.floor(Math.random() * CURSOR_TRAIL_GIFS.length))
  const planeOffset = useMemo(() => {
    if (corners.length !== 4) return new THREE.Vector3(0, 0, 0)

    const a = new THREE.Vector3(...corners[0])
    const b = new THREE.Vector3(...corners[1])
    const c = new THREE.Vector3(...corners[2])
    const ab = new THREE.Vector3().subVectors(b, a)
    const ac = new THREE.Vector3().subVectors(c, a)
    const normal = new THREE.Vector3().crossVectors(ab, ac)

    if (normal.lengthSq() === 0) return new THREE.Vector3(0, 0, 0)
    return normal.normalize().multiplyScalar(0.003)
  }, [corners])

  const samplePoint = useCallback(() => {
    if (corners.length !== 4) return null

    const topLeft = new THREE.Vector3(...corners[0])
    const topRight = new THREE.Vector3(...corners[1])
    const bottomRight = new THREE.Vector3(...corners[2])
    const bottomLeft = new THREE.Vector3(...corners[3])
    const u = Math.random()
    const v = Math.random()
    const top = topLeft.clone().lerp(topRight, u)
    const bottom = bottomLeft.clone().lerp(bottomRight, u)
    return top.lerp(bottom, v).add(planeOffset)
  }, [corners, planeOffset])

  useEffect(() => {
    if (!visible || corners.length !== 4) {
      if (sparkleInterval.current) {
        window.clearInterval(sparkleInterval.current)
        sparkleInterval.current = null
      }
      setSparkles([])
      return undefined
    }

    const spawnSparkle = () => {
      const position = samplePoint()
      if (!position) return

      const id = nextSparkleId.current++
      const src = CURSOR_TRAIL_GIFS[sparkleGifIndex.current % CURSOR_TRAIL_GIFS.length]
      sparkleGifIndex.current += 1
      const size = 18 + Math.random() * 14
      setSparkles((current) => [...current, { id, position, src, size }])

      const timeoutId = window.setTimeout(() => {
        setSparkles((current) => current.filter((sparkle) => sparkle.id !== id))
      }, CURSOR_TRAIL_LIFETIME_MS)
      sparkleTimeouts.current.push(timeoutId)
    }

    spawnSparkle()
    sparkleInterval.current = window.setInterval(spawnSparkle, 120)

    return () => {
      if (sparkleInterval.current) {
        window.clearInterval(sparkleInterval.current)
        sparkleInterval.current = null
      }
      sparkleTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      sparkleTimeouts.current = []
      setSparkles([])
    }
  }, [corners, samplePoint, visible])

  return sparkles.map((sparkle) => (
    <Html
      key={sparkle.id}
      position={sparkle.position.toArray()}
      transform
      sprite
      distanceFactor={0.22}
      zIndexRange={[1002, 1002]}
      occlude={false}
      pointerEvents="none"
    >
      <img
        src={sparkle.src}
        alt=""
        draggable="false"
        style={{
          width: `${sparkle.size}px`,
          height: `${sparkle.size}px`,
          objectFit: 'contain',
          userSelect: 'none',
          pointerEvents: 'none',
          transform: 'translate(-35%, -70%)',
        }}
      />
    </Html>
  ))
}

function DoorLinks({ doors, onOpenRoom, occluderRoot }) {
  const [hoveredRoomIndex, setHoveredRoomIndex] = useState(null)
  const occluderMeshes = useMemo(() => {
    if (!occluderRoot) return []

    const nextMeshes = []
    occluderRoot.traverse((child) => {
      if (child?.isMesh && !isWithinDoorHitArea(child)) {
        nextMeshes.push(child)
      }
    })
    return nextMeshes
  }, [occluderRoot])

  return (
    <group>
      {doors.map((door) => (
        <DoorLinkArea
          key={door.id}
          door={door}
          onOpenRoom={onOpenRoom}
          occluderMeshes={occluderMeshes}
          isHovered={hoveredRoomIndex === door.roomIndex}
          onHoverChange={setHoveredRoomIndex}
        />
      ))}
    </group>
  )
}

function RoomPage({ roomNumber, roomFile, cameraDefault, onBack, onOpenNextRoom, onReady }) {
  const prepareRoomScene = useCallback((scene) => {
    applyRoomMaterialOverrides(scene, DEFAULT_ROOM_RENDER_SETTINGS)
  }, [])

  return (
    <div
      style={{
        width: '100vw',
        height: '100dvh',
        backgroundColor: '#fff',
        color: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <KeyboardControls map={keyboardMap}>
        <Canvas gl={CANVAS_GL_OPTIONS} camera={{ position: cameraDefault.position, fov: 47.5 }} style={{ cursor: 'inherit', touchAction: 'auto' }}>
          <color attach="background" args={['#fff']} />
          <Suspense fallback={<LoadingCanvasFallback />}>
            <RendererSettings toneMapping={DEFAULT_ROOM_RENDER_SETTINGS.toneMapping} exposure={DEFAULT_ROOM_RENDER_SETTINGS.exposure} />
            <Stage environment={null} intensity={DEFAULT_ROOM_RENDER_SETTINGS.environmentIntensity} shadows={false} adjustCamera={false}>
              <Model url={`rooms/${roomFile}`} prepareScene={prepareRoomScene} />
            </Stage>
            <Controls />
            <CameraReset position={cameraDefault.position} target={cameraDefault.target} />
            <FirstFrameSignal onReady={onReady} />
          </Suspense>
        </Canvas>
      </KeyboardControls>

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
          cursor: HOVER_KEY_CURSOR,
        }}
        aria-label="Go back to house view"
      >
        <img
          src={GO_BACK_GIF}
          alt="Go back"
          style={{ width: 'min(55px, 9vw)', height: 'auto', display: 'block', objectFit: 'contain', cursor: HOVER_KEY_CURSOR }}
        />
      </button>

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
          cursor: HOVER_KEY_CURSOR,
        }}
      >
        <img
          src={NEXT_DOOR_GIF}
          alt="Go to the next door"
          style={{ width: 'min(55px, 9vw)', height: 'auto', display: 'block', objectFit: 'contain', cursor: HOVER_KEY_CURSOR }}
        />
      </button>
    </div>
  )
}

function SceneTransitionCover({ snapshotUrl }) {
  if (!snapshotUrl) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        pointerEvents: 'none',
        overflow: 'hidden',
        backgroundColor: '#fff',
      }}
    >
      <img
        src={snapshotUrl}
        alt=""
        draggable="false"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'cover',
          userSelect: 'none',
        }}
      />
    </div>
  )
}

function TinyPlayer({ onTitleBarMouseDown, width = 290 }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef(null)
  const scale = width / 290

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
    <div style={{ width: `${width}px`, userSelect: 'none', borderRadius: `${8 * scale}px`, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', fontFamily: MAC_LIGHT_FONT_STACK }}>
      {/* Title bar */}
      <div onMouseDown={onTitleBarMouseDown} className={onTitleBarMouseDown ? 'cursor-grab' : ''} style={{ background: 'linear-gradient(180deg,#e8e8e8 0%,#d0d0d0 100%)', padding: `${5 * scale}px ${8 * scale}px`, display: 'flex', alignItems: 'center', gap: `${6 * scale}px`, borderBottom: '1px solid #b0b0b0', userSelect: 'none' }}>
        <span style={{ width: `${10 * scale}px`, height: `${10 * scale}px`, borderRadius: '50%', background: '#ff5f57', border: '0.5px solid #e0443e', display: 'inline-block' }} />
        <span style={{ width: `${10 * scale}px`, height: `${10 * scale}px`, borderRadius: '50%', background: '#febc2e', border: '0.5px solid #d4a017', display: 'inline-block' }} />
        <span style={{ width: `${10 * scale}px`, height: `${10 * scale}px`, borderRadius: '50%', background: '#28c840', border: '0.5px solid #1aab29', display: 'inline-block' }} />
        <span style={{ flex: 1, textAlign: 'center', fontSize: `${11 * scale}px`, fontWeight: 500, color: '#333', marginRight: `${30 * scale}px` }}>Tiny Player</span>
      </div>

      {/* Body */}
      <div style={{ background: '#f5f5f5', padding: `${8 * scale}px ${10 * scale}px ${6 * scale}px` }}>
        <div style={{ fontWeight: 700, fontSize: `${12 * scale}px`, color: '#1a1a1a', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textAlign: 'center' }}>{song.title}</div>
        <div style={{ fontWeight: 300, fontSize: `${11 * scale}px`, color: '#666', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', textAlign: 'center', marginTop: `${1 * scale}px` }}>{song.artist}</div>

        {/* Transport buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: `${18 * scale}px`, margin: `${9 * scale}px 0 ${8 * scale}px` }}>
          <button type="button" aria-label="Previous" onClick={prevSong} style={{ width: `${32 * scale}px`, height: `${32 * scale}px`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 0, fontSize: `${16 * scale}px`, color: '#333', lineHeight: 1, cursor: 'inherit' }}>⏮</button>
          <button type="button" aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} style={{ width: `${36 * scale}px`, height: `${36 * scale}px`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 0, fontSize: `${18 * scale}px`, color: '#333', lineHeight: 1, cursor: 'inherit' }}>{isPlaying ? '⏸' : '▶'}</button>
          <button type="button" aria-label="Next" onClick={nextSong} style={{ width: `${32 * scale}px`, height: `${32 * scale}px`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', padding: 0, fontSize: `${16 * scale}px`, color: '#333', lineHeight: 1, cursor: 'inherit' }}>⏭</button>
        </div>

        {/* Seek bar */}
        <div
          onClick={handleSeek}
          style={{ position: 'relative', height: `${6 * scale}px`, background: '#ccc', borderRadius: `${3 * scale}px`, margin: `0 ${2 * scale}px ${4 * scale}px`, cursor: 'inherit' }}
        >
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: '#4a90d9', borderRadius: '3px' }} />
          <div style={{ position: 'absolute', top: '50%', left: `${pct}%`, transform: 'translate(-50%,-50%)', width: `${10 * scale}px`, height: `${10 * scale}px`, borderRadius: '50%', background: '#fff', border: `${1.5 * scale}px solid #4a90d9`, pointerEvents: 'none' }} />
        </div>

        {/* Time display */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${10 * scale}px`, color: '#888', padding: `0 ${2 * scale}px` }}>
          <span>{fmt(currentTime)}</span>
          <span>{fmtNeg(currentTime, duration)}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#e0e0e0', borderTop: '1px solid #c0c0c0', padding: `${3 * scale}px ${10 * scale}px`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: `${10 * scale}px`, color: '#888' }}>
        <span>320kbps</span>
        <span>{currentIndex + 1} / {SONGS.length}</span>
      </div>

      <audio ref={audioRef} preload={isPlaying ? 'auto' : 'metadata'} />
    </div>
  )
}

function DiaryDeck({ left, top, width, availableHeight, inline = false }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const photoCount = DIARY_PHOTOS.length
  const autoplayTimerRef = useRef(null)
  const deckHeight = inline ? Math.max(280, Math.min(availableHeight ?? 360, 360)) : Math.max(154, Math.min(availableHeight, 220))
  const cardWidth = inline ? Math.max(164, Math.min(width - 36, 240)) : Math.max(102, Math.min(width - 36, 142))
  const cardHeight = Math.min(deckHeight - 30, cardWidth * 1.52)
  const scale = inline ? cardWidth / 198 : cardWidth / 142
  const titleSize = Math.max(11, 14 * scale)
  const captionSize = Math.max(8.5, 11 * scale)

  const scheduleAutoplay = useCallback(() => {
    if (autoplayTimerRef.current) {
      window.clearTimeout(autoplayTimerRef.current)
    }

    if (photoCount <= 1) return

    autoplayTimerRef.current = window.setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % photoCount)
    }, 5200)
  }, [photoCount])

  useEffect(() => {
    scheduleAutoplay()

    return () => {
      if (autoplayTimerRef.current) {
        window.clearTimeout(autoplayTimerRef.current)
      }
    }
  }, [currentIndex, scheduleAutoplay])

  const showPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + photoCount) % photoCount)
    scheduleAutoplay()
  }, [photoCount, scheduleAutoplay])

  const showNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % photoCount)
    scheduleAutoplay()
  }, [photoCount, scheduleAutoplay])

  if (!photoCount) return null

  const activePhoto = DIARY_PHOTOS[currentIndex]
  const visibleCards = [-2, -1, 0, 1, 2]
    .map((offset) => {
      const photo = DIARY_PHOTOS[(currentIndex + offset + photoCount) % photoCount]
      return { photo, offset }
    })
    .sort((a, b) => Math.abs(b.offset) - Math.abs(a.offset))

  return (
    <div
      style={{
        position: inline ? 'relative' : 'fixed',
        left,
        top,
        zIndex: 21,
        width,
        height: deckHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: inline ? 'auto' : 'none',
        margin: inline ? '0 auto' : 0,
      }}
    >
      <div
        style={{
          fontFamily: MAC_LIGHT_FONT_STACK,
          fontSize: `${titleSize}px`,
          fontWeight: 300,
          lineHeight: 1,
          color: '#5871a4',
          letterSpacing: '-0.04em',
          textTransform: 'lowercase',
          marginBottom: `${4 * scale}px`,
          textAlign: 'center',
        }}
      >
        diary
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: `${cardHeight}px`,
          pointerEvents: 'auto',
        }}
      >
        {visibleCards.map(({ photo, offset }) => {
          const isActive = offset === 0
          const translateX = offset * (cardWidth * 0.105)
          const rotate = offset * 3.2
          const scaleValue = isActive ? 1 : Math.max(0.9, 0.97 - Math.abs(offset) * 0.028)
          const opacity = isActive ? 1 : Math.max(0.5, 0.7 - Math.abs(offset) * 0.07)

          return (
            <button
              key={`${photo.src}-${offset}`}
              type="button"
              onClick={offset < 0 ? showPrev : offset > 0 ? showNext : undefined}
              aria-label={offset < 0 ? 'Show previous diary photo' : offset > 0 ? 'Show next diary photo' : activePhoto.label}
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                margin: '0 auto',
                width: `${cardWidth}px`,
                height: `${cardHeight}px`,
                padding: 0,
                border: 'none',
                background: 'transparent',
                transform: `translateX(calc(-50% + ${translateX}px)) rotate(${rotate}deg) scale(${scaleValue})`,
                transformOrigin: 'center bottom',
                opacity,
                zIndex: 10 - Math.abs(offset),
                pointerEvents: isActive ? 'none' : 'auto',
              }}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                decoding="async"
                draggable="false"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  objectFit: 'cover',
                  borderRadius: `${18 * scale}px`,
                  boxShadow: isActive
                    ? '0 14px 28px rgba(0,0,0,0.12)'
                    : '0 9px 18px rgba(0,0,0,0.09)',
                  userSelect: 'none',
                }}
              />
            </button>
          )
        })}

        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: `${6 * scale}px`,
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: `${5 * scale}px`,
          }}
        >
          <button
            type="button"
            onClick={showPrev}
            aria-label="Show previous diary photo"
            style={{
              width: `${18 * scale}px`,
              height: `${18 * scale}px`,
              borderRadius: '999px',
              border: '1px solid rgba(129,129,129,0.24)',
              background: 'rgba(255,255,255,0.82)',
              color: '#7a7a7a',
              fontSize: `${9 * scale}px`,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 9px rgba(0,0,0,0.05)',
            }}
          >
            ‹
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: `${4 * scale}px` }}>
            {DIARY_PHOTOS.slice(0, Math.min(photoCount, 5)).map((_, index) => {
              const active = index === currentIndex % Math.min(photoCount, 5)
              return (
                <span
                  key={`diary-dot-${index}`}
                  aria-hidden="true"
                  style={{
                    width: `${active ? 8 * scale : 3.5 * scale}px`,
                    height: `${3.5 * scale}px`,
                    borderRadius: '999px',
                    background: active ? 'rgba(88,113,164,0.82)' : 'rgba(88,113,164,0.24)',
                    transition: 'all 180ms ease',
                  }}
                />
              )
            })}
          </div>

          <button
            type="button"
            onClick={showNext}
            aria-label="Show next diary photo"
            style={{
              width: `${18 * scale}px`,
              height: `${18 * scale}px`,
              borderRadius: '999px',
              border: '1px solid rgba(129,129,129,0.24)',
              background: 'rgba(255,255,255,0.82)',
              color: '#7a7a7a',
              fontSize: `${9 * scale}px`,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 9px rgba(0,0,0,0.05)',
            }}
          >
            ›
          </button>
        </div>
      </div>

      <div
        style={{
          width: '100%',
          paddingRight: inline ? 0 : `${10 * scale}px`,
          marginTop: `${3 * scale}px`,
          boxSizing: 'border-box',
          textAlign: inline ? 'center' : 'right',
          fontFamily: MAC_LIGHT_FONT_STACK,
          fontSize: `${captionSize}px`,
          fontWeight: 300,
          letterSpacing: '0.02em',
          color: 'rgba(87, 87, 87, 0.52)',
          textTransform: 'lowercase',
        }}
      >
        {activePhoto.label}
      </div>
    </div>
  )
}

function AboutPage({
  onBackHome,
  onShowAbout,
  onOpenFolder,
  onBrowserBack,
  onBrowserForward,
  onBrowserReload,
  canBrowserGoBack = false,
  canBrowserGoForward = false,
  activeFolderId = null,
  openedFolderIds = [],
  onRememberFolderOpen,
  isTouch = false,
}) {
  const editorContentRef = useRef(null)
  const [editorScrollbar, setEditorScrollbar] = useState({ top: 0, height: 100, enabled: false })
  const rightStageRef = useRef(null)
  const draggedFolderRef = useRef(null)
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  }))
  const [activeBrowserTab, setActiveBrowserTab] = useState(getAboutTabId(activeFolderId))
  const [browserAddress, setBrowserAddress] = useState(() => getAboutAddress(activeFolderId, getAboutTabId(activeFolderId)))

  const folderArcLayout = [
    { id: 'performance', left: '22%', top: '62%' },
    { id: 'writing', left: '30%', top: '36%' },
    { id: 'exhibitions', left: '47%', top: '56%' },
    { id: 'filmmaking', left: '73%', top: '42%' },
    { id: 'cv', left: '84%', top: '65%' },
    { id: 'submit-room', left: '94%', top: '43%' },
  ]
  const [folderPositions, setFolderPositions] = useState(
    () => new Map(folderArcLayout.map((p) => [p.id, { left: p.left, top: p.top }]))
  )
  const rightStageWidth = '100vw'

  const [aboutWinPos, setAboutWinPos] = useState({ x: 24, y: 112 })
  const aboutWinPosRef = useRef(aboutWinPos)
  aboutWinPosRef.current = aboutWinPos

  const [playerPos, setPlayerPos] = useState(() => ({
    x: 24,
    y: typeof window !== 'undefined' ? window.innerHeight - 150 : 450,
  }))
  const playerPosRef = useRef(playerPos)
  playerPosRef.current = playerPos
  const leftColumnWidth = Math.max(188, Math.min(viewport.width * 0.15, 218))
  const aboutWindowWidth = leftColumnWidth + 34
  const welcomeWidth = 126
  const welcomeHeight = Math.round(welcomeWidth * (55 / 135))
  const leftColumnX = Math.round((aboutWinPos.x + playerPos.x) / 2)
  const aboutWindowTop = aboutWinPos.y + 36
  const aboutWindowHeight = 181
  const playerWindowTop = playerPos.y + 36
  const diaryGapStart = aboutWindowTop + aboutWindowHeight + 10
  const diaryGapHeight = Math.max(playerWindowTop - diaryGapStart - 10, 154)
  const diaryHeight = Math.max(154, Math.min(diaryGapHeight, 220))
  const diaryTop = diaryGapStart + Math.max((diaryGapHeight - diaryHeight) / 2, 0)
  const diaryWidth = Math.max(Math.min(leftColumnWidth - 34, 132), 106)

  const makeTitleBarDrag = useCallback((posRef, setPos) => (e) => {
    if (isTouch) return
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
  }, [isTouch])

  const startFolderDrag = useCallback((folderId, e) => {
    if (isTouch) return
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    draggedFolderRef.current = null
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
      if (!moved && Math.abs(dx) < FOLDER_DRAG_THRESHOLD_PX && Math.abs(dy) < FOLDER_DRAG_THRESHOLD_PX) return
      moved = true
      draggedFolderRef.current = folderId
      setFolderPositions((prev) => {
        const next = new Map(prev)
        next.set(folderId, { left: startPx + dx, top: startPy + dy, isPx: true })
        return next
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [isTouch])

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
    if (typeof window === 'undefined') return undefined
    const frame = window.requestAnimationFrame(updateEditorScrollbar)
    return () => window.cancelAnimationFrame(frame)
  }, [updateEditorScrollbar])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
      updateEditorScrollbar()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [updateEditorScrollbar])

  useEffect(() => {
    const nextTab = getAboutTabId(activeFolderId)
    setActiveBrowserTab(nextTab)
    setBrowserAddress(getAboutAddress(activeFolderId, nextTab))
  }, [activeFolderId])

  useEffect(() => {
    if (!activeFolderId || !FOLDER_MAP.has(activeFolderId)) return
    onRememberFolderOpen?.(activeFolderId)
  }, [activeFolderId, onRememberFolderOpen])

  const browserTabs = useMemo(() => [
    ABOUT_HOME_TAB,
    ...openedFolderIds
      .map((folderId) => FOLDER_MAP.get(folderId))
      .filter(Boolean)
      .map((folder) => ({
        id: folder.id,
        label: folder.title,
        address: getAboutAddress(folder.id, folder.id),
        kind: 'folder',
        folderId: folder.id,
      })),
  ], [openedFolderIds])

  const activeFolder = activeFolderId ? FOLDER_MAP.get(activeFolderId) ?? null : null
  const isFolderView = Boolean(activeFolder)

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
    onRememberFolderOpen?.(folderId)
    setActiveBrowserTab(getAboutTabId(folderId))
    setBrowserAddress(getAboutAddress(folderId, getAboutTabId(folderId)))
    onOpenFolder(folderId)
  }, [onOpenFolder, onRememberFolderOpen])

  const handleFolderClick = useCallback((folderId, e) => {
    if (draggedFolderRef.current === folderId) {
      e.preventDefault()
      e.stopPropagation()
      draggedFolderRef.current = null
      return
    }

    handleFolderOpen(folderId)
  }, [handleFolderOpen])

  return (
    <div
      style={{
        width: '100vw',
        height: '100dvh',
        backgroundColor: '#fff',
        color: '#000',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Welcome gif (static) ── */}
      {!isFolderView && (
        <div style={{ position: 'fixed', left: leftColumnX, top: aboutWindowTop - welcomeHeight + 2, zIndex: 21, pointerEvents: 'none' }}>
          <img
            src="assets/welcome.webp"
            alt="welcome to my page"
            style={{ width: `${welcomeWidth}px`, maxWidth: `${aboutWindowWidth}px`, height: 'auto', objectFit: 'contain' }}
          />
        </div>
      )}

      {/* ── About window (draggable) ── */}
      {!isFolderView && (
        <div
          style={{
            position: 'fixed',
            left: leftColumnX,
            top: aboutWinPos.y + 36,
            zIndex: 21,
            width: `${aboutWindowWidth}px`,
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
            <div style={{ background: '#f5f5f5', position: 'relative', height: '148px' }}>
              <div
                ref={editorContentRef}
                className="classic-textedit-scroll"
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
                  fontSize: '9.25px',
                  fontWeight: 300,
                  lineHeight: 1.38,
                  whiteSpace: 'pre-wrap',
                  overflowX: 'hidden',
                  overflowY: 'auto',
                  padding: '8px 32px 8px 9px',
                  boxSizing: 'border-box',
                }}
                dangerouslySetInnerHTML={{ __html: DEFAULT_ABOUT_HTML }}
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
      )}

      {!isFolderView && (
        <DiaryDeck
          left={leftColumnX + (leftColumnWidth - diaryWidth) / 2}
          top={diaryTop}
          width={diaryWidth}
          availableHeight={diaryGapHeight}
        />
      )}

      {/* ── Safety pin (between left col and right stage) ── */}
      {!isFolderView && (
        <div style={{ position: 'absolute', left: `${leftColumnX + aboutWindowWidth + 24}px`, top: '42%', zIndex: 20, pointerEvents: 'none' }}>
          <img
            src="assets/safety-pin.gif"
            alt=""
            aria-hidden="true"
            style={{ width: '50px', height: 'auto', objectFit: 'contain' }}
          />
        </div>
      )}

      {/* ── Radio gif (static) ── */}
      {!isFolderView && (
        <div
          style={{
            position: 'fixed',
            left: leftColumnX,
            top: playerPos.y - 4,
            zIndex: 21,
            pointerEvents: 'none',
            width: `${leftColumnWidth}px`,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <img src="assets/radio.gif" alt="" aria-hidden="true" style={{ width: '42px', height: 'auto', objectFit: 'contain' }} />
        </div>
      )}

      {/* ── Player (draggable) ── */}
      {!isFolderView && (
        <div
          style={{
            position: 'fixed',
            left: leftColumnX,
            top: playerPos.y + 36,
            zIndex: 21,
            width: `${leftColumnWidth}px`,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <TinyPlayer onTitleBarMouseDown={makeTitleBarDrag(playerPosRef, setPlayerPos)} width={leftColumnWidth} />
        </div>
      )}

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
            tabs={browserTabs}
            activeTabId={activeBrowserTab}
            addressValue={browserAddress}
            onSelectTab={handleBrowserTabSelect}
            onBack={onBrowserBack}
            onForward={onBrowserForward}
            onReload={onBrowserReload}
            canGoBack={canBrowserGoBack}
            canGoForward={canBrowserGoForward}
          />
        </div>

        {/* Title banner + subtitle */}
        {!isFolderView && (
          <div
            style={{
              position: 'absolute',
              top: '112px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 12,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              pointerEvents: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <img
                src="assets/zodiac.gif"
                alt=""
                aria-hidden="true"
                style={{ width: '23px', height: 'auto', objectFit: 'contain' }}
              />
              <img
                src="assets/shelestvetrovki-glitter.gif"
                alt="shelestvetrovki"
                style={{ width: 'min(172px, 14.4vw)', height: 'auto', objectFit: 'contain' }}
              />
              <img
                src="assets/7ADo.gif"
                alt=""
                aria-hidden="true"
                style={{ width: '23px', height: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>
        )}

        {!isFolderView && (
          <button
            type="button"
            onClick={onBackHome}
            aria-label="Go back home"
            className="cursor-pointer"
            style={{
              position: 'absolute',
              top: '92px',
              right: '18px',
              zIndex: 13,
              border: 'none',
              background: 'transparent',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: HOVER_KEY_CURSOR,
            }}
          >
            <img
              src={ABOUT_HOME_GIF}
              alt="home"
              draggable={false}
              className="cursor-pointer"
              style={{ width: '51px', height: 'auto', display: 'block', objectFit: 'contain', cursor: HOVER_KEY_CURSOR }}
            />
          </button>
        )}

        {/* Knock knock button */}
        {!isFolderView && (
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
        )}

        {isFolderView && activeFolder && (
          <div
            style={{
              position: 'absolute',
              top: '86px',
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9,
              overflow: 'hidden',
            }}
          >
            <AboutFolderContent folder={activeFolder} />
          </div>
        )}

        {/* Folders */}
        {!isFolderView && folderArcLayout.map((placement) => {
          const folder = FOLDER_MAP.get(placement.id)
          if (!folder) return null
          const pos = folderPositions.get(folder.id) ?? placement
          const posLeft = pos.isPx ? `${pos.left}px` : pos.left
          const posTop = pos.isPx ? `${pos.top}px` : pos.top

          return (
            <button
              key={folder.id}
              type="button"
              onMouseDown={(e) => startFolderDrag(folder.id, e)}
              onClick={(e) => handleFolderClick(folder.id, e)}
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

function AboutFolderContent({ folder }) {
  const plainPageStyle = {
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    fontFamily: ARIAL_FONT_STACK,
    fontSize: '13px',
    lineHeight: 1.45,
    color: '#000',
    background: '#fff',
    boxSizing: 'border-box',
    padding: '14px 16px 48px',
  }
  const plainLinkStyle = {
    color: '#00e',
    textDecoration: 'underline',
  }
  const plainHeadingStyle = {
    margin: '18px 0 8px',
    fontSize: '13px',
    fontWeight: 700,
    textTransform: 'uppercase',
  }

  if (folder.id === 'submit-room') {
    return (
      <div
        style={plainPageStyle}
      >
        <h1 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700 }}>{folder.title}</h1>
        <TallyEmbed />
      </div>
    )
  }

  if (folder.id === 'exhibitions') {
    return (
      <div
        style={plainPageStyle}
      >
        <h1 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700 }}>Exhibitions</h1>
        <p style={{ margin: '0 0 18px' }}>Selected group exhibitions, installation views, and exhibition texts.</p>

        {EXHIBITIONS.map((exhibition) => {
          const images = EXHIBITION_IMAGES_BY_FOLDER.get(exhibition.imageFolder) ?? []

          return (
            <section key={exhibition.id} style={{ margin: '0 0 28px' }}>
              <h2 style={plainHeadingStyle}>{exhibition.title}</h2>
              <p style={{ margin: '0 0 8px' }}>
                {[exhibition.year, exhibition.venue, exhibition.location].filter(Boolean).join(' / ')}
                {exhibition.medium ? <><br />{exhibition.medium}</> : null}
                {exhibition.artists ? <><br />{exhibition.artists}</> : null}
                {exhibition.curators ? <><br />Curated by {exhibition.curators}</> : null}
              </p>

              {exhibition.description.map((paragraph) => (
                <p key={paragraph} style={{ margin: '0 0 10px', maxWidth: '86ch' }}>
                  {paragraph}
                </p>
              ))}

              {exhibition.links?.length > 0 && (
                <ul style={{ margin: '8px 0 14px', paddingLeft: '22px' }}>
                  {exhibition.links.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-folder-link"
                        style={plainLinkStyle}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              <div>
                {images.map((image) => (
                  <figure key={image.src} style={{ margin: '14px 0' }}>
                    <img
                      src={image.src}
                      alt={image.alt}
                      loading="lazy"
                      decoding="async"
                      style={{
                        display: 'block',
                        width: 'min(100%, 620px)',
                        height: 'auto',
                      }}
                    />
                    <figcaption style={{ marginTop: '4px' }}>{image.alt}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    )
  }

  return (
    <div style={plainPageStyle}>
      <h1 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700 }}>{folder.title}</h1>
      {folder.bio && (
        <p style={{ margin: '0 0 18px' }}>
          {folder.bio.name}
          <br />
          {folder.bio.born}
          <br />
          {folder.bio.lives}
        </p>
      )}

      {folder.sections.map((section) => (
        <section key={section.heading} style={{ margin: '0 0 20px' }}>
          <h2 style={plainHeadingStyle}>{section.heading}</h2>
          {section.entries && (
            <ul style={{ margin: 0, paddingLeft: '22px' }}>
              {section.entries.map((entry, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <li key={i} style={{ marginBottom: '6px' }}>
                  {entry.year ? `${entry.year} - ` : ''}
                  {entry.item}
                </li>
              ))}
            </ul>
          )}
          {section.links && (
            <ul style={{ margin: 0, paddingLeft: '22px' }}>
              {section.links.map((link) => (
                <li key={link.url} style={{ marginBottom: '6px' }}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="about-folder-link"
                    style={plainLinkStyle}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}

function ProjectPreviewWindow({ onClose, isTouch = false }) {
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
    if (isTouch) return
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
  }, [isTouch])

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
        zIndex: 45,
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
          cursor: 'inherit',
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

function PreviewLauncher({ onOpen, isTouch = false }) {
  const [iconPos, setIconPos] = useState(() => ({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 - 220 : 180,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 - 10 : 320,
  }))
  const iconPosRef = useRef(iconPos)
  iconPosRef.current = iconPos

  const startDrag = useCallback((event) => {
    if (isTouch) return
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
  }, [isTouch])

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
        cursor: 'inherit',
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

function LoadingGlitterOverlay({ active, reducedMotion = false }) {
  const [sparkles, setSparkles] = useState([])
  const nextSparkleId = useRef(0)
  const nextGifIndex = useRef(0)
  const sparkleTimeouts = useRef([])

  useEffect(() => {
    if (!active || typeof window === 'undefined') return undefined

    const spawnSparkle = (bandIndex = 0, bandCount = 1) => {
      const id = nextSparkleId.current++
      const src = CURSOR_TRAIL_GIFS[nextGifIndex.current % CURSOR_TRAIL_GIFS.length]
      nextGifIndex.current += 1
      const edgePadding = 24
      const availableWidth = Math.max(window.innerWidth - edgePadding * 2, 1)
      const availableHeight = Math.max(window.innerHeight - edgePadding * 2, 1)
      const bandWidth = availableWidth / Math.max(bandCount, 1)
      const x = edgePadding + bandWidth * bandIndex + Math.random() * bandWidth
      const y = edgePadding + Math.random() * availableHeight
      const size = 22 + Math.random() * 42
      const rotation = -24 + Math.random() * 48

      setSparkles((current) => [...current.slice(-LOADING_SPARKLE_MAX_COUNT), { id, x, y, src, size, rotation }])
      const timeoutId = window.setTimeout(() => {
        setSparkles((current) => current.filter((sparkle) => sparkle.id !== id))
      }, LOADING_SPARKLE_LIFETIME_MS)
      sparkleTimeouts.current.push(timeoutId)
    }

    const spawnBurst = () => {
      const count = reducedMotion ? 6 : LOADING_SPARKLE_BURST_COUNT
      for (let index = 0; index < count; index += 1) {
        spawnSparkle(index, count)
      }
    }

    const initialWaveCount = reducedMotion ? 4 : LOADING_SPARKLE_INITIAL_WAVES
    for (let waveIndex = 0; waveIndex < initialWaveCount; waveIndex += 1) {
      const timeoutId = window.setTimeout(spawnBurst, waveIndex * 32 + Math.random() * 26)
      sparkleTimeouts.current.push(timeoutId)
    }
    const intervalId = window.setInterval(spawnBurst, reducedMotion ? 150 : LOADING_SPARKLE_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
      sparkleTimeouts.current.forEach((timeoutId) => window.clearTimeout(timeoutId))
      sparkleTimeouts.current = []
      setSparkles([])
    }
  }, [active, reducedMotion])

  if (!active) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483646,
        pointerEvents: 'none',
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
            transform: `translate(-50%, -50%) rotate(${sparkle.rotation}deg)`,
            objectFit: 'contain',
            userSelect: 'none',
          }}
        />
      ))}
    </div>
  )
}

export default function App() {
  const responsive = useResponsiveShell()
  const {
    isTouch,
    prefersReducedMotion,
  } = responsive
  const [route, setRoute] = useState(() =>
    parseRouteFromHash(typeof window !== 'undefined' ? window.location.hash : ''),
  )
  const [aboutBrowserHistory, setAboutBrowserHistory] = useState(() => {
    const initialRoute = parseRouteFromHash(typeof window !== 'undefined' ? window.location.hash : '')
    const initialEntry = getAboutHistoryEntry(initialRoute)
    return { entries: [initialEntry], index: 0 }
  })
  const [aboutBrowserReloadKey, setAboutBrowserReloadKey] = useState(0)
  const [openedAboutFolderIds, setOpenedAboutFolderIds] = useState([])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [hasOpenedPreview, setHasOpenedPreview] = useState(false)
  const [editorCorners, setEditorCorners] = useState([null, null, null, null])
  const [activeEditorCorner, setActiveEditorCorner] = useState(0)
  const [snapshotLabel, setSnapshotLabel] = useState('')
  const [savedSnapshots, setSavedSnapshots] = useState([])
  const pendingRoomNavigationRef = useRef(0)
  const [transitionSnapshotUrl, setTransitionSnapshotUrl] = useState(null)
  const [isSceneTransitioning, setIsSceneTransitioning] = useState(false)

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
    const sparkleAssets = [...CURSOR_TRAIL_GIFS, CURSOR_CLICK_GIF]
    sparkleAssets.forEach((src) => {
      const image = new Image()
      image.src = src
    })

    const cancelIdlePreload = runWhenIdle(() => {
      ROOM_FILES.forEach((_, roomIndex) => preloadRoomAsset(roomIndex))
    })

    return cancelIdlePreload
  }, [])

  useEffect(() => {
    if (route.type !== 'room') return

    preloadRoomAsset(route.roomIndex)
    preloadRoomAsset((route.roomIndex + 1) % ROOM_FILES.length)
  }, [route])

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return

    if (route.type === 'home-editor' || isTouch) {
      document.documentElement.style.removeProperty('--app-cursor')
      document.documentElement.style.removeProperty('--app-hover-cursor')
      return
    }

    document.documentElement.style.setProperty('--app-cursor', MAIN_KEY_CURSOR)
    document.documentElement.style.setProperty('--app-hover-cursor', HOVER_KEY_CURSOR)
  }, [isTouch, route.type])

  const clearTransitionCover = useCallback(() => {
    setTransitionSnapshotUrl(null)
    setIsSceneTransitioning(false)
  }, [])

  const beginSceneTransition = useCallback(() => {
    setIsSceneTransitioning(true)
    setTransitionSnapshotUrl(captureCurrentCanvasFrame())
  }, [])

  const openRoom = useCallback(async (roomNumber) => {
    const navigationId = pendingRoomNavigationRef.current + 1
    pendingRoomNavigationRef.current = navigationId
    beginSceneTransition()
    await waitForRoomAsset(roomNumber - 1)
    if (pendingRoomNavigationRef.current !== navigationId) return
    navigateWithHash(`#${ROOM_HASH_PREFIX}${roomNumber}`)
  }, [beginSceneTransition])

  const openNextRoom = useCallback(async (roomNumber) => {
    const nextRoomNumber = roomNumber >= ROOM_FILES.length ? 1 : roomNumber + 1
    const navigationId = pendingRoomNavigationRef.current + 1
    pendingRoomNavigationRef.current = navigationId
    beginSceneTransition()
    await waitForRoomAsset(nextRoomNumber - 1)
    if (pendingRoomNavigationRef.current !== navigationId) return
    navigateWithHash(`#${ROOM_HASH_PREFIX}${nextRoomNumber}`)
  }, [beginSceneTransition])

  const closeRoom = useCallback(() => {
    setIsPreviewOpen(false)
    setHasOpenedPreview(true)
    beginSceneTransition()
    navigateWithHash(HOME_HASH)
  }, [beginSceneTransition])

  const openAbout = useCallback(() => {
    setAboutBrowserHistory((current) => {
      if (current.entries[current.index] === ABOUT_HOME_TAB.id) return current
      const nextEntries = current.entries.slice(0, current.index + 1)
      nextEntries.push(ABOUT_HOME_TAB.id)
      return { entries: nextEntries, index: nextEntries.length - 1 }
    })
    navigateWithHash(ABOUT_HASH)
  }, [])

  const closeAbout = useCallback(() => {
    setIsPreviewOpen(false)
    setHasOpenedPreview(true)
    navigateWithHash(HOME_HASH)
  }, [])

  const openFolder = useCallback((folderId) => {
    setAboutBrowserHistory((current) => {
      if (!folderId || !FOLDER_MAP.has(folderId) || current.entries[current.index] === folderId) return current
      const nextEntries = current.entries.slice(0, current.index + 1)
      nextEntries.push(folderId)
      return { entries: nextEntries, index: nextEntries.length - 1 }
    })
    navigateWithHash(`#${FOLDER_HASH_PREFIX}${folderId}`)
  }, [])

  const rememberAboutFolderOpen = useCallback((folderId) => {
    if (!folderId || !FOLDER_MAP.has(folderId)) return
    setOpenedAboutFolderIds((current) => (current.includes(folderId) ? current : [...current, folderId]))
  }, [])

  const navigateAboutHistory = useCallback((direction) => {
    setAboutBrowserHistory((current) => {
      const nextIndex = current.index + direction
      if (nextIndex < 0 || nextIndex >= current.entries.length) return current

      navigateWithHash(getHashForAboutHistoryEntry(current.entries[nextIndex]))
      return { ...current, index: nextIndex }
    })
  }, [])

  const reloadAboutHistory = useCallback(() => {
    setAboutBrowserReloadKey((current) => current + 1)
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
  const sceneTransitionLayer = (
    <>
      <SceneTransitionCover snapshotUrl={transitionSnapshotUrl} />
      <LoadingGlitterOverlay active={isSceneTransitioning} reducedMotion={prefersReducedMotion} />
    </>
  )

  if (route.type === 'room') {
    const roomNumber = route.roomIndex + 1
    const roomFile = ROOM_FILES[route.roomIndex]
    return (
      <>
        <RoomPage
          key={roomFile}
          roomNumber={roomNumber}
          roomFile={roomFile}
          cameraDefault={ROOM_CAMERA_DEFAULTS[route.roomIndex]}
          onBack={closeRoom}
          onOpenNextRoom={() => openNextRoom(roomNumber)}
          onReady={clearTransitionCover}
        />
        {sceneTransitionLayer}
      </>
    )
  }

  if (route.type === 'about') {
    return (
      <>
        <AboutPage
          key={`about-${aboutBrowserReloadKey}`}
          onBackHome={closeAbout}
          onShowAbout={openAbout}
          onOpenFolder={openFolder}
          onBrowserBack={() => navigateAboutHistory(-1)}
          onBrowserForward={() => navigateAboutHistory(1)}
          onBrowserReload={reloadAboutHistory}
          canBrowserGoBack={aboutBrowserHistory.index > 0}
          canBrowserGoForward={aboutBrowserHistory.index < aboutBrowserHistory.entries.length - 1}
          openedFolderIds={openedAboutFolderIds}
          onRememberFolderOpen={rememberAboutFolderOpen}
          isTouch={isTouch}
        />
        {sceneTransitionLayer}
        {!isTouch && !prefersReducedMotion && <CursorSparkles />}
      </>
    )
  }

  if (route.type === 'folder') {
    return (
      <>
        <AboutPage
          key={`about-${aboutBrowserReloadKey}`}
          onBackHome={closeAbout}
          onShowAbout={openAbout}
          onOpenFolder={openFolder}
          onBrowserBack={() => navigateAboutHistory(-1)}
          onBrowserForward={() => navigateAboutHistory(1)}
          onBrowserReload={reloadAboutHistory}
          canBrowserGoBack={aboutBrowserHistory.index > 0}
          canBrowserGoForward={aboutBrowserHistory.index < aboutBrowserHistory.entries.length - 1}
          activeFolderId={route.folderId}
          openedFolderIds={openedAboutFolderIds}
          onRememberFolderOpen={rememberAboutFolderOpen}
          isTouch={isTouch}
        />
        {sceneTransitionLayer}
        {!isTouch && !prefersReducedMotion && <CursorSparkles />}
      </>
    )
  }

  if (route.type === 'home-editor') {
    const canWriteSnapshot = snapshotLabel.trim().length > 0 && editorCorners.every((corner) => Boolean(corner))

    return (
      <div
        style={{
          width: '100vw',
          height: '100dvh',
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
            maxHeight: 'calc(100dvh - 48px)',
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
        height: '100dvh',
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
        aria-hidden={!(hasOpenedPreview && !isPreviewOpen)}
      >
        <HomeScene
          onModelLoaded={undefined}
          onOpenRoom={openRoom}
          onReady={clearTransitionCover}
        />
      </div>

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

        <button
          type="button"
          onClick={openAbout}
          style={{
            border: 'none',
            background: 'transparent',
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
            cursor: 'inherit',
          }}
        >
          {HOME_TITLE}
        </button>
      </div>

      {!hasOpenedPreview && !isPreviewOpen && (
        <PreviewLauncher onOpen={openPreview} isTouch={isTouch} />
      )}
      {isPreviewOpen && <ProjectPreviewWindow onClose={closePreview} isTouch={isTouch} />}
      {sceneTransitionLayer}
    </div>
  )
}

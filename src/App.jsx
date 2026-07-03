import React, { useState, Suspense, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stage, Html, useGLTF, KeyboardControls, useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'

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
  {
    position: [-0.04, 1.55, 2.25],
    target: [-0.04, 1.05, 0.25],
  },
  {
    position: [0.27, 1.55, 2.15],
    target: [0.27, 1.08, -0.06],
  },
  {
    position: [-0.13, 0.45, 2.6],
    target: [-0.13, -0.25, 0.16],
  },
  {
    position: [-3.08, 0.5, -0.11],
    target: [-0.08, -0.2, -0.11],
  },
  {
    position: [-0.44, 0.5, -3.09],
    target: [-0.44, -0.2, -0.09],
  },
  {
    position: [-2.94, 0.5, 0.05],
    target: [-0.14, -0.2, 0.05],
  },
  {
    position: [0.06, 0.5, -3.14],
    target: [0.06, -0.2, 0.06],
  },
]
const ROOM_FILES = [
  'YUNA WEB.glb',
  'SUZUNE WEB.glb',
  'AIKO WEB.glb',
  'MOENE WEB.glb',
  'PARDIS WEB.glb',
  'KAORI WEB.glb',
  'REI WEB.glb',
  'YURIA WEB.glb',
  'MOMOCO WEB.glb',
  'KUMO&MUKI WEB.glb',
  'MIMI WEB.glb',
]
const CONTACT_EMAIL = 'shelestvetrovki@gmail.com'
const CV_URL = 'https://docs.google.com/document/d/1VH0PZsOzxVn9IuuzZgf_y74OQ4W5b1L8vAyQHMuTyfs/edit?tab=t.0'
const HOME_TITLE = 'shelestvetrovki'
const PREVIEW_FILENAME = 'shelestvetrovki.mp4'
const HOME_HASH = '#home'
const HOME_EDITOR_HASH = '#home-editor'
const HOME_EDITOR_ENABLED = false
const ABOUT_HASH = '#about'
const ROOM_HASH_PREFIX = 'room-'
const FOLDER_HASH_PREFIX = 'folder-'
const FOLDER_LIGHTBOX_HASH_SEGMENT = 'image'
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
const MAIN_KEY_CURSOR_HOTSPOT = '28 24'
const HOVER_KEY_CURSOR_HOTSPOT = '13 12'
const HOME_EDITOR_STORAGE_KEY = 'nana-home-editor-state'
const FOLDER_DRAG_THRESHOLD_PX = 4
const DEFAULT_ABOUT_HTML = `shelestvetrovki is a Ukrainian-born, Tokyo-based media artist and filmmaker. She is the co-founder of <a href="https://localgr0up.com/" target="_blank" rel="noreferrer">local.group</a>, a Ukrainian art collective and print publication curating exhibitions and fundraisers worldwide through a post-internet lens. In 2023, following the full-scale invasion of Ukraine, she received a research scholarship in Media Arts at Tama Art University. Her art practice intersects hyperfeminist politics, media theory, and meme culture through 3D lidar scanning. Her project "she is so hot i wanna clean her room" has been featured by PHMuseum, i-D, SABUKARU, MOX London, Festival Panoramic, and PhotoVogue. She is currently developing a feature-length desktop documentary exploring Ukrainian Gen Z, war-shaped identity, and digital spirituality.`
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
const EXHIBITION_IMAGE_MODULES = import.meta.glob('../target/exhibitions/**/*.{jpeg,jpg,jpg_,png,webp,JPEG,JPG,PNG,WEBP}', { eager: true, query: '?url', import: 'default' })
const EXHIBITION_VIDEO_MODULES = import.meta.glob('../target/exhibitions/**/*.{mov,mp4,webm,MOV,MP4,WEBM}', { eager: true, query: '?url', import: 'default' })
const OPEN_ARCHIVE_IMAGE_MODULES = import.meta.glob('../target/open collective archive/**/*.{jpeg,jpg,png,webp,gif,JPEG,JPG,PNG,WEBP,GIF}', { eager: true, query: '?url', import: 'default' })
const OPEN_ARCHIVE_THUMB_MODULES = import.meta.glob('../target/open collective archive thumbnails/**/*.jpg', { eager: true, query: '?url', import: 'default' })
const EXHIBITIONS = [
  {
    id: 'women-by-women',
    title: 'Women by Women',
    year: '2026',
    dates: '1 March - 8 March 2026',
    venue: 'PhotoVogue',
    location: 'Biblioteca Nazionale Braidense',
    description: [
      'The 10th edition of the PhotoVogue Festival. The PhotoVogue Women by Women global open call shortlist features 150 photographers, selected from nearly 100,000 submissions across 149 countries, the festival showcasing contemporary female gaze.',
      'March 1st to 4th, 2026 at Biblioteca Nazionale Braidense, Milan.',
    ],
    links: [
      { url: 'https://www.vogue.com/article/pvf-2026-conversations-girlhood-fantasy-and-the-inner-life', label: 'Vogue: Conversations on Girlhood, Fantasy, and the Inner Life' },
    ],
    imageFolder: 'Women on Women',
  },
  {
    id: 'bed-doesnt-ask-questions',
    title: "Bed doesn't ask questions",
    year: '2025',
    venue: 'Festival Panoramic',
    location: 'Barcelona, Spain',
    caption: '6x3m digital print, 2025.',
    description: [
      "Chantal Akerman, Anne Glassner, Naked Space, shelestvetrovki.",
      "Curated by Estela Ortiz & Juan Evaristo Valls Boix.",
      "The exhibition reflects on rest, centering on the bed and the private room, taking Chantal Akerman's La chambre as its point of departure. Through a dialogue between artistic works and memetic expressions from recent years, this group show explores which bodies have access to rest and highlights the public dimension of practices that, at first glance, appear to be private.",
      'In the contemporary world, the imperatives of work infiltrate our beds and encroach upon our intimacy, while idleness and pause too often remain privileges accessible to only a few. For this reason, a sleeping body today stands as a radical image of freedom--yet also the most elusive: the embrace of time without purpose.',
    ],
    links: [
      { url: 'https://festivalpanoramic.cat/en/project/panoramic-review-2025/', label: 'Festival Panoramic' },
    ],
    imageFolder: 'Bed Doesn_t Ask Questions - Panoramic Photo Festival Barcelona',
  },
  {
    id: 'spilkaparis-local-group',
    title: 'SpilkaParis x Local Group',
    year: '2025',
    venue: 'Kolektiv Radieuse',
    location: "Le Corbusier's Cite Radieuse, Marseille, France",
    description: [
      'Group project with Local Group at Kolektiv Radieuse.',
    ],
    links: [],
    imageFolder: '2025   SpilkaParis x Local Group, Kolektiv Radieuse, Le Corbusier’s Cité Radieuse, Marseille, France',
  },
  {
    id: 'localstickerbook-domicile',
    title: 'Localstickerbook, Films fundraiser',
    year: '2024',
    venue: 'Domicile Gallery',
    location: 'Tokyo, Japan',
    description: [
      'Films fundraiser and screening with Localstickerbook.',
    ],
    links: [],
  },
  {
    id: 'mom-post-internet-is-not-a-phase',
    title: 'MOM, POST-INTERNET IS NOT A PHASE ;(',
    year: '2024',
    venue: 'Okay Initiative Space',
    location: 'Athens, Greece',
    description: [
      'Curator: Yan Tashtoush',
      'NOISTRUCT, CÁRPATOS, ZORKKKKKA, GAARA collective, LEO ADEF, CHRIS ECHO, SHELESTVETROVKI, P0BREDIABLA',
      '"MOM, post-internet is not a phase ;(" is a group exhibition exploring the shifting relationship between humans and our digital landscapes amidst visceral cry against the erasure of lives, bombed-out cities and abandoned homes in a global apathy that watches wars unfold, as entire populations are reduced to digital fragments, while the cries for justice are drowned by the endless cycle of "click, scroll, refresh." — curatorial message Yan Tashtoush',
    ],
    links: [
      { url: 'https://www.kubaparis.com/submission/469655', label: 'Kuba Paris: MOM, POST-INTERNET IS NOT A PHASE ;(' },
    ],
    imageFolder: 'MOM, POST-INTERNET IS NOT A PHASE _(',
  },
  {
    id: 'book-exhibition-untitled-space',
    title: 'Book Exhibition',
    year: '2024',
    venue: 'UNTITLED SPACE',
    location: 'Tokyo, Japan',
    description: [
      'Book exhibition in Tokyo.',
    ],
    links: [],
  },
  {
    id: 'localstickerbook-datsuijo',
    title: 'Localstickerbook, Films Fundraiser',
    year: '2024',
    venue: 'Datsuijo Gallery',
    location: 'Tokyo, Japan',
    description: [
      'Films fundraiser with Localstickerbook.',
    ],
    links: [],
  },
  {
    id: 'bezzvuchnodohlukhoty',
    title: 'bezzvuchnodohlukhoty',
    year: '2023',
    venue: 'Kyiv National Academy of Arts',
    location: 'Kyiv, Ukraine',
    description: [
      'Group exhibition at the National Academy of Fine Arts.',
    ],
    links: [],
    imageFolder: 'Kyiv National Academy of Arts',
  },
  {
    id: 'tama-art-university-installation',
    title: 'Multimedia interactive installation',
    year: '2023',
    venue: 'Tama Art University',
    location: 'Tokyo, Japan',
    description: [
      'Multimedia interactive installation presented at Tama Art University.',
    ],
    links: [],
    videoFolder: 'Tama Art University 2023',
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
    alt: '',
    sortKey: filename,
  })

  return collection
}, new Map())

EXHIBITION_IMAGES_BY_FOLDER.forEach((images) => {
  images.sort((a, b) => a.sortKey.localeCompare(b.sortKey, undefined, { numeric: true }))
})

const EXHIBITION_VIDEOS_BY_FOLDER = Object.entries(EXHIBITION_VIDEO_MODULES).reduce((collection, [path, src], index) => {
  const normalizedPath = path.replace(/\\/g, '/')
  const segments = normalizedPath.split('/')
  const folderName = segments[segments.length - 2] ?? 'exhibition'
  const filename = segments[segments.length - 1] ?? `video-${index + 1}`
  const stem = filename.replace(/\.[^.]+$/, '')

  if (!collection.has(folderName)) {
    collection.set(folderName, [])
  }

  collection.get(folderName).push({
    src,
    title: stem.replace(/[_-]/g, ' '),
    sortKey: filename,
  })

  return collection
}, new Map())

EXHIBITION_VIDEOS_BY_FOLDER.forEach((videos) => {
  videos.sort((a, b) => a.sortKey.localeCompare(b.sortKey, undefined, { numeric: true }))
})

function getStableNumber(value) {
  return Array.from(value).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0)
}

function getOpenArchiveAssetKey(path) {
  const normalizedPath = path.replace(/\\/g, '/')
  const segments = normalizedPath.split('/')
  const filename = segments[segments.length - 1] ?? ''
  const page = segments[segments.length - 2] ?? 'open archive'
  const stem = filename.replace(/\.[^.]+$/, '')
  return `${page}/${stem}`
}

const OPEN_ARCHIVE_THUMBS_BY_KEY = new Map(
  Object.entries(OPEN_ARCHIVE_THUMB_MODULES).map(([path, src]) => [getOpenArchiveAssetKey(path), src])
)

const OPEN_ARCHIVE_IMAGES = Object.entries(OPEN_ARCHIVE_IMAGE_MODULES)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([path, src], index) => {
    const normalizedPath = path.replace(/\\/g, '/')
    const segments = normalizedPath.split('/')
    const filename = segments[segments.length - 1] ?? `archive-${index + 1}`
    const page = segments[segments.length - 2] ?? 'open archive'
    const stem = filename.replace(/\.[^.]+$/, '')
    const assetKey = getOpenArchiveAssetKey(path)
    return {
      src,
      thumbSrc: OPEN_ARCHIVE_THUMBS_BY_KEY.get(assetKey) ?? src,
      alt: stem.replace(/[_-]/g, ' '),
      filename,
      page,
      seed: getStableNumber(`${page}/${filename}`),
    }
  })

const FOLDER_DEFINITIONS = [
  {
    id: 'cv',
    label: 'cv',
    title: 'CV',
    externalUrl: CV_URL,
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
    id: 'press',
    label: 'press',
    title: 'Press',
    sections: [
      {
        heading: '2026',
        links: [
          { url: 'https://www.vogue.com/article/a-project-about-gen-z-youth-in-ukraine?fbclid=PAdGRleAQpBMlleHRuA2FlbQIxMQBzcnRjBmFwcF9pZA8xMjQwMjQ1NzQyODc0MTQAAadkgc9wIQkccTcXOcbHOOxd4wWiCWSpJvO0sIrSnEJ86m0lLWdtYe7iTQ3YNQ_aem_W62CPaBczjId_yDnCjozuQ', label: 'Photo Vogue: Ukrainian Gen Z Adolescence' },
          { url: 'https://www.vogue.com/article/women-by-women-the-shortlist', label: 'PhotoVogue Global, Women by Women Shortlist' },
          { url: 'https://queerwararchive.com/2026/02/18/shelest-vetrovki-anastasiia-pischanska-gen-z/', label: 'Queer War Archive: Ukrainian Gen Z Youth' },
        ],
      },
      {
        heading: '2025',
        links: [
          { url: 'https://festivalpanoramic.cat/en/project/panoramic-review-2025/', label: "Festival Panoramic: Bed Doesn't Ask Questions 2025" },
        ],
      },
      {
        heading: '2024',
        links: [
          { url: 'https://www.yokogaomag.com/editorial/shes-so-hot-i-wanna-clean-her-room-shelestvetrovki', label: "Yokogao Mag: She's So Hot I Wanna Clean Her Room" },

          { url: 'https://www.kubaparis.com/submission/469655', label: 'Kuba Paris: MOM, POST-INTERNET IS NOT A PHASE ;(' },
          { url: 'https://becoming.press/dialogues-on-corecore', label: 'Becoming Press: Dialogues on CoreCore' },
          { url: 'https://www.instagram.com/p/DDmLc2Th1PV/', label: 'SABUKARU JAPAN' },
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
        heading: '2026',
        links: [
          { url: 'https://substack.com/@shelestvetrovki/note/p-194245632?utm_source=notes-share-action&r=33oaqu', label: 'Substack: and another fig was a girl wearing nipple patches', image: 'assets/another-fig-cover.jpg', iconLabel: 'and another fig was a girl wearing nipple patches' },
        ],
      },
      {
        heading: '2025',
        links: [
          { url: 'https://readellion.com/product/lexiconofnature/', label: 'Readellion Publishing: Spiritual Ecocides, Lexicon Of Nature, LocalGroup', image: 'assets/lexicon-new-1600x1600.webp', iconLabel: 'Readellion Publishing: Spiritual Ecocides, Lexicon Of Nature, LocalGroup' },
        ],
      },
      {
        heading: '2024',
        links: [
          { url: 'https://becoming.press/dialogues-on-corecore', label: 'Becoming Press Publishing: Dialogues on CoreCore & the Contemporary Online Avant-Garde', image: 'assets/05A_-CoreCore-front_.png', iconLabel: 'Dialogues on CoreCore & the Contemporary Online Avant-Garde (2024)' },
          { url: 'https://substack.com/@shelestvetrovki/p-151684169', label: 'Substack: notes on being unemployed (in a spiritual way)', image: 'assets/notes-unemployed-cover.jpg', iconLabel: 'notes on being unemployed (in a spiritual way)' },
        ],
      },
    ],
  },
  {
    id: 'filmmaking',
    label: 'curation',
    title: 'Curation',
    sections: [

      {
        heading: 'CURATING',
        entries: [
          { year: '2025', item: "SpilkaParis x Local Group, Kolektiv Radieuse, Le Corbusier's Cité Radieuse, Marseille, France", url: 'https://www.instagram.com/p/DLiPmNXoxwA/' },
          { year: '2025', item: 'Localstickerbook, Films fundraiser, Domicile Gallery, Tokyo, Japan', url: 'https://www.instagram.com/p/DF5DwVPiRwL/' },
          { year: '2025', item: 'OpenSecret x Localstickerbook, Internet Cinema, Untitled Space Gallery, Tokyo, Japan', url: 'https://www.ultra.art/p/the-fourth-secret-of-internet-cinema' },
          { year: '2024', item: 'Localstickerbook, Films Fundraiser, Datsuijo Gallery, Tokyo, Japan', url: 'https://datsuijo.com/' },
          { year: '2022', item: 'Localstickerbook, Experimental Film Screening, Filaret 16, Bucharest, Romania', url: 'https://www.facebook.com/Filaret16DiY/' },
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
  {
    id: 'diary',
    label: 'diary',
    title: 'Diary',
    sections: [],
  },
  {
    id: 'open-collective-archive',
    label: 'open collective archive',
    title: 'Open Collective Archive',
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
const ROOM_RENDER_VARIANTS = [
  {
    id: 'current',
    label: 'current',
    settings: DEFAULT_ROOM_RENDER_SETTINGS,
    stageEnvironment: null,
    ambientLightIntensity: 0,
    controls: {
      moveSpeed: 0.05,
      zoomSpeed: 2.2,
      rotateSpeed: 0.4,
      panSpeed: 0.4,
      enablePan: true,
      dampingFactor: 0.05,
    },
  },
  {
    id: 'calm',
    label: 'calm',
    settings: DEFAULT_ROOM_RENDER_SETTINGS,
    stageEnvironment: null,
    ambientLightIntensity: 0,
    controls: {
      moveSpeed: 0.025,
      enablePan: false,
      zoomSpeed: 0.85,
      rotateSpeed: 0.35,
      dampingFactor: 0.08,
      minDistance: 0.08,
      maxDistance: 3.8,
    },
  },
  {
    id: 'snappy',
    label: 'snappy',
    settings: DEFAULT_ROOM_RENDER_SETTINGS,
    stageEnvironment: null,
    ambientLightIntensity: 0,
    controls: {
      moveSpeed: 0.085,
      enablePan: true,
      zoomSpeed: 2.8,
      rotateSpeed: 0.62,
      panSpeed: 0.55,
      dampingFactor: 0.035,
      minDistance: 0.06,
      maxDistance: 5,
    },
  },
  {
    id: 'orbit',
    label: 'orbit only',
    settings: DEFAULT_ROOM_RENDER_SETTINGS,
    stageEnvironment: null,
    ambientLightIntensity: 0,
    controls: {
      moveSpeed: 0,
      enablePan: false,
      zoomSpeed: 0.75,
      rotateSpeed: 0.45,
      dampingFactor: 0.1,
      minDistance: 0.08,
      maxDistance: 3.8,
    },
  },
  {
    id: 'fixed',
    label: 'fixed target',
    settings: DEFAULT_ROOM_RENDER_SETTINGS,
    stageEnvironment: null,
    ambientLightIntensity: 0,
    controls: {
      moveSpeed: 0.035,
      keyboardTargetMode: 'fixed',
      enablePan: false,
      zoomSpeed: 0.9,
      rotateSpeed: 0.42,
      dampingFactor: 0.08,
      minDistance: 0.08,
      maxDistance: 3.8,
    },
  },
  {
    id: 'slow',
    label: 'slow walk',
    settings: DEFAULT_ROOM_RENDER_SETTINGS,
    stageEnvironment: null,
    ambientLightIntensity: 0,
    controls: {
      moveSpeed: 0.012,
      enablePan: true,
      zoomSpeed: 0.6,
      rotateSpeed: 0.32,
      panSpeed: 0.22,
      dampingFactor: 0.08,
      minDistance: 0.08,
      maxDistance: 3.8,
    },
  },
  {
    id: 'nozoom',
    label: 'no zoom',
    settings: DEFAULT_ROOM_RENDER_SETTINGS,
    stageEnvironment: null,
    ambientLightIntensity: 0,
    controls: {
      moveSpeed: 0.03,
      enableZoom: false,
      enablePan: false,
      zoomSpeed: 0,
      rotateSpeed: 0.38,
      dampingFactor: 0.09,
    },
  },
  {
    id: 'fly',
    label: 'fly',
    settings: DEFAULT_ROOM_RENDER_SETTINGS,
    stageEnvironment: null,
    ambientLightIntensity: 0,
    controls: {
      moveSpeed: 0.032,
      keyboardAxis: 'view',
      enablePan: false,
      zoomSpeed: 0.8,
      rotateSpeed: 0.4,
      dampingFactor: 0.075,
      minDistance: 0.08,
      maxDistance: 4.2,
    },
  },
]
const DEFAULT_ROOM_RENDER_VARIANT = ROOM_RENDER_VARIANTS[0]
const ROOM_RENDER_VARIANT_MAP = new Map(ROOM_RENDER_VARIANTS.map((variant) => [variant.id, variant]))
const ROOM_RENDER_VARIANT_ALIASES = new Map([
  ['native', 'calm'],
  ['soft', 'orbit'],
  ['bright', 'slow'],
])
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
const ROOM_PRELOAD_STAGGER_MS = 2500
const preloadedRoomAssets = new Set()
const preloadedVideoAssets = new Map()

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

function readRoomRenderVariantFromUrl() {
  if (typeof window === 'undefined') {
    return {
      enabled: false,
      variant: DEFAULT_ROOM_RENDER_VARIANT,
    }
  }

  const params = new URLSearchParams(window.location.search)
  const requestedVariant = params.get('viewer') || params.get('roomViewer')
  const enabled = params.has('viewerVariants') || params.has('viewer') || params.has('roomViewer')
  const resolvedVariantId = ROOM_RENDER_VARIANT_ALIASES.get(requestedVariant) ?? requestedVariant
  const variant = ROOM_RENDER_VARIANT_MAP.get(resolvedVariantId) ?? DEFAULT_ROOM_RENDER_VARIANT

  return { enabled, variant }
}

function writeRoomRenderVariantToUrl(variantId) {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  url.searchParams.set('viewer', variantId)
  url.searchParams.set('viewerVariants', '1')
  window.history.replaceState(window.history.state, '', url)
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
  if (!roomUrl) return
  if (preloadedRoomAssets.has(roomUrl)) return
  preloadedRoomAssets.add(roomUrl)
  useGLTF.preload(roomUrl)
}

function preloadRoomRange(startIndex, count, staggerMs = 0) {
  if (staggerMs <= 0) {
    for (let offset = 0; offset < count; offset += 1) {
      preloadRoomAsset((startIndex + offset) % ROOM_FILES.length)
    }
    return
  }

  let offset = 0
  const preloadNext = () => {
    if (offset >= count) return
    preloadRoomAsset((startIndex + offset) % ROOM_FILES.length)
    offset += 1
    if (offset < count) window.setTimeout(preloadNext, staggerMs)
  }

  preloadNext()
}

function preloadVideoAsset(src) {
  if (typeof document === 'undefined' || preloadedVideoAssets.has(src)) return

  const video = document.createElement('video')
  video.preload = 'auto'
  video.muted = true
  video.playsInline = true
  video.src = src
  video.load()
  preloadedVideoAssets.set(src, video)
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
    const folderPath = normalized.slice(FOLDER_HASH_PREFIX.length)
    const [folderId, folderDetailId, lightboxSegment, imageIndexValue] = folderPath.split('/')
    if (FOLDER_MAP.has(folderId)) {
      const folderImageIndex = lightboxSegment === FOLDER_LIGHTBOX_HASH_SEGMENT ? Number(imageIndexValue) : null
      return {
        type: 'folder',
        folderId,
        folderDetailId: folderDetailId || null,
        folderImageIndex: Number.isInteger(folderImageIndex) && folderImageIndex >= 0 ? folderImageIndex : null,
      }
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

function getFolderRouteKey(folderId, folderDetailId = null, folderImageIndex = null) {
  if (!folderId) return ABOUT_HOME_TAB.id
  const routeParts = [folderId]
  if (folderDetailId) routeParts.push(folderDetailId)
  if (folderDetailId && folderImageIndex != null) routeParts.push(FOLDER_LIGHTBOX_HASH_SEGMENT, String(folderImageIndex))
  return routeParts.join('/')
}

function getFolderRouteParts(entryId) {
  if (!entryId || entryId === ABOUT_HOME_TAB.id) return { folderId: null, folderDetailId: null, folderImageIndex: null }
  const [folderId, folderDetailId, lightboxSegment, imageIndexValue] = String(entryId).split('/')
  const folderImageIndex = lightboxSegment === FOLDER_LIGHTBOX_HASH_SEGMENT ? Number(imageIndexValue) : null
  return {
    folderId,
    folderDetailId: folderDetailId || null,
    folderImageIndex: Number.isInteger(folderImageIndex) && folderImageIndex >= 0 ? folderImageIndex : null,
  }
}

function getAboutAddress(folderId, tabId = 'about', folderDetailId = null, folderImageIndex = null) {
  if (folderId && FOLDER_MAP.has(folderId)) {
    const pathParts = [folderId]
    if (folderDetailId) pathParts.push(folderDetailId)
    if (folderDetailId && folderImageIndex != null) pathParts.push(FOLDER_LIGHTBOX_HASH_SEGMENT, String(folderImageIndex))
    return `${ABOUT_BASE_URL}${pathParts.join('/')}`
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
    return getFolderRouteKey(route.folderId, route.folderDetailId, route.folderImageIndex)
  }

  return ABOUT_HOME_TAB.id
}

function getHashForAboutHistoryEntry(entryId) {
  if (entryId && entryId !== ABOUT_HOME_TAB.id) {
    const { folderId } = getFolderRouteParts(entryId)
    if (folderId && FOLDER_MAP.has(folderId)) {
      return `#${FOLDER_HASH_PREFIX}${entryId}`
    }
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

function ExhibitionLightbox({ image, onNext, onClose }) {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, onNext])

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Next exhibition image"
      onClick={onNext}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483647,
        width: '100vw',
        height: '100vh',
        background: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        aria-label="Close fullscreen image"
        onClick={(event) => {
          event.stopPropagation()
          onClose()
        }}
        style={{
          position: 'fixed',
          top: '14px',
          right: '16px',
          zIndex: 2147483647,
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: HOVER_KEY_CURSOR,
        }}
      >
        <img
          src={GO_BACK_GIF}
          alt="Go back"
          draggable={false}
          style={{ width: 'min(42px, 7vw)', height: 'auto', display: 'block', objectFit: 'contain', cursor: HOVER_KEY_CURSOR }}
        />
      </button>
      <img
        src={image.src}
        alt={image.alt}
        style={{
          display: 'block',
          width: 'auto',
          height: 'auto',
          maxWidth: '100vw',
          maxHeight: '100vh',
          objectFit: 'contain',
        }}
      />
    </div>
  )
}

const DEFAULT_CAMERA_MOVE_SPEED = 0.2
const ROOM_CAMERA_MOVE_SPEED = 0.05
const DEFAULT_CAMERA_ZOOM_SPEED = 1
const ROOM_CAMERA_ZOOM_SPEED = 2.2

function formatCameraVector(vector) {
  return vector.map((value) => Number(value).toFixed(3)).join(', ')
}

function parseCameraVector(value) {
  const parsed = value
    .replace(/[\[\]]/g, '')
    .split(',')
    .map((part) => Number(part.trim()))

  return parsed.length === 3 && parsed.every(Number.isFinite) ? parsed : null
}

function CameraPositionControlsOverlay({ controlsApiRef }) {
  const [positionInput, setPositionInput] = useState('')
  const [targetInput, setTargetInput] = useState('')
  const [message, setMessage] = useState('')
  const isEditingRef = useRef(false)

  const readCamera = useCallback(() => {
    const cameraState = controlsApiRef.current?.read()
    if (!cameraState) return null

    const nextPosition = formatCameraVector(cameraState.position)
    const nextTarget = formatCameraVector(cameraState.target)
    setPositionInput(nextPosition)
    setTargetInput(nextTarget)
    return { position: nextPosition, target: nextTarget }
  }, [controlsApiRef])

  useEffect(() => {
    const syncTimer = window.setInterval(() => {
      if (!isEditingRef.current) readCamera()
    }, 350)

    return () => window.clearInterval(syncTimer)
  }, [readCamera])

  const applyCamera = () => {
    const nextPosition = parseCameraVector(positionInput)
    const nextTarget = parseCameraVector(targetInput)
    if (!nextPosition || !nextTarget) {
      setMessage('Use three comma-separated numbers.')
      return
    }

    if (!controlsApiRef.current?.apply) {
      setMessage('Camera is not ready yet.')
      return
    }
    controlsApiRef.current.apply(nextPosition, nextTarget)
    setMessage('Applied.')
  }

  const copyCamera = async () => {
    const cameraState = readCamera()
    if (!cameraState) {
      setMessage('Camera is not ready yet.')
      return
    }
    const { position, target } = cameraState
    const text = `position: [${position}], target: [${target}]`
    try {
      await navigator.clipboard.writeText(text)
      setMessage('Copied.')
    } catch {
      setMessage(text)
    }
  }

  const fieldStyle = {
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #000',
    background: '#fff',
    color: '#000',
    font: '12px Arial, Helvetica, sans-serif',
    padding: '4px',
  }
  const buttonStyle = {
    border: '1px solid #000',
    background: '#fff',
    color: '#000',
    font: '12px Arial, Helvetica, sans-serif',
    padding: '4px 7px',
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        top: 42,
        zIndex: 100,
        width: 286,
        padding: 10,
        background: 'rgba(255,255,255,0.9)',
        border: '1px solid #000',
        color: '#000',
        font: '12px Arial, Helvetica, sans-serif',
        lineHeight: 1.35,
      }}
    >
      <div style={{ marginBottom: 6, fontWeight: 700 }}>camera</div>
      <label style={{ display: 'block', marginBottom: 6 }}>
        position
        <input
          value={positionInput}
          onChange={(event) => setPositionInput(event.target.value)}
          onFocus={() => { isEditingRef.current = true }}
          onBlur={() => { isEditingRef.current = false }}
          style={fieldStyle}
        />
      </label>
      <label style={{ display: 'block', marginBottom: 8 }}>
        target
        <input
          value={targetInput}
          onChange={(event) => setTargetInput(event.target.value)}
          onFocus={() => { isEditingRef.current = true }}
          onBlur={() => { isEditingRef.current = false }}
          style={fieldStyle}
        />
      </label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
        <button type="button" onClick={readCamera} style={buttonStyle}>read</button>
        <button type="button" onClick={applyCamera} style={buttonStyle}>apply</button>
        <button type="button" onClick={copyCamera} style={buttonStyle}>copy</button>
      </div>
      <div style={{ minHeight: 16, wordBreak: 'break-word' }}>{message}</div>
    </div>
  )
}

function Controls({
  moveSpeed = DEFAULT_CAMERA_MOVE_SPEED,
  zoomSpeed = DEFAULT_CAMERA_ZOOM_SPEED,
  rotateSpeed = 0.4,
  panSpeed = 0.4,
  enablePan = true,
  enableZoom = true,
  enableRotate = true,
  dampingFactor = 0.05,
  keyboardAxis = 'flat',
  keyboardTargetMode = 'follow',
  minDistance,
  maxDistance,
  positionControlsApiRef = null,
}) {
  const [, get] = useKeyboardControls()
  const { camera } = useThree()
  const controlsRef = useRef()

  useEffect(() => {
    if (!positionControlsApiRef) return undefined

    positionControlsApiRef.current = {
      read() {
        return {
          position: camera.position.toArray(),
          target: controlsRef.current?.target?.toArray?.() ?? DEFAULT_CAMERA_TARGET,
        }
      },
      apply(position, target) {
        camera.position.set(...position)
        if (controlsRef.current?.target) {
          controlsRef.current.target.set(...target)
          controlsRef.current.update()
        } else {
          camera.lookAt(...target)
        }
      },
    }

    return () => {
      positionControlsApiRef.current = null
    }
  }, [camera, positionControlsApiRef])

  useFrame(() => {
    const { forward, backward, left, right } = get()

    if (!(forward || backward || left || right)) return

    const forwardDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    if (keyboardAxis !== 'view') {
      forwardDir.y = 0
    }
    forwardDir.normalize()

    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    if (keyboardAxis !== 'view') {
      rightDir.y = 0
    }
    rightDir.normalize()

    const moveDir = new THREE.Vector3(0, 0, 0)
    if (forward) moveDir.add(forwardDir)
    if (backward) moveDir.sub(forwardDir)
    if (left) moveDir.sub(rightDir)
    if (right) moveDir.add(rightDir)

    if (moveDir.length() === 0) return

    moveDir.normalize().multiplyScalar(moveSpeed)
    camera.position.add(moveDir)

    if (controlsRef.current && keyboardTargetMode !== 'fixed') {
      controlsRef.current.target.add(moveDir)
      controlsRef.current.update()
    } else if (controlsRef.current) {
      controlsRef.current.update()
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      rotateSpeed={rotateSpeed}
      zoomSpeed={zoomSpeed}
      panSpeed={panSpeed}
      enablePan={enablePan}
      enableZoom={enableZoom}
      enableRotate={enableRotate}
      enableDamping
      dampingFactor={dampingFactor}
      minDistance={minDistance}
      maxDistance={maxDistance}
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
    if (onModelLoaded) onModelLoaded(scene)
  }, [onModelLoaded])
  const handleHomeReady = useCallback(() => {
    onReady?.()
  }, [onReady])

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
          <FirstFrameSignal onReady={handleHomeReady} />
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

function RoomTickerBar({ onOpenSubmit }) {
  return (
    <button type="button" className="room-ticker-bar" onClick={onOpenSubmit} aria-label="Submit room">
      <span>clean my room +++++ clean my room +++++ clean my room +++++</span>
    </button>
  )
}

function MobileDesktopNotice() {
  return (
    <main className="mobile-desktop-notice" aria-label="Desktop notice">
      <img src={HOME_WELCOME_GIF} alt="welcome to my page" />
      <p>please open on desktop</p>
    </main>
  )
}

function RoomRenderVariantControls({ selectedVariantId, onSelectVariant }) {
  const selectedVariant = ROOM_RENDER_VARIANT_MAP.get(selectedVariantId) ?? DEFAULT_ROOM_RENDER_VARIANT

  return (
    <div className="room-render-variant-controls" aria-label="Room render variants">
      <div className="room-render-variant-status">movement test: {selectedVariant.label}</div>
      {ROOM_RENDER_VARIANTS.map((variant) => (
        <button
          type="button"
          key={variant.id}
          className={variant.id === selectedVariantId ? 'is-active' : ''}
          onClick={() => onSelectVariant(variant.id)}
        >
          {variant.label}
        </button>
      ))}
    </div>
  )
}

function RoomPage({ roomNumber, roomFile, cameraDefault, onBack, onHome, onOpenNextRoom, onOpenSubmit, canGoBack, onReady }) {
  const positionControlsApiRef = useRef(null)
  const roomRenderVariantState = useMemo(readRoomRenderVariantFromUrl, [])
  const [roomRenderVariantId, setRoomRenderVariantId] = useState(roomRenderVariantState.variant.id)
  const roomRenderVariant = ROOM_RENDER_VARIANT_MAP.get(roomRenderVariantId) ?? DEFAULT_ROOM_RENDER_VARIANT
  const roomRenderSettings = roomRenderVariant.settings
  const prepareRoomScene = useCallback((scene) => {
    applyRoomMaterialOverrides(scene, roomRenderSettings)
  }, [roomRenderSettings])
  const handleSelectRoomRenderVariant = useCallback((variantId) => {
    setRoomRenderVariantId(variantId)
    writeRoomRenderVariantToUrl(variantId)
  }, [])
  const showPositionControls = useMemo(() => {
    if (typeof window === 'undefined') return false
    const params = new URLSearchParams(window.location.search)
    return (
      params.get('positionControls') === '1' ||
      params.get('cameraControls') === '1' ||
      params.get('controls') === 'position'
    )
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
      <RoomTickerBar onOpenSubmit={onOpenSubmit} />
      <KeyboardControls map={keyboardMap}>
        <Canvas gl={CANVAS_GL_OPTIONS} camera={{ position: cameraDefault.position, fov: 47.5 }} style={{ cursor: 'inherit', touchAction: 'auto' }}>
          <color attach="background" args={['#fff']} />
          <Suspense fallback={<LoadingCanvasFallback />}>
            <RendererSettings toneMapping={roomRenderSettings.toneMapping} exposure={roomRenderSettings.exposure} />
            {roomRenderVariant.ambientLightIntensity > 0 && <ambientLight intensity={roomRenderVariant.ambientLightIntensity} />}
            <Stage environment={roomRenderVariant.stageEnvironment} intensity={roomRenderSettings.environmentIntensity} shadows={false} adjustCamera={false}>
              <Model url={`rooms/${roomFile}`} prepareScene={prepareRoomScene} />
            </Stage>
            <Controls
              moveSpeed={roomRenderVariant.controls.moveSpeed ?? ROOM_CAMERA_MOVE_SPEED}
              zoomSpeed={roomRenderVariant.controls.zoomSpeed ?? ROOM_CAMERA_ZOOM_SPEED}
              rotateSpeed={roomRenderVariant.controls.rotateSpeed ?? 0.4}
              panSpeed={roomRenderVariant.controls.panSpeed ?? 0.4}
              enablePan={roomRenderVariant.controls.enablePan ?? true}
              enableZoom={roomRenderVariant.controls.enableZoom ?? true}
              enableRotate={roomRenderVariant.controls.enableRotate ?? true}
              dampingFactor={roomRenderVariant.controls.dampingFactor ?? 0.05}
              keyboardAxis={roomRenderVariant.controls.keyboardAxis ?? 'flat'}
              keyboardTargetMode={roomRenderVariant.controls.keyboardTargetMode ?? 'follow'}
              minDistance={roomRenderVariant.controls.minDistance}
              maxDistance={roomRenderVariant.controls.maxDistance}
              positionControlsApiRef={showPositionControls ? positionControlsApiRef : null}
            />
            <CameraReset position={cameraDefault.position} target={cameraDefault.target} />
            <FirstFrameSignal onReady={onReady} />
          </Suspense>
        </Canvas>
      </KeyboardControls>
      {showPositionControls && <CameraPositionControlsOverlay controlsApiRef={positionControlsApiRef} />}
      {roomRenderVariantState.enabled && (
        <RoomRenderVariantControls
          selectedVariantId={roomRenderVariant.id}
          onSelectVariant={handleSelectRoomRenderVariant}
        />
      )}

      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack}
        style={{
          position: 'absolute',
          bottom: '48px',
          left: '24px',
          border: 'none',
          background: 'transparent',
          padding: 0,
          zIndex: 20,
          cursor: canGoBack ? HOVER_KEY_CURSOR : 'default',
        }}
        aria-label="Go back to previous room"
      >
        <img
          src={GO_BACK_GIF}
          alt="Go back"
          style={{ width: 'min(55px, 9vw)', height: 'auto', display: 'block', objectFit: 'contain', cursor: canGoBack ? HOVER_KEY_CURSOR : 'default' }}
        />
      </button>

      <button
        type="button"
        onClick={onHome}
        aria-label="Go home"
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          zIndex: 20,
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: HOVER_KEY_CURSOR,
        }}
      >
        <img
          src={ABOUT_HOME_GIF}
          alt="home"
          draggable={false}
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
          alt={`Go to room ${roomNumber === ROOM_FILES.length ? 1 : roomNumber + 1}`}
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

function DiaryDeck({ left, top, width, availableHeight, inline = false, onOpenDiary }) {
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
              onClick={offset < 0 ? showPrev : offset > 0 ? showNext : onOpenDiary}
              aria-label={offset < 0 ? 'Show previous diary photo' : offset > 0 ? 'Show next diary photo' : 'Open diary'}
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
                pointerEvents: 'auto',
                cursor: isActive && onOpenDiary ? HOVER_KEY_CURSOR : 'pointer',
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
  activeFolderDetailId = null,
  activeFolderImageIndex = null,
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
  const [browserAddress, setBrowserAddress] = useState(() => getAboutAddress(activeFolderId, getAboutTabId(activeFolderId), activeFolderDetailId, activeFolderImageIndex))

  const folderArcLayout = [
    { id: 'press', left: '25%', top: '36%' },
    { id: 'writing', left: '37%', top: '34%' },
    { id: 'exhibitions', left: '47%', top: '56%' },
    { id: 'filmmaking', left: '73%', top: '42%' },
    { id: 'cv', left: '84%', top: '65%' },
    { id: 'submit-room', left: '94%', top: '43%' },
    { id: 'open-collective-archive', left: '93%', top: '57%' },
  ]
  const [folderPositions, setFolderPositions] = useState(
    () => new Map(folderArcLayout.map((p) => [p.id, { left: p.left, top: p.top }]))
  )
  const rightStageWidth = '100vw'

  const leftColumnWidth = Math.max(188, Math.min(viewport.width * 0.15, 218))
  const aboutWindowWidth = leftColumnWidth + 34
  const welcomeWidth = 126
  const welcomeHeight = Math.round(welcomeWidth * (55 / 135))
  const leftColumnX = 24
  const aboutWindowTop = 148
  const aboutWindowHeight = 181
  const BROWSER_CHROME_HEIGHT = 62
  const welcomeTop = Math.round(BROWSER_CHROME_HEIGHT + ((aboutWindowTop - BROWSER_CHROME_HEIGHT - welcomeHeight) / 2))
  const playerWindowHeight = Math.round(132 * (leftColumnWidth / 290))
  const playerWindowTop = Math.max(aboutWindowTop + aboutWindowHeight + 430, viewport.height - playerWindowHeight - 28)
  const diaryHeight = Math.max(154, Math.min(playerWindowTop - aboutWindowTop - aboutWindowHeight - 96, 220))
  const diaryTop = Math.max(aboutWindowTop + aboutWindowHeight + 96, playerWindowTop - diaryHeight - 260)
  const diaryWidth = Math.max(Math.min(leftColumnWidth - 34, 132), 106)

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
    setBrowserAddress(getAboutAddress(activeFolderId, nextTab, activeFolderDetailId, activeFolderImageIndex))
  }, [activeFolderDetailId, activeFolderId, activeFolderImageIndex])

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
    const folder = FOLDER_MAP.get(folderId)
    if (folder?.externalUrl) {
      window.open(folder.externalUrl, '_blank', 'noopener,noreferrer')
      return
    }

    onRememberFolderOpen?.(folderId)
    setActiveBrowserTab(getAboutTabId(folderId))
    setBrowserAddress(getAboutAddress(folderId, getAboutTabId(folderId)))
    onOpenFolder(folderId)
  }, [onOpenFolder, onRememberFolderOpen])

  const handleFolderRouteOpen = useCallback((folderId, folderDetailId = null, folderImageIndex = null) => {
    onRememberFolderOpen?.(folderId)
    setActiveBrowserTab(getAboutTabId(folderId))
    setBrowserAddress(getAboutAddress(folderId, getAboutTabId(folderId), folderDetailId, folderImageIndex))
    onOpenFolder(folderId, folderDetailId, folderImageIndex)
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

  const handleDiaryOpen = useCallback(() => {
    handleFolderOpen('diary')
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
        <div style={{ position: 'fixed', left: leftColumnX, top: welcomeTop, zIndex: 21, pointerEvents: 'none' }}>
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
            top: aboutWindowTop,
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
          availableHeight={diaryHeight}
          onOpenDiary={handleDiaryOpen}
        />
      )}

      {/* ── Safety pin (between left col and right stage) ── */}
      {!isFolderView && (
        <div style={{ position: 'absolute', left: `${leftColumnX + aboutWindowWidth + 24}px`, top: '48%', zIndex: 20, pointerEvents: 'none' }}>
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
            top: playerWindowTop - 40,
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
            top: playerWindowTop,
            zIndex: 21,
            width: `${leftColumnWidth}px`,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <TinyPlayer width={leftColumnWidth} />
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
            <AboutFolderContent
              folder={activeFolder}
              activeFolderDetailId={activeFolderDetailId}
              activeFolderImageIndex={activeFolderImageIndex}
              onOpenFolderRoute={handleFolderRouteOpen}
            />
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

function AboutFolderContent({
  folder,
  activeFolderDetailId = null,
  activeFolderImageIndex = null,
  onOpenFolderRoute,
}) {
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
  const pressLinkStyle = {
    ...plainLinkStyle,
    color: '#000',
    fontSize: '18px',
    lineHeight: 1.25,
  }
  const filmmakingLinkStyle = {
    ...pressLinkStyle,
    display: 'inline',
  }
  const filmmakingHeadingStyle = {
    margin: '0 0 18px',
    fontSize: '18px',
    fontWeight: 700,
    lineHeight: 1.25,
    textTransform: 'uppercase',
  }
  const plainHeadingStyle = {
    margin: '18px 0 8px',
    fontSize: '13px',
    fontWeight: 700,
    textTransform: 'uppercase',
  }
  const pressHeadingStyle = {
    ...plainHeadingStyle,
    fontSize: '18px',
    lineHeight: 1.25,
  }
  const writingDesktopRef = useRef(null)
  const draggedWritingRef = useRef(null)
  const archiveDesktopRef = useRef(null)
  const draggedArchiveRef = useRef(null)
  const writingScatterLayout = useMemo(() => {
    const count = 20
    const positions = []
    for (let i = 0; i < count; i++) {
      positions.push({
        left: `${5 + Math.random() * 68}%`,
        top: `${5 + Math.random() * 70}%`,
      })
    }
    return positions
  }, [])
  const writingIconLinkStyle = {
    display: 'grid',
    gap: '6px',
    color: '#000',
    textDecoration: 'none',
    position: 'absolute',
    width: '220px',
    justifyItems: 'center',
    padding: '4px',
    userSelect: 'none',
  }
  const writingIconMediaStyle = {
    width: '200px',
    height: '240px',
    border: 'none',
    background: 'transparent',
    objectFit: 'contain',
    boxSizing: 'border-box',
  }
  const writingIconPlaceholderStyle = {
    ...writingIconMediaStyle,
    display: 'grid',
    placeItems: 'center',
    padding: '10px',
    fontSize: '12px',
    fontWeight: 700,
    lineHeight: 1.12,
    textAlign: 'center',
    textTransform: 'uppercase',
  }
  const writingIconFilenameStyle = {
    display: 'block',
    fontFamily: ARIAL_FONT_STACK,
    fontSize: '11px',
    lineHeight: 1.12,
    color: '#000',
    textAlign: 'center',
    overflowWrap: 'anywhere',
    textDecoration: 'none',
  }
  const writingLinks = useMemo(
    () => (folder.id === 'writing' ? folder.sections.flatMap((section) => section.links ?? []) : []),
    [folder.id, folder.sections]
  )
  const getArchiveImageKey = useCallback((image) => `${image.page}/${image.filename}`, [])
  const archiveColumns = 9
  const archiveRowHeight = 132
  const archiveBaseLayout = useMemo(() => OPEN_ARCHIVE_IMAGES.map((image, index) => {
    const row = Math.floor(index / archiveColumns)
    const column = index % archiveColumns
    const columnOffset = ((column + 0.5) / archiveColumns) * 100
    const xJitter = (image.seed % 47) - 23
    const yJitter = ((Math.floor(image.seed / 7) % 55) - 20)
    const width = 46 + (image.seed % 54)
    const rotation = (Math.floor(image.seed / 11) % 17) - 8

    return {
      left: `calc(${columnOffset}% + ${xJitter}px)`,
      top: `${58 + row * archiveRowHeight + yJitter}px`,
      width,
      rotation,
      zIndex: 10 + (image.seed % 40),
    }
  }), [])
  const [archiveImagePositions, setArchiveImagePositions] = useState(
    () => new Map(OPEN_ARCHIVE_IMAGES.map((image, index) => [getArchiveImageKey(image), archiveBaseLayout[index]]))
  )
  const [writingIconPositions, setWritingIconPositions] = useState(
    () => new Map(writingLinks.map((link, index) => [link.url, writingScatterLayout[index] ?? { left: `${8 + index * 14}%`, top: `${18 + (index % 2) * 14}%` }]))
  )
  useEffect(() => {
    if (folder.id !== 'open-collective-archive') return
    setArchiveImagePositions((prev) => {
      let changed = false
      const next = new Map(prev)
      OPEN_ARCHIVE_IMAGES.forEach((image, index) => {
        const key = getArchiveImageKey(image)
        if (next.has(key)) return
        changed = true
        next.set(key, archiveBaseLayout[index])
      })
      return changed ? next : prev
    })
  }, [archiveBaseLayout, folder.id, getArchiveImageKey])
  useEffect(() => {
    if (folder.id !== 'writing') return
    setWritingIconPositions((prev) => {
      let changed = false
      const next = new Map(prev)
      writingLinks.forEach((link, index) => {
        if (next.has(link.url)) return
        changed = true
        next.set(link.url, writingScatterLayout[index] ?? { left: `${8 + index * 14}%`, top: `${18 + (index % 2) * 14}%` })
      })
      return changed ? next : prev
    })
  }, [folder.id, writingLinks, writingScatterLayout])
  const startWritingIconDrag = useCallback((linkUrl, e) => {
    if (e.button !== 0) return
    e.preventDefault()
    const container = writingDesktopRef.current
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const el = e.currentTarget
    const elRect = el.getBoundingClientRect()
    const startPx = elRect.left + elRect.width / 2 - containerRect.left
    const startPy = elRect.top + elRect.height / 2 - containerRect.top
    const startMx = e.clientX
    const startMy = e.clientY
    let moved = false
    draggedWritingRef.current = null

    const onMove = (me) => {
      const dx = me.clientX - startMx
      const dy = me.clientY - startMy
      if (!moved && Math.abs(dx) < FOLDER_DRAG_THRESHOLD_PX && Math.abs(dy) < FOLDER_DRAG_THRESHOLD_PX) return
      moved = true
      draggedWritingRef.current = linkUrl
      setWritingIconPositions((prev) => {
        const next = new Map(prev)
        next.set(linkUrl, { left: startPx + dx, top: startPy + dy, isPx: true })
        return next
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])
  const startArchiveImageDrag = useCallback((imageKey, e) => {
    if (e.button !== 0) return
    e.preventDefault()
    const container = archiveDesktopRef.current
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const el = e.currentTarget
    const elRect = el.getBoundingClientRect()
    const startPx = elRect.left + elRect.width / 2 - containerRect.left
    const startPy = elRect.top + elRect.height / 2 - containerRect.top
    const startMx = e.clientX
    const startMy = e.clientY
    let moved = false
    draggedArchiveRef.current = null

    const onMove = (me) => {
      const dx = me.clientX - startMx
      const dy = me.clientY - startMy
      if (!moved && Math.abs(dx) < FOLDER_DRAG_THRESHOLD_PX && Math.abs(dy) < FOLDER_DRAG_THRESHOLD_PX) return
      moved = true
      draggedArchiveRef.current = imageKey
      setArchiveImagePositions((prev) => {
        const current = prev.get(imageKey) ?? {}
        const next = new Map(prev)
        next.set(imageKey, { ...current, left: startPx + dx, top: startPy + dy, isPx: true })
        return next
      })
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])
  const isExhibitionOverview = activeFolderDetailId === 'overview'
  const selectedExhibition = !isExhibitionOverview
    ? EXHIBITIONS.find((exhibition) => exhibition.id === activeFolderDetailId) ?? EXHIBITIONS[0] ?? null
    : null
  const getExhibitionDescription = (exhibition) => {
    const descriptionText = exhibition.description?.[0] ?? ''
    const placeText = [exhibition.venue, exhibition.location].filter(Boolean).join(', ')
    return [descriptionText, placeText].filter(Boolean).join(' ')
  }

  if (folder.id === 'diary') {
    return (
      <div
        style={{
          ...plainPageStyle,
          padding: '26px 18px 80px',
          fontSize: '15px',
          lineHeight: 1.55,
        }}
      >
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <h1
            style={{
              margin: '0 0 26px',
              fontSize: '18px',
              fontWeight: 400,
              lineHeight: 1.2,
            }}
          >
            diary
          </h1>

          {DIARY_PHOTOS.map((photo, index) => (
            <section key={photo.src} style={{ margin: '0 0 34px' }}>
              <img
                src={photo.src}
                alt={photo.alt}
                loading="lazy"
                decoding="async"
                style={{
                  display: 'block',
                  width: 'auto',
                  maxWidth: index % 5 === 0 ? 'min(100%, 620px)' : 'min(100%, 470px)',
                  maxHeight: index % 4 === 0 ? '560px' : '430px',
                  height: 'auto',
                  objectFit: 'contain',
                }}
              />
            </section>
          ))}
        </div>
      </div>
    )
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

  if (folder.id === 'open-collective-archive') {
    const archivePageHeight = Math.max(680, Math.ceil(OPEN_ARCHIVE_IMAGES.length / archiveColumns) * archiveRowHeight + 190)
    const activeArchiveImage = activeFolderImageIndex != null && OPEN_ARCHIVE_IMAGES.length > 0
      ? OPEN_ARCHIVE_IMAGES[activeFolderImageIndex % OPEN_ARCHIVE_IMAGES.length]
      : null
    const showNextArchiveImage = () => {
      if (OPEN_ARCHIVE_IMAGES.length === 0) return
      onOpenFolderRoute?.(folder.id, 'view', ((activeFolderImageIndex ?? 0) + 1) % OPEN_ARCHIVE_IMAGES.length)
    }

    return (
      <div
        style={{
          ...plainPageStyle,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: 0,
          background: '#fff',
        }}
      >
        <div
          ref={archiveDesktopRef}
          style={{
            position: 'relative',
            minHeight: `${archivePageHeight}px`,
            width: '100%',
          }}
        >
          {OPEN_ARCHIVE_IMAGES.map((image, imageIndex) => {
            const imageKey = getArchiveImageKey(image)
            const layout = archiveImagePositions.get(imageKey) ?? archiveBaseLayout[imageIndex]
            const layoutLeft = layout.isPx ? `${layout.left}px` : layout.left
            const layoutTop = layout.isPx ? `${layout.top}px` : layout.top

            return (
              <button
                key={imageKey}
                type="button"
                onMouseDown={(event) => startArchiveImageDrag(imageKey, event)}
                onClick={(event) => {
                  if (draggedArchiveRef.current === imageKey) {
                    event.preventDefault()
                    event.stopPropagation()
                    draggedArchiveRef.current = null
                    return
                  }
                  onOpenFolderRoute?.(folder.id, 'view', imageIndex)
                }}
                title={image.filename}
                className="cursor-grab"
                style={{
                  position: 'absolute',
                  left: layoutLeft,
                  top: layoutTop,
                  zIndex: layout.zIndex,
                  width: `${layout.width}px`,
                  transform: `translate(-50%, -50%) rotate(${layout.rotation}deg)`,
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  display: 'block',
                  lineHeight: 0,
                  cursor: 'inherit',
                  userSelect: 'none',
                }}
              >
                <img
                  src={image.thumbSrc}
                  alt={image.alt}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: 'auto',
                    maxHeight: '96px',
                    objectFit: 'contain',
                    boxShadow: '0 2px 7px rgba(0,0,0,0.16)',
                  }}
                />
              </button>
            )
          })}
        </div>

        {activeArchiveImage && createPortal(
          <ExhibitionLightbox
            image={activeArchiveImage}
            onNext={showNextArchiveImage}
            onClose={() => onOpenFolderRoute?.(folder.id)}
          />,
          document.body,
        )}
      </div>
    )
  }

  if (folder.id === 'exhibitions') {
    const navButtonBaseStyle = {
      display: 'block',
      width: '100%',
      border: 'none',
      background: 'transparent',
      padding: '0 0 8px',
      font: 'inherit',
      fontSize: '13px',
      lineHeight: 1.25,
      color: '#000',
      textAlign: 'left',
      textDecoration: 'underline',
    }
    const exhibitionShellStyle = {
      ...plainPageStyle,
      display: 'grid',
      gridTemplateColumns: '170px minmax(0, 1fr)',
      gap: '30px',
      alignItems: 'start',
      padding: '40px 32px 64px',
      fontSize: '16px',
      lineHeight: 1.45,
    }
    const renderExhibitionNav = () => (
      <nav
        aria-label="Exhibitions"
        style={{
          position: 'sticky',
          top: 0,
          alignSelf: 'start',
          maxHeight: 'calc(100vh - 44px)',
          overflowY: 'auto',
          padding: '0 0 18px',
        }}
      >
        <button
          type="button"
          onClick={() => onOpenFolderRoute?.(folder.id, 'overview')}
          style={{
            ...navButtonBaseStyle,
            margin: '0 0 14px',
            color: '#000',
            fontWeight: isExhibitionOverview ? 700 : 400,
            textDecoration: isExhibitionOverview ? 'none' : 'underline',
          }}
        >
          overview
        </button>
        {EXHIBITIONS.map((exhibition) => {
          const isActive = selectedExhibition?.id === exhibition.id
          return (
            <button
              key={exhibition.id}
              type="button"
              onClick={() => onOpenFolderRoute?.(folder.id, exhibition.id)}
              style={{
                ...navButtonBaseStyle,
                color: '#000',
                fontWeight: isActive ? 700 : 400,
                textDecoration: isActive ? 'none' : 'underline',
              }}
            >
              {exhibition.title}
            </button>
          )
        })}
      </nav>
    )

    if (selectedExhibition) {
      const images = EXHIBITION_IMAGES_BY_FOLDER.get(selectedExhibition.imageFolder) ?? []
      const videos = EXHIBITION_VIDEOS_BY_FOLDER.get(selectedExhibition.videoFolder ?? selectedExhibition.imageFolder) ?? []
      const openLightbox = (imageIndex) => onOpenFolderRoute?.(folder.id, selectedExhibition.id, imageIndex)
      const activeLightboxImage = activeFolderImageIndex != null && images.length > 0
        ? images[activeFolderImageIndex % images.length]
        : null
      const showNextLightboxImage = () => {
        if (images.length === 0) return
        onOpenFolderRoute?.(folder.id, selectedExhibition.id, ((activeFolderImageIndex ?? 0) + 1) % images.length)
      }
      const institutionText = [selectedExhibition.venue, selectedExhibition.location].filter(Boolean).join('\n')
      const detailContentStyle = {
        margin: '0 0 34px',
        maxWidth: '700px',
        fontSize: '18px',
        lineHeight: 1.42,
      }

      return (
        <div style={exhibitionShellStyle}>
          {renderExhibitionNav()}

          <main style={{ minWidth: 0, maxWidth: '860px', margin: '0 auto', padding: '0 0 80px' }}>
            {/* Title block — two equal columns */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '24px',
                alignItems: 'start',
                margin: '0 0 48px',
              }}
            >
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, lineHeight: 1.3, whiteSpace: 'pre-line' }}>
                  {institutionText}
                </h1>
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, lineHeight: 1.3 }}>
                  {selectedExhibition.title}
                  <br />
                  {selectedExhibition.dates ?? selectedExhibition.year}
                </h1>
              </div>
            </div>

            {/* Description */}
            {selectedExhibition.description?.length > 0 && (
              <div style={{ marginBottom: '36px' }}>
                {selectedExhibition.description.map((paragraph) => (
                  <p key={paragraph} style={{ margin: '0 0 18px', fontSize: '18px', lineHeight: 1.5 }}>
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {/* Images section */}
            {images.length > 0 && (
              <div style={{ marginBottom: '28px' }}>
                {/* "Installation Images (N) →" link */}
                <button
                  type="button"
                  onClick={() => openLightbox(0)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: '0 0 10px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    textDecoration: 'underline',
                    color: 'inherit',
                    fontFamily: 'inherit',
                    display: 'block',
                  }}
                >
                  {`Installation Images (${images.length}) →`}
                </button>
                {/* First image full width */}
                <button
                  type="button"
                  onClick={() => openLightbox(0)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    padding: 0,
                    display: 'block',
                    width: '100%',
                    lineHeight: 0,
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={images[0].src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    style={{
                      display: 'block',
                      width: '100%',
                      height: 'auto',
                      objectFit: 'cover',
                    }}
                  />
                </button>
                {selectedExhibition.caption && (
                  <p style={{ margin: '10px 0 0', fontSize: '14px', color: '#555', lineHeight: 1.4 }}>
                    {selectedExhibition.caption}
                  </p>
                )}
              </div>
            )}

            {/* Links */}
            {selectedExhibition.links?.length > 0 && (
              <div style={{ marginBottom: '36px' }}>
                {selectedExhibition.links.map((link) => (
                  <React.Fragment key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '18px', color: 'inherit', textDecoration: 'underline', display: 'inline-block', marginBottom: '8px' }}
                    >
                      {link.label} ↓
                    </a>
                    <br />
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* Videos */}
            {videos.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {videos.map((video) => (
                  <figure key={video.src} style={{ margin: 0, width: '100%' }}>
                    <video
                      src={video.src}
                      controls
                      preload="metadata"
                      style={{
                        display: 'block',
                        width: '100%',
                        maxHeight: '58vh',
                        background: '#000',
                      }}
                    />
                    <figcaption style={{ marginTop: '7px', fontSize: '13px', lineHeight: 1.25 }}>
                      {video.title}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </main>

          {activeLightboxImage && createPortal(
            <ExhibitionLightbox
              image={activeLightboxImage}
              onNext={showNextLightboxImage}
              onClose={() => onOpenFolderRoute?.(folder.id, selectedExhibition.id)}
            />,
            document.body,
          )}
        </div>
      )
    }

    return (
      <div
        style={exhibitionShellStyle}
      >
        {renderExhibitionNav()}
        <main style={{ minWidth: 0, textAlign: 'center' }}>
          {EXHIBITIONS.map((exhibition, exhibitionIndex) => {
            const images = EXHIBITION_IMAGES_BY_FOLDER.get(exhibition.imageFolder) ?? []
            const videos = EXHIBITION_VIDEOS_BY_FOLDER.get(exhibition.videoFolder ?? exhibition.imageFolder) ?? []
            const previewImage = images[0] ?? null

            return (
              <section key={exhibition.id} style={{ margin: '0 0 56px' }}>
                {exhibitionIndex > 0 && (
                  <div aria-hidden="true" style={{ margin: '0 0 30px' }}>
                    ⋆ ˚｡⋆୨୧˚ ✿ ˚୨୧⋆｡˚ ⋆
                  </div>
                )}
                <h2 style={{ ...plainHeadingStyle, margin: '0 0 14px', fontSize: '22px', fontStyle: 'italic', lineHeight: 1.55, textTransform: 'none' }}>{exhibition.title}</h2>
                <p style={{ margin: '0 0 8px' }}>{exhibition.year}</p>

                {previewImage && (
                  <button
                    type="button"
                    onClick={() => onOpenFolderRoute?.(folder.id, exhibition.id)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      display: 'block',
                      margin: '0 auto',
                      textAlign: 'center',
                    }}
                  >
                    <figure style={{ margin: '0 0 8px' }}>
                      <img
                        src={previewImage.src}
                        alt={previewImage.alt}
                        loading="lazy"
                        decoding="async"
                        style={{
                          display: 'block',
                          width: 'min(100%, 260px)',
                          maxHeight: '220px',
                          height: 'auto',
                          margin: '0 auto',
                          objectFit: 'contain',
                        }}
                      />

                    </figure>
                  </button>
                )}
                {!previewImage && videos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenFolderRoute?.(folder.id, exhibition.id)}
                    style={{
                      border: '1px solid #111',
                      background: '#fff',
                      padding: '12px 18px',
                      margin: '0 auto 8px',
                      display: 'inline-block',
                      font: 'inherit',
                      fontSize: '13px',
                      color: '#000',
                    }}
                  >
                    video documentation
                  </button>
                )}

                <div>
                  <button
                    type="button"
                    onClick={() => onOpenFolderRoute?.(folder.id, exhibition.id)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      font: 'inherit',
                      color: '#000',
                      textDecoration: 'underline',
                    }}
                  >
                    more photos / more info
                  </button>
                  {exhibition.links?.slice(0, 2).map((link) => (
                    <React.Fragment key={link.url}>
                      <br />
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="about-folder-link"
                        style={plainLinkStyle}
                      >
                        {link.label}
                      </a>
                    </React.Fragment>
                  ))}
                </div>
              </section>
            )
          })}
        </main>
      </div>
    )
  }

  return (
    <div style={plainPageStyle}>
      {folder.id !== 'press' && folder.id !== 'writing' && folder.id !== 'filmmaking' && (
        <h1 style={{ margin: '0 0 12px', fontSize: '16px', fontWeight: 700 }}>{folder.title}</h1>
      )}
      {folder.bio && (
        <p style={{ margin: '0 0 18px' }}>
          {folder.bio.name}
          <br />
          {folder.bio.born}
          <br />
          {folder.bio.lives}
        </p>
      )}

      {folder.id === 'writing' && (
        <div
          ref={writingDesktopRef}
          style={{
            position: 'relative',
            minHeight: '440px',
            width: '100%',
          }}
        >
          {writingLinks.map((link, index) => {
            const pos = writingIconPositions.get(link.url) ?? writingScatterLayout[index] ?? { left: '10%', top: '20%' }
            return (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="about-folder-link cursor-grab"
                onMouseDown={(e) => startWritingIconDrag(link.url, e)}
                onClick={(e) => {
                  if (draggedWritingRef.current === link.url) {
                    e.preventDefault()
                    draggedWritingRef.current = null
                  }
                }}
                style={{
                  ...writingIconLinkStyle,
                  left: pos.isPx ? `${pos.left}px` : pos.left,
                  top: pos.isPx ? `${pos.top}px` : pos.top,
                  transform: 'translate(-50%, -50%)',
                }}
                title={link.label}
              >
                <img src={link.image} alt={link.label} draggable={false} style={writingIconMediaStyle} />
                <span style={writingIconFilenameStyle}>{link.iconLabel}</span>
              </a>
            )
          })}
        </div>
      )}

      {folder.id !== 'writing' && folder.sections.map((section) => {
        const isFilmmaking = folder.id === 'filmmaking'
        return (
          <section key={section.heading} style={{ margin: isFilmmaking ? '0 0 86px' : '0 0 20px' }}>
            <h2 style={isFilmmaking ? filmmakingHeadingStyle : folder.id === 'press' ? pressHeadingStyle : plainHeadingStyle}>{section.heading}</h2>
            {section.entries && (
              <ul style={{ margin: 0, paddingLeft: '22px' }}>
                {section.entries.map((entry, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <li key={i} style={{ marginBottom: isFilmmaking ? '12px' : '6px', fontSize: isFilmmaking ? '18px' : undefined, lineHeight: isFilmmaking ? 1.25 : undefined }}>
                    {entry.year ? `${entry.year} - ` : ''}
                    {entry.url ? (
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`about-folder-link${isFilmmaking ? ' press-folder-link' : ''}`}
                        style={isFilmmaking ? filmmakingLinkStyle : plainLinkStyle}
                      >
                        {entry.item}
                      </a>
                    ) : entry.item}
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
                      className={`about-folder-link${folder.id === 'press' ? ' press-folder-link' : ''}`}
                      style={folder.id === 'press' ? pressLinkStyle : plainLinkStyle}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

function ProjectPreviewWindow({ onClose, onPreviewStarted, isTouch = false }) {
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
    onPreviewStarted?.()
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
  }, [onPreviewStarted])

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
          onClick={(event) => {
            event.stopPropagation()
            onClose()
          }}
          onMouseDown={(event) => event.stopPropagation()}
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
    viewportWidth,
    prefersReducedMotion,
  } = responsive
  const shouldShowMobileNotice = isTouch || viewportWidth <= 700
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
  const [visitedRoomHistory, setVisitedRoomHistory] = useState([])
  const [transitionSnapshotUrl, setTransitionSnapshotUrl] = useState(null)
  const [isSceneTransitioning, setIsSceneTransitioning] = useState(false)
  const hasStartedHouseRoomPreloadsRef = useRef(false)

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
      const nextRoute = parseRouteFromHash(window.location.hash)
      setRoute(nextRoute)
      if (nextRoute.type === 'about' || nextRoute.type === 'folder') {
        const nextEntry = getAboutHistoryEntry(nextRoute)
        setAboutBrowserHistory((current) => {
          if (current.entries[current.index] === nextEntry) return current
          const existingIndex = current.entries.lastIndexOf(nextEntry)
          if (existingIndex >= 0) return { ...current, index: existingIndex }
          const nextEntries = current.entries.slice(0, current.index + 1)
          nextEntries.push(nextEntry)
          return { entries: nextEntries, index: nextEntries.length - 1 }
        })
      }
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  useEffect(() => {
    preloadVideoAsset(HOME_PREVIEW_VIDEO)
    const sparkleAssets = [...CURSOR_TRAIL_GIFS, CURSOR_CLICK_GIF]
    sparkleAssets.forEach((src) => {
      const image = new Image()
      image.src = src
    })
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

  const handleHomeReady = useCallback(() => {
    clearTransitionCover()
    if (hasStartedHouseRoomPreloadsRef.current) return
    hasStartedHouseRoomPreloadsRef.current = true
    preloadRoomRange(0, 4, ROOM_PRELOAD_STAGGER_MS)
  }, [clearTransitionCover])

  const beginSceneTransition = useCallback(() => {
    setIsSceneTransitioning(true)
    setTransitionSnapshotUrl(captureCurrentCanvasFrame())
  }, [])

  const preloadHome = useCallback(() => {
    useGLTF.preload('assets/home.glb')
  }, [])

  const openRoom = useCallback((roomNumber) => {
    const navigationId = pendingRoomNavigationRef.current + 1
    pendingRoomNavigationRef.current = navigationId
    beginSceneTransition()
    setVisitedRoomHistory(route.type === 'room' ? [route.roomIndex] : [])
    preloadRoomAsset(roomNumber - 1)
    if (pendingRoomNavigationRef.current !== navigationId) return
    navigateWithHash(`#${ROOM_HASH_PREFIX}${roomNumber}`)
  }, [beginSceneTransition, route])

  const openNextRoom = useCallback((roomNumber) => {
    const nextRoomNumber = roomNumber >= ROOM_FILES.length ? 1 : roomNumber + 1
    const navigationId = pendingRoomNavigationRef.current + 1
    pendingRoomNavigationRef.current = navigationId
    beginSceneTransition()
    if (route.type === 'room') {
      setVisitedRoomHistory((current) => [...current, route.roomIndex])
    }
    preloadRoomAsset(nextRoomNumber - 1)
    if (pendingRoomNavigationRef.current !== navigationId) return
    navigateWithHash(`#${ROOM_HASH_PREFIX}${nextRoomNumber}`)
  }, [beginSceneTransition, route])

  const openPreviousRoom = useCallback(() => {
    const previousRoomIndex = visitedRoomHistory[visitedRoomHistory.length - 1]
    if (previousRoomIndex == null) return

    const navigationId = pendingRoomNavigationRef.current + 1
    pendingRoomNavigationRef.current = navigationId
    beginSceneTransition()
    setVisitedRoomHistory((current) => current.slice(0, -1))
    preloadRoomAsset(previousRoomIndex)
    if (pendingRoomNavigationRef.current !== navigationId) return
    navigateWithHash(`#${ROOM_HASH_PREFIX}${previousRoomIndex + 1}`)
  }, [beginSceneTransition, visitedRoomHistory])

  const closeRoom = useCallback(() => {
    setIsPreviewOpen(false)
    setHasOpenedPreview(true)
    setVisitedRoomHistory([])
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

  const openFolder = useCallback((folderId, folderDetailId = null, folderImageIndex = null) => {
    setAboutBrowserHistory((current) => {
      const nextEntry = getFolderRouteKey(folderId, folderDetailId, folderImageIndex)
      if (!folderId || !FOLDER_MAP.has(folderId) || current.entries[current.index] === nextEntry) return current
      const nextEntries = current.entries.slice(0, current.index + 1)
      nextEntries.push(nextEntry)
      return { entries: nextEntries, index: nextEntries.length - 1 }
    })
    navigateWithHash(getHashForAboutHistoryEntry(getFolderRouteKey(folderId, folderDetailId, folderImageIndex)))
  }, [])

  const openSubmitRoom = useCallback(() => {
    openFolder('submit-room')
  }, [openFolder])

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

  if (shouldShowMobileNotice) {
    return <MobileDesktopNotice />
  }

  if (route.type === 'room') {
    const roomNumber = route.roomIndex + 1
    const roomFile = ROOM_FILES[route.roomIndex]
    return (
      <>
        <RoomPage
          key={roomFile}
          roomNumber={roomNumber}
          roomFile={roomFile}
          cameraDefault={ROOM_CAMERA_DEFAULTS[route.roomIndex] ?? ROOM_CAMERA_DEFAULTS[0]}
          onBack={openPreviousRoom}
          onHome={closeRoom}
          onOpenNextRoom={() => openNextRoom(roomNumber)}
          onOpenSubmit={openSubmitRoom}
          canGoBack={visitedRoomHistory.length > 0}
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
          activeFolderDetailId={route.folderDetailId}
          activeFolderImageIndex={route.folderImageIndex}
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
        {hasOpenedPreview && !isPreviewOpen && (
          <HomeScene
            onModelLoaded={undefined}
            onOpenRoom={openRoom}
            onReady={handleHomeReady}
          />
        )}
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
      {isPreviewOpen && <ProjectPreviewWindow onClose={closePreview} onPreviewStarted={preloadHome} isTouch={isTouch} />}
      {sceneTransitionLayer}
    </div>
  )
}

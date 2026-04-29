import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stage, useGLTF } from '@react-three/drei'

const STATIC_ROOT = 'https://www.metarialist.com/static/images'
const CONTACT_EMAIL = 'shelestvetrovki@gmail.com'
const CV_URL = 'https://docs.google.com/document/d/1VH0PZsOzxVn9IuuzZgf_y74OQ4W5b1L8vAyQHMuTyfs/edit?tab=t.0'
const BIO_HTML = `Anastasiia Pishchanska is a Ukrainian-born, Tokyo-based artist, filmmaker, and art director. She is the co-founder of the established Ukrainian art print publication localstickerbook, which curates exhibitions, events, and fundraisers worldwide, presenting contemporary artists through the lens of post-internet culture.<br><br>Her practice moves between moving image, installation, and art direction, focusing on digital memory, migration, and cultural identity.`

const SONGS = [
  {
    title: 'Hysterical Love Project',
    artist: 'Motion Ward',
    src: 'assets/music/song1.mp3',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6f/7b/93/6f7b9319-f894-4f3b-afd4-65f4e62c65fe/197190610635.jpg/600x600bb.jpg',
    links: [
      ['Apple Music', 'https://music.apple.com/us/album/lashes/1720756491'],
    ],
  },
  {
    title: 'oral',
    artist: 'bjork ft. rosalia',
    src: 'assets/music/song2.m4a',
    cover: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/33/0d/73/330d7373-afb5-c3ba-0eb3-e9c7c11efe0d/5016958104535.jpg/600x600bb.jpg',
    links: [
      ['Spotify', 'https://open.spotify.com/search/bjork%20rosalia%20oral'],
      ['Apple Music', 'https://music.apple.com/us/album/oral-single/1716073728'],
    ],
  },
  {
    title: 'love again',
    artist: 'DJ LOSTBOI x Young Thug',
    src: 'assets/music/song3.mp3',
    cover: 'https://i1.sndcdn.com/artworks-XBn1ZnMzNWUzeBLD-UjTMzw-t500x500.jpg',
    links: [
      ['SoundCloud', 'https://soundcloud.com/love_again/dj-lostboi-x-young-thug'],
    ],
  },
]

const ROOMS = [
  { id: 'yuna', title: 'YUNA', file: 'YUNA WEB.glb', note: 'room 01' },
  { id: 'suzune', title: 'SUZUNE', file: 'SUZUNE WEB.glb', note: 'room 02' },
  { id: 'aiko', title: 'AIKO', file: 'AIKO WEB.glb', note: 'room 03' },
  { id: 'moene', title: 'MOENE', file: 'MOENE WEB.glb', note: 'room 04' },
]

const FOLDERS = [
  {
    id: 'cv',
    title: 'CV',
    caption: 'education, exhibitions, awards',
    sections: [
      ['Education', ['Research Program, Media Arts; Dance&Performance, Tama Art University, Tokyo', 'B.F.A, Filmmaking and Screenwriting, International Humanitarian University, Odesa', 'Diploma of Odesa Ballet Choreographic School']],
      ['Selected Exhibitions', ['Women by Women, PhotoVogue, Milan', "Bed doesn't ask questions, Panoramic Festival, Barcelona", 'MOM, POST-INTERNET IS NOT A PHASE ;(, Athens', 'Multimedia interactive installation, Tama Art University, Tokyo']],
      ['Awards / Residencies', ['Women By Women Shortlist, PhotoVogue Global', 'Grantee, Panoramic Festival', 'Artist at Risk Program, Nippon Foundation', 'MEXT Scholarship']],
    ],
  },
  {
    id: 'press',
    title: 'Press',
    caption: 'articles and mentions',
    links: [
      ['Vogue: Women By Women Shortlist', 'https://www.vogue.com/article/women-by-women-the-shortlist'],
      ['Festival Panoramic: Panoramic Review', 'https://festivalpanoramic.cat/en/project/panoramic-review-2025/'],
      ["Yokogao Mag: She's So Hot I Wanna Clean Her Room", 'https://www.yokogaomag.com/editorial/shes-so-hot-i-wanna-clean-her-room-shelestvetrovki'],
      ['Tama Art University: Artist at Risk Program', 'https://www.tamabi.ac.jp/news/55772/'],
    ],
  },
  {
    id: 'writing',
    title: 'Writing',
    caption: 'essays, notes, publications',
    links: [
      ['Substack: and another fig was a girl wearing nipple patches', 'https://substack.com/@shelestvetrovki/note/p-194245632?utm_source=notes-share-action&r=33oaqu'],
      ['Readellion Publishing: Spiritual Ecocides', 'https://readellion.com/product/lexiconofnature/'],
      ['Becoming Press: Dialogues on CoreCore', 'https://becoming.press/dialogues-on-corecore'],
    ],
  },
  {
    id: 'filmmaking',
    title: 'Filmmaking',
    caption: 'screenings and curation',
    sections: [
      ['Screenings', ['Dream Wanders By The Window, BurningMagazine, Tokyo', 'SpilkaParis x Local Group, Kolektiv Radieuse, Marseille', 'Localstickerbook Films Fundraiser, Datsuijo Gallery, Tokyo', 'Short Poetic Film Festival, Lviv']],
      ['Curating', ['Localstickerbook films fundraiser, Domicile Gallery', 'OpenSecret x Localstickerbook, Internet Cinema', 'Experimental Film Screening, Filaret 16, Bucharest']],
    ],
  },
  {
    id: 'exhibitions',
    title: 'Exhibitions',
    caption: 'shows, documentation, and folders',
  },
  {
    id: 'submit-room',
    title: 'Submit Room',
    caption: 'mail a room, memory, or trace',
    sections: [['How', ['Send a short note, image, scan, sound, or room fragment.', `Contact: ${CONTACT_EMAIL}`]]],
  },
]

const EXHIBITIONS = [
  { id: 'women-by-women', title: 'Women by Women', year: '2026', venue: 'PhotoVogue', location: 'Biblioteca Nazionale Braidense, Milan', imageFolder: 'Women on Women' },
  { id: 'bed-doesnt-ask-questions', title: "Bed doesn't ask questions", year: '2025', venue: 'Festival Panoramic', location: 'Barcelona', imageFolder: 'Bed Doesn_t Ask Questions - Panoramic Photo Festival Barcelona' },
  { id: 'spilkaparis-local-group', title: 'SpilkaParis x Local Group', year: '2025', venue: 'Kolektiv Radieuse', location: 'Marseille' },
  { id: 'localstickerbook-domicile', title: 'Localstickerbook, Films fundraiser', year: '2024', venue: 'Domicile Gallery', location: 'Tokyo' },
  { id: 'mom-post-internet-is-not-a-phase', title: 'MOM, POST-INTERNET IS NOT A PHASE ;(', year: '2024', venue: 'Okay Initiative Space', location: 'Athens', imageFolder: 'MOM, POST-INTERNET IS NOT A PHASE _(' },
  { id: 'book-exhibition-untitled-space', title: 'Book Exhibition', year: '2024', venue: 'UNTITLED SPACE', location: 'Tokyo' },
  { id: 'bezzvuchnodohlukhoty', title: 'bezzvuchnodohlukhoty', year: '2023', venue: 'National Academy of Fine Arts', location: 'Kyiv' },
  { id: 'tama-art-university-installation', title: 'Multimedia interactive installation', year: '2023', venue: 'Tama Art University', location: 'Tokyo' },
]

const DIARY_PHOTO_MODULES = import.meta.glob('../target/diary photos/*.{jpeg,jpg,png,webp}', { eager: true, import: 'default' })
const EXHIBITION_IMAGE_MODULES = import.meta.glob('../target/exhibitions/**/*.{jpeg,jpg,jpg_,png,webp,JPEG,JPG,PNG,WEBP}', { eager: true, query: '?url', import: 'default' })

const DIARY_PHOTOS = Object.entries(DIARY_PHOTO_MODULES)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([path, src], index) => ({
    src,
    alt: `Diary photo ${index + 1}`,
    label: path.split('/').pop()?.replace(/\.[^.]+$/, '').replace(/_/g, ' ') ?? `photo ${index + 1}`,
  }))

const EXHIBITION_IMAGES_BY_FOLDER = Object.entries(EXHIBITION_IMAGE_MODULES).reduce((collection, [path, src], index) => {
  const segments = path.replace(/\\/g, '/').split('/')
  const folder = segments[segments.length - 2] ?? 'exhibition'
  if (!collection.has(folder)) collection.set(folder, [])
  collection.get(folder).push({
    src,
    alt: segments.at(-1)?.replace(/\.[^.]+$/, '').replace(/_/g, ' ') ?? `image ${index + 1}`,
  })
  return collection
}, new Map())

function useClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return {
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
    date: now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }),
  }
}

function StatusBar() {
  return (
    <div className="status-bar" aria-hidden="true">
      <img src={`${STATIC_ROOT}/icons/icons.svg`} draggable="false" alt="" />
    </div>
  )
}

function GLBModel({ url }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} />
}

function ThreeViewer({ url, title, home = false }) {
  return (
    <div className="three-viewer">
      <Canvas camera={{ position: home ? [-0.55, 0.24, 0.48] : [0.58, 0.73, -0.85], fov: home ? 36 : 48 }} dpr={[1, 1.7]}>
        <color attach="background" args={['#f8f6ef']} />
        <ambientLight intensity={1.8} />
        <Suspense fallback={null}>
          <Stage adjustCamera={false} intensity={0.45} environment="city">
            <GLBModel url={url} />
          </Stage>
        </Suspense>
        <OrbitControls enableDamping enablePan={false} minDistance={home ? 0.22 : 0.08} maxDistance={home ? 1.1 : 2.5} />
      </Canvas>
      <div className="viewer-caption">{title}</div>
      <div className="viewer-hint">drag to look</div>
    </div>
  )
}

function LockScreen({ onUnlock }) {
  const { time, date } = useClock()
  const sliderRef = useRef(null)
  const thumbRef = useRef(null)
  const dragRef = useRef(null)
  const didUnlockRef = useRef(false)

  const startDrag = (event) => {
    const point = event.touches?.[0] ?? event
    dragRef.current = {
      startX: point.clientX,
      originalLeft: thumbRef.current?.offsetLeft ?? 0,
    }
    event.preventDefault()
  }

  useEffect(() => {
    const move = (event) => {
      if (!dragRef.current || !sliderRef.current || !thumbRef.current) return
      const point = event.touches?.[0] ?? event
      const maxLeft = sliderRef.current.offsetWidth - thumbRef.current.offsetWidth
      const nextLeft = Math.max(2, Math.min(maxLeft, dragRef.current.originalLeft + point.clientX - dragRef.current.startX))
      thumbRef.current.style.left = `${nextLeft}px`
      if (nextLeft >= maxLeft * 0.94) {
        didUnlockRef.current = true
        dragRef.current = null
        thumbRef.current.style.left = '2px'
        onUnlock()
      }
    }

    const end = () => {
      if (thumbRef.current && !didUnlockRef.current) thumbRef.current.style.left = '2px'
      didUnlockRef.current = false
      dragRef.current = null
    }

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', end)
    window.addEventListener('touchmove', move, { passive: false })
    window.addEventListener('touchend', end)

    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', end)
      window.removeEventListener('touchmove', move)
      window.removeEventListener('touchend', end)
    }
  }, [onUnlock])

  return (
    <section className="screen-layer lock-screen" aria-label="Lock screen">
      <StatusBar />
      <div className="lock-clock">
        <strong>{time}</strong>
        <span>{date}</span>
      </div>
      <div className="slide-dock">
        <div className="slide-track" ref={sliderRef} aria-label="Slide to unlock" role="group">
          <span>Slide to unlock</span>
          <button className="slide-thumb" type="button" ref={thumbRef} onClick={onUnlock} onMouseDown={startDrag} onTouchStart={startDrag} aria-label="Unlock">
            <img src={`${STATIC_ROOT}/icons/arrow.png`} draggable="false" alt="" />
          </button>
        </div>
        <a className="camera-link" href="https://instagram.com/shelestvetrovki" target="_blank" rel="noreferrer" aria-label="Open Instagram">
          <img src={`${STATIC_ROOT}/icons/camera.svg`} draggable="false" alt="" />
        </a>
      </div>
    </section>
  )
}

function PasscodeScreen({ passcode, onSuccess }) {
  const [entered, setEntered] = useState([])
  const [shake, setShake] = useState(false)

  const reset = () => {
    setEntered([])
    setShake(true)
    window.setTimeout(() => setShake(false), 360)
  }

  const submitDigit = (digit) => {
    setEntered((current) => {
      const next = [...current, digit].slice(0, 4)
      if (next.length === 4) window.setTimeout(() => (next.join('') === passcode ? onSuccess() : reset()), 170)
      return next
    })
  }

  const deleteDigit = () => setEntered((current) => current.slice(0, -1))
  const cheat = () => {
    setEntered([])
    passcode.split('').forEach((digit, index) => {
      window.setTimeout(() => {
        setEntered((current) => [...current, digit].slice(0, 4))
        if (index === passcode.length - 1) window.setTimeout(onSuccess, 400)
      }, index * 220)
    })
  }

  useEffect(() => {
    const handleKeydown = (event) => {
      if (/^\d$/.test(event.key)) submitDigit(event.key)
      if (event.key === 'Backspace') deleteDigit()
      if (event.key === 'Escape') cheat()
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  })

  return (
    <section className="screen-layer passcode-screen" aria-label="Passcode screen">
      <StatusBar />
      <div className="message-card">
        <img src={`${STATIC_ROOT}/app-logos/imessage.jpeg`} draggable="false" alt="" />
        <div>
          <strong>Unknown Number:</strong>
          <span>The code is: {passcode}</span>
        </div>
      </div>
      <header className="passcode-header">Enter Passcode</header>
      <div className="passcode-bottom">
        <div className={`passcode-dots ${shake ? 'is-shaking' : ''}`} aria-label={`${entered.length} digits entered`}>
          {Array.from({ length: 4 }).map((_, index) => <span className={entered[index] ? 'filled' : ''} key={index} />)}
        </div>
        <div className="keypad">
          {[
            ['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
          ].map(([digit, letters]) => (
            <button type="button" className="key" onClick={() => submitDigit(digit)} key={digit}>
              <span>{digit}</span>{letters && <small>{letters}</small>}
            </button>
          ))}
          <button type="button" className="key utility" onClick={cheat}>Esc</button>
          <button type="button" className="key" onClick={() => submitDigit('0')}><span>0</span></button>
          <button type="button" className="key utility" onClick={deleteDigit} aria-label="Delete">&larr;</button>
        </div>
      </div>
    </section>
  )
}

function HomeScreen({ apps, onOpenApp }) {
  const [page, setPage] = useState(0)
  const startX = useRef(null)
  const pages = [apps.filter((app) => !app.page), apps.filter((app) => app.page === 1)]

  const handleSwipeEnd = (event) => {
    if (startX.current === null) return
    const point = event.changedTouches?.[0] ?? event
    const delta = point.clientX - startX.current
    if (Math.abs(delta) > 45) setPage((current) => Math.max(0, Math.min(pages.length - 1, current + (delta < 0 ? 1 : -1))))
    startX.current = null
  }

  return (
    <section className="screen-layer home-screen" aria-label="Home screen" onMouseDown={(event) => { startX.current = event.clientX }} onMouseUp={handleSwipeEnd} onTouchStart={(event) => { startX.current = event.touches[0].clientX }} onTouchEnd={handleSwipeEnd}>
      <StatusBar />
      <div className="pages-window">
        <div className="pages-track" style={{ transform: `translateX(-${page * 100}%)` }}>
          {pages.map((pageApps, pageIndex) => (
            <div className="apps-grid" key={pageIndex}>
              {pageApps.map((app) => (
                <button className={`app-icon ${app.kind === 'folder' ? 'is-folder' : ''}`} type="button" key={app.id} onClick={() => onOpenApp(app)} aria-label={`Open ${app.title}`}>
                  {app.kind === 'folder' ? <span className="folder-preview">{app.items?.slice(0, 4).map((item) => <i key={item.id}>{item.short ?? item.title.slice(0, 2)}</i>)}</span> : <img src={app.icon} draggable="false" alt="" />}
                  <span>{app.title}</span>
                </button>
              ))}
              {Array.from({ length: Math.max(0, 20 - pageApps.length) }).map((_, index) => <span className="app-placeholder" key={index} />)}
            </div>
          ))}
        </div>
      </div>
      <div className="page-dots" aria-hidden="true">
        {pages.map((_, index) => <button className={index === page ? 'active' : ''} type="button" onClick={() => setPage(index)} key={index} />)}
      </div>
    </section>
  )
}

function AppChrome({ title, onBack, children, tone = 'light' }) {
  return (
    <section className={`screen-layer native-app ${tone}`} aria-label={title}>
      <StatusBar />
      <header className="app-nav">
        <button type="button" onClick={onBack} aria-label="Back">‹</button>
        <strong>{title}</strong>
      </header>
      <div className="app-content">{children}</div>
    </section>
  )
}

function HouseApp({ openRoom }) {
  return (
    <div className="stacked-app">
      <ThreeViewer url="assets/home.glb" title="shelestvetrovki house" home />
      <div className="room-jump-row">
        {ROOMS.map((room, index) => <button type="button" onClick={() => openRoom(index)} key={room.id}>{room.title}</button>)}
      </div>
    </div>
  )
}

function RoomsApp({ openRoom }) {
  return (
    <div className="list-app">
      {ROOMS.map((room, index) => (
        <button type="button" className="list-row" onClick={() => openRoom(index)} key={room.id}>
          <span>{room.title}</span>
          <small>{room.note}</small>
        </button>
      ))}
    </div>
  )
}

function ArtworksApp({ openApp, openRoom, openLightbox }) {
  const featureRows = [
    {
      title: 'Film',
      caption: 'shelestvetrovki.mp4',
      action: () => openApp({ id: 'film', title: 'Film' }),
    },
    {
      title: 'House View',
      caption: 'main 3D house',
      action: () => openApp({ id: 'house', title: 'House View' }),
    },
    {
      title: 'Room Views',
      caption: 'YUNA / SUZUNE / AIKO / MOENE',
      action: () => openApp({ id: 'rooms', title: 'Room Views' }),
    },
    {
      title: 'Exhibitions',
      caption: 'shows and documentation',
      action: () => openApp({ id: 'exhibitions', title: 'Exhibitions' }),
    },
  ]

  return (
    <div className="artworks-app">
      <div className="featured-video">
        <video src="assets/shelestvetrovki-scan-web.mp4" muted loop playsInline autoPlay poster="assets/welcome.webp" />
      </div>
      <div className="list-app compact">
        {featureRows.map((item) => (
          <button type="button" className="list-row" onClick={item.action} key={item.title}>
            <span>{item.title}</span>
            <small>{item.caption}</small>
          </button>
        ))}
      </div>
      <div className="mini-room-grid">
        {ROOMS.map((room, index) => <button type="button" onClick={() => openRoom(index)} key={room.id}>{room.title}</button>)}
      </div>
      <Gallery images={DIARY_PHOTOS.slice(0, 6)} onOpen={openLightbox} />
    </div>
  )
}

function WebsitesApp({ openFolder, openApp }) {
  const links = [
    ['local.group', 'https://localgr0up.com/'],
    ['CV', CV_URL],
    ['Instagram', 'https://instagram.com/shelestvetrovki'],
  ]

  return (
    <div className="websites-app">
      <div className="fake-safari-bar">http://shelestvetrovki.com/</div>
      <div className="list-app compact">
        <button type="button" className="list-row" onClick={() => openApp({ id: 'house', title: 'House View' })}>
          <span>House View</span>
          <small>interactive 3D home</small>
        </button>
        {FOLDERS.filter((item) => ['cv', 'press', 'writing'].includes(item.id)).map((item) => (
          <button type="button" className="list-row" onClick={() => openFolder(item)} key={item.id}>
            <span>{item.title}</span>
            <small>{item.caption}</small>
          </button>
        ))}
      </div>
      <div className="external-link-stack">
        {links.map(([label, url]) => <button type="button" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')} key={url}>{label}</button>)}
      </div>
    </div>
  )
}

function RoomApp({ index, openRoom }) {
  const room = ROOMS[index]
  const next = (index + 1) % ROOMS.length
  return (
    <div className="stacked-app">
      <ThreeViewer url={`rooms/${room.file}`} title={room.title} />
      <div className="room-jump-row">
        <button type="button" onClick={() => openRoom((index + ROOMS.length - 1) % ROOMS.length)}>previous</button>
        <button type="button" onClick={() => openRoom(next)}>next room</button>
      </div>
    </div>
  )
}

function FilmApp() {
  return (
    <div className="film-app">
      <video src="assets/shelestvetrovki-scan-web.mp4" controls playsInline poster="assets/welcome.webp" />
      <p>shelestvetrovki.mp4</p>
    </div>
  )
}

function Gallery({ images, onOpen }) {
  return (
    <div className="gallery-grid">
      {images.map((image, index) => (
        <button type="button" onClick={() => onOpen(images, index)} key={`${image.src}-${index}`}>
          <img src={image.src} alt={image.alt} loading="lazy" />
        </button>
      ))}
    </div>
  )
}

function PhotosApp({ openLightbox }) {
  return <Gallery images={DIARY_PHOTOS} onOpen={openLightbox} />
}

function ExhibitionsApp({ openLightbox }) {
  const [selected, setSelected] = useState(null)
  if (selected) {
    const images = selected.imageFolder ? EXHIBITION_IMAGES_BY_FOLDER.get(selected.imageFolder) ?? [] : []
    return (
      <div className="detail-app">
        <button type="button" className="inline-back" onClick={() => setSelected(null)}>‹ exhibitions</button>
        <h2>{selected.title}</h2>
        <p>{selected.year} / {selected.venue}<br />{selected.location}</p>
        {images.length ? <Gallery images={images} onOpen={openLightbox} /> : <p className="empty-note">documentation coming soon</p>}
      </div>
    )
  }

  return (
    <div className="list-app">
      {EXHIBITIONS.map((exhibition) => (
        <button type="button" className="list-row" onClick={() => setSelected(exhibition)} key={exhibition.id}>
          <span>{exhibition.title}</span>
          <small>{exhibition.year} / {exhibition.venue}</small>
        </button>
      ))}
    </div>
  )
}

function FolderContent({ folder }) {
  if (folder.id === 'exhibitions') {
    return (
      <div className="folder-content">
        <h2>{folder.title}</h2>
        <p>{folder.caption}</p>
        {EXHIBITIONS.map((exhibition) => (
          <section key={exhibition.id}>
            <h3>{exhibition.year}</h3>
            <p>{exhibition.title}<br />{exhibition.venue}, {exhibition.location}</p>
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="folder-content">
      <h2>{folder.title}</h2>
      <p>{folder.caption}</p>
      {folder.id === 'cv' && <button type="button" className="pill-link" onClick={() => window.open(CV_URL, '_blank', 'noopener,noreferrer')}>open full cv</button>}
      {folder.links?.map(([label, url]) => <button type="button" className="text-link" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')} key={url}>{label}</button>)}
      {folder.sections?.map(([heading, entries]) => (
        <section key={heading}>
          <h3>{heading}</h3>
          {entries.map((entry) => <p key={entry}>{entry}</p>)}
        </section>
      ))}
    </div>
  )
}

function AboutApp({ openFolder, openApp }) {
  const widgets = [
    { title: 'radio', icon: 'assets/radio.gif', action: () => openApp({ id: 'music', title: 'Music' }) },
    { title: 'zodiac', icon: 'assets/zodiac.gif' },
    { title: 'safety pin', icon: 'assets/safety-pin.gif' },
    { title: 'mail', icon: 'assets/envelope.gif', action: () => window.location.href = `mailto:${CONTACT_EMAIL}` },
  ]

  return (
    <div className="about-app">
      <div className="note-card" dangerouslySetInnerHTML={{ __html: BIO_HTML }} />
      <div className="about-folder-grid">
        {FOLDERS.map((folder) => (
          <button type="button" onClick={() => openFolder(folder)} key={folder.id}>
            <img src="assets/folder-icon-macos.webp" alt="" />
            <span>{folder.title}</span>
          </button>
        ))}
      </div>
      <div className="widget-grid">
        {widgets.map((widget) => (
          <button type="button" onClick={widget.action} key={widget.title}>
            <img src={widget.icon} alt="" />
            <span>{widget.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function MusicApp() {
  const [songIndex, setSongIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)
  const song = SONGS[songIndex]
  const today = useMemo(() => new Date().toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }), [])
  const pickSong = (nextIndex, autoplay = isPlaying) => {
    const resolvedIndex = (nextIndex + SONGS.length) % SONGS.length
    setSongIndex(resolvedIndex)
    setIsPlaying(false)
    window.setTimeout(() => {
      if (autoplay && audioRef.current) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false))
      }
    }, 0)
  }
  const togglePlayback = () => {
    if (!audioRef.current) return
    if (audioRef.current.paused) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    } else {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  return (
    <div className="music-app">
      <div className="music-cover-frame">
        <img src={song.cover} alt={`${song.title} cover`} />
      </div>
      <div className="music-loading">Loading...</div>
      <div className="music-meta-line">
        <span>{today}</span>
        <span>{song.links.map(([label]) => label).join(' / ')}</span>
      </div>
      <h2>{song.title}</h2>
      <p>{song.artist}</p>
      <audio
        ref={audioRef}
        src={song.src}
        onEnded={() => pickSong(songIndex + 1, true)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
      <div className="ipod-controls">
        <button type="button" onClick={() => pickSong(songIndex - 1)} aria-label="Previous track">‹‹</button>
        <button type="button" className="play-toggle" onClick={togglePlayback} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? '❚❚' : '▶'}
        </button>
        <button type="button" onClick={() => pickSong(songIndex + 1)} aria-label="Next track">››</button>
      </div>
      <div className="song-list original-style">
        {SONGS.map((item, index) => (
          <button type="button" className={index === songIndex ? 'active' : ''} onClick={() => pickSong(index, false)} key={item.src}>
            {item.title}
          </button>
        ))}
      </div>
    </div>
  )
}

function ContactApp() {
  return (
    <div className="contact-app">
      <img src="assets/envelope.gif" alt="" />
      <h2>Contact</h2>
      <p>{CONTACT_EMAIL}</p>
      <button type="button" onClick={() => window.location.href = `mailto:${CONTACT_EMAIL}`}>write email</button>
      <button type="button" onClick={() => window.open('https://instagram.com/shelestvetrovki', '_blank', 'noopener,noreferrer')}>instagram</button>
    </div>
  )
}

function Lightbox({ images, index, onClose, setIndex }) {
  const image = images[index]
  return (
    <section className="screen-layer lightbox" aria-label="Image viewer">
      <button type="button" className="lightbox-close" onClick={onClose}>close</button>
      <img src={image.src} alt={image.alt} />
      <div className="lightbox-controls">
        <button type="button" onClick={() => setIndex((index + images.length - 1) % images.length)}>‹</button>
        <span>{index + 1} / {images.length}</span>
        <button type="button" onClick={() => setIndex((index + 1) % images.length)}>›</button>
      </div>
    </section>
  )
}

export default function App() {
  const [screen, setScreen] = useState('lock')
  const [activeApp, setActiveApp] = useState(null)
  const [poweredOff, setPoweredOff] = useState(false)
  const [folder, setFolder] = useState(null)
  const [roomIndex, setRoomIndex] = useState(0)
  const [lightbox, setLightbox] = useState(null)
  const passcode = useMemo(() => Math.floor(1000 + Math.random() * 9000).toString(), [])

  const apps = useMemo(() => [
    { id: 'artworks', title: 'Artworks', icon: `${STATIC_ROOT}/app-logos/videos.png` },
    { id: 'websites', title: 'Websites', icon: `${STATIC_ROOT}/app-logos/settings.jpeg` },
    { id: 'about', title: 'About', icon: `${STATIC_ROOT}/app-logos/notes.jpeg` },
    { id: 'photos', title: 'Photos', icon: `${STATIC_ROOT}/app-logos/photos.jpeg` },
    { id: 'music', title: 'Music', icon: `${STATIC_ROOT}/app-logos/music.png` },
    { id: 'contact', title: 'Contact', icon: `${STATIC_ROOT}/app-logos/mail.png` },
    { id: 'instagram', title: 'Instagram', icon: `${STATIC_ROOT}/app-logos/instagram.png`, externalUrl: 'https://instagram.com/shelestvetrovki' },
    { id: 'terms', title: 'Terms', icon: `${STATIC_ROOT}/app-logos/appstore.jpeg`, page: 1 },
    { id: 'privacy', title: 'Privacy', icon: `${STATIC_ROOT}/app-logos/faicetime.png`, page: 1 },
  ], [])

  const openApp = (app) => {
    if (app.externalUrl) {
      window.open(app.externalUrl, '_blank', 'noopener,noreferrer')
      return
    }
    setFolder(null)
    setActiveApp(app)
    setScreen('app')
  }

  const openRoom = (index) => {
    setRoomIndex(index)
    openApp({ id: 'room', title: ROOMS[index].title })
  }

  const openFolder = (nextFolder) => {
    setFolder(nextFolder)
    openApp({ id: 'folder', title: nextFolder.title })
  }

  const openLightbox = (images, index) => setLightbox({ images, index })
  const closeLightbox = () => setLightbox(null)

  const goHome = () => {
    setActiveApp(null)
    setFolder(null)
    setLightbox(null)
    setScreen('home')
    setPoweredOff(false)
  }

  const togglePower = () => {
    setPoweredOff((current) => {
      if (!current) return true
      setScreen('lock')
      setActiveApp(null)
      setFolder(null)
      setLightbox(null)
      return false
    })
  }

  const renderApp = () => {
    if (!activeApp) return null
    if (activeApp.id === 'artworks') return <ArtworksApp openApp={openApp} openRoom={openRoom} openLightbox={openLightbox} />
    if (activeApp.id === 'websites') return <WebsitesApp openFolder={openFolder} openApp={openApp} />
    if (activeApp.id === 'house') return <HouseApp openRoom={openRoom} />
    if (activeApp.id === 'rooms') return <RoomsApp openRoom={openRoom} />
    if (activeApp.id === 'room') return <RoomApp index={roomIndex} openRoom={openRoom} />
    if (activeApp.id === 'film') return <FilmApp />
    if (activeApp.id === 'photos') return <PhotosApp openLightbox={openLightbox} />
    if (activeApp.id === 'exhibitions') return <ExhibitionsApp openLightbox={openLightbox} />
    if (activeApp.id === 'about') return <AboutApp openFolder={openFolder} openApp={openApp} />
    if (activeApp.id === 'archive') return <div className="about-folder-grid archive-grid">{FOLDERS.map((item) => <button type="button" onClick={() => openFolder(item)} key={item.id}><img src="assets/folder-icon-macos.webp" alt="" /><span>{item.title}</span></button>)}</div>
    if (activeApp.id === 'folder' && folder) return <FolderContent folder={folder} />
    if (activeApp.id === 'music') return <MusicApp />
    if (activeApp.id === 'contact') return <ContactApp />
    if (activeApp.id === 'terms') return <FolderContent folder={{ title: 'Terms', caption: 'mobile archive prototype', sections: [['Terms', ['This phone shell is a navigation study for the shelestvetrovki web archive.', 'All artwork, rooms, photos, sounds, and links remain authored portfolio material.']]] }} />
    if (activeApp.id === 'privacy') return <FolderContent folder={{ title: 'Privacy', caption: 'mobile archive prototype', sections: [['Privacy', ['This local prototype does not add tracking or collect visitor data.', 'External links open outside the phone shell.']]] }} />
    return null
  }

  return (
    <main className="metarialist-clone">
      <div className="phone-border">
        <button className="side-power" type="button" onClick={togglePower} aria-label="Power" />
        <span className="side-ringer" />
        <span className="side-volume one" />
        <span className="side-volume two" />
        <div className="phone">
          <span className="camera-dot" />
          <span className="speaker" />
          <div className={`phone-screen ${poweredOff ? 'is-off' : ''}`}>
            {!poweredOff && screen === 'lock' && <LockScreen onUnlock={() => setScreen('passcode')} />}
            {!poweredOff && screen === 'passcode' && <PasscodeScreen passcode={passcode} onSuccess={() => setScreen('home')} />}
            {!poweredOff && screen === 'home' && <HomeScreen apps={apps} onOpenApp={openApp} />}
            {!poweredOff && screen === 'app' && activeApp && <AppChrome title={activeApp.title} onBack={goHome}>{renderApp()}</AppChrome>}
            {!poweredOff && lightbox && <Lightbox images={lightbox.images} index={lightbox.index} setIndex={(index) => setLightbox((current) => ({ ...current, index }))} onClose={closeLightbox} />}
          </div>
          <button className="home-button" type="button" onClick={goHome} aria-label="Home"><span /></button>
        </div>
      </div>
    </main>
  )
}

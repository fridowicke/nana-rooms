import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'

const COLOR_HEX = {
  pink: '#ff8fcf',
  white: '#e6e6e6',
  beige: '#e2c9a6',
  brown: '#a9714b',
  black: '#2b2b2b',
  grey: '#9a9a9a',
  blue: '#7db4ff',
  green: '#7dd39a',
  purple: '#b58cf0',
  red: '#ff6b6b',
  yellow: '#ffd76b',
  multicolor: '#ff9f7a',
  'screen time': '#18d9d3',
}
const COLOR_ORDER = Object.keys(COLOR_HEX)
const SCREENSHOT_TAG = 'screen time screenshot'
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'
const NODE_R = 16

function buildLinks(nodes, k = 3) {
  const links = []
  const seen = new Set()
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i]
    const scored = []
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue
      const b = nodes[j]
      let s = 0
      for (const t of a.tags) if (b.tagSet.has(t)) s += (t === SCREENSHOT_TAG ? 4 : 1)
      if (a.isShot !== b.isShot) s -= 3
      if (a.color === b.color) s += 0.5
      if (s > 0) scored.push([s, j])
    }
    scored.sort((x, y) => y[0] - x[0])
    for (const [s, j] of scored.slice(0, k)) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (seen.has(key)) continue
      seen.add(key)
      links.push({ a: i, b: j, weight: s })
    }
  }
  return links
}

export default function ArchiveMap({ images, tags, isMobileLayout = false }) {
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [activeColors, setActiveColors] = useState(() => new Set(COLOR_ORDER))
  const [activeTags, setActiveTags] = useState(() => new Set())
  const [query, setQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(!isMobileLayout)
  const [, force] = useState(0)

  // mutable engine state (patchy-studies style)
  const S = useRef({
    W: 800, H: 600, dpr: 1,
    view: { x: 400, y: 300, scale: 0.9 },
    alpha: 1, drag: null, pan: null, moved: false,
    hovered: null, selected: null,
    visible: [], visibleSet: new Set(),
    raf: 0,
  }).current

  const nodes = useMemo(() => images.map((img, index) => {
    const key = `${img.page}/${img.filename}`
    const t = tags?.[key] ?? {}
    const objects = Array.isArray(t.objects) ? t.objects : []
    const isShot = objects.includes(SCREENSHOT_TAG)
    const color = isShot ? 'screen time' : (COLOR_HEX[t.color] ? t.color : 'multicolor')
    const tagList = [...objects]
    const im = new Image()
    im.src = img.thumbSrc
    return {
      index, key, src: img.src, thumbSrc: img.thumbSrc, img: im,
      color, isShot, caption: t.caption ?? '', date: t.date ?? null,
      tags: tagList, tagSet: new Set(tagList),
      x: Math.cos(index * 2.399) * 420 + (index % 4) * 25,
      y: Math.sin(index * 2.399) * 330 + (index % 5) * 18,
      vx: 0, vy: 0, fixed: false,
    }
  }), [images, tags])

  const links = useMemo(() => buildLinks(nodes), [nodes])
  const neighbors = useMemo(() => {
    const m = new Map()
    links.forEach((l) => {
      if (!m.has(l.a)) m.set(l.a, new Set())
      if (!m.has(l.b)) m.set(l.b, new Set())
      m.get(l.a).add(l.b); m.get(l.b).add(l.a)
    })
    return m
  }, [links])
  const allTags = useMemo(() => {
    const count = new Map()
    nodes.forEach((n) => n.tags.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)))
    return [...count.entries()].sort((a, b) => b[1] - a[1])
  }, [nodes])

  const q = query.trim().toLowerCase()
  const visibleList = useMemo(() => nodes.filter((n) => {
    if (!activeColors.has(n.color)) return false
    if (activeTags.size > 0) for (const t of activeTags) if (!n.tagSet.has(t)) return false
    if (q && !(n.caption.toLowerCase().includes(q) || n.tags.some((t) => t.includes(q)) || n.color.includes(q))) return false
    return true
  }).map((n) => n.index), [nodes, activeColors, activeTags, q])

  useEffect(() => {
    S.visible = visibleList
    S.visibleSet = new Set(visibleList)
    S.alpha = Math.max(S.alpha, 0.5)
  }, [visibleList, S])
  useEffect(() => { S.selected = selected }, [selected, S])
  useEffect(() => { S.hovered = hovered }, [hovered, S])

  // ---------- engine ----------
  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    const ctx = canvas.getContext('2d')

    const world = (sx, sy) => ({ x: (sx - S.view.x) / S.view.scale, y: (sy - S.view.y) / S.view.scale })
    const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
    const hit = (sx, sy) => {
      const p = world(sx, sy)
      const r2 = (NODE_R + 3) * (NODE_R + 3)
      for (let i = S.visible.length - 1; i >= 0; i--) {
        const n = nodes[S.visible[i]]
        const dx = p.x - n.x, dy = p.y - n.y
        if (dx * dx + dy * dy <= r2) return n
      }
      return null
    }
    const relationSet = () => {
      const idx = S.selected ?? S.hovered
      if (idx == null) return null
      const s = new Set([idx])
      neighbors.get(idx)?.forEach((k) => s.add(k))
      return s
    }

    const simulate = () => {
      if (S.alpha < 0.002 && !S.drag) return
      const vis = S.visible.map((i) => nodes[i])
      const a = S.alpha
      for (let i = 0; i < vis.length; i++) {
        const p = vis[i]
        for (let j = i + 1; j < vis.length; j++) {
          const o = vis[j]
          const dx = p.x - o.x, dy = p.y - o.y
          const d2 = dx * dx + dy * dy + 50
          if (d2 > 360000) continue
          const f = 14000 / d2 * a
          const dist = Math.sqrt(d2)
          const fx = dx / dist * f, fy = dy / dist * f
          if (!p.fixed) { p.vx += fx; p.vy += fy }
          if (!o.fixed) { o.vx -= fx; o.vy -= fy }
        }
        if (!p.fixed) { p.vx += -p.x * 0.0005 * a; p.vy += -p.y * 0.0005 * a }
      }
      for (const l of links) {
        if (!S.visibleSet.has(l.a) || !S.visibleSet.has(l.b)) continue
        const A = nodes[l.a], B = nodes[l.b]
        const dx = B.x - A.x, dy = B.y - A.y
        const d = Math.max(1, Math.sqrt(dx * dx + dy * dy))
        const ideal = 120
        const f = (d - ideal) * 0.0018 * a * Math.min(2, l.weight)
        const fx = dx / d * f, fy = dy / d * f
        if (!A.fixed) { A.vx += fx; A.vy += fy }
        if (!B.fixed) { B.vx -= fx; B.vy -= fy }
      }
      for (const n of vis) {
        if (n.fixed) continue
        n.vx *= 0.86; n.vy *= 0.86
        n.x += n.vx; n.y += n.vy
      }
      S.alpha *= 0.992
    }

    const draw = () => {
      const { W, H, dpr, view } = S
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const rels = relationSet()
      ctx.save()
      ctx.translate(view.x, view.y)
      ctx.scale(view.scale, view.scale)
      for (const l of links) {
        if (!S.visibleSet.has(l.a) || !S.visibleSet.has(l.b)) continue
        const A = nodes[l.a], B = nodes[l.b]
        const hot = rels && rels.has(l.a) && rels.has(l.b) && (l.a === (S.selected ?? S.hovered) || l.b === (S.selected ?? S.hovered))
        ctx.strokeStyle = hot ? 'rgba(20,20,20,.8)' : 'rgba(25,25,25,.16)'
        ctx.lineWidth = (hot ? 1.6 : 0.7) / view.scale
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke()
      }
      const showImg = view.scale > 0.55
      for (const i of S.visible) {
        const n = nodes[i]
        const dim = rels && !rels.has(i)
        const sel = i === S.selected, hov = i === S.hovered
        ctx.globalAlpha = dim ? 0.15 : 1
        ctx.beginPath(); ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2)
        ctx.fillStyle = COLOR_HEX[n.color]; ctx.fill()
        if (showImg && n.img.complete && n.img.naturalWidth > 0) {
          ctx.save(); ctx.beginPath(); ctx.arc(n.x, n.y, NODE_R - 2.5, 0, Math.PI * 2); ctx.clip()
          const iw = n.img.naturalWidth, ih = n.img.naturalHeight, s = Math.max((NODE_R * 2) / iw, (NODE_R * 2) / ih)
          ctx.drawImage(n.img, n.x - iw * s / 2, n.y - ih * s / 2, iw * s, ih * s)
          ctx.restore()
        }
        if (sel || hov) {
          ctx.lineWidth = (sel ? 3.5 : 2) / view.scale
          ctx.strokeStyle = '#111'
          ctx.beginPath(); ctx.arc(n.x, n.y, NODE_R + 1, 0, Math.PI * 2); ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
      ctx.restore()
    }

    const loop = () => { simulate(); draw(); S.raf = requestAnimationFrame(loop) }

    const resize = () => {
      S.dpr = Math.min(window.devicePixelRatio || 1, 2)
      S.W = stage.clientWidth; S.H = stage.clientHeight
      canvas.width = S.W * S.dpr; canvas.height = S.H * S.dpr
      canvas.style.width = S.W + 'px'; canvas.style.height = S.H + 'px'
      if (!S.viewInit) { S.view = { x: S.W / 2, y: S.H / 2, scale: Math.min(S.W / 1500, S.H / 1100, 1) }; S.viewInit = true }
    }
    const ro = new ResizeObserver(resize)
    ro.observe(stage)
    resize()

    const onDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return
      canvas.setPointerCapture(e.pointerId)
      const { x, y } = local(e)
      const n = hit(x, y)
      S.moved = false
      if (n) { S.drag = n; n.fixed = true } else S.pan = { x, y, vx: S.view.x, vy: S.view.y }
      canvas.classList.add('grabbing')
    }
    const onMove = (e) => {
      const { x, y } = local(e)
      if (S.drag) {
        const p = world(x, y); S.drag.x = p.x; S.drag.y = p.y; S.moved = true; S.alpha = Math.max(S.alpha, 0.2)
      } else if (S.pan) {
        S.view.x = S.pan.vx + x - S.pan.x; S.view.y = S.pan.vy + y - S.pan.y; S.moved = true
      } else {
        const h = hit(x, y)
        const idx = h ? h.index : null
        if (idx !== S.hovered) { S.hovered = idx; setHovered(idx) }
        canvas.style.cursor = h ? 'pointer' : 'default'
      }
    }
    const onUp = (e) => {
      const { x, y } = local(e)
      if (S.drag) {
        const n = S.drag; S.drag = null; n.fixed = false
        if (!S.moved) { setSelected(n.index); S.alpha = Math.max(S.alpha, 0.3) }
      } else if (!S.moved && !hit(x, y)) {
        setSelected(null)
      }
      S.pan = null
      canvas.classList.remove('grabbing')
    }
    const onWheel = (e) => {
      e.preventDefault()
      const { x, y } = local(e)
      const old = S.view.scale
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY
      const f = Math.max(0.1, Math.min(6, old * Math.exp(-dy * 0.0035)))
      const wx = (x - S.view.x) / old, wy = (y - S.view.y) / old
      S.view.x = x - wx * f; S.view.y = y - wy * f; S.view.scale = f
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    S.raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(S.raf)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [nodes, links, neighbors, S])

  // ---------- controls ----------
  const focusNode = useCallback((index) => {
    const n = nodes[index]
    if (!n) return
    setSelected(index)
    const scale = Math.max(S.view.scale, 1.2)
    S.view = { scale, x: S.W / 2 - n.x * scale, y: S.H / 2 - n.y * scale }
    S.alpha = Math.max(S.alpha, 0.3)
  }, [nodes, S])
  const goRelative = (delta) => {
    if (visibleList.length === 0) return
    const cur = selected != null ? visibleList.indexOf(selected) : -1
    const next = ((cur + delta) % visibleList.length + visibleList.length) % visibleList.length
    focusNode(visibleList[next])
  }
  const goRandom = () => { if (visibleList.length) focusNode(visibleList[Math.floor(Math.random() * visibleList.length)]) }
  const fit = () => { S.view = { x: S.W / 2, y: S.H / 2, scale: Math.min(S.W / 1500, S.H / 1100, 1) } }
  const zoomBy = (k) => {
    const old = S.view.scale, f = Math.max(0.1, Math.min(6, old * k))
    const cx = S.W / 2, cy = S.H / 2
    const wx = (cx - S.view.x) / old, wy = (cy - S.view.y) / old
    S.view = { x: cx - wx * f, y: cy - wy * f, scale: f }
  }
  const reset = () => {
    setActiveColors(new Set(COLOR_ORDER)); setActiveTags(new Set()); setQuery(''); setSelected(null)
    nodes.forEach((n, i) => { n.x = Math.cos(i * 2.399) * 420 + (i % 4) * 25; n.y = Math.sin(i * 2.399) * 330 + (i % 5) * 18; n.vx = n.vy = 0 })
    fit(); S.alpha = 1
  }
  const toggleColor = (c) => setActiveColors((prev) => {
    const next = new Set(prev)
    if (next.has(c) && next.size === COLOR_ORDER.length) return new Set([c])
    if (next.has(c)) next.delete(c); else next.add(c)
    return next.size === 0 ? new Set(COLOR_ORDER) : next
  })
  const toggleTag = (t) => setActiveTags((prev) => { const next = new Set(prev); if (next.has(t)) next.delete(t); else next.add(t); return next })

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT') return
      if (e.key === 'ArrowRight') goRelative(1)
      if (e.key === 'ArrowLeft') goRelative(-1)
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const sel = selected != null ? nodes[selected] : null
  const hov = hovered != null ? nodes[hovered] : null
  const markNode = hov ?? sel
  const anyFilter = activeTags.size > 0 || q || activeColors.size !== COLOR_ORDER.length

  const chip = (label, active, onClick, colorDot, marked = false) => (
    <button key={label} type="button" onClick={onClick}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', border: '1px solid ' + (active ? '#000' : marked ? '#ff69b4' : '#ddd'), background: active ? '#000' : marked ? '#ffe4f3' : '#fff', color: active ? '#fff' : '#000', borderRadius: '999px', padding: '2px 8px', margin: '0 4px 4px 0', fontFamily: FONT, fontSize: '11px', fontWeight: 300, cursor: 'pointer', lineHeight: 1.5 }}>
      {colorDot && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colorDot, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block' }} />}
      {label}
    </button>
  )
  const navBtn = (label, onClick, disabled) => (
    <button type="button" onClick={onClick} disabled={disabled} style={{ border: '1px solid #000', background: '#fff', color: '#000', padding: '3px 9px', fontFamily: FONT, fontSize: '12px', fontWeight: 300, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, borderRadius: '3px' }}>{label}</button>
  )
  const roundBtn = (label, onClick, title) => (
    <button type="button" onClick={onClick} title={title} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.2)', background: 'rgba(255,255,255,0.9)', fontSize: '17px', lineHeight: '30px', padding: 0, cursor: 'pointer', fontFamily: FONT }}>{label}</button>
  )

  const cardW = isMobileLayout ? 'calc(100% - 18px)' : '320px'

  return (
    <div className="archive-map" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#fff', fontFamily: FONT, display: 'flex', flexDirection: isMobileLayout ? 'column' : 'row' }}>
      {/* Left panel */}
      <div style={{ flex: isMobileLayout ? '0 0 auto' : '0 0 220px', width: isMobileLayout ? '100%' : '220px', borderRight: isMobileLayout ? 'none' : '1px solid #eee', borderBottom: isMobileLayout ? '1px solid #eee' : 'none', padding: '14px 14px 10px', boxSizing: 'border-box', overflowY: 'auto', maxHeight: isMobileLayout ? (panelOpen ? '45%' : '44px') : '100%', transition: 'max-height 200ms', fontSize: '12px', fontWeight: 300, lineHeight: 1.4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 400 }}>global collective bedrooms archive</span>
          {isMobileLayout && <button type="button" onClick={() => setPanelOpen((p) => !p)} style={{ border: 'none', background: 'none', fontSize: '14px', cursor: 'pointer' }}>{panelOpen ? '−' : '+'}</button>}
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="search tags…" style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #ddd', padding: '5px 8px', fontFamily: FONT, fontSize: '12px', fontWeight: 300, marginBottom: '10px', outline: 'none' }} />
        <div style={{ color: '#666', marginBottom: '10px' }}>{visibleList.length} / {nodes.length} rooms · {links.filter((l) => visibleList.includes(l.a) && visibleList.includes(l.b)).length} links</div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {navBtn('← prev', () => goRelative(-1), visibleList.length === 0)}
          {navBtn('next →', () => goRelative(1), visibleList.length === 0)}
          {navBtn('random', goRandom, visibleList.length === 0)}
          {anyFilter && navBtn('reset', reset, false)}
        </div>
        <div style={{ color: '#666', marginBottom: '4px' }}>colour</div>
        <div style={{ marginBottom: '10px' }}>
          {COLOR_ORDER.map((c) => chip(c, activeColors.has(c) && activeColors.size !== COLOR_ORDER.length, () => toggleColor(c), COLOR_HEX[c], markNode?.color === c))}
        </div>
        <div style={{ color: '#666', marginBottom: '4px' }}>tags</div>
        <div>{allTags.map(([t, n]) => chip(`${t} ${n}`, activeTags.has(t), () => toggleTag(t), null, Boolean(markNode?.tagSet.has(t))))}</div>
      </div>

      {/* Stage */}
      <div ref={stageRef} style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <canvas ref={canvasRef} className="am-canvas" style={{ display: 'block', touchAction: 'none' }} />

        <div style={{ position: 'absolute', right: '12px', top: '12px', display: 'flex', gap: '6px', zIndex: 8 }}>
          {roundBtn('+', () => zoomBy(1.6), 'zoom in')}
          {roundBtn('−', () => zoomBy(1 / 1.6), 'zoom out')}
          {roundBtn('⌂', fit, 'fit')}
        </div>

        {/* hover tooltip: small, near cursor-free corner so it never covers neighbours */}
        {hov && !sel && (
          <div style={{ position: 'absolute', left: '12px', bottom: '12px', width: '200px', background: '#fff', border: '1px solid #111', padding: '6px', zIndex: 8, pointerEvents: 'none' }}>
            <img src={hov.src} alt="" style={{ width: '100%', height: '150px', objectFit: 'cover', display: 'block' }} />
            <div style={{ fontSize: '11px', fontWeight: 300, marginTop: '5px', lineHeight: 1.3 }}>room {hov.index + 1} · {hov.date ?? 'date unknown'}</div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>click to open</div>
          </div>
        )}

        {/* pinned detail card, docked bottom-right like patchy studies */}
        {sel && (
          <section style={{ position: 'absolute', right: isMobileLayout ? '9px' : '12px', bottom: isMobileLayout ? '9px' : '12px', width: cardW, maxHeight: isMobileLayout ? '40%' : '62%', overflowY: 'auto', boxSizing: 'border-box', background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(0,0,0,0.18)', borderRadius: '14px', padding: '14px', zIndex: 9, boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}>
            <button type="button" onClick={() => setSelected(null)} aria-label="close" style={{ position: 'absolute', right: '10px', top: '8px', border: 0, background: 'none', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>
              <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', background: COLOR_HEX[sel.color], marginRight: '6px', verticalAlign: '-1px' }} />
              room {sel.index + 1} · {sel.color} · {sel.date ?? 'date unknown'}
            </div>
            <a href={sel.src} target="_blank" rel="noreferrer"><img src={sel.src} alt="" style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '8px', marginBottom: '10px' }} /></a>
            <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 300, lineHeight: 1.4 }}>{sel.caption || sel.tags.join(', ')}</p>
            <div style={{ marginBottom: '10px' }}>
              {chip(sel.color, activeColors.size === 1 && activeColors.has(sel.color), () => toggleColor(sel.color), COLOR_HEX[sel.color])}
              {sel.tags.map((t) => chip(t, activeTags.has(t), () => toggleTag(t)))}
            </div>
            {neighbors.get(sel.index)?.size > 0 && (
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.16)', paddingTop: '9px', fontSize: '11px' }}>
                <div style={{ marginBottom: '6px' }}>direct relations</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {[...neighbors.get(sel.index)].map((ni) => (
                    <button key={ni} type="button" onClick={() => focusNode(ni)} title={`room ${ni + 1}`} style={{ border: '1px solid #eee', background: 'none', padding: 0, cursor: 'pointer', lineHeight: 0, borderRadius: '4px', overflow: 'hidden' }}>
                      <img src={nodes[ni].thumbSrc} alt="" style={{ width: '52px', height: '52px', objectFit: 'cover', display: 'block' }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
              {navBtn('← prev', () => goRelative(-1), false)}
              {navBtn('next →', () => goRelative(1), false)}
              {navBtn('random', goRandom, false)}
            </div>
          </section>
        )}

        <div style={{ position: 'absolute', left: '50%', bottom: '10px', transform: 'translateX(-50%)', fontSize: '10px', color: '#777', fontWeight: 300, pointerEvents: 'none', background: 'rgba(255,255,255,0.85)', padding: '3px 8px', borderRadius: '8px', display: hov || sel ? 'none' : 'block' }}>
          drag to move · scroll to zoom · click a room to open it
        </div>
      </div>
    </div>
  )
}

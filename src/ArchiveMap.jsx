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
}
const COLOR_ORDER = Object.keys(COLOR_HEX)
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'

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
      for (const t of a.tags) if (b.tagSet.has(t)) s += 1
      if (a.color === b.color) s += 0.5
      if (s > 0) scored.push([s, j])
    }
    scored.sort((x, y) => y[0] - x[0])
    for (const [s, j] of scored.slice(0, k)) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (seen.has(key)) continue
      seen.add(key)
      links.push({ source: i, target: j, weight: s })
    }
  }
  return links
}

export default function ArchiveMap({ images, tags, isMobileLayout = false }) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ w: 800, h: 600 })
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 })
  const [tick, setTick] = useState(0)
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [activeColors, setActiveColors] = useState(() => new Set(COLOR_ORDER))
  const [activeTags, setActiveTags] = useState(() => new Set())
  const [query, setQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(!isMobileLayout)
  const nodesRef = useRef([])
  const linksRef = useRef([])
  const animRef = useRef(null)
  const panRef = useRef(null)
  const dragRef = useRef(null)
  const hoverTimerRef = useRef(null)

  const nodes = useMemo(() => {
    return images.map((img, index) => {
      const key = `${img.page}/${img.filename}`
      const t = tags?.[key] ?? {}
      const objects = Array.isArray(t.objects) ? t.objects : []
      const vibe = []
      const color = COLOR_HEX[t.color] ? t.color : 'multicolor'
      const tagList = [...objects, ...vibe]
      return {
        index,
        key,
        src: img.src,
        thumbSrc: img.thumbSrc,
        color,
        objects,
        vibe,
        caption: t.caption ?? '',
        date: t.date ?? null,
        tags: tagList,
        tagSet: new Set(tagList),
        x: 0, y: 0, vx: 0, vy: 0,
      }
    })
  }, [images, tags])

  const links = useMemo(() => buildLinks(nodes), [nodes])

  const allTags = useMemo(() => {
    const count = new Map()
    nodes.forEach((n) => n.tags.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)))
    return [...count.entries()].sort((a, b) => b[1] - a[1])
  }, [nodes])

  const neighbors = useMemo(() => {
    const m = new Map()
    links.forEach((l) => {
      if (!m.has(l.source)) m.set(l.source, new Set())
      if (!m.has(l.target)) m.set(l.target, new Set())
      m.get(l.source).add(l.target)
      m.get(l.target).add(l.source)
    })
    return m
  }, [links])

  const q = query.trim().toLowerCase()
  const isVisible = useCallback((n) => {
    if (!activeColors.has(n.color)) return false
    if (activeTags.size > 0) for (const t of activeTags) if (!n.tagSet.has(t)) return false
    if (q && !(n.caption.toLowerCase().includes(q) || n.tags.some((t) => t.includes(q)) || n.color.includes(q))) return false
    return true
  }, [activeColors, activeTags, q])

  const visibleList = useMemo(() => nodes.filter(isVisible).map((n) => n.index), [nodes, isVisible])

  // measure
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }))
    ro.observe(el)
    setSize({ w: el.offsetWidth, h: el.offsetHeight })
    return () => ro.disconnect()
  }, [])

  // static layout: run the simulation synchronously once, nothing moves until dragged
  const layoutDone = useRef(false)
  useEffect(() => {
    if (layoutDone.current || size.w < 50) return
    layoutDone.current = true
    const n = nodes.length
    const R = Math.min(size.w, size.h) * 0.42 || 250
    nodes.forEach((node, i) => {
      const angle = (i / Math.max(1, n)) * Math.PI * 2 * 7
      const r = R * Math.sqrt((i + 1) / n)
      node.x = size.w / 2 + Math.cos(angle) * r
      node.y = size.h / 2 + Math.sin(angle) * r
      node.vx = 0; node.vy = 0
    })
    nodesRef.current = nodes
    linksRef.current = links
    const cx = size.w / 2, cy = size.h / 2
    for (let iter = 0; iter < 300; iter++) {
      const alpha = Math.max(0.02, 1 - iter / 280)
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i]
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j]
          let dx = a.x - b.x, dy = a.y - b.y
          let d2 = dx * dx + dy * dy
          if (d2 < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1 }
          if (d2 > 90000) continue
          const f = (900 / d2) * alpha
          const d = Math.sqrt(d2)
          const fx = (dx / d) * f, fy = (dy / d) * f
          a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy
        }
      }
      for (const l of links) {
        const a = nodes[l.source], b = nodes[l.target]
        const dx = b.x - a.x, dy = b.y - a.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const f = ((d - 46) / d) * 0.05 * alpha * Math.min(2, l.weight)
        a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f
      }
      for (const nd of nodes) {
        nd.vx += (cx - nd.x) * 0.004 * alpha
        nd.vy += (cy - nd.y) * 0.004 * alpha
        nd.vx *= 0.82; nd.vy *= 0.82
        nd.x += nd.vx; nd.y += nd.vy
      }
    }
    setTick((t) => t + 1)
  }, [nodes, links, size.w, size.h])
  // zoom
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      setTransform((t) => {
        const factor = e.deltaY < 0 ? 1.1 : 0.9
        const scale = Math.min(6, Math.max(0.25, t.scale * factor))
        const k = scale / t.scale
        return { scale, x: mx - (mx - t.x) * k, y: my - (my - t.y) * k }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const toWorld = (clientX, clientY) => {
    const rect = containerRef.current.getBoundingClientRect()
    return { x: (clientX - rect.left - transform.x) / transform.scale, y: (clientY - rect.top - transform.y) / transform.scale }
  }

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return
    panRef.current = { sx: e.clientX, sy: e.clientY, tx: transform.x, ty: transform.y, moved: false }
  }
  const onPointerMove = (e) => {
    if (dragRef.current) {
      const p = toWorld(e.clientX, e.clientY)
      const nd = nodesRef.current[dragRef.current.index]
      nd.x = p.x; nd.y = p.y
      dragRef.current.moved = true
      setTick((t) => t + 1)
      return
    }
    const p = panRef.current
    if (!p) return
    const dx = e.clientX - p.sx, dy = e.clientY - p.sy
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) p.moved = true
    setTransform((t) => ({ ...t, x: p.tx + dx, y: p.ty + dy }))
  }
  const onPointerUp = () => {
    if (dragRef.current) {
      const d = dragRef.current
      dragRef.current = null
      if (!d.moved) setSelected(d.index)
      return
    }
    panRef.current = null
  }

  const focusNode = useCallback((index) => {
    const nd = nodesRef.current[index]
    if (!nd) return
    setSelected(index)
    setTransform((t) => {
      const scale = Math.max(t.scale, 1.6)
      return { scale, x: size.w / 2 - nd.x * scale, y: size.h / 2 - nd.y * scale }
    })
  }, [size.w, size.h])

  const goRelative = (delta) => {
    if (visibleList.length === 0) return
    const cur = selected != null ? visibleList.indexOf(selected) : -1
    const next = ((cur + delta) % visibleList.length + visibleList.length) % visibleList.length
    focusNode(visibleList[next])
  }
  const goRandom = () => {
    if (visibleList.length === 0) return
    focusNode(visibleList[Math.floor(Math.random() * visibleList.length)])
  }
  const reset = () => {
    setActiveColors(new Set(COLOR_ORDER))
    setActiveTags(new Set())
    setQuery('')
    setSelected(null)
    setTransform({ x: 0, y: 0, scale: 1 })
  }

  const toggleColor = (c) => setActiveColors((prev) => {
    const next = new Set(prev)
    if (next.has(c) && next.size === COLOR_ORDER.length) return new Set([c])
    if (next.has(c)) next.delete(c); else next.add(c)
    if (next.size === 0) return new Set(COLOR_ORDER)
    return next
  })
  const toggleTag = (t) => setActiveTags((prev) => {
    const next = new Set(prev)
    if (next.has(t)) next.delete(t); else next.add(t)
    return next
  })

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
  const focusSet = useMemo(() => {
    const idx = hovered ?? selected
    if (idx == null) return null
    const s = new Set([idx])
    neighbors.get(idx)?.forEach((n) => s.add(n))
    return s
  }, [hovered, selected, neighbors])

  const visibleSet = useMemo(() => new Set(visibleList), [visibleList])
  const anyFilter = activeTags.size > 0 || q || activeColors.size !== COLOR_ORDER.length

  const panelW = isMobileLayout ? '100%' : '220px'
  const previewW = isMobileLayout ? '100%' : '440px'

  const markNode = hovered != null ? nodes[hovered] : sel
  const chip = (label, active, onClick, colorDot, marked = false) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        border: '1px solid ' + (active ? '#000' : marked ? '#ff69b4' : '#ddd'),
        background: active ? '#000' : marked ? '#ffe4f3' : '#fff', color: active ? '#fff' : '#000',
        borderRadius: '999px', padding: '2px 8px', margin: '0 4px 4px 0',
        fontFamily: FONT, fontSize: '11px', fontWeight: 300, cursor: 'pointer', lineHeight: 1.5,
      }}
    >
      {colorDot && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: colorDot, border: '1px solid rgba(0,0,0,0.15)', display: 'inline-block' }} />}
      {label}
    </button>
  )

  const navBtn = (label, onClick, disabled) => (
    <button type="button" onClick={onClick} disabled={disabled} style={{ border: '1px solid #000', background: '#fff', color: '#000', padding: '3px 9px', fontFamily: FONT, fontSize: '12px', fontWeight: 300, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, borderRadius: '3px' }}>{label}</button>
  )

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#fff', fontFamily: FONT, display: 'flex', flexDirection: isMobileLayout ? 'column' : 'row' }}>
      {/* Left panel */}
      <div style={{ width: panelW, flex: isMobileLayout ? '0 0 auto' : '0 0 220px', borderRight: isMobileLayout ? 'none' : '1px solid #eee', borderBottom: isMobileLayout ? '1px solid #eee' : 'none', padding: '14px 14px 10px', boxSizing: 'border-box', overflowY: 'auto', maxHeight: isMobileLayout ? (panelOpen ? '45%' : '44px') : '100%', transition: 'max-height 200ms', fontSize: '12px', fontWeight: 300, lineHeight: 1.4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 400 }}>global collective bedrooms archive</span>
          {isMobileLayout && <button type="button" onClick={() => setPanelOpen((p) => !p)} style={{ border: 'none', background: 'none', fontSize: '14px', cursor: 'pointer' }}>{panelOpen ? '−' : '+'}</button>}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search tags…"
          style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #ddd', padding: '5px 8px', fontFamily: FONT, fontSize: '12px', fontWeight: 300, marginBottom: '10px', outline: 'none' }}
        />
        <div style={{ color: '#666', marginBottom: '10px' }}>{visibleList.length} / {nodes.length} rooms · {links.length} links</div>
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
        <div>
          {allTags.map(([t, n]) => chip(`${t} ${n}`, activeTags.has(t), () => toggleTag(t), null, Boolean(markNode?.tagSet.has(t))))}
        </div>
      </div>

      {/* Graph */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', minHeight: 0, cursor: panRef.current ? 'grabbing' : 'grab', touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <svg width={size.w} height={size.h} style={{ display: 'block' }}>
          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
            {links.map((l, i) => {
              const a = nodesRef.current[l.source], b = nodesRef.current[l.target]
              if (!a || !b) return null
              const vis = visibleSet.has(l.source) && visibleSet.has(l.target)
              const inFocus = focusSet ? (focusSet.has(l.source) && focusSet.has(l.target) && (l.source === (hovered ?? selected) || l.target === (hovered ?? selected))) : false
              return (
                <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={inFocus ? '#000' : '#bbb'}
                  strokeWidth={(inFocus ? 1.2 : 0.6) / transform.scale}
                  opacity={vis ? (focusSet && !inFocus ? 0.25 : 0.8) : 0.06}
                />
              )
            })}
            {nodesRef.current.map((n) => {
              const vis = visibleSet.has(n.index)
              const isSel = selected === n.index
              const isHov = hovered === n.index
              const dim = focusSet && !focusSet.has(n.index)
              const r = (isSel ? 9 : isHov ? 8 : 6) / Math.sqrt(transform.scale)
              return (
                <circle
                  key={n.index}
                  cx={n.x} cy={n.y} r={r}
                  fill={COLOR_HEX[n.color]}
                  stroke={isSel ? '#000' : 'rgba(0,0,0,0.25)'}
                  strokeWidth={(isSel ? 2 : 0.8) / transform.scale}
                  opacity={vis ? (dim ? 0.3 : 1) : 0.08}
                  style={{ cursor: 'pointer' }}
                  onPointerDown={(e) => { e.stopPropagation(); dragRef.current = { index: n.index, moved: false } }}
                  onPointerEnter={() => { clearTimeout(hoverTimerRef.current); setHovered(n.index) }}
                  onPointerLeave={() => { hoverTimerRef.current = setTimeout(() => setHovered(null), 350) }}
                />
              )
            })}
          </g>
        </svg>
        {(() => {
          const idx = hovered ?? selected
          if (idx == null || dragRef.current) return null
          const n = nodesRef.current[idx]
          if (!n) return null
          const pinned = hovered == null && selected != null
          const W = isMobileLayout ? Math.min(300, size.w - 16) : 300
          const nb = [...(neighbors.get(n.index) ?? [])]
          let sx = n.x * transform.scale + transform.x + 16
          let sy = n.y * transform.scale + transform.y - 40
          if (sx + W > size.w - 8) sx = n.x * transform.scale + transform.x - W - 16
          if (sx < 8) sx = 8
          if (sy < 8) sy = 8
          const maxH = size.h - 16
          return (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onPointerEnter={() => clearTimeout(hoverTimerRef.current)}
              onPointerLeave={() => { if (!pinned) hoverTimerRef.current = setTimeout(() => setHovered(null), 250) }}
              style={{ position: 'absolute', left: sx, top: sy, width: `${W}px`, maxHeight: `${maxH}px`, overflowY: 'auto', boxSizing: 'border-box', pointerEvents: 'auto', background: '#fde4ee', borderRadius: '14px', padding: '10px', zIndex: 7, boxShadow: '0 10px 30px rgba(0,0,0,0.18)', fontFamily: FONT }}
            >
              {pinned && (
                <button type="button" onClick={() => setSelected(null)} aria-label="close" style={{ position: 'absolute', top: '14px', right: '14px', width: '26px', height: '26px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.85)', fontSize: '15px', cursor: 'pointer', lineHeight: '26px', padding: 0 }}>×</button>
              )}
              <img src={n.src} alt="" style={{ width: '100%', height: `${Math.round(W * 0.78)}px`, objectFit: 'cover', display: 'block', borderRadius: '10px', background: '#f6f6f6' }} />
              <div style={{ fontSize: '15px', fontWeight: 400, lineHeight: 1.3, margin: '10px 0 4px', color: '#111' }}>
                room {n.index + 1}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 300, color: '#555', marginBottom: '6px' }}>
                {n.date ? n.date : 'date unknown'} · {n.color}
              </div>
              <div style={{ fontSize: '12px', fontWeight: 300, color: '#333', marginBottom: '8px', lineHeight: 1.4 }}>
                {n.caption || n.tags.join(', ')}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: nb.length ? '10px' : 0 }}>
                <span style={{ background: '#fff', borderRadius: '999px', padding: '2px 9px', fontSize: '11px', fontWeight: 300 }}>{nb.length} relations</span>
                <span style={{ background: '#fff', borderRadius: '999px', padding: '2px 9px', fontSize: '11px', fontWeight: 300 }}>{n.tags.length} tags</span>
              </div>
              {nb.length > 0 && (
                <>
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.12)', paddingTop: '8px', fontSize: '12px', fontWeight: 400, color: '#444', marginBottom: '6px' }}>connected rooms</div>
                  <div style={{ background: '#fff', borderRadius: '8px', padding: '4px' }}>
                    {nb.map((ni) => {
                      const m = nodes[ni]
                      const shared = m.tags.filter((t) => n.tagSet.has(t))
                      return (
                        <button key={ni} type="button" onClick={() => { clearTimeout(hoverTimerRef.current); setHovered(null); focusNode(ni) }} style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', border: 'none', background: 'transparent', padding: '4px', cursor: 'pointer', textAlign: 'left', fontFamily: FONT, borderBottom: '1px solid #f3e3ea' }}>
                          <img src={m.thumbSrc} alt="" style={{ width: '38px', height: '38px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                          <span style={{ fontSize: '11px', fontWeight: 300, lineHeight: 1.3, color: '#111' }}>
                            room {ni + 1}
                            {shared.length > 0 && <span style={{ color: '#888' }}> — {shared.slice(0, 3).join(', ')}</span>}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
              
            </div>
          )
        })()}
        <div style={{ position: 'absolute', right: '10px', bottom: '8px', fontSize: '10px', color: '#999', fontWeight: 300, pointerEvents: 'none' }}>scroll to zoom · drag to pan · ← → to browse</div>
      </div>

    </div>
  )
}

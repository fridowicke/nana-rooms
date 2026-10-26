import React, { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph from './ForceGraph.jsx'

const COLOR_HEX = {
  pink: '#ff2fd6',
  toys: '#f5ff2e',
  cluttered: '#8fd3ff',
  tidy: '#7ff5e0',
  screenshot: '#39ff14',
}
const CAT_LABEL = { pink: 'pink / girly', toys: 'toys & makeup', cluttered: 'super cluttered', tidy: 'not so messy', screenshot: 'screen time' }
const COLOR_ORDER = Object.keys(COLOR_HEX)
const SCREENSHOT_TAG = 'screen time screenshot'
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'
const NODE_R = 16

const scatter = (n, i) => {
  n.x = Math.cos(i * 2.399) * 420 + (i % 4) * 25
  n.y = Math.sin(i * 2.399) * 330 + (i % 5) * 18
  n.vx = 0; n.vy = 0
}
const drawNode = (ctx, n, st) => {
  const rr = Math.max(NODE_R, 9 / st.scale)
  ctx.globalAlpha = st.dim ? 0.15 : 1
  ctx.beginPath(); ctx.arc(n.x, n.y, rr, 0, Math.PI * 2)
  ctx.fillStyle = st.grey ? '#e6e6e6' : COLOR_HEX[n.color]; ctx.fill()
  ctx.lineWidth = 1 / st.scale; ctx.strokeStyle = st.grey ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.35)'; ctx.stroke()
  if (st.selected || st.hovered) {
    ctx.lineWidth = (st.selected ? 3.5 : 2) / st.scale
    ctx.strokeStyle = '#111'
    ctx.beginPath(); ctx.arc(n.x, n.y, rr + 1, 0, Math.PI * 2); ctx.stroke()
  }
  ctx.globalAlpha = 1
}
// dots are small: hit them in screen space with a generous minimum radius
const hitNode = (n, w, sp, view) => {
  const r = Math.max(Math.max(NODE_R * view.scale, 9) + 4, 22)
  const dx = sp.x - (view.x + n.x * view.scale), dy = sp.y - (view.y + n.y * view.scale)
  const d2 = dx * dx + dy * dy
  return d2 <= r * r ? d2 : null
}
const extent = () => ({ w: NODE_R, h: NODE_R })
const padding = () => ({ l: 56, r: 56, t: 56, b: 56 })
const PHYSICS = { repulsion: 14000, cutoff: 360000, centering: 0.0005, linkLength: () => 120, linkStrength: (l) => 0.0018 * Math.min(2, l.weight) }

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
  const graphRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [hovered, setHovered] = useState(null)
  const [activeColors, setActiveColors] = useState(() => new Set(COLOR_ORDER))
  const [activeTags, setActiveTags] = useState(() => new Set())
  const [query, setQuery] = useState('')
  const [panelOpen, setPanelOpen] = useState(!isMobileLayout)

  const nodes = useMemo(() => images.map((img, index) => {
    const key = `${img.page}/${img.filename}`
    const t = tags?.[key] ?? {}
    const objects = Array.isArray(t.objects) ? t.objects : []
    const isShot = objects.includes(SCREENSHOT_TAG) || t.cat === 'screenshot'
    const color = isShot ? 'screenshot' : (COLOR_HEX[t.cat] ? t.cat : 'cluttered')
    return {
      index, key, src: img.src, thumbSrc: img.thumbSrc,
      color, isShot, caption: t.caption ?? '', date: t.date ?? null,
      tags: objects, tagSet: new Set(objects),
      x: 0, y: 0, vx: 0, vy: 0, fixed: false,
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
    if (q && !(n.caption.toLowerCase().includes(q) || n.tags.some((t) => t.includes(q)) || CAT_LABEL[n.color].includes(q))) return false
    return true
  }).map((n) => n.index), [nodes, activeColors, activeTags, q])
  const visible = useMemo(() => new Set(visibleList), [visibleList])

  // ---------- controls ----------
  const focusNode = (index) => {
    setSelected(index)
    graphRef.current?.focus(index, 1.2)
  }
  const goRelative = (delta) => {
    if (visibleList.length === 0) return
    const cur = selected != null ? visibleList.indexOf(selected) : -1
    const next = ((cur + delta) % visibleList.length + visibleList.length) % visibleList.length
    focusNode(visibleList[next])
  }
  const goRandom = () => { if (visibleList.length) focusNode(visibleList[Math.floor(Math.random() * visibleList.length)]) }
  const reset = () => {
    setActiveColors(new Set(COLOR_ORDER)); setActiveTags(new Set()); setQuery(''); setSelected(null)
    graphRef.current?.reset()
  }
  const sharedTags = (a, b) => nodes[a].tags.filter((t) => nodes[b].tagSet.has(t))
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
        <div style={{ color: '#666', marginBottom: '4px' }}>{visibleList.length} / {nodes.length} rooms · {links.filter((l) => visibleList.includes(l.a) && visibleList.includes(l.b)).length} links</div>
        <div style={{ color: '#666', marginBottom: '10px' }}>a line joins two rooms that have many of the same objects in them</div>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
          {navBtn('← prev', () => goRelative(-1), visibleList.length === 0)}
          {navBtn('next →', () => goRelative(1), visibleList.length === 0)}
          {navBtn('random', goRandom, visibleList.length === 0)}
          {anyFilter && navBtn('reset', reset, false)}
        </div>
        <div style={{ color: '#666', marginBottom: '4px' }}>category</div>
        <div style={{ marginBottom: '10px' }}>
          {COLOR_ORDER.map((c) => chip(CAT_LABEL[c], activeColors.has(c) && activeColors.size !== COLOR_ORDER.length, () => toggleColor(c), COLOR_HEX[c], markNode?.color === c))}
        </div>
        <div style={{ color: '#666', marginBottom: '4px' }}>tags</div>
        <div>{allTags.map(([t, n]) => chip(`${t} ${n}`, activeTags.has(t), () => toggleTag(t), null, Boolean(markNode?.tagSet.has(t))))}</div>
      </div>

      {/* Stage */}
      <ForceGraph
        ref={graphRef}
        style={{ flex: 1 }}
        nodes={nodes} links={links} visible={visible} selected={selected}
        onSelect={setSelected} onHover={setHovered}
        drawNode={drawNode} hitNode={hitNode} extent={extent} scatter={scatter} physics={PHYSICS} padding={padding}
      >

        {/* hover tooltip: small, near cursor-free corner so it never covers neighbours */}
        {hov && !sel && !isMobileLayout && (
          <div style={{ position: 'absolute', left: '12px', bottom: '12px', width: '200px', background: '#fff', border: '1px solid #111', padding: '6px', zIndex: 8, pointerEvents: 'none' }}>
            <img src={hov.src} alt="" style={{ width: '100%', height: '150px', objectFit: 'cover', display: 'block' }} />
            <div style={{ fontSize: '11px', fontWeight: 300, marginTop: '5px', lineHeight: 1.3 }}>room {hov.index + 1} · {hov.date ?? 'date unknown'}</div>
            <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>click to open</div>
          </div>
        )}

        {/* pinned detail card, docked bottom-right like patchy studies */}
        {sel && (
          <section style={{ position: 'absolute', right: isMobileLayout ? '9px' : '12px', bottom: isMobileLayout ? '9px' : '12px', width: cardW, maxHeight: isMobileLayout ? '46%' : '62%', overflowY: 'auto', boxSizing: 'border-box', background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(0,0,0,0.18)', borderRadius: '14px', padding: '14px', zIndex: 9, boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}>
            <button type="button" onClick={() => setSelected(null)} aria-label="close" style={{ position: 'absolute', right: '10px', top: '8px', border: 0, background: 'none', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '8px' }}>
              <span style={{ display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', background: COLOR_HEX[sel.color], marginRight: '6px', verticalAlign: '-1px' }} />
              room {sel.index + 1} · {CAT_LABEL[sel.color]} · {sel.date ?? 'date unknown'}
            </div>
            <a href={sel.src} target="_blank" rel="noreferrer"><img src={sel.src} alt="" style={{ width: '100%', height: isMobileLayout ? '150px' : 'auto', maxHeight: isMobileLayout ? '150px' : '48vh', objectFit: 'contain', background: '#f4f4f4', display: 'block', borderRadius: '8px', marginBottom: '10px' }} /></a>
            <p style={{ margin: '0 0 10px', fontSize: '12px', fontWeight: 300, lineHeight: 1.4 }}>{sel.caption || sel.tags.join(', ')}</p>
            <div style={{ marginBottom: '10px' }}>
              {chip(CAT_LABEL[sel.color], activeColors.size === 1 && activeColors.has(sel.color), () => toggleColor(sel.color), COLOR_HEX[sel.color])}
              {sel.tags.map((t) => chip(t, activeTags.has(t), () => toggleTag(t)))}
            </div>
            {neighbors.get(sel.index)?.size > 0 && (
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.16)', paddingTop: '9px', fontSize: '11px' }}>
                <div style={{ marginBottom: '6px' }}>rooms with the most objects in common</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {[...neighbors.get(sel.index)].map((ni) => (
                    <button key={ni} type="button" onClick={() => focusNode(ni)} title={`room ${ni + 1} · both have: ${sharedTags(sel.index, ni).join(', ') || 'similar mood'}`} style={{ border: '1px solid #eee', background: 'none', padding: 0, cursor: 'pointer', lineHeight: 0, borderRadius: '4px', overflow: 'hidden' }}>
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

        {visibleList.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 7 }}>
            <div style={{ background: 'rgba(255,255,255,0.94)', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '12px', padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 300, pointerEvents: 'auto' }}>
              <div style={{ marginBottom: '8px' }}>no rooms match {q ? `“${query.trim()}”` : 'these filters'}</div>
              {navBtn('show all rooms', reset, false)}
            </div>
          </div>
        )}

        <div style={{ position: 'absolute', left: '50%', bottom: '10px', transform: 'translateX(-50%)', fontSize: '10px', color: '#777', fontWeight: 300, pointerEvents: 'none', background: 'rgba(255,255,255,0.85)', padding: '3px 8px', borderRadius: '8px', display: hov || sel || visibleList.length === 0 ? 'none' : 'block' }}>
          drag to move · scroll to zoom · click a room to open it
        </div>
      </ForceGraph>
    </div>
  )
}

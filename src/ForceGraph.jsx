import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'

// The diagram behind the research and archive folders: layout physics, drawing, drag / pan / pinch / wheel, fit
// and zoom. Each folder brings its own nodes and links, how a node looks and is hit, and its panels and cards
// (as children, drawn over the canvas).
//   nodes        [{ index, ... }]; x, y, vx, vy and fixed are written onto them
//   links        [{ a, b, weight }] with node indices
//   visible      Set of the node indices that match the filters; the others stay where they are, grey and not clickable
//   selected     selected node index or null; onSelect(index | null), onHover(index | null)
//   drawNode     (ctx, n, { grey, dim, selected, hovered, scale }) in world coordinates
//   hitNode      (n, world, screen, view) -> distance (smallest wins) or null when missed
//   extent       n -> { w, h }, half-size in world units, for fitting
//   scatter      (n, i) starting position before the layout runs
//   physics      { repulsion, cutoff, centering, linkLength(l), linkStrength(l) }
//   padding      (W, H) -> { l, r, t, b } screen space to keep free when fitting
// The ref exposes fit(), zoomBy(k), focus(index, minScale) and reset().
const SETTLE_TICKS = 320 // done before the first frame; what is left is a soft second or two of settling

const ForceGraph = forwardRef(function ForceGraph({
  nodes, links, visible, selected = null, onSelect, onHover, drawNode, hitNode, extent, scatter, physics, padding,
  maxFitScale = 2, style, children,
}, ref) {
  const rootRef = useRef(null)
  const canvasRef = useRef(null)
  const neighbors = useMemo(() => {
    const m = new Map()
    links.forEach((l) => {
      if (!m.has(l.a)) m.set(l.a, new Set())
      if (!m.has(l.b)) m.set(l.b, new Set())
      m.get(l.a).add(l.b); m.get(l.b).add(l.a)
    })
    return m
  }, [links])
  // latest props for the animation loop and event handlers, which live as long as the nodes do
  const P = useRef(null)
  P.current = { visible, selected, onSelect, onHover, drawNode, hitNode, extent, physics, padding, maxFitScale }
  const S = useRef({ W: 800, H: 600, dpr: 1, view: { x: 400, y: 300, scale: 1 }, alpha: 1, drag: null, pan: null, moved: false, hovered: null, anim: null, touched: false }).current

  // every node takes part in the layout, filtered out or not, so filtering never rearranges the diagram
  const simulate = () => {
    if (S.alpha < 0.002 && !S.drag) return
    const { repulsion, cutoff = Infinity, centering, linkLength, linkStrength } = P.current.physics
    const a = S.alpha
    for (let i = 0; i < nodes.length; i++) {
      const p = nodes[i]
      for (let j = i + 1; j < nodes.length; j++) {
        const o = nodes[j]
        const dx = p.x - o.x, dy = p.y - o.y
        const d2 = dx * dx + dy * dy + 50
        if (d2 > cutoff) continue
        const f = repulsion / d2 * a
        const dist = Math.sqrt(d2)
        const fx = dx / dist * f, fy = dy / dist * f
        if (!p.fixed) { p.vx += fx; p.vy += fy }
        if (!o.fixed) { o.vx -= fx; o.vy -= fy }
      }
      if (!p.fixed) { p.vx -= p.x * centering * a; p.vy -= p.y * centering * a }
    }
    for (const l of links) {
      const A = nodes[l.a], B = nodes[l.b]
      const dx = B.x - A.x, dy = B.y - A.y
      const d = Math.max(1, Math.sqrt(dx * dx + dy * dy))
      const f = (d - linkLength(l)) * linkStrength(l) * a
      const fx = dx / d * f, fy = dy / d * f
      if (!A.fixed) { A.vx += fx; A.vy += fy }
      if (!B.fixed) { B.vx -= fx; B.vy -= fy }
    }
    for (const n of nodes) {
      if (n.fixed) continue
      n.vx *= 0.86; n.vy *= 0.86
      n.x += n.vx; n.y += n.vy
    }
    S.alpha *= 0.992
  }
  const settle = () => {
    nodes.forEach((n, i) => scatter(n, i))
    S.alpha = 1
    for (let t = 0; t < SETTLE_TICKS; t++) simulate()
  }

  // the view that shows the (visible, or all) nodes whole inside the padding
  const fitTarget = (all) => {
    const { visible: vis, extent: ext, padding: pad, maxFitScale: maxScale } = P.current
    const list = !all && vis.size ? nodes.filter((n) => vis.has(n.index)) : nodes
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (const n of list) {
      const e = ext(n)
      x0 = Math.min(x0, n.x - e.w); x1 = Math.max(x1, n.x + e.w)
      y0 = Math.min(y0, n.y - e.h); y1 = Math.max(y1, n.y + e.h)
    }
    if (!Number.isFinite(x0)) return S.view
    const p = pad(S.W, S.H)
    const w = Math.max(1, S.W - p.l - p.r), h = Math.max(1, S.H - p.t - p.b)
    const scale = Math.max(0.1, Math.min(w / Math.max(1, x1 - x0), h / Math.max(1, y1 - y0), maxScale))
    return { scale, x: p.l + w / 2 - ((x0 + x1) / 2) * scale, y: p.t + h / 2 - ((y0 + y1) / 2) * scale }
  }
  // view changes from the controls glide: the centre moves evenly and the zoom changes evenly
  const glide = (to, dur = 450) => { S.anim = { from: { ...S.view }, to, t0: performance.now(), dur } }
  const stepGlide = () => {
    const an = S.anim
    if (!an) return
    const t = Math.min(1, (performance.now() - an.t0) / an.dur)
    const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
    const centre = (v) => ({ x: (S.W / 2 - v.x) / v.scale, y: (S.H / 2 - v.y) / v.scale })
    const a = centre(an.from), b = centre(an.to)
    const scale = an.from.scale * (an.to.scale / an.from.scale) ** e
    S.view = { scale, x: S.W / 2 - (a.x + (b.x - a.x) * e) * scale, y: S.H / 2 - (a.y + (b.y - a.y) * e) * scale }
    if (t === 1) S.anim = null
  }

  const api = {
    fit: () => glide(fitTarget(false)),
    zoomBy: (k) => {
      const old = S.view.scale, f = Math.max(0.1, Math.min(8, old * k))
      const wx = (S.W / 2 - S.view.x) / old, wy = (S.H / 2 - S.view.y) / old
      glide({ scale: f, x: S.W / 2 - wx * f, y: S.H / 2 - wy * f }, 250)
    },
    focus: (index, minScale = 0) => {
      const n = nodes[index]
      if (!n) return
      const scale = Math.max(S.view.scale, minScale)
      glide({ scale, x: S.W / 2 - n.x * scale, y: S.H / 2 - n.y * scale })
    },
    reset: () => { settle(); glide(fitTarget(true)) },
  }
  useImperativeHandle(ref, () => api)

  useEffect(() => {
    const canvas = canvasRef.current
    const root = rootRef.current
    if (!canvas || !root) return undefined
    const ctx = canvas.getContext('2d')
    const world = (sx, sy) => ({ x: (sx - S.view.x) / S.view.scale, y: (sy - S.view.y) / S.view.scale })
    // pointer position in canvas pixels; the desktop page may be shrunk with CSS zoom, which the bounding box includes
    const local = (e) => {
      const r = canvas.getBoundingClientRect()
      const k = r.width / S.W || 1
      return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }
    }
    const hit = (sx, sy) => {
      const { visible: vis, hitNode: hitFn } = P.current
      const w = world(sx, sy)
      let best = null, bestD = Infinity
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i]
        if (!vis.has(n.index)) continue
        const d = hitFn(n, w, { x: sx, y: sy }, S.view)
        if (d != null && d < bestD) { best = n; bestD = d }
      }
      return best
    }
    const setHovered = (idx) => {
      if (idx === S.hovered) return
      S.hovered = idx
      P.current.onHover?.(idx)
    }

    const draw = () => {
      const { visible: vis, selected: sel, drawNode: drawFn } = P.current
      const { W, H, dpr, view } = S
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      const focusIdx = sel ?? S.hovered
      const rels = focusIdx == null ? null : new Set([focusIdx, ...(neighbors.get(focusIdx) ?? [])])
      ctx.save()
      ctx.translate(view.x, view.y)
      ctx.scale(view.scale, view.scale)
      for (const l of links) {
        if (!vis.has(l.a) || !vis.has(l.b)) continue
        const A = nodes[l.a], B = nodes[l.b]
        const hot = rels && (l.a === focusIdx || l.b === focusIdx)
        ctx.strokeStyle = hot ? 'rgba(20,20,20,.75)' : 'rgba(25,25,25,.18)'
        ctx.lineWidth = (hot ? 1.5 : 0.7) / view.scale
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke()
      }
      for (const n of nodes) if (!vis.has(n.index)) drawFn(ctx, n, { grey: true, scale: view.scale })
      for (const n of nodes) {
        if (!vis.has(n.index)) continue
        drawFn(ctx, n, { dim: Boolean(rels && !rels.has(n.index)), selected: n.index === sel, hovered: n.index === S.hovered, scale: view.scale })
      }
      ctx.restore()
    }
    const loop = () => {
      simulate(); stepGlide(); draw()
      S.raf = requestAnimationFrame(loop)
    }

    const resize = () => {
      S.dpr = Math.min(window.devicePixelRatio || 1, 2)
      S.W = root.clientWidth; S.H = root.clientHeight
      canvas.width = S.W * S.dpr; canvas.height = S.H * S.dpr
      canvas.style.width = S.W + 'px'; canvas.style.height = S.H + 'px'
      // the folder window or phone browser sheet may still be opening: keep everything in view until the user moves it
      if (!S.touched) { S.anim = null; S.view = fitTarget(true) }
    }
    settle()
    const ro = new ResizeObserver(resize)
    ro.observe(root)
    resize()

    const touches = new Map()
    let pinch = null
    const pinchState = () => {
      const t = [...touches.values()]
      if (t.length < 2) return null
      return { d: Math.hypot(t[1].x - t[0].x, t[1].y - t[0].y), cx: (t[0].x + t[1].x) / 2, cy: (t[0].y + t[1].y) / 2 }
    }
    const onDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return
      S.anim = null; S.touched = true
      try { canvas.setPointerCapture(e.pointerId) } catch { /* pointer already gone */ }
      const { x, y } = local(e)
      touches.set(e.pointerId, { x, y })
      if (touches.size === 2) {
        if (S.drag) { S.drag.fixed = false; S.drag = null }
        S.pan = null
        const ps = pinchState()
        pinch = { d0: ps.d, s0: S.view.scale, cx: ps.cx, cy: ps.cy, vx: S.view.x, vy: S.view.y }
        S.moved = true
        return
      }
      const n = hit(x, y)
      S.moved = false
      if (n) { S.drag = n; n.fixed = true } else S.pan = { x, y, vx: S.view.x, vy: S.view.y }
    }
    const onMove = (e) => {
      const { x, y } = local(e)
      if (touches.has(e.pointerId)) touches.set(e.pointerId, { x, y })
      if (pinch && touches.size >= 2) {
        const ps = pinchState()
        if (!ps) return
        const f = Math.max(0.1, Math.min(8, pinch.s0 * ps.d / pinch.d0))
        const wx = (pinch.cx - pinch.vx) / pinch.s0, wy = (pinch.cy - pinch.vy) / pinch.s0
        S.view = { scale: f, x: ps.cx - wx * f, y: ps.cy - wy * f }
        return
      }
      if (S.drag) {
        const p = world(x, y); S.drag.x = p.x; S.drag.y = p.y; S.moved = true; S.alpha = Math.max(S.alpha, 0.2)
      } else if (S.pan) {
        S.view = { ...S.view, x: S.pan.vx + x - S.pan.x, y: S.pan.vy + y - S.pan.y }; S.moved = true
      } else {
        const h = hit(x, y)
        setHovered(h ? h.index : null)
        canvas.classList.toggle('cursor-pointer', Boolean(h))
      }
    }
    const onUp = (e) => {
      const { x, y } = local(e)
      touches.delete(e.pointerId)
      if (touches.size < 2) pinch = null
      if (touches.size > 0) return
      if (S.drag) {
        const n = S.drag; S.drag = null; n.fixed = false
        if (!S.moved) P.current.onSelect?.(n.index)
      } else if (!S.moved && !hit(x, y)) {
        P.current.onSelect?.(null)
      }
      S.pan = null
    }
    const onLeave = () => { if (!S.drag && !S.pan) setHovered(null) }
    const onWheel = (e) => {
      e.preventDefault()
      S.anim = null; S.touched = true
      const { x, y } = local(e)
      const old = S.view.scale
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY
      const mag = Math.max(Math.abs(dy) * 0.004, 0.08)
      const f = Math.max(0.1, Math.min(8, old * Math.exp(dy < 0 ? mag : -mag)))
      const wx = (x - S.view.x) / old, wy = (y - S.view.y) / old
      S.view = { scale: f, x: x - wx * f, y: y - wy * f }
    }
    // swipes on the diagram move the diagram only, not the page (or a phone's in-app browser sheet around it)
    const holdTouch = (e) => e.preventDefault()
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('touchmove', holdTouch, { passive: false })
    S.raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(S.raf)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('touchmove', holdTouch)
    }
  // the engine restarts only for a new set of nodes or links; everything else is read from P
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, links, neighbors])

  const roundBtn = (label, onClick, title) => (
    <button type="button" onClick={onClick} title={title} aria-label={title} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1px solid rgba(0,0,0,0.2)', background: 'rgba(255,255,255,0.9)', fontSize: '18px', lineHeight: '32px', padding: 0, fontFamily: 'inherit', fontWeight: 300, color: '#111', touchAction: 'manipulation' }}>{label}</button>
  )
  return (
    <div ref={rootRef} style={{ position: 'relative', overflow: 'hidden', minHeight: 0, ...style }}>
      <canvas ref={canvasRef} style={{ display: 'block', touchAction: 'none' }} />
      <div style={{ position: 'absolute', right: '12px', top: '12px', display: 'flex', gap: '6px', zIndex: 20 }}>
        {roundBtn('+', () => api.zoomBy(1.6), 'zoom in')}
        {roundBtn('−', () => api.zoomBy(1 / 1.6), 'zoom out')}
        {roundBtn('⌂', () => api.fit(), 'fit')}
      </div>
      {children}
    </div>
  )
})

export default ForceGraph

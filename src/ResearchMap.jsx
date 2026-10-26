import React, { useMemo, useRef, useState } from 'react'
import ForceGraph from './ForceGraph.jsx'
import { RESEARCH_ITEMS } from './researchItems.js'

const PALETTE = { book: '#39ff14', essay: '#ffb3d9', work: '#7ff5e0' }
const TYPE_LABEL = { book: 'book', essay: 'essay / manifesto', work: 'film / artwork / video' }
const TYPES = Object.keys(PALETTE)
const NODE_FONT = '400 11px "Helvetica Neue", Helvetica, Arial, sans-serif'

function wrap(text, max) {
  const lines = []
  let line = ''
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word
    if (test.length > max && line) { lines.push(line); line = word } else line = test
  }
  if (line) lines.push(line)
  return lines.slice(0, 4)
}
const scatter = (n, i) => {
  n.x = Math.cos(i * 2.399) * 220 + (i % 4) * 25
  n.y = Math.sin(i * 2.399) * 170 + (i % 5) * 18
  n.vx = 0; n.vy = 0
}
const drawNode = (ctx, n, st) => {
  ctx.globalAlpha = st.dim ? 0.14 : 1
  ctx.beginPath(); ctx.roundRect(n.x - n.w / 2, n.y - n.h / 2, n.w, n.h, Math.min(12, n.h / 2))
  ctx.fillStyle = st.grey ? '#ececec' : PALETTE[n.type]; ctx.fill()
  if (st.selected || st.hovered) { ctx.lineWidth = (st.selected ? 4 : 2) / st.scale; ctx.strokeStyle = '#111'; ctx.stroke() }
  ctx.fillStyle = st.grey ? '#bdbdbd' : '#111'
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = NODE_FONT
  const lh = 13, start = n.y - (n.lines.length - 1) * lh / 2
  n.lines.forEach((l, i) => ctx.fillText(l, n.x, start + i * lh))
  ctx.globalAlpha = 1
}
const hitNode = (n, w) => (w.x > n.x - n.w / 2 && w.x < n.x + n.w / 2 && w.y > n.y - n.h / 2 && w.y < n.y + n.h / 2 ? 0 : null)
const extent = (n) => ({ w: n.w / 2, h: n.h / 2 })

const CSS = `
.research-map{position:relative;width:100%;height:100%;overflow:hidden;background:#fff;color:#111;font:300 16px/1.35 "Helvetica Neue",Helvetica,Arial,sans-serif}
.research-map button,.research-map input{font:inherit;color:inherit}
.research-map .panel{position:absolute;z-index:30;top:14px;left:14px;width:min(330px,calc(100% - 28px));padding:16px 16px 14px;background:rgba(255,255,255,.96);border:1px solid rgba(0,0,0,.12);border-radius:17px;box-shadow:0 9px 35px rgba(0,0,0,.13);backdrop-filter:blur(14px);transition:transform .25s,opacity .25s;box-sizing:border-box}
.research-map .panel.closed{transform:translateX(calc(-100% - 22px));opacity:.2;pointer-events:none}
.research-map .panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px}
.research-map .panel h1{font-size:1rem;line-height:1;margin:0;font-weight:400}
.research-map .round{border:1px solid rgba(0,0,0,.28);background:transparent;width:31px;height:31px;border-radius:50%;padding:0;font-size:20px;line-height:25px}
.research-map .reopen{position:absolute;z-index:31;top:14px;left:14px;background:rgba(255,255,255,.96)}
.research-map .counts{font-size:.72rem;color:#555;margin:0 0 15px}
.research-map .mode-row{display:flex;align-items:center;gap:9px;font-size:.8rem;margin-bottom:4px}
.research-map .mode-word{font-weight:400}
.research-map .mode-help{font-size:.72rem;line-height:1.25;color:#555;margin:0 0 13px}
.research-map .switch{position:relative;width:46px;height:25px;border:0;background:#bbb;border-radius:30px;padding:0}
.research-map .switch i{position:absolute;width:19px;height:19px;left:3px;top:3px;border-radius:50%;background:white;transition:.2s}
.research-map .switch.on{background:#111}.research-map .switch.on i{left:24px}
.research-map .label{display:block;font-size:.72rem;font-weight:400;margin:0 0 6px}
.research-map .graph-search{width:100%;box-sizing:border-box;padding:10px 11px;background:rgba(255,255,255,.52);border:1px solid rgba(0,0,0,.18);border-radius:9px;outline:none;font-size:.82rem;margin-bottom:12px}
.research-map .graph-search:focus{border-color:#111;box-shadow:0 0 0 2px rgba(0,0,0,.08)}
.research-map .panel-rule{height:1px;background:rgba(0,0,0,.12);margin:0 -16px 11px}
.research-map .visibility-title{font-size:.72rem;font-weight:400;margin-bottom:6px}
.research-map .vis-row{display:grid;grid-template-columns:18px 13px 1fr auto;gap:7px;align-items:center;margin:7px 0;font-size:.78rem}
.research-map .vis-row input{accent-color:#222}
.research-map .swatch{width:13px;height:13px;border-radius:4px}
.research-map .vis-count{font-variant-numeric:tabular-nums;color:#555}
.research-map .panel-note{font-size:.68rem;line-height:1.3;color:#555;margin:11px 0 0}
.research-map .reset-link{border:0;background:none;text-decoration:underline;font-size:.7rem;padding:0}
.research-map .brand{position:absolute;z-index:20;bottom:46px;left:16px;max-width:min(420px,calc(100% - 450px));font-size:clamp(.83rem,1.7vw,1.15rem);line-height:1.25;letter-spacing:-.025em;pointer-events:none}
.research-map .detail{position:absolute;z-index:25;right:15px;bottom:15px;width:min(390px,calc(100% - 30px));max-height:42%;overflow:auto;box-sizing:border-box;background:rgba(255,255,255,.98);border:1px solid rgba(0,0,0,.18);border-radius:15px;padding:15px 17px 16px;box-shadow:0 12px 40px rgba(0,0,0,.15)}
.research-map .detail-type{font-size:.65rem;text-transform:uppercase;letter-spacing:.08em;font-weight:400}
.research-map .detail h2{font-size:1.15rem;line-height:1.15;margin:7px 24px 3px 0;font-weight:400}
.research-map .detail-author{font-size:.85rem;margin:0 24px 10px 0}
.research-map .detail p{font-size:.82rem;line-height:1.4;margin:0}
.research-map .detail-links{margin-top:10px;padding-top:9px;border-top:1px solid rgba(0,0,0,.16);font-size:.7rem;line-height:1.35}
.research-map .detail-links b{font-weight:400}
.research-map .detail-links .rel{border:0;background:none;padding:0;text-decoration:underline;text-underline-offset:2px}
.research-map .detail-close{position:absolute;right:10px;top:8px;border:0;background:none;font-size:20px}
.research-map .no-results{position:absolute;z-index:15;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(255,255,255,.95);border:1px solid rgba(0,0,0,.12);border-radius:12px;padding:12px 16px;font-size:.85rem;text-align:center}
.research-map.wide .no-results{left:calc(50% + 172px)}
.research-map .no-results button{margin-top:8px;border:1px solid #111;background:#fff;border-radius:3px;padding:3px 9px;font-size:.78rem}
.research-map .hint{position:absolute;z-index:10;left:50%;bottom:18px;transform:translateX(-50%);font-size:.67rem;color:#555;background:rgba(255,255,255,.85);padding:4px 8px;border-radius:8px;pointer-events:none;white-space:nowrap}
.research-map.narrow .panel{top:56px;left:9px;width:min(300px,calc(100% - 18px));max-height:56%;overflow:auto}
.research-map.narrow .reopen{top:9px;left:9px}
.research-map.narrow .brand{left:10px;bottom:10px;right:10px;max-width:none;font-size:.8rem}
.research-map.narrow .detail{right:9px;bottom:84px;width:calc(100% - 18px);max-height:31%}
`

export default function ResearchMap({ isMobileLayout = false }) {
  const graphRef = useRef(null)
  const nodes = useMemo(() => RESEARCH_ITEMS.map(([id, title, author, type, desc, tags, linkIds], index) => {
    const lines = wrap(title, type === 'essay' ? 23 : 20)
    const w = Math.max(type === 'essay' ? 112 : 82, Math.min(type === 'essay' ? 190 : 148, Math.max(...lines.map((l) => l.length)) * 6.2 + 22))
    return { index, id, title, author, type, desc, tags: tags.split(','), linkIds, lines, w, h: lines.length * 13 + 18, x: 0, y: 0, vx: 0, vy: 0, fixed: false }
  }), [])
  const links = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const seen = new Set()
    const out = []
    nodes.forEach((a) => a.linkIds.forEach((id) => {
      const b = byId.get(id)
      if (!b) return
      const key = [a.id, id].sort().join('|')
      if (seen.has(key)) return
      seen.add(key)
      out.push({ a: a.index, b: b.index, weight: 1 })
    }))
    return out
  }, [nodes])
  const neighbors = useMemo(() => {
    const m = new Map(nodes.map((n) => [n.index, new Set()]))
    links.forEach((l) => { m.get(l.a).add(l.b); m.get(l.b).add(l.a) })
    return m
  }, [nodes, links])
  const physics = useMemo(() => ({
    repulsion: 9000, centering: 0.0007,
    linkLength: (l) => 105 + (nodes[l.a].w + nodes[l.b].w) * 0.16,
    linkStrength: () => 0.0018,
  }), [nodes])

  const [enabled, setEnabled] = useState(() => new Set(TYPES))
  const [focusMode, setFocusMode] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [panelOpen, setPanelOpen] = useState(!isMobileLayout)

  const q = query.trim().toLowerCase()
  // matching nodes: by type, then (when searching) the matches and their direct relations, (in focus mode) the selection and its relations
  const visible = useMemo(() => {
    const base = nodes.filter((n) => enabled.has(n.type))
    if (!q && !focusMode) return new Set(base.map((n) => n.index))
    const matches = new Set(base.filter((n) => !q || `${n.title} ${n.author} ${n.desc} ${n.tags.join(' ')}`.toLowerCase().includes(q)).map((n) => n.index))
    if (q) [...matches].forEach((i) => neighbors.get(i).forEach((k) => matches.add(k)))
    if (selected != null && focusMode) { matches.add(selected); neighbors.get(selected).forEach((k) => matches.add(k)) }
    return new Set(base.filter((n) => matches.has(n.index)).map((n) => n.index))
  }, [nodes, neighbors, enabled, q, focusMode, selected])
  const visibleLinks = links.filter((l) => visible.has(l.a) && visible.has(l.b)).length

  const padding = (W) => {
    const wide = W > 640
    return { l: panelOpen && wide ? 380 : 36, r: 36, t: wide ? 70 : 60, b: wide ? 90 : 60 }
  }
  const reset = () => {
    setQuery(''); setFocusMode(false); setEnabled(new Set(TYPES)); setSelected(null)
    graphRef.current?.reset()
  }
  const toggleType = (t) => setEnabled((prev) => { const next = new Set(prev); if (next.has(t)) next.delete(t); else next.add(t); return next })
  const sel = selected != null ? nodes[selected] : null

  return (
    <div className={`research-map ${isMobileLayout ? 'narrow' : 'wide'}`}>
      <style>{CSS}</style>
      <ForceGraph
        ref={graphRef}
        style={{ position: 'absolute', inset: 0 }}
        nodes={nodes} links={links} visible={visible} selected={selected}
        onSelect={setSelected} drawNode={drawNode} hitNode={hitNode} extent={extent} scatter={scatter}
        physics={physics} padding={padding} maxFitScale={1.4}
      />

      <aside className={`panel${panelOpen ? '' : ' closed'}`}>
        <div className="panel-head"><h1>Diagram controls</h1><button type="button" className="round" onClick={() => setPanelOpen(false)} aria-label="Close controls">−</button></div>
        <div className="counts">{visible.size}/{nodes.length} nodes · {visibleLinks}/{links.length} links</div>
        <div className="mode-row">
          <span className="mode-word">Explore</span>
          <button type="button" className={`switch${focusMode ? ' on' : ''}`} onClick={() => setFocusMode((f) => !f)} aria-label="Toggle focus mode"><i /></button>
          <span className="mode-word">Focus</span>
        </div>
        <p className="mode-help">{focusMode ? 'Show only the selected node and its immediate relations.' : 'Explore the full filtered diagram.'}</p>
        <label className="label" htmlFor="graphSearch">Search nodes and immediate relations</label>
        <input id="graphSearch" className="graph-search" value={query} placeholder="e.g. girlhood, Tiqqun, maintenance" onChange={(e) => { setQuery(e.target.value); setSelected(null) }} />
        <div className="panel-rule" />
        <div className="visibility-title">Visibility</div>
        {TYPES.map((t) => (
          <label key={t} className="vis-row">
            <input type="checkbox" checked={enabled.has(t)} onChange={() => toggleType(t)} />
            <span className="swatch" style={{ background: PALETTE[t] }} />
            <span>{TYPE_LABEL[t]}</span>
            <span className="vis-count">{nodes.filter((n) => n.type === t).length}</span>
          </label>
        ))}
        <p className="panel-note">A line joins two works that speak to each other (the links are hand-picked, not computed). Hover for details. Click a node to pin its card and show its direct relations. Drag nodes or the background; scroll to zoom.</p>
        <button type="button" className="reset-link" onClick={reset}>Reset diagram</button>
      </aside>
      {!panelOpen && <button type="button" className="round reopen" onClick={() => setPanelOpen(true)} aria-label="Open controls">+</button>}

      <div className="brand">my fav literature, media and articles that inspired me throughout the “she is so hot i wanna clean her room” research</div>

      {visible.size === 0 && (
        <div className="no-results">
          <div>{q ? `nothing matches “${query.trim()}”` : 'every type is switched off'}</div>
          <button type="button" onClick={reset}>show everything</button>
        </div>
      )}

      {sel && (
        <section className="detail">
          <button type="button" className="detail-close" onClick={() => setSelected(null)} aria-label="Close details">×</button>
          <div className="detail-type">{sel.type} · {sel.tags.join(' / ')}</div>
          <h2>{sel.title}</h2>
          <div className="detail-author">{sel.author}</div>
          <p>{sel.desc}</p>
          <div className="detail-links">
            <b>Connected to</b><br />
            {[...neighbors.get(sel.index)].map((k, i) => (
              <React.Fragment key={k}>
                {i > 0 && ' · '}
                <button type="button" className="rel" onClick={() => { setSelected(k); graphRef.current?.focus(k) }}>{nodes[k].title}</button>
              </React.Fragment>
            ))}
          </div>
        </section>
      )}

      {!isMobileLayout && !sel && <div className="hint">drag to move · scroll to zoom · select a node to follow its connections</div>}
    </div>
  )
}

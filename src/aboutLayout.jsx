import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Free layout for the About window body. Published file: public/about-layout.json (supplied by
// Nana through the bot, like the hotspot files). Without that file the original bio is shown.
// ?edit=1 on the About page opens the editor; its draft lives only in that browser until published.
const DRAFT_KEY = 'shelest-about-layout-v1'
const LAYOUT_FILE = 'about-layout.json'

export const isAboutEditMode = () => {
  try { return new URLSearchParams(window.location.search).get('edit') === '1' } catch { return false }
}

let publishedRequest = null
const fetchPublishedLayout = () => {
  publishedRequest ??= fetch(LAYOUT_FILE, { cache: 'no-cache' })
    .then((response) => (response.ok ? response.json() : null))
    .then((layout) => (Array.isArray(layout?.items) ? layout : null))
    .catch(() => null)
  return publishedRequest
}

const loadDraft = () => {
  try { const draft = JSON.parse(localStorage.getItem(DRAFT_KEY)); return Array.isArray(draft?.items) ? draft : null } catch { return null }
}

export function useAboutLayout(editMode) {
  const [layout, setLayout] = useState(() => (editMode ? loadDraft() : null))
  useEffect(() => {
    let cancelled = false
    fetchPublishedLayout().then((published) => {
      if (!cancelled && published) setLayout((current) => current ?? published)
    })
    return () => { cancelled = true }
  }, [])
  return [layout, setLayout]
}

const newId = () => Math.random().toString(36).slice(2, 9)

export function AboutLayoutCanvas({ layout, setLayout, editable = false, defaultHtml, fontSize, scale: scaleOverride, onResize }) {
  const wrapperRef = useRef(null)
  const canvasRef = useRef(null)
  const [wrapperWidth, setWrapperWidth] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [status, setStatus] = useState('')

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return undefined
    const observer = new ResizeObserver(() => setWrapperWidth(wrapper.clientWidth))
    observer.observe(wrapper)
    setWrapperWidth(wrapper.clientWidth)
    return () => observer.disconnect()
  }, [])

  // Editing without a saved layout starts from the current bio, laid out exactly as before.
  useEffect(() => {
    if (!editable || layout || !wrapperWidth) return
    setLayout({ version: 1, width: wrapperWidth, fontSize, items: [{ id: 'bio', type: 'text', x: 0, y: 0, w: wrapperWidth, html: defaultHtml }] })
  }, [editable, layout, wrapperWidth, fontSize, defaultHtml, setLayout])

  const items = layout?.items ?? []

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const measure = () => {
      let bottom = 0
      for (const child of canvas.children) bottom = Math.max(bottom, child.offsetTop + child.offsetHeight)
      setContentHeight(bottom)
    }
    const observer = new ResizeObserver(measure)
    for (const child of canvas.children) observer.observe(child)
    measure()
    return () => observer.disconnect()
  }, [layout])

  useEffect(() => { onResize?.() }, [contentHeight, wrapperWidth]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateItem = (id, patch) => setLayout((current) => ({ ...current, items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) }))
  const deleteItem = (id) => { setLayout((current) => ({ ...current, items: current.items.filter((item) => item.id !== id) })); setSelectedId(null); setEditingId(null) }
  const addItem = (item) => {
    const top = Math.round((wrapperRef.current?.parentElement?.scrollTop ?? 0) / scale)
    const id = newId()
    setLayout((current) => ({ ...current, items: [...current.items, { id, x: 10, y: top + 10, ...item }] }))
    setSelectedId(id)
  }

  useEffect(() => {
    if (!editable) return undefined
    const onKey = (event) => {
      if (editingId) { if (event.key === 'Escape') event.target.blur?.(); return }
      if (['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return
      if (selectedId && (event.key === 'Delete' || event.key === 'Backspace')) { event.preventDefault(); deleteItem(selectedId) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }) // eslint-disable-line react-hooks/exhaustive-deps

  if (!layout) return <div ref={wrapperRef} />

  const scale = scaleOverride ?? (wrapperWidth && layout.width ? wrapperWidth / layout.width : 1)

  const startPointer = (event, item, mode) => {
    if (!editable || editingId === item.id) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedId(item.id)
    const element = event.currentTarget.closest('[data-about-item]')
    const start = { x: event.clientX, y: event.clientY, item: { ...item, w: item.w ?? element.offsetWidth, h: item.h ?? element.offsetHeight } }
    // On-screen scale, including any transform on the About window itself.
    const screenScale = canvasRef.current.getBoundingClientRect().width / layout.width || 1
    const move = (ev) => {
      const dx = (ev.clientX - start.x) / screenScale
      const dy = (ev.clientY - start.y) / screenScale
      if (mode === 'move') updateItem(item.id, { x: Math.round(start.item.x + dx), y: Math.max(0, Math.round(start.item.y + dy)) })
      else updateItem(item.id, { w: Math.max(16, Math.round(start.item.w + dx)), h: Math.max(12, Math.round(start.item.h + dy)) })
    }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const layoutJson = () => JSON.stringify({ ...layout, version: 1 }, null, 2)
  const handleSave = () => {
    const json = layoutJson()
    try { localStorage.setItem(DRAFT_KEY, json) } catch { /* ignore */ }
    navigator.clipboard?.writeText(json).catch(() => {})
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = LAYOUT_FILE
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
    setStatus(`saved — send ${LAYOUT_FILE} to the bot to publish`)
  }
  const handleReset = () => {
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
    setSelectedId(null)
    setEditingId(null)
    setStatus('')
    fetchPublishedLayout().then((published) => setLayout(published))
  }
  const handleAddImage = () => {
    const src = window.prompt('GIF / image URL')?.trim()
    if (src) addItem({ type: 'image', src, w: Math.round(layout.width / 3) })
  }

  const toolbarButton = { font: 'inherit', fontSize: '11px', padding: '3px 8px', border: '1px solid #b0b0b0', borderRadius: '4px', background: '#fff', cursor: 'pointer' }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', height: `${contentHeight * scale}px` }} onClick={editable ? (event) => event.stopPropagation() : undefined}>
      <div
        ref={canvasRef}
        onPointerDown={editable ? (event) => { if (event.target === event.currentTarget) { setSelectedId(null) } } : undefined}
        style={{ position: 'absolute', left: 0, top: 0, width: `${layout.width}px`, height: `${contentHeight}px`, fontSize: `${layout.fontSize}px`, whiteSpace: 'pre-wrap', transform: `scale(${scale})`, transformOrigin: '0 0' }}
      >
        {items.map((item) => {
          const selected = editable && selectedId === item.id
          const editing = editingId === item.id
          return (
            <div
              key={item.id}
              data-about-item=""
              onPointerDown={(event) => startPointer(event, item, 'move')}
              onDoubleClick={editable && item.type === 'text' ? () => { setSelectedId(item.id); setEditingId(item.id) } : undefined}
              style={{
                position: 'absolute',
                left: `${item.x}px`,
                top: `${item.y}px`,
                width: item.w ? `${item.w}px` : undefined,
                minHeight: item.type === 'text' && item.h ? `${item.h}px` : undefined,
                height: item.type === 'image' && item.h ? `${item.h}px` : undefined,
                outline: selected ? '1px dashed #2f6fed' : editable ? '1px dashed rgba(0,0,0,0.12)' : undefined,
                cursor: editable && !editing ? 'move' : undefined,
                touchAction: editable ? 'none' : undefined,
              }}
            >
              {item.type === 'image' ? (
                <img src={item.src} alt="" draggable={false} style={{ display: 'block', width: '100%', height: item.h ? '100%' : 'auto', objectFit: 'contain' }} />
              ) : (
                <div
                  contentEditable={editing}
                  suppressContentEditableWarning
                  ref={(element) => { if (element && editing && document.activeElement !== element) element.focus() }}
                  onBlur={editing ? (event) => { updateItem(item.id, { html: event.currentTarget.innerHTML }); setEditingId(null) } : undefined}
                  style={{ outline: 'none', cursor: editing ? 'text' : undefined }}
                  dangerouslySetInnerHTML={{ __html: item.html }}
                />
              )}
              {selected && !editing && (
                <span
                  onPointerDown={(event) => startPointer(event, item, 'resize')}
                  style={{ position: 'absolute', right: '-4px', bottom: '-4px', width: '8px', height: '8px', background: '#2f6fed', cursor: 'nwse-resize' }}
                />
              )}
            </div>
          )
        })}
      </div>
      {editable && createPortal(
        <div
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          style={{ position: 'fixed', top: '8px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: 'rgba(245,245,245,0.96)', border: '1px solid #b0b0b0', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '11px', fontWeight: 400, color: '#222' }}
        >
          <span style={{ opacity: 0.6 }}>about · edit</span>
          <button type="button" style={toolbarButton} onClick={() => addItem({ type: 'text', w: Math.round(layout.width / 2), html: 'text' })}>+ text</button>
          <button type="button" style={toolbarButton} onClick={handleAddImage}>+ gif / image</button>
          <button type="button" style={toolbarButton} disabled={!selectedId} onClick={() => deleteItem(selectedId)}>delete</button>
          <button type="button" style={toolbarButton} onClick={handleReset}>reset</button>
          <button type="button" style={{ ...toolbarButton, background: '#2f6fed', borderColor: '#2f6fed', color: '#fff' }} onClick={handleSave}>save</button>
          {status && <span style={{ opacity: 0.7 }}>{status}</span>}
        </div>,
        document.body,
      )}
    </div>
  )
}

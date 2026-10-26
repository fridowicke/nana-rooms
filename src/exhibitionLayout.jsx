import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Free layout for the EXHIBITIONS folder pages (overview + every exhibition), desktop only.
// Published file: public/exhibitions-layout.json = { version, pages: { <pageId>: { width, items } } }, supplied by
// Nana through the bot like about-layout.json. Pages without an entry render exactly as before.
// ?edit=1 opens the editor: the first visit to a page freezes its current look into movable items.
const DRAFT_KEY = 'shelest-exhibitions-layout-v1'
const LAYOUT_FILE = 'exhibitions-layout.json'

let publishedRequest = null
const fetchPublishedPages = () => {
  publishedRequest ??= fetch(LAYOUT_FILE, { cache: 'no-cache' })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => (data?.pages && typeof data.pages === 'object' ? data.pages : null))
    .catch(() => null)
  return publishedRequest
}

const loadDraft = () => {
  try { const draft = JSON.parse(localStorage.getItem(DRAFT_KEY)); return draft?.pages && typeof draft.pages === 'object' ? draft.pages : null } catch { return null }
}

export function useExhibitionLayouts(editMode) {
  const [pages, setPages] = useState(() => (editMode ? loadDraft() : null))
  useEffect(() => {
    let cancelled = false
    fetchPublishedPages().then((published) => {
      if (!cancelled && published) setPages((current) => current ?? published)
    })
    return () => { cancelled = true }
  }, [])
  return [pages, setPages]
}

const newId = () => Math.random().toString(36).slice(2, 9)
const TEXT_TAGS = new Set(['H1', 'H2', 'H3', 'P', 'A', 'FIGCAPTION', 'BUTTON', 'SPAN'])
const escapeAttr = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;')

const waitForMedia = (main) => Promise.all([
  ...[...main.querySelectorAll('img')].map((img) => {
    img.loading = 'eager'
    return Promise.race([img.decode().catch(() => {}), new Promise((resolve) => setTimeout(resolve, 4000))])
  }),
  ...[...main.querySelectorAll('video')].map((video) => (video.readyState >= 1 ? null : Promise.race([
    new Promise((resolve) => { video.addEventListener('loadedmetadata', resolve, { once: true }); video.addEventListener('error', resolve, { once: true }) }),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]))),
])

// Turns the rendered page into absolutely positioned items that look the same.
const capturePage = (main) => {
  const rect = main.getBoundingClientRect()
  const k = rect.width / main.offsetWidth || 1
  const box = (element) => {
    const r = element.getBoundingClientRect()
    return { x: Math.round((r.left - rect.left) / k), y: Math.round((r.top - rect.top) / k), w: Math.ceil(r.width / k) + 1, h: Math.round(r.height / k) }
  }
  const items = []
  const walk = (parent) => {
    for (const element of parent.children) {
      const href = element.closest('[data-ex-href]')?.dataset.exHref
      if (element.tagName === 'IMG') {
        items.push({ id: newId(), type: 'image', src: element.currentSrc || element.src, ...(href ? { href } : {}), ...box(element) })
      } else if (element.tagName === 'VIDEO') {
        items.push({ id: newId(), type: 'video', src: element.currentSrc || element.src, ...box(element) })
      } else if (element.tagName !== 'BR' && element.textContent.trim() && (TEXT_TAGS.has(element.tagName) || element.children.length === 0)
        && !element.querySelector('img, video')) {
        const css = getComputedStyle(element)
        let html = element.innerHTML
        if (element.tagName === 'A') html = element.outerHTML
        else if (href) html = `<a href="${escapeAttr(href)}" style="color: inherit; text-decoration: inherit">${element.innerHTML}</a>`
        const { h, ...position } = box(element)
        items.push({
          id: newId(),
          type: 'text',
          ...position,
          html,
          style: { fontSize: css.fontSize, fontWeight: css.fontWeight, fontStyle: css.fontStyle, lineHeight: css.lineHeight, color: css.color, textAlign: css.textAlign, textDecoration: css.textDecorationLine === 'none' ? undefined : css.textDecorationLine },
        })
      } else {
        walk(element)
      }
    }
  }
  walk(main)
  return { width: main.offsetWidth, items, pristine: true }
}

const MAX_IMAGE_SIDE = 1600
const readImageFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onerror = () => reject(reader.error)
  reader.onload = () => {
    // GIFs stay untouched so they keep animating; other images are scaled down to keep the JSON small.
    if (file.type === 'image/gif') { resolve(reader.result); return }
    const img = new Image()
    img.onerror = () => resolve(reader.result)
    img.onload = () => {
      const ratio = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.naturalWidth, img.naturalHeight))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.naturalWidth * ratio)
      canvas.height = Math.round(img.naturalHeight * ratio)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85))
    }
    img.src = reader.result
  }
  reader.readAsDataURL(file)
})

// disabled (mobile) always renders the original page and never opens the editor.
export function ExhibitionLayoutMain({ pageId, pages, setPages, editable: editRequested = false, disabled = false, style, children }) {
  const editable = editRequested && !disabled
  const mainRef = useRef(null)
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)
  const [mainWidth, setMainWidth] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [status, setStatus] = useState('')
  const layout = disabled ? null : pages?.[pageId] ?? null

  useLayoutEffect(() => {
    const main = mainRef.current
    if (!main) return undefined
    const observer = new ResizeObserver(() => setMainWidth(main.clientWidth))
    observer.observe(main)
    setMainWidth(main.clientWidth)
    return () => observer.disconnect()
  }, [])

  // Editing a page without a saved layout starts from a snapshot of how it looks now.
  useEffect(() => {
    if (!editable || layout || !mainRef.current) return undefined
    let cancelled = false
    const main = mainRef.current
    waitForMedia(main).then(() => {
      if (cancelled || !main.isConnected) return
      const captured = capturePage(main)
      setPages((current) => (current?.[pageId] ? current : { ...current, [pageId]: captured }))
    })
    return () => { cancelled = true }
  }, [editable, layout, pageId, setPages])

  useEffect(() => { setSelectedId(null); setEditingId(null) }, [pageId])

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

  const updatePage = (update) => setPages((current) => {
    const { pristine, ...page } = update(current[pageId]) // eslint-disable-line no-unused-vars
    return { ...current, [pageId]: page }
  })
  const updateItem = (id, patch) => updatePage((page) => ({ ...page, items: page.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) }))
  const deleteItem = (id) => { updatePage((page) => ({ ...page, items: page.items.filter((item) => item.id !== id) })); setSelectedId(null); setEditingId(null) }

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

  const scale = layout && mainWidth ? mainWidth / layout.width : 1

  const addItem = (item) => {
    let scroller = mainRef.current?.parentElement
    while (scroller && scroller.scrollHeight <= scroller.clientHeight) scroller = scroller.parentElement
    const mainTop = mainRef.current.getBoundingClientRect().top
    const viewTop = scroller ? scroller.getBoundingClientRect().top : 0
    const top = Math.max(0, Math.round((viewTop - mainTop) / (canvasRef.current.getBoundingClientRect().width / layout.width || 1)))
    const id = newId()
    updatePage((page) => ({ ...page, items: [...page.items, { id, x: 10, y: top + 10, ...item }] }))
    setSelectedId(id)
  }

  const startPointer = (event, item, mode) => {
    if (!editable || editingId === item.id) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedId(item.id)
    const element = event.currentTarget.closest('[data-ex-item]')
    const start = { x: event.clientX, y: event.clientY, item: { ...item, w: item.w ?? element.offsetWidth, h: item.h ?? element.offsetHeight } }
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

  const handleSave = () => {
    // Pages that were only opened (never changed) are left out so they keep following the site content.
    const changed = Object.fromEntries(Object.entries(pages ?? {}).filter(([, page]) => !page.pristine))
    const json = JSON.stringify({ version: 1, pages: changed }, null, 2)
    try { localStorage.setItem(DRAFT_KEY, json) } catch { /* too big for localStorage; the file below still has it */ }
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
    setSelectedId(null)
    setEditingId(null)
    setStatus('')
    fetchPublishedPages().then((published) => setPages((current) => {
      const next = { ...current }
      if (published?.[pageId]) next[pageId] = published[pageId]
      else delete next[pageId]
      return next
    }))
  }
  const handleAddImageUrl = () => {
    const src = window.prompt('GIF / image URL')?.trim()
    if (src) addItem({ type: 'image', src, w: Math.round(layout.width / 3) })
  }
  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try { addItem({ type: 'image', src: await readImageFile(file), w: Math.round(layout.width / 3) }) } catch { setStatus('could not read that file') }
  }

  if (!layout) return <main ref={mainRef} style={style}>{children}</main>

  const toolbarButton = { font: 'inherit', fontSize: '11px', padding: '3px 8px', border: '1px solid #b0b0b0', borderRadius: '4px', background: '#fff', cursor: 'pointer' }

  return (
    <main ref={mainRef} style={style} onClick={editable ? (event) => event.stopPropagation() : undefined}
      onClickCapture={editable ? (event) => { if (event.target.closest('a')) event.preventDefault() } : undefined}>
      <div style={{ position: 'relative', height: `${contentHeight * scale}px` }}>
        <div
          ref={canvasRef}
          onPointerDown={editable ? (event) => { if (event.target === event.currentTarget) setSelectedId(null) } : undefined}
          style={{ position: 'absolute', left: 0, top: 0, width: `${layout.width}px`, height: `${contentHeight}px`, transform: `scale(${scale})`, transformOrigin: '0 0', textAlign: 'left' }}
        >
          {layout.items.map((item) => {
            const selected = editable && selectedId === item.id
            const editing = editingId === item.id
            const media = item.type === 'image'
              ? <img src={item.src} alt="" draggable={false} style={{ display: 'block', width: '100%', height: item.h ? '100%' : 'auto', objectFit: 'contain', pointerEvents: editable ? 'none' : undefined }} />
              : <video src={item.src} controls preload="metadata" style={{ display: 'block', width: '100%', height: item.h ? '100%' : 'auto', background: '#000', pointerEvents: editable ? 'none' : undefined }} />
            return (
              <div
                key={item.id}
                data-ex-item=""
                onPointerDown={(event) => startPointer(event, item, 'move')}
                onDoubleClick={editable && item.type === 'text' ? () => { setSelectedId(item.id); setEditingId(item.id) } : undefined}
                style={{
                  position: 'absolute',
                  left: `${item.x}px`,
                  top: `${item.y}px`,
                  width: item.w ? `${item.w}px` : undefined,
                  minHeight: item.type === 'text' && item.h ? `${item.h}px` : undefined,
                  height: item.type !== 'text' && item.h ? `${item.h}px` : undefined,
                  ...(item.type === 'text' ? item.style : null),
                  outline: selected ? '1px dashed #2f6fed' : editable ? '1px dashed rgba(0,0,0,0.12)' : undefined,
                  cursor: editable && !editing ? 'move' : undefined,
                  touchAction: editable ? 'none' : undefined,
                }}
              >
                {item.type === 'text' ? (
                  <div
                    contentEditable={editing}
                    suppressContentEditableWarning
                    ref={(element) => { if (element && editing && document.activeElement !== element) element.focus() }}
                    onBlur={editing ? (event) => { updateItem(item.id, { html: event.currentTarget.innerHTML }); setEditingId(null) } : undefined}
                    style={{ outline: 'none', cursor: editing ? 'text' : undefined }}
                    dangerouslySetInnerHTML={{ __html: item.html }}
                  />
                ) : item.href && !editable ? (
                  <a href={item.href} style={{ display: 'block', width: '100%', height: '100%' }}>{media}</a>
                ) : media}
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
      </div>
      {editable && createPortal(
        <div
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          style={{ position: 'fixed', top: '8px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', background: 'rgba(245,245,245,0.96)', border: '1px solid #b0b0b0', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontSize: '11px', fontWeight: 400, color: '#222' }}
        >
          <span style={{ opacity: 0.6 }}>exhibitions · {pageId} · edit</span>
          <button type="button" style={toolbarButton} onClick={() => addItem({ type: 'text', w: Math.round(layout.width / 2), html: 'text', style: { fontSize: '16px', fontWeight: '300', lineHeight: '1.45' } })}>+ text</button>
          <button type="button" style={toolbarButton} onClick={handleAddImageUrl}>+ gif / image url</button>
          <button type="button" style={toolbarButton} onClick={() => fileInputRef.current?.click()}>+ gif / image file</button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
          <button type="button" style={toolbarButton} disabled={!selectedId} onClick={() => deleteItem(selectedId)}>delete</button>
          <button type="button" style={toolbarButton} onClick={handleReset}>reset page</button>
          <button type="button" style={{ ...toolbarButton, background: '#2f6fed', borderColor: '#2f6fed', color: '#fff' }} onClick={handleSave}>save</button>
          {status && <span style={{ opacity: 0.7 }}>{status}</span>}
        </div>,
        document.body,
      )}
    </main>
  )
}

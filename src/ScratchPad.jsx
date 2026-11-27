import { useEffect, useRef, useState } from 'react'
import MathNotationPicker from './MathNotationPicker.jsx'

const STORAGE_KEY = 'calculust-scratchpad'
const COLORS = ['#f0f0f2', '#0fb7e0', '#ef82ae', '#a58cf0', '#09e82e']

function loadScratchPad() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return {
      strokes: Array.isArray(saved?.strokes) ? saved.strokes.filter((stroke) => stroke?.tool !== 'clean-text') : [],
      notes: typeof saved?.notes === 'string' ? saved.notes : '',
    }
  } catch {
    return { strokes: [], notes: '' }
  }
}

function wrapText(context, text, maxWidth) {
  const lines = []
  for (const paragraph of String(text).split(/\r?\n/)) {
    if (!paragraph) {
      lines.push('')
      continue
    }
    let line = ''
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word
      if (line && context.measureText(candidate).width > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

function getTypedTextLayout(context, item, width, height) {
  const fontSize = Math.max(12, Math.min(item.fontSize || 18, height * 0.12))
  const lineHeight = fontSize * 1.4
  const padding = Math.max(8, fontSize * 0.55)
  const x = Math.max(0, Math.min(width - 48, item.x * width))
  const y = Math.max(0, Math.min(height - 36, item.y * height))
  const maxTextWidth = Math.max(32, width - x - padding * 2 - 10)

  context.save()
  context.font = `${fontSize}px "Atkinson Hyperlegible Next", sans-serif`
  const lines = wrapText(context, item.text, maxTextWidth)
  const maxLines = Math.max(1, Math.floor((height - y - padding * 2 - 8) / lineHeight))
  const visibleLines = lines.slice(0, maxLines)
  if (lines.length > maxLines && visibleLines.length) {
    const last = visibleLines.length - 1
    visibleLines[last] = `${visibleLines[last].slice(0, 30)}…`
  }
  const contentWidth = Math.max(36, ...visibleLines.map((line) => context.measureText(line).width))
  const boxWidth = Math.min(width - x - 8, contentWidth + padding * 2)
  const boxHeight = visibleLines.length * lineHeight + padding * 2
  context.restore()
  return { fontSize, lineHeight, padding, x, y, boxWidth, boxHeight, visibleLines }
}

function drawTypedText(context, item, width, height) {
  const layout = getTypedTextLayout(context, item, width, height)
  const { fontSize, lineHeight, padding, x, y, boxWidth, boxHeight, visibleLines } = layout
  context.save()
  context.font = `${fontSize}px "Atkinson Hyperlegible Next", sans-serif`
  context.fillStyle = '#1c1d21ed'
  context.strokeStyle = '#0fb7e0a8'
  context.lineWidth = 1
  context.fillRect(x, y, boxWidth, boxHeight)
  context.strokeRect(x, y, boxWidth, boxHeight)
  context.fillStyle = item.color || '#f0f0f2'
  context.textBaseline = 'top'
  visibleLines.forEach((line, index) => {
    context.fillText(line, x + padding, y + padding + index * lineHeight, Math.max(1, boxWidth - padding * 2))
  })
  context.restore()
}

function drawStroke(context, stroke, width, height) {
  if (stroke.tool === 'typed-text') {
    drawTypedText(context, stroke, width, height)
    return
  }
  if (!stroke.points?.length) return
  context.save()
  context.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
  context.strokeStyle = stroke.color
  context.fillStyle = stroke.color
  context.lineWidth = stroke.width
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.beginPath()
  context.moveTo(stroke.points[0].x * width, stroke.points[0].y * height)
  if (stroke.points.length === 1) {
    context.arc(stroke.points[0].x * width, stroke.points[0].y * height, stroke.width / 2, 0, Math.PI * 2)
    context.fill()
  } else {
    for (let index = 1; index < stroke.points.length - 1; index += 1) {
      const point = stroke.points[index]
      const next = stroke.points[index + 1]
      context.quadraticCurveTo(
        point.x * width,
        point.y * height,
        (point.x + next.x) * width / 2,
        (point.y + next.y) * height / 2,
      )
    }
    const lastPoint = stroke.points.at(-1)
    context.lineTo(lastPoint.x * width, lastPoint.y * height)
    context.stroke()
  }
  context.restore()
}

function renderCanvas(canvas, strokes, activeStroke) {
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const ratio = window.devicePixelRatio || 1
  const pixelWidth = Math.round(rect.width * ratio)
  const pixelHeight = Math.round(rect.height * ratio)
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }
  const context = canvas.getContext('2d')
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, rect.width, rect.height)
  for (const stroke of activeStroke ? [...strokes, activeStroke] : strokes) {
    drawStroke(context, stroke, rect.width, rect.height)
  }
}

export default function ScratchPad({ context = '', returnPage, onBack, onAskTutor, inModal = false, onClose }) {
  const [initial] = useState(loadScratchPad)
  const canvasRef = useRef(null)
  const notesRef = useRef(null)
  const notesCursorRef = useRef(null)
  const activeStrokeRef = useRef(null)
  const pendingTextRef = useRef(null)
  const dragTextRef = useRef(null)
  const strokesRef = useRef(initial.strokes)
  const draftRef = useRef(null)
  const [strokes, setStrokes] = useState(initial.strokes)
  const [notes, setNotes] = useState(initial.notes)
  const [draft, setDraft] = useState(null)
  const [tool, setTool] = useState('pen')
  const [color, setColor] = useState(COLORS[0])
  const [penWidth, setPenWidth] = useState(6)
  const [numberEntry, setNumberEntry] = useState('')
  const [numberError, setNumberError] = useState('')
  const [pendingText, setPendingText] = useState(null)
  const [hoveredTextIndex, setHoveredTextIndex] = useState(-1)
  const [draggingText, setDraggingText] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [saveMessage, setSaveMessage] = useState('Saved on this device')

  strokesRef.current = strokes
  draftRef.current = draft
  pendingTextRef.current = pendingText

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const redraw = () => renderCanvas(canvas, strokesRef.current, draftRef.current)
    redraw()
    const observer = new ResizeObserver(redraw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (canvasRef.current) renderCanvas(canvasRef.current, strokes, draft)
  }, [strokes, draft])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ strokes, notes }))
        setSaveMessage('Saved on this device')
      } catch {
        setSaveMessage('Storage is full. Some changes may not persist.')
      }
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [strokes, notes])

  function getPoint(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.round(Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * 10000) / 10000,
      y: Math.round(Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) * 10000) / 10000,
    }
  }

  function getTypedTextAtPoint(event) {
    const canvas = canvasRef.current
    if (!canvas) return -1
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const context = canvas.getContext('2d')
    for (let index = strokesRef.current.length - 1; index >= 0; index -= 1) {
      const item = strokesRef.current[index]
      if (item.tool !== 'typed-text') continue
      const { x: boxX, y: boxY, boxWidth, boxHeight } = getTypedTextLayout(context, item, rect.width, rect.height)
      if (x >= boxX && x <= boxX + boxWidth && y >= boxY && y <= boxY + boxHeight) return index
    }
    return -1
  }

  function cancelTextPlacement() {
    setPendingText(null)
    pendingTextRef.current = null
    setTool('pen')
  }

  function startStroke(event) {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    if (tool === 'place-text' && pendingTextRef.current) {
      const point = getPoint(event)
      const item = { ...pendingTextRef.current, x: point.x, y: point.y }
      const updated = [...strokesRef.current, item].slice(-120)
      strokesRef.current = updated
      setStrokes(updated)
      cancelTextPlacement()
      return
    }
    if (tool === 'pen') {
      const index = getTypedTextAtPoint(event)
      if (index >= 0) {
        event.currentTarget.setPointerCapture(event.pointerId)
        const point = getPoint(event)
        const item = strokesRef.current[index]
        dragTextRef.current = {
          index,
          start: point,
          origin: { x: item.x, y: item.y },
          baseStrokes: strokesRef.current,
        }
        setDraggingText(true)
        setHoveredTextIndex(index)
        return
      }
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    const stroke = { color, tool, width: tool === 'eraser' ? 26 : penWidth, points: [getPoint(event)] }
    activeStrokeRef.current = stroke
    setDraft(stroke)
  }

  function continueStroke(event) {
    if (dragTextRef.current) {
      const drag = dragTextRef.current
      const point = getPoint(event)
      const rect = event.currentTarget.getBoundingClientRect()
      const item = drag.baseStrokes[drag.index]
      const moved = {
        ...item,
        x: Math.max(0, Math.min(1, drag.origin.x + point.x - drag.start.x)),
        y: Math.max(0, Math.min(1, drag.origin.y + point.y - drag.start.y)),
      }
      const layout = getTypedTextLayout(event.currentTarget.getContext('2d'), moved, rect.width, rect.height)
      moved.x = Math.min(moved.x, Math.max(0, (rect.width - layout.boxWidth) / rect.width))
      moved.y = Math.min(moved.y, Math.max(0, (rect.height - layout.boxHeight) / rect.height))
      const updated = [...drag.baseStrokes]
      updated[drag.index] = moved
      strokesRef.current = updated
      setStrokes(updated)
      return
    }
    if (!activeStrokeRef.current) {
      const index = tool === 'pen' ? getTypedTextAtPoint(event) : -1
      setHoveredTextIndex((current) => current === index ? current : index)
      return
    }
    const stroke = { ...activeStrokeRef.current, points: [...activeStrokeRef.current.points, getPoint(event)].slice(-700) }
    activeStrokeRef.current = stroke
    setDraft(stroke)
  }

  function finishStroke() {
    if (dragTextRef.current) {
      dragTextRef.current = null
      setDraggingText(false)
      setHoveredTextIndex(-1)
      return
    }
    if (!activeStrokeRef.current) return
    const finished = activeStrokeRef.current
    activeStrokeRef.current = null
    setStrokes((current) => [...current, finished].slice(-120))
    setDraft(null)
  }

  function queueText(text, fontSize = 28, label = 'text') {
    const cleaned = String(text || '').trim()
    if (!cleaned) return
    const pending = { tool: 'typed-text', text: cleaned, fontSize, color, label }
    pendingTextRef.current = pending
    setPendingText(pending)
    setTool('place-text')
    canvasRef.current?.focus()
  }

  function addNumberToCanvas() {
    const value = numberEntry.trim()
    if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
      setNumberError('Enter a number, then choose where to place it.')
      return
    }
    setNumberError('')
    queueText(value, 30, 'number')
    setNumberEntry('')
  }

  function handleNumberKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault()
      addNumberToCanvas()
    }
  }

  function addNotesToCanvas() {
    queueText(notes, 14, 'notes')
  }

  function addMathSymbol(symbol) {
    queueText(symbol, 28, 'math notation')
  }

  function insertNotationIntoNotes(symbol) {
    const textarea = notesRef.current
    const selection = notesCursorRef.current || { start: notes.length, end: notes.length }
    const start = Math.max(0, Math.min(notes.length, selection.start))
    const end = Math.max(start, Math.min(notes.length, selection.end))
    const available = Math.max(0, 5700 - notes.length + (end - start))
    if (symbol.length > available) return
    const insertion = symbol
    const nextNotes = `${notes.slice(0, start)}${insertion}${notes.slice(end)}`
    setNotes(nextNotes)
    notesCursorRef.current = { start: start + insertion.length, end: start + insertion.length }
    window.requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(start + insertion.length, start + insertion.length)
    })
  }

  function updateNotesCursor(event) {
    notesCursorRef.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd }
  }

  function handleCanvasKeyDown(event) {
    if (event.key === 'Escape' && pendingTextRef.current) {
      event.preventDefault()
      cancelTextPlacement()
    }
  }

  function clearScratchPad() {
    setStrokes([])
    setNotes('')
    setDraft(null)
    setPendingText(null)
    pendingTextRef.current = null
    activeStrokeRef.current = null
    setTool('pen')
    setConfirmClear(false)
  }

  function exportSketch() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'calculust-scratch-pad.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  function exportNotes() {
    const file = new Blob([notes], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.download = 'calculust-scratch-notes.txt'
    link.href = url
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  function askTutorAboutNotes() {
    persistNow()
    const prefix = context ? `${context}\n\n` : ''
    const noteLabel = 'My scratch-pad notes:\n'
    const available = Math.max(0, 6000 - prefix.length - noteLabel.length)
    onAskTutor(`${prefix}${noteLabel}${notes.slice(0, available)}`)
  }

  function persistNow() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ strokes, notes }))
      setSaveMessage('Saved on this device')
    } catch {
      setSaveMessage('Storage is full. Some changes may not persist.')
    }
  }

  function leaveScratchPad() {
    persistNow()
    onBack?.()
  }

  function closeScratchPad() {
    persistNow()
    onClose?.()
  }

  const returnLabels = { applied: 'Applied calculus', quizzes: 'Quizzes', tutor: 'Ollama tutor', solver: 'Problem solver', practice: 'Practice', overview: 'Overview' }
  const returnLabel = returnLabels[returnPage] || 'Learning space'

  return (
    <div className={`scratch-page ${inModal ? 'scratch-in-modal' : ''}`}>
      {!inModal && <div className="scratch-back-row"><button className="back-link" onClick={leaveScratchPad}>← Back to {returnLabel}</button><span className="level-chip scratch-save"><span className="scratch-save-dot" /> {saveMessage}</span></div>}
      <div className="page-title-row">
        <div><p className="eyebrow">{inModal ? 'QUICK WORKING SPACE' : 'A SPACE TO THINK OUT LOUD'}</p><h1 id={inModal ? 'scratch-modal-title' : undefined}>Make room for <em>your thinking.</em></h1><p className="page-description">Sketch a graph, work through an equation, or jot down the idea as it comes.</p></div>
        {inModal && <div className="scratch-modal-actions"><span className="level-chip scratch-save"><span className="scratch-save-dot" /> {saveMessage}</span><button className="scratch-modal-close" onClick={closeScratchPad} aria-label="Close scratch pad">×</button></div>}
      </div>
      {context && <div className="scratch-problem-context"><span><span className="question-count-dot" /> WORKING ON</span><p>{context.split('\n')[0]}</p></div>}
      <section className="scratch-layout">
        <div className="scratch-board-card">
          <div className="scratch-toolbar" role="toolbar" aria-label="Drawing tools">
            <div className="scratch-tool-group">
              <button className={`scratch-tool ${tool === 'pen' ? 'active' : ''}`} onClick={() => { cancelTextPlacement(); setTool('pen') }} aria-pressed={tool === 'pen'} aria-label="Pen tool">✎ <span>Pen</span></button>
              <button className={`scratch-tool ${tool === 'eraser' ? 'active' : ''}`} onClick={() => { cancelTextPlacement(); setTool('eraser') }} aria-pressed={tool === 'eraser'} aria-label="Eraser tool">⌫ <span>Eraser</span></button>
              <span className="scratch-toolbar-divider" />
              <div className="scratch-colors" role="group" aria-label="Pen color">{COLORS.map((item) => <button key={item} className={`scratch-color ${color === item ? 'selected' : ''}`} style={{ '--swatch': item }} onClick={() => { cancelTextPlacement(); setColor(item); setTool('pen') }} aria-label={`Use ${item} ink`} aria-pressed={color === item} />)}</div>
              <label className="scratch-width-control">
                <span>Pen width <output>{penWidth}px</output></span>
                <input type="range" min="3" max="12" step="0.5" value={penWidth} onChange={(event) => setPenWidth(Number(event.target.value))} aria-label="Pen width" />
              </label>
            </div>
            <div className="scratch-tool-group scratch-toolbar-actions">
              <button className="scratch-action" onClick={() => setStrokes((current) => current.slice(0, -1))} disabled={!strokes.length} aria-label="Undo last stroke">↶ <span>Undo</span></button>
              <button className="scratch-action" onClick={exportSketch} aria-label="Export drawing as PNG">↓ <span>Export</span></button>
              <button className="scratch-action scratch-clear" onClick={() => setConfirmClear(true)} disabled={!strokes.length && !notes} aria-label="Clear scratch pad">Clear</button>
            </div>
          </div>
          <div className="scratch-number-entry">
            <label htmlFor="scratch-number-input">Type a number <span>Use your keyboard or numpad, then press Enter.</span></label>
            <input id="scratch-number-input" type="text" inputMode="decimal" autoComplete="off" maxLength={80} value={numberEntry} onChange={(event) => { setNumberEntry(event.target.value); setNumberError('') }} onKeyDown={handleNumberKeyDown} placeholder="e.g. 8.7777" aria-describedby={numberError ? 'scratch-number-error' : undefined} />
            <button className="button button-primary scratch-number-submit" onClick={addNumberToCanvas} disabled={!numberEntry.trim()}>Add number</button>
            <MathNotationPicker onSelect={addMathSymbol} />
            {numberError && <span className="scratch-number-error" id="scratch-number-error" role="status">{numberError}</span>}
          </div>
          {confirmClear && <div className="scratch-confirm" role="alert"><span>Clear this sketch and all its notes?</span><button className="scratch-confirm-keep" onClick={() => setConfirmClear(false)}>Keep them</button><button className="scratch-confirm-delete" onClick={clearScratchPad}>Clear everything</button></div>}
          {pendingText && <div className="scratch-placement-hint" role="status">Click the canvas to place {pendingText.label}. Press Escape to cancel.</div>}
          <div className="scratch-canvas-wrap">
            <canvas ref={canvasRef} tabIndex={0} className={`scratch-canvas ${tool === 'eraser' ? 'eraser-cursor' : ''} ${tool === 'place-text' ? 'place-text-cursor' : ''} ${hoveredTextIndex >= 0 ? 'text-box-hover' : ''} ${draggingText ? 'text-box-dragging' : ''}`} aria-label={pendingText ? 'Click to place the queued text. Press Escape to cancel.' : 'Free-form drawing area. Use the pen or eraser, or drag a typed number or notes box to move it.'} onPointerDown={startStroke} onPointerMove={continueStroke} onPointerUp={finishStroke} onPointerCancel={finishStroke} onPointerLeave={() => { if (!dragTextRef.current) setHoveredTextIndex(-1) }} onKeyDown={handleCanvasKeyDown} />
            {!strokes.length && !draft && !pendingText && <div className="scratch-canvas-hint" aria-hidden="true"><span>∫</span><p>Your page is blank.<br />That’s a lovely place to start.</p></div>}
          </div>
          <div className="scratch-board-footer"><span>{pendingText ? 'Choose a clear spot on the canvas for this text.' : 'Drag a number or notes box to move it. Draw with a mouse, stylus, or touch.'}</span><span>{strokes.length} {strokes.length === 1 ? 'item' : 'items'}</span></div>
        </div>
        <aside className="scratch-notes-card">
          <div className="scratch-notes-heading"><span className="scratch-note-icon">≡</span><div><p className="eyebrow">THOUGHTS & STEPS</p><h2>Keep a few notes</h2></div><button className="scratch-notes-export" onClick={exportNotes} disabled={!notes.trim()} aria-label="Export notes as a text file">Export</button></div>
          <label className="sr-only" htmlFor="scratch-notes">Write notes for this scratch pad</label>
          <textarea ref={notesRef} id="scratch-notes" value={notes} onChange={(event) => { setNotes(event.target.value); updateNotesCursor(event) }} onSelect={updateNotesCursor} onClick={updateNotesCursor} onKeyUp={updateNotesCursor} maxLength={5700} placeholder={'Write down what you know…\n\nWhat are you trying to find?\nWhich idea might help?'} />
          <div className="scratch-notes-notation">
            <span>Add a symbol at the text cursor</span>
            <MathNotationPicker className="scratch-notes-symbol-picker" buttonLabel="Insert notation" onSelect={insertNotationIntoNotes} />
          </div>
          <div className="scratch-notes-footer"><span>Notes save automatically.</span><span>{notes.length}/5,700</span></div>
          <button className="button button-subtle scratch-notes-canvas-button" onClick={addNotesToCanvas} disabled={!notes.trim()}>Add notes to canvas</button>
          <div className="scratch-idea"><span>✳</span><p><strong>Try this:</strong> sketch how a function changes, then note what its derivative tells you about the shape.</p></div>
          <button className="button button-subtle scratch-tutor-button" onClick={askTutorAboutNotes} disabled={!notes.trim()}><span>✳</span> Ask the local tutor about these notes</button>
          <p className="scratch-share-note">Only your typed notes are shared with the local model; the sketch stays on this device.</p>
        </aside>
      </section>
    </div>
  )
}

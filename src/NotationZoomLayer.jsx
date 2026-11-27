import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const LazyMathDisplay = lazy(() => import('./MathDisplay.jsx').then((module) => ({ default: module.MathDisplay })))

const NOTATION_SELECTOR = '.vocabulary-page .math-typeset .katex, .coursebook-page .math-typeset .katex, .agent-page .math-typeset .katex, .tutor-page .math-typeset .katex'
const MAX_ZOOM = 1.7
const PANEL_PADDING = 32

function getOverlayGeometry(rect, fontSize) {
  const availableWidth = Math.max(180, window.innerWidth - 32)
  const availableHeight = Math.max(120, window.innerHeight - 32)
  const width = Math.max(rect.width, Number.parseFloat(fontSize) * 1.6)
  const height = Math.max(rect.height, Number.parseFloat(fontSize) * 1.8)
  const scale = Math.min(MAX_ZOOM, (availableWidth - PANEL_PADDING) / width, (availableHeight - PANEL_PADDING) / height)
  const panelWidth = Math.min(availableWidth, width * scale + PANEL_PADDING)
  const panelHeight = Math.min(availableHeight, height * scale + PANEL_PADDING)
  let left = rect.left + rect.width / 2 - panelWidth / 2
  let top = rect.top - panelHeight - 12
  if (top < 8) top = rect.bottom + 12
  if (top + panelHeight > window.innerHeight - 8) top = rect.top + rect.height / 2 - panelHeight / 2

  return {
    scale,
    width: panelWidth,
    height: panelHeight,
    left: Math.max(8, Math.min(window.innerWidth - panelWidth - 8, left)),
    top: Math.max(8, Math.min(window.innerHeight - panelHeight - 8, top)),
  }
}

export default function NotationZoomLayer() {
  const [active, setActive] = useState(null)
  const activeRef = useRef(null)
  const pointerRef = useRef(null)

  useEffect(() => {
    function findNotation(target) {
      return target instanceof Element ? target.closest(NOTATION_SELECTOR) : null
    }

    function handlePointerMove(event) {
      pointerRef.current = { x: event.clientX, y: event.clientY }
    }

    function handlePointerOver(event) {
      const target = findNotation(event.target)
      if (!target || target === activeRef.current?.node) return
      const annotation = target.querySelector('annotation[encoding="application/x-tex"]')
      const latex = annotation?.textContent?.trim()
      if (!latex) return
      const computed = window.getComputedStyle(target)
      const next = {
        node: target,
        latex,
        fontSize: Number.parseFloat(computed.fontSize) || 16,
        color: computed.color || '#f0f0f2',
        displayMode: Boolean(target.closest('.katex-display')),
        rect: target.getBoundingClientRect(),
      }
      activeRef.current = next
      setActive(next)
    }

    function handlePointerOut(event) {
      const target = findNotation(event.target)
      if (!target || target.contains(event.relatedTarget)) return
      if (activeRef.current?.node === target) {
        activeRef.current = null
        setActive(null)
      }
    }

    function updatePosition() {
      const current = activeRef.current
      if (!current) return
      const pointer = pointerRef.current
      const underPointer = pointer ? findNotation(document.elementFromPoint(pointer.x, pointer.y)) : null
      if (underPointer !== current.node) {
        activeRef.current = null
        setActive(null)
        return
      }
      const next = { ...current, rect: current.node.getBoundingClientRect() }
      activeRef.current = next
      setActive(next)
    }

    function hideOnEscape(event) {
      if (event.key === 'Escape') {
        activeRef.current = null
        setActive(null)
      }
    }

    document.addEventListener('pointermove', handlePointerMove, { passive: true })
    document.addEventListener('pointerover', handlePointerOver)
    document.addEventListener('pointerout', handlePointerOut)
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('keydown', hideOnEscape)
    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerover', handlePointerOver)
      document.removeEventListener('pointerout', handlePointerOut)
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('keydown', hideOnEscape)
    }
  }, [])

  if (!active) return null
  const overlay = getOverlayGeometry(active.rect, active.fontSize)
  const contentSize = Math.max(10, active.fontSize * overlay.scale)

  return createPortal(
    <div className="notation-zoom-layer" aria-hidden="true">
      <div className="notation-zoom-panel" style={{ left: overlay.left, top: overlay.top, width: overlay.width, height: overlay.height }}>
        <div className="notation-zoom-content" style={{ fontSize: `${contentSize}px`, color: active.color }}>
          <Suspense fallback={null}><LazyMathDisplay className="notation-zoom-math" latex={active.latex} displayMode={active.displayMode} /></Suspense>
        </div>
      </div>
    </div>,
    document.body,
  )
}

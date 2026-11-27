import { useId, useState } from 'react'

export default function MathRenderFallback({ source, displayMode }) {
  const [showSource, setShowSource] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
  const sourceId = useId()
  const Wrapper = displayMode ? 'div' : 'span'
  const copyText = displayMode ? `\\[\n${source}\n\\]` : `\\(${source}\\)`

  async function copySource() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable.')
      await navigator.clipboard.writeText(copyText)
      setCopyStatus('Copied')
    } catch {
      setShowSource(true)
      setCopyStatus('Select the shown source to copy it.')
    }
  }

  return (
    <Wrapper className={`math-render-fallback ${displayMode ? 'display' : 'inline'}`}>
      <span className="math-render-fallback-label">Unformatted math</span>
      <button className="math-render-fallback-button" type="button" aria-expanded={showSource} aria-controls={sourceId} onClick={() => setShowSource((current) => !current)}>
        {showSource ? 'Hide code' : 'Show code'}
      </button>
      <button className="math-render-fallback-button" type="button" onClick={copySource}>Copy code</button>
      {showSource && <code className="math-render-fallback-source" id={sourceId}>{copyText}</code>}
      {copyStatus && <span className="math-render-fallback-status" role="status">{copyStatus}</span>}
    </Wrapper>
  )
}

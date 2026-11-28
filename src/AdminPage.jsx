import { useEffect, useRef, useState } from 'react'
import { checkOllama } from './ollama.js'
import {
  APP_VERSION,
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  buildExportPayload,
  clearPrefixedKeys,
  collectStorageData,
  formatBytes,
  recordsToCsv,
  storageUsage,
  validateImportPayload,
} from './adminTools.js'

function download(filename, content, type = 'application/json') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function stamp() {
  return new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
}

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return value ?? fallback
  } catch {
    return fallback
  }
}

function ConfirmButton({ label, confirmLabel = 'Click again to confirm', onConfirm, className = 'admin-danger' }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return undefined
    const timer = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(timer)
  }, [armed])
  return (
    <button className={`${className} ${armed ? 'armed' : ''}`} onClick={() => {
      if (armed) {
        setArmed(false)
        onConfirm()
      } else setArmed(true)
    }}>{armed ? confirmLabel : label}</button>
  )
}

function StatRow({ label, value }) {
  return <div className="admin-stat"><span>{label}</span><strong>{value}</strong></div>
}

function Section({ eyebrow, title, children }) {
  return (
    <section className="admin-card">
      <div className="admin-card-head"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>
      {children}
    </section>
  )
}

export default function AdminPage({ records, inferenceHistory, settings, onSettingsChange, onResetProgress, onResetInference }) {
  const [models, setModels] = useState([])
  const [ollamaOnline, setOllamaOnline] = useState(null)
  const [modelChoice, setModelChoice] = useState(() => localStorage.getItem('electralab-ollama-model') || '')
  const [usage, setUsage] = useState(() => storageUsage(localStorage))
  const [importStatus, setImportStatus] = useState('')
  const fileInputRef = useRef(null)

  const mastered = readJson('electralab-vocabulary-progress', [])
  const courseProgress = readJson('electralab-course-progress', {})

  useEffect(() => {
    checkOllama()
      .then((status) => {
        setOllamaOnline(status.connected === true)
        setModels(Array.isArray(status.models) ? status.models : [])
      })
      .catch(() => setOllamaOnline(false))
  }, [])

  function refreshUsage() {
    setUsage(storageUsage(localStorage))
  }

  function saveModel(name) {
    setModelChoice(name)
    try {
      if (name) localStorage.setItem('electralab-ollama-model', name)
      else localStorage.removeItem('electralab-ollama-model')
    } catch {
      // storage unavailable — choice applies to this session's reads only
    }
    refreshUsage()
  }

  function updateSettings(patch) {
    onSettingsChange((previous) => ({ ...previous, ...patch }))
  }

  function exportAll() {
    const data = collectStorageData(localStorage)
    const meta = {
      records: records.length,
      inferenceEntries: inferenceHistory.length,
      masteredTerms: Array.isArray(mastered) ? mastered.length : 0,
      completedChapters: Array.isArray(courseProgress.completedChapters) ? courseProgress.completedChapters.length : 0,
      keys: Object.keys(data).length,
      userAgent: navigator.userAgent,
    }
    download(`electralab-backup-${stamp()}.json`, JSON.stringify(buildExportPayload(data, meta), null, 2))
  }

  function exportHistoryCsv() {
    download(`electralab-history-${stamp()}.csv`, recordsToCsv(records), 'text/csv')
  }

  function exportInference() {
    download(`electralab-inference-${stamp()}.json`, JSON.stringify({ app: 'electralab', exportedAt: new Date().toISOString(), inferenceHistory }, null, 2))
  }

  async function importFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImportStatus('Reading file…')
    try {
      const payload = JSON.parse(await file.text())
      const result = validateImportPayload(payload)
      if (!result.ok) {
        setImportStatus(result.error)
        return
      }
      const count = Object.keys(result.data).length
      if (!window.confirm(`Restore ${count} saved item${count === 1 ? '' : 's'} from ${result.exportedAt ? new Date(result.exportedAt).toLocaleString() : 'this backup'}? This overwrites the matching data stored in this browser.`)) {
        setImportStatus('Import cancelled.')
        return
      }
      for (const [key, value] of Object.entries(result.data)) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
      }
      setImportStatus(`Restored ${count} item${count === 1 ? '' : 's'}. Reloading…`)
      window.setTimeout(() => window.location.reload(), 700)
    } catch {
      setImportStatus('Could not read that file — it is not valid JSON.')
    }
  }

  function eraseAndReload(label) {
    clearPrefixedKeys(localStorage)
    onResetProgress()
    onResetInference()
    onSettingsChange(() => ({ ...DEFAULT_SETTINGS }))
    setImportStatus(`${label} Reloading…`)
    window.setTimeout(() => window.location.reload(), 700)
  }

  return (
    <div className="admin-page">
      <div className="page-title-row"><div><p className="eyebrow">BEHIND THE CURTAIN</p><h1>Admin &amp; <em>settings.</em></h1><p className="page-description">Export your data, restore a backup, tune preferences, or clear things out. Everything stays on this device.</p></div><span className="level-chip">v{APP_VERSION}</span></div>

      <div className="admin-grid">
        <Section eyebrow="AT A GLANCE" title="Your data on this device">
          <StatRow label="Practice &amp; lab records" value={records.length} />
          <StatRow label="Inference log entries" value={inferenceHistory.length} />
          <StatRow label="Vocabulary terms mastered" value={Array.isArray(mastered) ? mastered.length : 0} />
          <StatRow label="Chapters completed" value={Array.isArray(courseProgress.completedChapters) ? courseProgress.completedChapters.length : 0} />
          <StatRow label="Storage keys in use" value={usage.length} />
        </Section>

        <Section eyebrow="EXPORT" title="Take your data with you">
          <div className="admin-actions">
            <button className="button button-primary" onClick={exportAll}>Download full backup (.json)</button>
            <button className="button button-subtle" onClick={exportHistoryCsv} disabled={!records.length}>Learning history (.csv)</button>
            <button className="button button-subtle" onClick={exportInference} disabled={!inferenceHistory.length}>Inference log (.json)</button>
          </div>
          <p className="admin-note">The backup contains every ElectraLab key in this browser — progress, history, settings, scratch pad, and preferences.</p>
        </Section>

        <Section eyebrow="IMPORT" title="Restore a backup">
          <div className="admin-actions">
            <button className="button button-subtle" onClick={() => fileInputRef.current?.click()}>Choose a backup file…</button>
            <input ref={fileInputRef} type="file" accept=".json,application/json" className="admin-file-input" onChange={importFile} />
          </div>
          <p className="admin-note">Only files exported from ElectraLab are accepted. Matching keys are overwritten, then the app reloads.</p>
          {importStatus && <p className="admin-import-status" role="status">{importStatus}</p>}
        </Section>

        <Section eyebrow="USER SETTINGS" title="Preferences">
          <label className="admin-field">
            <span className="admin-field-label">Local model for tutor &amp; assistant</span>
            <select value={modelChoice} onChange={(event) => saveModel(event.target.value)} disabled={ollamaOnline === false}>
              {models.length === 0 && <option value="">{ollamaOnline === false ? 'Ollama offline' : 'No models found'}</option>}
              {models.map((model) => <option key={model.name} value={model.name}>{model.name}</option>)}
              {modelChoice && !models.some((model) => model.name === modelChoice) && <option value={modelChoice}>{modelChoice} (not installed)</option>}
            </select>
            <small>{ollamaOnline === false ? 'Start your local Ollama service to choose a model.' : 'Saved for the tutor, vocabulary lookup, and universal assistant.'}</small>
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Read-aloud speed <strong className="admin-field-value">{Number(settings.speechRate).toFixed(2)}×</strong></span>
            <input type="range" min="0.5" max="2" step="0.05" value={settings.speechRate} onChange={(event) => updateSettings({ speechRate: Number(event.target.value) })} />
            <small>Applies to the solver's read-aloud, practice feedback, and vocabulary pronunciation.</small>
          </label>
          <label className="admin-field admin-toggle-row">
            <span><span className="admin-field-label">Reduce motion</span><small>Tones down glow pulses and animated transitions across the app.</small></span>
            <button role="switch" aria-checked={settings.reduceMotion} className={`admin-toggle ${settings.reduceMotion ? 'on' : ''}`} onClick={() => updateSettings({ reduceMotion: !settings.reduceMotion })}><span /></button>
          </label>
        </Section>

        <Section eyebrow="STORAGE" title="What's using space">
          <ul className="admin-usage">
            {usage.map((row) => <li key={row.key}><span className="admin-usage-key">{row.key}</span><strong>{formatBytes(row.bytes)}</strong></li>)}
            {usage.length === 0 && <li><span className="admin-usage-key">No saved data yet</span><strong>0 B</strong></li>}
          </ul>
        </Section>

        <Section eyebrow="DANGER ZONE" title="Clear data">
          <div className="admin-danger-list">
            <div className="admin-danger-row"><div><strong>Learning history</strong><small>All practice, quiz, and lab records.</small></div><ConfirmButton label="Clear history" onConfirm={() => { localStorage.removeItem('electralab-progress'); onResetProgress(); refreshUsage() }} /></div>
            <div className="admin-danger-row"><div><strong>Inference log</strong><small>Saved Ollama performance metrics.</small></div><ConfirmButton label="Clear log" onConfirm={() => { localStorage.removeItem('electralab-inference-history'); onResetInference(); refreshUsage() }} /></div>
            <div className="admin-danger-row"><div><strong>Scratch pad</strong><small>Saved drawing strokes and notes.</small></div><ConfirmButton label="Clear pad" onConfirm={() => { localStorage.removeItem('electralab-scratchpad'); refreshUsage() }} /></div>
            <div className="admin-danger-row"><div><strong>Vocabulary mastery</strong><small>Which terms you marked as learned.</small></div><ConfirmButton label="Clear mastery" onConfirm={() => { localStorage.removeItem('electralab-vocabulary-progress'); refreshUsage() }} /></div>
            <div className="admin-danger-row"><div><strong>Course progress</strong><small>Read chapters and current position.</small></div><ConfirmButton label="Clear course" onConfirm={() => { localStorage.removeItem('electralab-course-progress'); refreshUsage() }} /></div>
            <div className="admin-danger-row"><div><strong>Calculator memory</strong><small>History, last expression, and mode.</small></div><ConfirmButton label="Clear calculator" onConfirm={() => { ['electralab-calculator-mode', 'electralab-calculator-history', 'electralab-calculator-expression', 'electralab-calculator-answer', 'electralab-calculator-angle', 'electralab-calculator-graph-angle', 'electralab-calculator-graph', 'electralab-calculator-x-min', 'electralab-calculator-x-max'].forEach((key) => localStorage.removeItem(key)); refreshUsage() }} /></div>
            <div className="admin-danger-row"><div><strong>Settings</strong><small>Speech rate, motion, and model preference.</small></div><ConfirmButton label="Reset settings" onConfirm={() => { localStorage.removeItem(SETTINGS_KEY); localStorage.removeItem('electralab-ollama-model'); setModelChoice(''); onSettingsChange(() => ({ ...DEFAULT_SETTINGS })); refreshUsage() }} /></div>
            <div className="admin-danger-row nuclear"><div><strong>Erase everything</strong><small>Every ElectraLab key — a clean slate.</small></div><ConfirmButton className="admin-danger nuclear" label="Erase all data" confirmLabel="Erase it all — confirm" onConfirm={() => eraseAndReload('All data erased.')} /></div>
          </div>
        </Section>
      </div>
      <section className="offline-note chip-offline"><span>⚡</span><span>Admin actions only touch this browser's storage. Nothing is uploaded, ever.</span></section>
    </div>
  )
}

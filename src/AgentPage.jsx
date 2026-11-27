import { useEffect, useState } from 'react'
import { askOllamaStream, checkOllama, combineAgentRuntime, getInferenceMetrics, getOllamaMetrics } from './ollama.js'
import { solveMathInput } from './math.js'
import { addMatrices, determinant2x2, formatMatrixLatex, multiplyMatrices } from './matrix.js'
import MathContent from './MathContent.jsx'
import { MathDisplay } from './MathDisplay.jsx'
import './agent-output.css'
import './agent-output.css'

const EXAMPLES = [
  { label: 'Power-rule derivative', prompt: 'Differentiate f(x) = 4x^3. Show the power rule and explain each step.' },
  { label: 'RC circuit rate', prompt: 'For V(t) = 10(1 - e^(-t/7)) volts, with t in milliseconds, find and explain the initial rate of change.' },
  { label: 'Matrix determinant', prompt: 'Explain how to calculate the determinant of [[1, 2], [3, 4]], then give the result.' },
]

const WALKTHROUGH_STAGES = [
  { label: 'Problem focus', pattern: /^##\s*Problem focus/im },
  { label: 'Rule or principle', pattern: /^##\s*Rule or principle/im },
  { label: 'Work', pattern: /^##\s*Work/im },
  { label: 'Evaluation', pattern: /^##\s*Evaluation/im },
  { label: 'Check', pattern: /^##\s*Check/im },
]

function getWalkthroughStage(answer) {
  let stage = -1
  WALKTHROUGH_STAGES.forEach((item, index) => {
    if (item.pattern.test(answer)) stage = index
  })
  return Math.max(0, stage)
}

function formatBytes(bytes) {
  if (!bytes) return '—'
  const gibibytes = bytes / 1024 ** 3
  return gibibytes >= 0.1 ? `${gibibytes.toFixed(1)} GiB` : `${(bytes / 1024 ** 2).toFixed(0)} MiB`
}

function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds)) return '—'
  return milliseconds < 1000 ? `${Math.round(milliseconds)} ms` : `${(milliseconds / 1000).toFixed(1)} s`
}

function AgentIcon({ name }) {
  const path = name === 'pencil'
    ? <path d="m4 20 4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z" />
    : name === 'copy'
      ? <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>
    : <><path d="M5 12h14M13 6l6 6-6 6" /></>
  return <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{path}</svg>
}

function WalkthroughProgress({ answer, running, workStatus }) {
  const encountered = WALKTHROUGH_STAGES.map((stage) => stage.pattern.test(answer))
  const activeIndex = encountered.lastIndexOf(true) < 0 ? 0 : encountered.lastIndexOf(true)
  const activeLabel = WALKTHROUGH_STAGES[activeIndex].label
  const complete = !running && /complete/i.test(workStatus)
  return <section className="agent-walkthrough" aria-label="Learner-facing solution walkthrough">
    <div className="agent-walkthrough-header" role="status" aria-live="polite"><span className={`agent-stream-indicator ${running ? 'active' : complete ? 'complete' : ''}`} /><div><strong>{running ? `Working on: ${activeLabel}` : complete ? 'Walkthrough ready to review' : 'Partial walkthrough'}</strong><span>{running ? workStatus || 'Generating visible solution steps…' : workStatus || 'Review the visible work below.'}</span></div></div>
    <ol>{WALKTHROUGH_STAGES.map((stage, index) => {
      const reached = encountered[index]
      const state = reached ? index < activeIndex || !running ? 'complete' : 'active' : ''
      return <li className={state} aria-current={state === 'active' ? 'step' : undefined} key={stage.label}><span>{state === 'complete' ? '✓' : index + 1}</span>{stage.label}</li>
    })}</ol>
  </section>
}

export default function AgentPage({ inferenceHistory, onInference, onOpenScratch }) {
  const [runtime, setRuntime] = useState(null)
  const [checking, setChecking] = useState(true)
  const [model, setModel] = useState(() => localStorage.getItem('electralab-ollama-model') || '')
  const [prompt, setPrompt] = useState(EXAMPLES[0].prompt)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [showWalkthrough, setShowWalkthrough] = useState(true)
  const [workStatus, setWorkStatus] = useState('')
  const [copyStatus, setCopyStatus] = useState('')

  async function refreshRuntime() {
    setChecking(true)
    try {
      const health = await checkOllama()
      const telemetry = health.connected ? await getOllamaMetrics().catch(() => null) : null
      const result = combineAgentRuntime(health, telemetry)
      setRuntime(result)
      setModel((current) => result.installedModels?.some((item) => item.name === current)
        ? current
        : result.installedModels?.find((item) => item.name === 'qwen2.5:3b')?.name
          || result.installedModels?.[0]?.name
          || '')
    } catch {
      setRuntime({ connected: false, installedModels: [], runningModels: [] })
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    refreshRuntime()
    const timer = window.setInterval(refreshRuntime, 15000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (model) localStorage.setItem('electralab-ollama-model', model)
  }, [model])

  async function runExample(event) {
    event.preventDefault()
    if (!runtime?.connected || !model || !prompt.trim() || running) return
    setRunning(true)
    setError('')
    setAnswer('')
    setCopyStatus('')
    setWorkStatus('Connecting to the selected local model…')
    const startedAt = performance.now()
    let partialAnswer = ''
    try {
      const result = await askOllamaStream({
        model,
        messages: [{ role: 'user', content: prompt.trim() }],
        context: '',
        walkthrough: showWalkthrough,
        onStarted: () => setWorkStatus('The model is generating the learner-facing walkthrough…'),
        onToken: (token) => {
          partialAnswer += token
          setAnswer((current) => current + token)
        },
      })
      const metrics = getInferenceMetrics(result, [{ role: 'user', content: prompt.trim() }], '', performance.now() - startedAt)
      setAnswer(result.message)
      onInference({ model: result.model, ...metrics, timestamp: new Date().toISOString() })
      setWorkStatus('Walkthrough complete.')
    } catch (requestError) {
      setError(requestError.message)
      setWorkStatus(partialAnswer ? 'The stream stopped early; partial work is shown.' : '')
    } finally {
      setRunning(false)
      refreshRuntime()
    }
  }

  async function copyAnswer() {
    if (!answer) return
    try {
      await navigator.clipboard.writeText(answer)
      setCopyStatus('Agent output copied.')
    } catch {
      setCopyStatus('Clipboard access failed. Select the output and copy it manually.')
    }
  }

  const lastInference = inferenceHistory[0]
  return (
    <div className="agent-page">
      <div className="page-title-row">
        <div><p className="eyebrow">LOCAL MODEL CONTROL ROOM</p><h1>AI performance <em>workbench.</em></h1><p className="page-description">Inspect Ollama runtime health, measure inference, and experiment with calculus and matrices.</p></div>
        <span className={`level-chip agent-status ${runtime?.connected ? 'connected' : 'offline'}`}><span className="tutor-connection-dot" />{checking ? 'Refreshing metrics' : runtime?.connected ? 'Local runtime connected' : 'Ollama unavailable'}</span>
      </div>

      <section className="agent-metric-grid" aria-label="Ollama runtime overview">
        <AgentMetric label="Ollama version" value={runtime?.version || '—'} note={runtime?.telemetryAvailable ? 'Local runtime' : 'Runtime details unavailable'} />
        <AgentMetric label="Installed models" value={runtime?.installedModelCount ?? '—'} note="Chat-capable models" />
        <AgentMetric label="Models in memory" value={runtime?.telemetryAvailable ? runtime.runningModelCount : '—'} note={runtime?.telemetryAvailable ? 'Currently loaded' : 'Runtime details unavailable'} />
        <AgentMetric label="Latest generation" value={lastInference?.tokensPerSecond ? `${lastInference.metricsSource === 'estimate' ? '≈' : ''}${lastInference.tokensPerSecond.toFixed(1)} tok/s` : '—'} note={lastInference ? `${lastInference.completionTokens} ${lastInference.metricsSource === 'estimate' ? 'estimated ' : ''}output tokens` : 'Run a local inference'} />
      </section>

      <section className="agent-model-panel">
        <div className="agent-section-heading"><div><p className="eyebrow">RUNTIME TELEMETRY</p><h2>Models currently running</h2></div><button className="button button-subtle" onClick={refreshRuntime} disabled={checking}>{checking ? 'Refreshing…' : 'Refresh metrics'}</button></div>
        {!runtime?.telemetryAvailable && runtime?.connected && <p className="agent-telemetry-warning">Ollama is available for tutoring. Detailed running-model telemetry is temporarily unavailable; the local calculator and inference playground remain ready.</p>}
        {runtime?.runningModels?.length ? <div className="agent-model-list">{runtime.runningModels.map((item) => { const vramShare = item.sizeBytes ? Math.min(100, Math.round(item.vramBytes / item.sizeBytes * 100)) : 0; return <article className="agent-model-row" key={`${item.name}-${item.expiresAt}`}><span className="agent-model-dot" /><div className="agent-model-name"><strong>{item.name}</strong><small>{[item.parameterSize, item.family, item.quantization, item.format].filter(Boolean).join(' · ') || 'Loaded in local Ollama memory'}</small></div><div className="agent-model-stat"><small>MODEL SIZE</small><strong>{formatBytes(item.sizeBytes)}</strong></div><div className="agent-model-stat"><small>VRAM</small><strong>{formatBytes(item.vramBytes)}</strong></div><div className="agent-model-stat"><small>CONTEXT</small><strong>{item.contextLength ? `${item.contextLength.toLocaleString()} tokens` : '—'}</strong></div><div className="agent-model-stat"><small>GPU RESIDENT</small><strong>{vramShare}%</strong></div><div className="agent-model-stat"><small>EXPIRES</small><strong>{item.expiresAt ? new Date(item.expiresAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}</strong></div></article> })}</div> : <div className="agent-empty-models"><span className="agent-pulse" /><p>{runtime?.connected ? runtime.telemetryAvailable ? 'No model is currently loaded. Run a tutor request to load one.' : 'No runtime model list yet. You can still run an inference to refresh the metrics.' : 'Start Ollama locally to see model runtime and memory metrics.'}</p></div>}
      </section>

      <div className="agent-workbench-grid">
        <section className="agent-playground">
          <div className="agent-section-heading"><div><p className="eyebrow">LOCAL INFERENCE PLAYGROUND</p><h2>Run an agent example</h2></div><span className="agent-local-badge">127.0.0.1 · local only</span></div>
          <div className="agent-example-chips" aria-label="Example prompts">{EXAMPLES.map((example) => <button key={example.label} className="agent-example-chip" onClick={() => setPrompt(example.prompt)}>{example.label}</button>)}</div>
          <form onSubmit={runExample} className="agent-prompt-form"><label className="solver-label" htmlFor="agent-prompt">Prompt for the selected local model</label><textarea id="agent-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={4000} rows={3} placeholder="Try a calculus or matrix question…" /><div className="agent-prompt-controls"><select value={model} onChange={(event) => setModel(event.target.value)} disabled={!runtime?.installedModels?.length} aria-label="Choose a local model">{runtime?.installedModels?.length ? runtime.installedModels.map((item) => <option key={item.name} value={item.name}>{item.name}</option>) : <option value="">No model installed</option>}</select><button className="button button-primary" type="submit" disabled={!runtime?.connected || !model || !prompt.trim() || running}>{running ? 'Streaming solution…' : 'Run inference'} <AgentIcon name="arrow" /></button></div><label className="agent-walkthrough-toggle"><input type="checkbox" checked={showWalkthrough} onChange={(event) => setShowWalkthrough(event.target.checked)} /> Show learner-facing work as it is generated</label></form>
          {error && <p className="solver-error" role="alert">{error}</p>}
          {running && !answer && <p className="agent-stream-status" role="status">{workStatus}</p>}
          {answer && <div className="agent-answer"><div className="agent-answer-heading"><div><strong>Model response</strong><span className="agent-answer-model">{model} · local</span></div><div className="agent-answer-tools">{lastInference && !running && <InferenceMeter metrics={lastInference} />}<button className="agent-copy-output" onClick={copyAnswer} aria-label="Copy Agent output"><AgentIcon name="copy" /> Copy output</button></div></div>{showWalkthrough && <WalkthroughProgress answer={answer} running={running} workStatus={workStatus} />}<div className="agent-answer-live" aria-live={running ? 'off' : 'polite'}><MathContent className="agent-answer-content" content={answer} /></div>{copyStatus && <p className="agent-copy-status" role="status">{copyStatus}</p>}</div>}
        </section>
        <section className="agent-history-panel">
          <div className="agent-section-heading"><div><p className="eyebrow">INFERENCE HISTORY</p><h2>Recent performance</h2></div></div>
          {inferenceHistory.length ? <div className="agent-history-list">{inferenceHistory.slice(0, 6).map((item, index) => <div className="agent-history-row" key={`${item.timestamp}-${index}`}><span className="agent-history-model">{item.model}</span><InferenceMeter metrics={item} /><time>{new Date(item.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div>)}</div> : <div className="agent-history-empty"><span>↗</span><p>Run a prompt to record local inference metrics.</p></div>}
        </section>
      </div>

      <section className="agent-labs">
        <div className="agent-section-heading"><div><p className="eyebrow">INTERACTIVE MATH TOOLS</p><h2>Try the math yourself</h2></div><button className="text-link" onClick={() => onOpenScratch('AI Performance workbench: I am exploring a calculus or matrix example.')}>Open scratch pad <AgentIcon name="pencil" /></button></div>
        <div className="agent-lab-grid"><CalculusLab /><MatrixLab /></div>
      </section>
    </div>
  )
}

function AgentMetric({ label, value, note }) {
  return <article className="agent-metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>
}

function InferenceMeter({ metrics }) {
  const rate = Number(metrics.tokensPerSecond) || 0
  const fill = Math.max(4, Math.min(100, rate / 80 * 100))
  const generation = Number.isFinite(metrics.evaluationDurationMs) ? `${Math.round(metrics.evaluationDurationMs)} ms gen` : 'gen time n/a'
  const promptRate = Number(metrics.promptTokensPerSecond) || 0
  const promptWork = Number.isFinite(metrics.promptEvaluationDurationMs) ? `${Math.round(metrics.promptEvaluationDurationMs)} ms prompt` : 'prompt time n/a'
  const modelLoad = Number.isFinite(metrics.modelLoadDurationMs) ? `${Math.round(metrics.modelLoadDurationMs)} ms model load` : 'model load n/a'
  const approximate = metrics.metricsSource === 'estimate'
  return <div className={`inference-meter ${approximate ? 'estimated' : ''}`} title={approximate ? 'Estimated from response length and end-to-end request time; restart the local tutor API for exact Ollama token metrics.' : `${metrics.promptTokens} prompt tokens (${promptRate.toFixed(1)} tok/s), ${metrics.completionTokens} generated tokens (${rate.toFixed(1)} tok/s), ${promptWork}, ${generation}, ${modelLoad}, ${formatDuration(metrics.totalDurationMs)} total`}>
    <span className="inference-meter-track" aria-hidden="true"><i style={{ width: `${fill}%` }} /></span>
    <strong>{rate ? `${approximate ? '≈' : ''}${rate.toFixed(1)} tok/s` : '— tok/s'}</strong>
    <small>{metrics.promptTokens || 0} in · {metrics.completionTokens || 0} out · {approximate ? 'estimated from response length' : `${generation} · ${formatDuration(metrics.totalDurationMs)} total`}</small>
    <details className="agent-inference-details"><summary>Metrics</summary><span>{metrics.totalTokens || 0} total tokens · prompt {promptRate.toFixed(1)} tok/s · {promptWork} · {modelLoad}</span></details>
  </div>
}

function CalculusLab() {
  const [operation, setOperation] = useState('Derivatives')
  const [coefficient, setCoefficient] = useState('3')
  const [power, setPower] = useState('2')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  function calculate(event) {
    event.preventDefault()
    try {
      const input = `${coefficient}x^${power}`
      setResult(solveMathInput(operation, input))
      setError('')
    } catch (calculationError) {
      setResult(null)
      setError(calculationError.message)
    }
  }

  return <section className="math-lab-card"><div className="math-lab-heading"><span className="math-lab-symbol">ƒ′</span><div><p className="eyebrow">CALCULUS PLAYGROUND</p><h3>Power rule explorer</h3></div></div><p className="math-lab-description">Change the coefficient and exponent, then calculate a derivative or integral.</p><form className="calculus-controls" onSubmit={calculate}><label>Coefficient<input type="number" value={coefficient} onChange={(event) => setCoefficient(event.target.value)} step="any" /></label><span className="calculus-times">× x</span><label>Power<input type="number" value={power} onChange={(event) => setPower(event.target.value)} min="0" max="12" step="1" /></label><select aria-label="Calculus operation" value={operation} onChange={(event) => setOperation(event.target.value)}><option>Derivatives</option><option>Integrals</option></select><button className="button button-primary" type="submit">Calculate</button></form>{error && <p className="solver-error">{error}</p>}{result && <div className="math-lab-result"><MathDisplay value={result.answer} /><MathContent className="math-lab-steps" content={result.steps.join('\n')} /></div>}</section>
}

function MatrixLab() {
  const [first, setFirst] = useState([1, 2, 3, 4])
  const [second, setSecond] = useState([5, 6, 7, 8])
  const [operation, setOperation] = useState('add')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  function updateMatrix(setMatrix, values, index, value) {
    setMatrix(values.map((current, currentIndex) => currentIndex === index ? value : current))
  }

  function calculate(event) {
    event.preventDefault()
    try {
      const output = operation === 'determinant'
        ? { scalar: determinant2x2(first) }
        : { matrix: operation === 'add' ? addMatrices(first, second) : multiplyMatrices(first, second) }
      setResult(output)
      setError('')
    } catch (calculationError) {
      setResult(null)
      setError(calculationError.message)
    }
  }

  return <section className="math-lab-card matrix-lab-card"><div className="math-lab-heading"><span className="math-lab-symbol">A²</span><div><p className="eyebrow">MATRIX PLAYGROUND</p><h3>2 × 2 matrix calculator</h3></div></div><p className="math-lab-description">Edit two matrices and explore addition, multiplication, or a determinant.</p><form onSubmit={calculate}><div className="matrix-inputs"><MatrixInputs label="Matrix A" values={first} onChange={(index, value) => updateMatrix(setFirst, first, index, value)} /><MatrixInputs label="Matrix B" values={second} onChange={(index, value) => updateMatrix(setSecond, second, index, value)} /></div><div className="matrix-actions"><select aria-label="Matrix operation" value={operation} onChange={(event) => setOperation(event.target.value)}><option value="add">A + B</option><option value="multiply">A × B</option><option value="determinant">det(A)</option></select><button className="button button-primary" type="submit">Calculate</button></div></form>{error && <p className="solver-error">{error}</p>}{result && <div className="matrix-result"><p className="eyebrow">RESULT</p>{result.matrix ? <MathDisplay latex={formatMatrixLatex(result.matrix)} /> : <MathDisplay latex={`\\det(A) = ${result.scalar}`} />}</div>}</section>
}

function MatrixInputs({ label, values, onChange }) {
  const symbol = label.endsWith('A') ? 'a' : 'b'
  return <fieldset className="matrix-input-group"><legend>{label}</legend><div className="matrix-input-grid">{values.map((value, index) => <label key={index} className="matrix-input-field"><span className="sr-only">{label} row {Math.floor(index / 2) + 1}, column {index % 2 + 1}</span><span aria-hidden="true">{symbol}<sub>{Math.floor(index / 2) + 1}{index % 2 + 1}</sub></span><input type="number" value={value} onChange={(event) => onChange(index, event.target.value)} step="any" /></label>)}</div></fieldset>
}

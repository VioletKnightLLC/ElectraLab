import { useEffect, useMemo, useState } from 'react'
import {
  evaluateCalculatorExpression,
  MAX_CALCULATOR_HISTORY,
  normalizeCalculatorHistory,
  prependCalculatorHistory,
} from './calculator.js'

const MODES = [
  { id: 'basic', label: 'Basic', mark: '＋', detail: 'Everyday arithmetic' },
  { id: 'scientific', label: 'Scientific', mark: 'ƒ', detail: 'Functions and trig' },
  { id: 'graphing', label: 'Graphing', mark: '∿', detail: 'See how a function behaves' },
]

const GUIDES = {
  basic: {
    how: 'Enter numbers with the operation buttons or keyboard. Parentheses let you group work; multiplication and division happen before addition and subtraction.',
    why: 'A basic layout keeps the most common operations visible, so you can focus on estimating, checking, and understanding the steps.',
    when: 'Use it for quick arithmetic, ratios, unit conversions, and checking a result after you have estimated what it should be.',
  },
  scientific: {
    how: 'Choose DEG for angles in degrees or RAD for radians. Use functions such as sin(30), ln(e), √(x), powers, factorials, and π.',
    why: 'Scientific calculators evaluate functions and expressions that appear in algebra, physics, electronics, and calculus.',
    when: 'Reach for it when a problem uses trigonometry, logarithms, roots, scientific notation, or repeated operations.',
  },
  graphing: {
    how: 'Enter a function of x, such as sin(x) or x^2 - 4. The plot samples the function across the selected x-range; the vertical window is shown on the axes.',
    why: 'A graph makes behavior visible: intercepts, turning points, periodic patterns, and regions where a model grows or falls.',
    when: 'Use it to explore a function before solving, compare models, estimate roots, or check whether an algebraic answer makes sense.',
  },
}

const PRACTICE = {
  basic: [
    { prompt: 'Evaluate 18 ÷ 3 + 2.', options: ['4', '6', '8', '12'], answer: '8', note: 'Division comes first: 18 ÷ 3 = 6, then add 2.' },
    { prompt: 'What is 15% of 80?', options: ['8', '12', '15', '20'], answer: '12', note: '15% is 0.15, and 0.15 × 80 = 12.' },
    { prompt: 'Evaluate (7 + 5) × 3.', options: ['26', '30', '36', '42'], answer: '36', note: 'Parentheses first: 7 + 5 = 12, then 12 × 3 = 36.' },
  ],
  scientific: [
    { prompt: 'In DEG mode, what is sin(30)?', options: ['0', '0.5', '1', '√3'], answer: '0.5', note: 'A 30° angle has sine 1/2.' },
    { prompt: 'What is log₁₀(1000)?', options: ['2', '3', '10', '100'], answer: '3', note: '10³ = 1000, so the base-10 logarithm is 3.' },
    { prompt: 'Evaluate √(3² + 4²).', options: ['4', '5', '7', '25'], answer: '5', note: '3² + 4² = 25, and √25 = 5.' },
  ],
  graphing: [
    { prompt: 'Where does y = x² - 4 cross the x-axis?', options: ['0 and 4', '−2 and 2', '−4 and 4', '−2 only'], answer: '−2 and 2', note: 'Set y to zero: x² = 4, so x = −2 or x = 2.' },
    { prompt: 'What is the y-intercept of y = 2x + 3?', options: ['−2', '0', '2', '3'], answer: '3', note: 'At x = 0, y = 3.' },
    { prompt: 'Which shape best describes y = sin(x)?', options: ['A straight line', 'A repeating wave', 'A V shape', 'A circle'], answer: 'A repeating wave', note: 'Sine repeats its values in a smooth periodic wave.' },
  ],
}

const BASIC_KEYS = [
  [['AC', 'AC', 'clear'], ['DEL', 'DEL', 'action'], ['%', '%', 'action'], ['÷', '÷', 'operator']],
  [['7', '7'], ['8', '8'], ['9', '9'], ['×', '×', 'operator']],
  [['4', '4'], ['5', '5'], ['6', '6'], ['−', '−', 'operator']],
  [['1', '1'], ['2', '2'], ['3', '3'], ['+', '+', 'operator']],
  [['±', '±', 'action'], ['0', '0'], ['.', '.'], ['=', '=', 'equals']],
]

const SCIENTIFIC_KEYS = [
  [['sin', 'sin(', 'function'], ['cos', 'cos(', 'function'], ['tan', 'tan(', 'function'], ['√', 'sqrt(', 'function'], ['xʸ', '^', 'function']],
  [['ln', 'ln(', 'function'], ['log', 'log(', 'function'], ['π', 'pi', 'function'], ['e', 'e', 'function'], ['!', '!', 'function']],
  [['sin⁻¹', 'asin(', 'function'], ['cos⁻¹', 'acos(', 'function'], ['%', '%', 'function'], ['(', '(', 'action'], [')', ')', 'action']],
]

function safeSavedMode() {
  try {
    const saved = localStorage.getItem('electralab-calculator-mode')
    return MODES.some((mode) => mode.id === saved) ? saved : 'basic'
  } catch {
    return 'basic'
  }
}

function safeSavedValue(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function safeSavedHistory() {
  try {
    const saved = localStorage.getItem('electralab-calculator-history')
    return normalizeCalculatorHistory(saved ? JSON.parse(saved) : [])
  } catch {
    return []
  }
}

function formatNumber(value) {
  if (Object.is(value, -0)) return '0'
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(11)))
}

export default function CalculatorPage({ onAskTutor }) {
  const [mode, setMode] = useState(safeSavedMode)
  const [expression, setExpression] = useState(() => safeSavedValue('electralab-calculator-expression', ''))
  const [answer, setAnswer] = useState(() => safeSavedValue('electralab-calculator-answer', '') || null)
  const [error, setError] = useState('')
  const [angleMode, setAngleMode] = useState(() => safeSavedValue('electralab-calculator-angle', 'DEG'))
  const [graphAngleMode, setGraphAngleMode] = useState(() => safeSavedValue('electralab-calculator-graph-angle', 'RAD'))
  const [graphExpression, setGraphExpression] = useState(() => safeSavedValue('electralab-calculator-graph', 'sin(x)'))
  const [xMin, setXMin] = useState(() => safeSavedValue('electralab-calculator-x-min', '-10'))
  const [xMax, setXMax] = useState(() => safeSavedValue('electralab-calculator-x-max', '10'))
  const [history, setHistory] = useState(safeSavedHistory)

  useEffect(() => {
    try {
      localStorage.setItem('electralab-calculator-mode', mode)
    } catch {
      // The calculator remains usable when browser storage is unavailable.
    }
  }, [mode])

  useEffect(() => {
    for (const [key, value] of [
      ['electralab-calculator-expression', expression],
      ['electralab-calculator-answer', answer ?? ''],
      ['electralab-calculator-angle', angleMode],
      ['electralab-calculator-graph-angle', graphAngleMode],
      ['electralab-calculator-graph', graphExpression],
      ['electralab-calculator-x-min', xMin],
      ['electralab-calculator-x-max', xMax],
    ]) {
      try {
        localStorage.setItem(key, value)
      } catch {
        // In-memory calculator work remains available for the current session.
      }
    }
  }, [angleMode, answer, expression, graphAngleMode, graphExpression, xMax, xMin])

  useEffect(() => {
    try {
      localStorage.setItem('electralab-calculator-history', JSON.stringify(history))
    } catch {
      // History remains available in memory for the current session.
    }
  }, [history])

  function calculate() {
    try {
      const result = formatNumber(evaluateCalculatorExpression(expression, { angleMode }))
      const timestamp = Date.now()
      setAnswer(result)
      setError('')
      setHistory((current) => prependCalculatorHistory(current, {
        id: `${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
        expression: expression.trim(),
        result,
        mode,
        angleMode: mode === 'scientific' ? angleMode : null,
        timestamp,
      }))
    } catch (calculationError) {
      setAnswer(null)
      setError(calculationError.message)
    }
  }

  function restoreCalculation(item) {
    setMode(item.mode)
    if (item.angleMode) setAngleMode(item.angleMode)
    setExpression(item.expression)
    setAnswer(item.result)
    setError('')
  }

  function appendKey(value) {
    if (value === 'AC') {
      setExpression('')
      setAnswer(null)
      setError('')
      return
    }
    if (value === 'DEL') {
      setExpression((current) => current.slice(0, -1))
      setAnswer(null)
      setError('')
      return
    }
    if (value === '=') {
      calculate()
      return
    }
    if (value === '±') {
      setExpression((current) => current.startsWith('-(') && current.endsWith(')')
        ? current.slice(2, -1)
        : current ? `-(${current})` : '-')
      setAnswer(null)
      setError('')
      return
    }
    setExpression((current) => `${current}${value}`)
    setAnswer(null)
    setError('')
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === '=') {
      event.preventDefault()
      calculate()
    } else if (event.key === 'Escape') {
      setExpression('')
      setAnswer(null)
      setError('')
    }
  }

  const tutorQuestion = `I am learning when and how to use a ${mode} calculator.${expression ? ` My current expression is ${expression}${answer ? ` and the result is ${answer}` : ''}.` : ''} Explain the key idea and give me one guided example.`
  const modeInfo = MODES.find((item) => item.id === mode)

  return (
    <div className="calculator-page">
      <header className="calculator-page-heading">
        <div><p className="eyebrow">A TOOL FOR THINKING</p><h1>Calculator <em>lab</em></h1><p>Choose a layout, explore what it can do, then practice using it with purpose.</p></div>
        <span className="calculator-local-mark">∑ <small>OFFLINE READY</small></span>
      </header>

      <nav className="calculator-mode-select" aria-label="Calculator layout">
        {MODES.map((item) => <button key={item.id} type="button" className={`calculator-mode-tab ${mode === item.id ? 'active' : ''}`} aria-pressed={mode === item.id} onClick={() => { setMode(item.id); setError('') }}>
          <span className="calculator-mode-mark">{item.mark}</span><span><strong>{item.label}</strong><small>{item.detail}</small></span>
        </button>)}
      </nav>

      <div className={`calculator-workspace ${mode === 'graphing' ? 'graphing-mode' : ''}`}>
        {mode !== 'graphing' ? <section className="calculator-device" aria-label={`${modeInfo.label} calculator`}>
          <div className="calculator-display">
            <span className="calculator-display-mode">{modeInfo.label} · {mode === 'scientific' ? angleMode : 'READY'}</span>
            <input aria-label="Calculator expression" value={expression} onChange={(event) => { setExpression(event.target.value); setAnswer(null); setError('') }} onKeyDown={handleKeyDown} placeholder="0" inputMode="decimal" autoComplete="off" />
            <output aria-live="polite">{answer !== null ? `= ${answer}` : ' '}</output>
            {error && <span className="calculator-error" role="status">{error}</span>}
          </div>
          {mode === 'scientific' && <div className="calculator-scientific-tools"><span>Angle unit</span><div role="group" aria-label="Trigonometry angle unit"><button type="button" aria-pressed={angleMode === 'DEG'} className={angleMode === 'DEG' ? 'selected' : ''} onClick={() => setAngleMode('DEG')}>DEG</button><button type="button" aria-pressed={angleMode === 'RAD'} className={angleMode === 'RAD' ? 'selected' : ''} onClick={() => setAngleMode('RAD')}>RAD</button></div></div>}
          {mode === 'scientific' && <div className="calculator-key-grid scientific-keys">{SCIENTIFIC_KEYS.flat().map(([label, value, kind]) => <button key={label} type="button" className={`calculator-key ${kind}`} onClick={() => appendKey(value)}>{label}</button>)}</div>}
          <div className="calculator-key-grid">{BASIC_KEYS.flat().map(([label, value, kind = '']) => <button key={label} type="button" className={`calculator-key ${kind}`} onClick={() => appendKey(value)}>{label}</button>)}</div>
          <p className="calculator-key-hint">Keyboard ready · Enter calculates · Esc clears</p>
        </section> : <GraphingCalculator expression={graphExpression} setExpression={setGraphExpression} xMin={xMin} setXMin={setXMin} xMax={xMax} setXMax={setXMax} angleMode={graphAngleMode} setAngleMode={setGraphAngleMode} />}

        <aside className="calculator-purpose-card">
          <span className="calculator-purpose-symbol">{modeInfo.mark}</span>
          <p className="eyebrow">CURRENT LOADOUT</p>
          <h2>{modeInfo.label}, with intention.</h2>
          <p>{modeInfo.detail}. The calculator is a check on your reasoning—not a substitute for deciding what the problem is asking.</p>
          <div className="calculator-caution"><strong>Good habit</strong><span>Estimate the size and sign of your answer before you calculate. Then compare.</span></div>
          <button className="button button-primary calculator-tutor-button" onClick={() => onAskTutor(tutorQuestion)}>Ask local tutor <span aria-hidden="true">↗</span></button>
          <small className="calculator-local-note">Your question opens the Ollama Tutor with this calculator context.</small>
        </aside>
      </div>

      <CalculatorHistory history={history} onReuse={restoreCalculation} onClear={() => setHistory([])} />

      <section className="calculator-learning-section">
        <div className="calculator-section-heading"><div><p className="eyebrow">USE THE TOOL, NOT JUST THE BUTTONS</p><h2>How, why, and when</h2></div><span>{modeInfo.label} layout</span></div>
        <div className="calculator-lesson-grid">
          {[['HOW IT WORKS', GUIDES[mode].how], ['WHY IT HELPS', GUIDES[mode].why], ['WHEN TO USE IT', GUIDES[mode].when]].map(([label, text], index) => <article className="calculator-lesson-card" key={label}><span className="calculator-lesson-index">0{index + 1}</span><p className="eyebrow">{label}</p><p>{text}</p></article>)}
        </div>
      </section>

      <PracticeSet key={mode} mode={mode} />
    </div>
  )
}

function CalculatorHistory({ history, onReuse, onClear }) {
  return <section className="calculator-history-card" aria-labelledby="calculator-history-title">
    <div className="calculator-history-heading">
      <div>
        <p className="eyebrow">RECENT CALCULATIONS · SAVED ON THIS DEVICE</p>
        <h2 id="calculator-history-title">History <span>{history.length}</span></h2>
      </div>
      <button type="button" className="calculator-history-clear" onClick={onClear} disabled={!history.length}>Clear history</button>
    </div>
    {history.length ? <ol className="calculator-history-list">
      {history.map((item) => <li key={item.id}>
        <button type="button" className="calculator-history-entry" onClick={() => onReuse(item)} aria-label={`Reuse ${item.expression}, result ${item.result}`}>
          <span className="calculator-history-equation"><span>{item.expression}</span><strong>= {item.result}</strong></span>
          <span className="calculator-history-meta">
            <span>{item.mode === 'scientific' ? `Scientific · ${item.angleMode || 'DEG'}` : 'Basic'}</span>
            <time dateTime={new Date(item.timestamp).toISOString()}>{new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(item.timestamp)}</time>
          </span>
        </button>
      </li>)}
    </ol> : <p className="calculator-history-empty">Your successful calculations will appear here. Select one to bring it back to the display.</p>}
    {history.length === MAX_CALCULATOR_HISTORY && <p className="calculator-history-cap">Showing the latest {MAX_CALCULATOR_HISTORY} calculations.</p>}
  </section>
}

function GraphingCalculator({ expression, setExpression, xMin, setXMin, xMax, setXMax, angleMode, setAngleMode }) {
  const min = Number(xMin)
  const max = Number(xMax)
  const validRange = Number.isFinite(min) && Number.isFinite(max) && max > min
  const path = useMemo(() => {
    if (!validRange || !expression.trim()) return ''
    const width = 720
    const height = 320
    const points = []
    for (let index = 0; index <= 480; index += 1) {
      const x = min + (max - min) * index / 480
      try {
        const y = evaluateCalculatorExpression(expression, { angleMode, x })
        if (!Number.isFinite(y) || Math.abs(y) > 50) {
          points.push('break')
          continue
        }
        const px = 48 + index / 480 * (width - 68)
        const py = 14 + (10 - Math.max(-10, Math.min(10, y))) / 20 * (height - 42)
        points.push(`${points.at(-1) === 'break' || !points.length ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`)
      } catch {
        points.push('break')
      }
    }
    return points.filter((point) => point !== 'break').join(' ')
  }, [angleMode, expression, max, min, validRange])

  return <section className="calculator-graph-card">
    <div className="calculator-graph-heading"><div><p className="eyebrow">FUNCTION PLOTTER</p><h2>Graph a relationship</h2></div><div className="calculator-angle-tools" role="group" aria-label="Graph angle unit"><button type="button" className={angleMode === 'DEG' ? 'selected' : ''} aria-pressed={angleMode === 'DEG'} onClick={() => setAngleMode('DEG')}>DEG</button><button type="button" className={angleMode === 'RAD' ? 'selected' : ''} aria-pressed={angleMode === 'RAD'} onClick={() => setAngleMode('RAD')}>RAD</button></div></div>
    <label className="calculator-graph-expression">y = <input aria-label="Function of x to graph" value={expression} onChange={(event) => setExpression(event.target.value)} placeholder="sin(x) or x^2 - 4" /></label>
    <div className="calculator-graph-range"><label>x minimum<input type="number" value={xMin} onChange={(event) => setXMin(event.target.value)} /></label><label>x maximum<input type="number" value={xMax} onChange={(event) => setXMax(event.target.value)} /></label><span>y range: −10 to 10</span></div>
    {!validRange && <p className="calculator-error" role="alert">Set a valid x-range where the maximum is greater than the minimum.</p>}
    <div className="calculator-plot-wrap"><svg className="calculator-plot" viewBox="0 0 720 320" role="img" aria-label={`Graph of y equals ${expression || 'the entered function'}`}>
      {Array.from({ length: 11 }, (_, index) => <g key={`grid-${index}`}><line x1={48 + index * 60} y1="14" x2={48 + index * 60} y2="278" /><line x1="48" y1={14 + index * 26.4} x2="700" y2={14 + index * 26.4} /></g>)}
      <line className="calculator-axis" x1={validRange && min <= 0 && max >= 0 ? 48 + (0 - min) / (max - min) * 652 : 48} y1="14" x2={validRange && min <= 0 && max >= 0 ? 48 + (0 - min) / (max - min) * 652 : 48} y2="278" />
      <line className="calculator-axis" x1="48" y1="146" x2="700" y2="146" />
      <path className="calculator-plot-line" d={path} />
      <text x="703" y="146">x</text><text x="52" y="18">y</text>
      <text x="48" y="300">{validRange ? formatNumber(min) : 'min'}</text><text x="680" y="300">{validRange ? formatNumber(max) : 'max'}</text>
    </svg></div>
    <p className="calculator-plot-note">The plot is a visual estimate over the selected range; use algebra or a solver to verify exact roots.</p>
  </section>
}

function PracticeSet({ mode }) {
  const [answers, setAnswers] = useState({})
  const questions = PRACTICE[mode]
  return <section className="calculator-practice-section">
    <div className="calculator-section-heading"><div><p className="eyebrow">THREE QUICK CHECKS</p><h2>Practice with the {mode} layout</h2></div><span>Choose an answer to see why</span></div>
    <div className="calculator-practice-grid">{questions.map((question, index) => {
      const selected = answers[index]
      const checked = selected !== undefined
      return <article className={`calculator-practice-card ${checked ? selected === question.answer ? 'correct' : 'incorrect' : ''}`} key={question.prompt}>
        <span className="calculator-practice-number">0{index + 1}</span><h3>{question.prompt}</h3>
        <div className="calculator-practice-options">{question.options.map((option) => <button key={option} type="button" className={selected === option ? 'selected' : ''} aria-pressed={selected === option} onClick={() => setAnswers((current) => ({ ...current, [index]: option }))}>{option}</button>)}</div>
        {checked && <p className="calculator-practice-feedback" role="status"><strong>{selected === question.answer ? 'That’s right.' : 'Not quite.'}</strong> {question.note}</p>}
      </article>
    })}</div>
  </section>
}

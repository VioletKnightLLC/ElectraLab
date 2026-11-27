import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { createAppliedProblem, createProblem, solveMathInput } from './math.js'
import { prepareMathPreviewContent } from './math-markdown.js'
import { askOllamaStream, checkOllama, getInferenceMetrics, normalizeTutorResponse } from './ollama.js'
import NotationZoomLayer from './NotationZoomLayer.jsx'
import ScratchPad from './ScratchPad.jsx'
import MathNotationPicker from './MathNotationPicker.jsx'
import CalculatorPage from './CalculatorPage.jsx'

async function loadElectraData() {
  try {
    const response = await fetch('/src/data/electra_data.json')
    if (response.ok) return response.json()
  } catch {
    // Fallback to embedded data if fetch fails
  }
  return null
}

const FALLBACK_NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'coursebook', label: 'Coursebook', icon: 'book' },
  { id: 'vocabulary', label: 'Vocabulary', icon: 'dictionary' },
  { id: 'solver', label: 'The Solver', icon: 'spark' },
  { id: 'calculator', label: 'Calculator', icon: 'calculator' },
  { id: 'tutor', label: 'Physics Tutor', icon: 'chat' },
  { id: 'agent', label: 'AI Performance', icon: 'agent' },
  { id: 'scratch', label: 'Scratch pad', icon: 'pencil' },
  { id: 'applied', label: 'The Lab', icon: 'bolt' },
  { id: 'practice', label: 'Practice', icon: 'spark' },
  { id: 'quizzes', label: 'Quizzes', icon: 'clipboard' },
  { id: 'progress', label: 'My progress', icon: 'chart' },
]

const FALLBACK_SKILLS = [
  { name: "Ohm's Law", detail: 'V = I R', icon: 'Ω', tone: 'blue', progress: 0 },
  { name: 'Power', detail: 'P = V I = I²R = V²/R', icon: 'P', tone: 'mint', progress: 0 },
  { name: 'Series/Parallel', detail: 'Equivalent resistance', icon: '∥', tone: 'peach', progress: 0 },
  { name: 'Drift Velocity', detail: 'I = n A e v_d', icon: 'v_d', tone: 'lavender', progress: 0 },
  { name: 'Carrier Concentration', detail: 'n p = n_i²', icon: 'n,p', tone: 'orange', progress: 0 },
  { name: 'Diode Equation', detail: 'I = I₀[e^(qV/nkT) - 1]', icon: 'I₀', tone: 'red', progress: 0 },
  { name: 'BJT Gains', detail: 'β = I_C/I_B, α = I_C/I_E', icon: 'β', tone: 'purple', progress: 0 },
  { name: 'JFET/MOSFET', detail: 'I_D = I_DSS(1 - V_GS/V_P)²', icon: 'I_D', tone: 'green', progress: 0 },
]

const FALLBACK_QUIZ_TOPICS = [
  { name: "Ohm's Law & Resistance", skill: "Ohm's Law", questions: 5, time: '5 min', icon: 'Ω', tone: 'blue' },
  { name: 'Drift Velocity & Current Density', skill: 'Drift Velocity', questions: 5, time: '5 min', icon: 'v_d', tone: 'mint' },
  { name: "Kirchhoff's Laws", skill: 'Series/Parallel', questions: 5, time: '5 min', icon: '∑', tone: 'peach' },
  { name: 'Semiconductor Doping', skill: 'Carrier Concentration', questions: 5, time: '5 min', icon: 'n,p', tone: 'lavender' },
  { name: 'PN Junction & Diodes', skill: 'Diode Equation', questions: 5, time: '5 min', icon: 'I₀', tone: 'red' },
  { name: 'BJT & FET Operation', skill: 'BJT Gains', questions: 5, time: '5 min', icon: 'β', tone: 'purple' },
]

const FALLBACK_APPLIED_FIELDS = [
  { name: 'Circuit Analysis', icon: '⚡', detail: "Analyze DC circuits using Ohm's Law, Kirchhoff's Laws, and equivalent resistance.", example: 'Multi-loop circuit', tone: 'blue' },
  { name: 'Semiconductor Devices', icon: '🔬', detail: 'Calculate carrier concentrations, diode currents, and transistor biasing.', example: 'Diode/transistor design', tone: 'mint' },
  { name: 'Electronic Design', icon: '📐', detail: 'Design simple amplifiers, switches, and voltage regulators.', example: 'Amplifier biasing', tone: 'lavender' },
]

const LazyMathDisplay = lazy(() => import('./MathDisplay.jsx').then((module) => ({ default: module.MathDisplay })))
const LazyMathContent = lazy(() => import('./MathContent.jsx'))
const LazyAgentPage = lazy(() => import('./AgentPage.jsx'))
const LazyCoursebookPage = lazy(() => import('./CoursebookPage.jsx'))
const LazyVocabularyPage = lazy(() => import('./VocabularyPage.jsx'))

const initialProgress = { records: [] }

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem('electralab-progress'))
    return saved && Array.isArray(saved.records) ? { ...initialProgress, ...saved } : initialProgress
  } catch {
    return initialProgress
  }
}

function loadInferenceHistory() {
  try {
    const history = JSON.parse(localStorage.getItem('electralab-inference-history'))
    return Array.isArray(history) ? history.slice(0, 30) : []
  } catch {
    return []
  }
}

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" /></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.8-3.2A7.5 7.5 0 1 1 20 11.5Z" /><path d="M9 11h.01M12.5 11h.01M16 11h.01" /></>,
    pencil: <><path d="m4 20 4.2-.9L19 8.3a2.1 2.1 0 0 0-3-3L5.2 16.1 4 20Z" /><path d="m14.5 6.5 3 3" /></>,
    agent: <><rect x="4" y="5" width="16" height="14" rx="3" /><path d="M9 9h6M9 13h3M8 2v3M16 2v3M8 19v3M16 19v3" /><circle cx="17" cy="13" r="1" /></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M4 5.5v16M8 7h8M8 11h8" /></>,
    dictionary: <><path d="M5 4h14v16H5z" /><path d="M9 8h6M9 12h6M9 16h3" /><path d="M3 6v14a2 2 0 0 0 2 2" /></>,
    calculator: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2M8 18h2M14 18h2" /></>,
    clipboard: <><rect x="5" y="5" width="14" height="16" rx="2" /><path d="M9 5.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5M9 11h6M9 15h6" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /><path d="M16 6h4v4" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    mic: <><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>,
    bolt: <path d="m13 2-3 8h7l-6 12 2-9H6l7-11Z" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    volume: <><path d="M4 10v4h4l5 4V6l-5 4H4Z" /><path d="M17 9a5 5 0 0 1 0 6M19.5 6.5a9 9 0 0 1 0 11" /></>,
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.spark}</svg>
}

function App() {
  const [electraData, setElectraData] = useState(null)
  const [page, setPage] = useState('overview')
  const [progress, setProgress] = useState(loadProgress)
  const [skill, setSkill] = useState("Ohm's Law")
  const [problem, setProblem] = useState(() => createProblem("Ohm's Law"))
  const [selected, setSelected] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [quiz, setQuiz] = useState(null)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState([])
  const [voiceMessage, setVoiceMessage] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [solverMode, setSolverMode] = useState("Ohm's Law")
  const [solverResult, setSolverResult] = useState(null)
  const [solverError, setSolverError] = useState('')
  const [tutorContext, setTutorContext] = useState('')
  const [tutorReturnPage, setTutorReturnPage] = useState('overview')
  const [scratchContext, setScratchContext] = useState('')
  const [scratchReturnPage, setScratchReturnPage] = useState('overview')
  const [appliedField, setAppliedField] = useState('Circuit Analysis')
  const [appliedProblem, setAppliedProblem] = useState(() => createAppliedProblem('Circuit Analysis'))
  const [appliedSelected, setAppliedSelected] = useState('')
  const [appliedFeedback, setAppliedFeedback] = useState(null)
  const [scratchModalOpen, setScratchModalOpen] = useState(false)
  const [calculatorModalOpen, setCalculatorModalOpen] = useState(false)
  const [inferenceHistory, setInferenceHistory] = useState(loadInferenceHistory)
  const [copiedMessage, setCopiedMessage] = useState(null)
  const [copyError, setCopyError] = useState('')
  const scratchUtilityRef = useRef(null)
  const calculatorUtilityRef = useRef(null)

  useEffect(() => {
    loadElectraData().then(data => {
      if (data) setElectraData(data)
    })
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('electralab-progress', JSON.stringify(progress))
    } catch {
      setVoiceMessage('Progress could not be saved in this browser.')
    }
  }, [progress])

  useEffect(() => {
    try {
      localStorage.setItem('electralab-inference-history', JSON.stringify(inferenceHistory))
    } catch {
      // Keep the running session usable if browser storage is full.
    }
  }, [inferenceHistory])

  useEffect(() => {
    if (!scratchModalOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function closeOnEscape(event) {
      if (event.key === 'Escape') closeScratchModal()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [scratchModalOpen])

  useEffect(() => {
    if (!calculatorModalOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function closeOnEscape(event) {
      if (event.key === 'Escape') closeCalculatorModal()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [calculatorModalOpen])

  const NAV_ITEMS = electraData?.navItems || FALLBACK_NAV_ITEMS
  const SKILLS = electraData?.solverSkills || FALLBACK_SKILLS
  const QUIZ_TOPICS = electraData?.quizTopics || FALLBACK_QUIZ_TOPICS
  const APPLIED_FIELDS = electraData?.appliedFields || FALLBACK_APPLIED_FIELDS

  const records = progress.records
  const practiceRecords = records.filter((record) => record.source !== 'solver')
  const accuracy = practiceRecords.length ? Math.round((practiceRecords.filter((record) => record.correct).length / practiceRecords.length) * 100) : 0
  const level = Math.min(5, Math.max(1, 1 + Math.floor(practiceRecords.filter((record) => record.correct).length / 3) - Math.floor(practiceRecords.filter((record) => !record.correct).length / 4)))
  const streak = calculateStreak(records)

  function startPractice(nextSkill = "Ohm's Law", asQuiz = false) {
    setSkill(nextSkill)
    setProblem(createProblem(nextSkill, level))
    setSelected('')
    setFeedback(null)
    setVoiceMessage('')
    setPage(asQuiz ? 'quizzes' : 'practice')
    setMobileNavOpen(false)
    if (asQuiz) {
      setQuiz({ skill: nextSkill, complete: false })
      setQuizIndex(0)
      setQuizAnswers([])
    } else {
      setQuiz(null)
    }
  }

  function saveAnswer(correct, currentProblem = problem, source = 'practice') {
    const record = {
      userId: 'local-learner',
      problem: `${currentProblem.prompt}: ${currentProblem.expression}`,
      solutionSteps: currentProblem.steps,
      correct,
      timestamp: new Date().toISOString(),
      skill: currentProblem.skill,
      field: currentProblem.field,
      expression: currentProblem.expression,
      mathLatex: currentProblem.mathLatex,
      source,
    }
    setProgress((previous) => ({ ...previous, records: [record, ...previous.records].slice(0, 100) }))
  }

  function submitAnswer() {
    if (!selected || feedback) return
    const correct = selected === problem.answer
    saveAnswer(correct)
    setFeedback({ correct, answer: problem.answer, steps: problem.steps })
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const message = correct ? `That's right. ${problem.steps.join(' ')}` : `Not quite. The answer is ${problem.answer}. ${problem.steps.join(' ')}`
      const utterance = new SpeechSynthesisUtterance(message)
      utterance.rate = 0.92
      window.speechSynthesis.speak(utterance)
    }
  }

  function solveProblem(input) {
    try {
      const result = solveMathInput(solverMode, input)
      setSolverResult({ ...result, input })
      setSolverError('')
      saveAnswer(true, { skill: result.skill, prompt: 'Solved', expression: input, steps: result.steps }, 'solver')
    } catch (error) {
      setSolverResult(null)
      setSolverError(error.message)
    }
  }

  function nextProblem() {
    setProblem(createProblem(skill, level))
    setSelected('')
    setFeedback(null)
    setVoiceMessage('')
  }

  function handleQuizAnswer() {
    if (!selected || quizIndex > 4) return
    const correct = selected === problem.answer
    saveAnswer(correct)
    const answers = [...quizAnswers, { correct, problem, selected }]
    setQuizAnswers(answers)
    if (quizIndex === 4) {
      setQuiz((current) => ({ ...current, complete: true }))
      return
    }
    setQuizIndex((index) => index + 1)
    setProblem(createProblem(skill, level))
    setSelected('')
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setVoiceMessage('Voice input is not available in this browser. You can still choose an answer below.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const spoken = event.results[0][0].transcript.toLowerCase()
      const letter = spoken.match(/\b(?:option|choice|answer)?\s*([a-d])\b/)
      const match = letter
        ? problem.options[letter[1].charCodeAt(0) - 97]
        : problem.options.find((option) => spoken.includes(option.toLowerCase()))
      if (match) {
        setSelected(match)
        setVoiceMessage(`Heard: "${event.results[0][0].transcript}"`)
      } else {
        setVoiceMessage('I didn\'t catch an answer letter. Try saying option A, B, C, or D.')
      }
    }
    recognition.onerror = () => setVoiceMessage('Voice input stopped. Select an answer or try again.')
    try {
      recognition.start()
      setVoiceMessage('Listening... say the answer letter, such as "option B."')
    } catch {
      setVoiceMessage('Voice input could not start. Select an answer below instead.')
    }
  }

  function navigate(nextPage) {
    setPage(nextPage)
    if (nextPage === 'scratch') {
      setScratchContext('')
      setScratchReturnPage(page)
    } else if (nextPage === 'tutor') {
      setTutorReturnPage(page)
    } else {
      setQuiz(null)
    }
    setMobileNavOpen(false)
  }

  function openTutor(context = '') {
    setScratchModalOpen(false)
    setCalculatorModalOpen(false)
    if (scratchModalOpen) window.requestAnimationFrame(() => scratchUtilityRef.current?.focus())
    setTutorContext(context)
    setTutorReturnPage(page)
    setPage('tutor')
    setMobileNavOpen(false)
  }

  function openScratchPad(context = '') {
    setScratchContext(context)
    setScratchReturnPage(page)
    setPage('scratch')
    setMobileNavOpen(false)
  }

  function openAppliedField(field) {
    setAppliedField(field)
    setAppliedProblem(createAppliedProblem(field, level))
    setAppliedSelected('')
    setAppliedFeedback(null)
    setQuiz(null)
    setPage('applied')
    setMobileNavOpen(false)
  }

  function openScratchModal(context = '') {
    setScratchContext(context)
    setScratchModalOpen(true)
  }

  function closeScratchModal() {
    setScratchModalOpen(false)
    window.requestAnimationFrame(() => scratchUtilityRef.current?.focus())
  }

  function openCalculatorModal() {
    setCalculatorModalOpen(true)
  }

  function closeCalculatorModal() {
    setCalculatorModalOpen(false)
    window.requestAnimationFrame(() => calculatorUtilityRef.current?.focus())
  }

  function recordInference(metrics) {
    if (!metrics) return
    setInferenceHistory((history) => [{ ...metrics, timestamp: metrics.timestamp || new Date().toISOString() }, ...history].slice(0, 30))
  }

  async function copyTutorResponse(content, index) {
    try {
      let copied = false
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(content)
          copied = true
        } catch {
          copied = false
        }
      }
      if (!copied) {
        const temporary = document.createElement('textarea')
        temporary.value = content
        temporary.style.position = 'fixed'
        temporary.style.opacity = '0'
        document.body.appendChild(temporary)
        let copied = false
        try {
          temporary.select()
          copied = document.execCommand('copy')
        } finally {
          temporary.remove()
        }
        if (!copied) throw new Error('Copy is unavailable in this browser.')
      }
      setCopiedMessage(index)
      setCopyError('')
      window.setTimeout(() => setCopiedMessage(null), 1800)
    } catch {
      setCopyError('Could not copy this response. Select its text and copy it manually.')
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); navigate('overview') }} aria-label="ElectraLab home">
          <span className="brand-mark">E<span>.</span></span><span className="brand-name">electra<span>lab</span></span>
        </a>
        <div className="sidebar-label">LEARN</div>
        <nav className="main-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => <button key={item.id} className={`nav-link ${page === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)} aria-current={page === item.id ? 'page' : undefined}><Icon name={item.icon} /><span>{item.label}</span>{item.id === 'practice' && <span className="nav-dot" />}</button>)}
        </nav>
        <div className="sidebar-label topics-label">YOUR TOPICS</div>
        <div className="topic-links">{SKILLS.map((item) => <button key={item.name} className="topic-link" onClick={() => startPractice(item.name)}><span className={`topic-symbol ${item.tone}`}>{item.icon}</span>{item.name}</button>)}</div>
        <div className="sidebar-spacer" />
        <div className="offline-card"><span className="offline-icon"><Icon name="bolt" size={16} /></span><div><strong>Learning offline</strong><span>Your progress stays on this device.</span></div><span className="online-dot" aria-label="Offline-ready" /></div>
        <button className="profile-button" aria-label="Learner profile"><span className="avatar">A</span><span className="profile-copy"><strong>Alex Morgan</strong><small>Physics learner</small></span><span className="profile-more">···</span></button>
      </aside>
      {mobileNavOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileNavOpen(false)} />}
      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open menu" onClick={() => setMobileNavOpen(true)}><Icon name="menu" /></button>
          <div className="breadcrumb">ElectraLab <span>/</span> <strong>{pageLabel(page)}</strong></div>
          <div className="topbar-right"><button ref={scratchUtilityRef} className="scratch-utility-trigger" onClick={() => openScratchModal()} disabled={page === 'scratch'} aria-label="Open scratch pad utility"><Icon name="pencil" size={15} /><span>Scratch pad</span></button><button ref={calculatorUtilityRef} className="scratch-utility-trigger calculator-utility-trigger" onClick={openCalculatorModal} disabled={page === 'calculator'} aria-label="Open calculator utility"><Icon name="calculator" size={15} /><span>Calculator</span></button><span className="streak-pill"><span>✳</span> {streak} day streak</span><span className="topbar-divider" /><span className="topbar-date">{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</span></div>
        </header>
        <div className="page-content">
          {page === 'overview' && <Dashboard onNavigate={navigate} onPractice={startPractice} progress={progress} accuracy={accuracy} level={level} streak={streak} skills={SKILLS} />}
          {page === 'coursebook' && <Suspense fallback={<div className="course-loading">Opening the coursebook...</div>}><LazyCoursebookPage onPractice={startPractice} onApplied={openAppliedField} onAgent={() => navigate('agent')} onAskTutor={openTutor} onOpenScratch={openScratchModal} /></Suspense>}
          {page === 'vocabulary' && <Suspense fallback={<div className="course-loading">Opening the vocabulary guide...</div>}><LazyVocabularyPage onPractice={startPractice} onApplied={openAppliedField} onAgent={() => navigate('agent')} onAskTutor={openTutor} onOpenScratch={openScratchModal} onInference={recordInference} /></Suspense>}
          {page === 'solver' && <ProblemSolverPage mode={solverMode} setMode={(mode) => { setSolverMode(mode); setSolverResult(null); setSolverError('') }} result={solverResult} error={solverError} onSolve={solveProblem} onAskTutor={openTutor} />}
          {page === 'calculator' && <CalculatorPage onAskTutor={openTutor} />}
          {page === 'tutor' && <OllamaTutorPage initialContext={tutorContext} returnPage={tutorReturnPage} onBack={() => setPage(tutorReturnPage)} onOpenScratch={openScratchModal} onInference={recordInference} copiedMessage={copiedMessage} copyError={copyError} onCopy={copyTutorResponse} />}
          {page === 'agent' && <Suspense fallback={<div className="agent-loading">Loading local agent tools...</div>}><LazyAgentPage inferenceHistory={inferenceHistory} onInference={recordInference} onOpenScratch={openScratchModal} /></Suspense>}
          {page === 'scratch' && <ScratchPad context={scratchContext} returnPage={scratchReturnPage} onBack={() => setPage(scratchReturnPage)} onAskTutor={openTutor} />}
          {page === 'applied' && <AppliedCalculusPage records={records} level={level} onRecord={saveAnswer} onAskTutor={openTutor} onOpenScratch={openScratchModal} field={appliedField} setField={setAppliedField} problem={appliedProblem} setProblem={setAppliedProblem} selected={appliedSelected} setSelected={setAppliedSelected} feedback={appliedFeedback} setFeedback={setAppliedFeedback} appliedFields={APPLIED_FIELDS} />}
          {page === 'practice' && <PracticePage skill={skill} records={records} setSkill={(next) => { setSkill(next); setProblem(createProblem(next, level)); setFeedback(null); setSelected('') }} problem={problem} selected={selected} setSelected={setSelected} feedback={feedback} onSubmit={submitAnswer} onNext={nextProblem} onVoice={startListening} voiceMessage={voiceMessage} level={level} onAskTutor={openTutor} />}
          {page === 'quizzes' && <QuizPage quiz={quiz} quizIndex={quizIndex} quizAnswers={quizAnswers} skill={skill} problem={problem} selected={selected} setSelected={setSelected} onStart={startPractice} onNext={handleQuizAnswer} onAskTutor={openTutor} onOpenScratch={openScratchModal} />}
          {page === 'progress' && <ProgressPage progress={progress} accuracy={accuracy} level={level} onPractice={startPractice} onNavigate={navigate} skills={SKILLS} />}
        </div>
        <footer className="footer"><span>Physics learning, offline-first.</span><span><Icon name="lock" size={13} /> Your learning data stays yours</span></footer>
      </main>
      {scratchModalOpen && <ScratchPadModal context={scratchContext} onClose={closeScratchModal} onAskTutor={openTutor} />}
      {calculatorModalOpen && <CalculatorModal onClose={closeCalculatorModal} onAskTutor={openTutor} />}
      <NotationZoomLayer />
    </div>
  )
}

function pageLabel(page) {
  return ({ overview: 'Overview', coursebook: 'Coursebook', vocabulary: 'Vocabulary', solver: 'The Solver', calculator: 'Calculator', tutor: 'Physics Tutor', agent: 'AI Performance', scratch: 'Scratch pad', applied: 'The Lab', practice: 'Practice', quizzes: 'Quizzes', progress: 'My progress' })[page] || 'Overview'
}

function MathDisplay(props) {
  const fallback = props.value || props.latex || ''
  return <Suspense fallback={<span className={`math-fallback ${props.className || ''}`}>{fallback}</span>}><LazyMathDisplay {...props} /></Suspense>
}

function MathContent(props) {
  return <Suspense fallback={<div className={`math-content-fallback ${props.className || ''}`}>{props.content}</div>}><LazyMathContent {...props} /></Suspense>
}

function calculateStreak(records) {
  const days = new Set(records.map((record) => new Date(record.timestamp).toDateString()))
  let cursor = new Date()
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(cursor.toDateString())) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function getSkillProgress(records, skill) {
  return Math.min(100, records.filter((record) => record.skill === skill).length * 12)
}

function preferredTutorModel(models, current) {
  if (models.some((item) => item.name === current)) return current
  const preferred = ['qwen2.5:3b', 'qwen3:4b', 'gemma3:4b', 'llama3.2:3b', 'phi3:mini']
  return preferred.find((name) => models.some((item) => item.name === name))
    || [...models].sort((first, second) => (first.size || Infinity) - (second.size || Infinity))[0]?.name
    || ''
}

function Dashboard({ onNavigate, onPractice, progress, accuracy, level, streak, skills }) {
  const count = progress.records.length
  const recent = progress.records.slice(0, 3)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  weekStart.setHours(0, 0, 0, 0)
  const thisWeek = progress.records.filter((record) => new Date(record.timestamp) >= weekStart)
  const today = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase()
  return (
    <div className="dashboard-page">
      <section className="welcome-row">
        <div><p className="eyebrow">{today} <span className="eyebrow-line" /></p><h1>A little progress<br className="mobile-break" /> goes a <em>long way.</em></h1><p className="welcome-subtitle">Good to see you, Alex. Ready to make something click?</p></div>
        <div className="welcome-illustration" aria-hidden="true"><span className="illustration-orbit orbit-one" /><span className="illustration-orbit orbit-two" /><span className="illustration-spark spark-a">✳</span><span className="illustration-spark spark-b">·</span><span className="illustration-number">Ω</span><span className="illustration-caption">little by little</span></div>
      </section>
      <section className="stats-grid" aria-label="Learning summary">
        <StatCard label="Problems solved" value={count} note={count ? 'You\'re building momentum' : 'Your first one is waiting'} icon="check" accent="purple" />
        <StatCard label="Accuracy" value={`${accuracy}%`} note={count ? 'Keep that thoughtful pace' : 'Every try is a good start'} icon="chart" accent="green" />
        <StatCard label="Current level" value={`Level ${level}`} note="Growing at your own pace" icon="bolt" accent="orange" />
        <StatCard label="Day streak" value={`${streak} days`} note="A little practice adds up" icon="spark" accent="blue" />
      </section>
      <section className="dashboard-columns">
        <div className="left-column">
          <article className="continue-card"><div className="continue-top"><span className="continue-kicker"><span className="live-dot" /> PICK UP WHERE YOU LEFT OFF</span><span className="continue-duration"><Icon name="clock" size={14} /> 5 min</span></div><div className="continue-content"><span className="continue-icon">Ω</span><div><h2>Ohm's Law, made intuitive</h2><p>See how voltage, current, and resistance connect in every circuit.</p><div className="mini-progress"><span className="mini-progress-track"><span style={{ width: `${getSkillProgress(progress.records, "Ohm's Law")}%` }} /></span><span>{getSkillProgress(progress.records, "Ohm's Law") ? `${progress.records.filter((record) => record.skill === "Ohm's Law").length} questions explored` : 'A fresh start'}</span></div></div></div><button className="button button-primary continue-button" onClick={() => onPractice("Ohm's Law")}>Continue learning <Icon name="arrow" size={16} /></button><span className="card-decoration">V = IR</span></article>
          <section className="section-block"><div className="section-heading"><div><p className="eyebrow">YOUR LEARNING PATH</p><h2>Find your flow</h2></div><button className="text-link" onClick={() => onNavigate('practice')}>Explore all <Icon name="arrow" size={15} /></button></div><div className="skill-grid">{skills.map((item) => { const topicProgress = getSkillProgress(progress.records, item.name); return <button className="skill-card" key={item.name} onClick={() => onPractice(item.name)}><span className={`skill-icon ${item.tone}`}>{item.icon}</span><span className="skill-title">{item.name}</span><span className="skill-detail">{item.detail}</span><span className="skill-progress"><span><i style={{ width: `${topicProgress}%` }} /></span><small>{topicProgress}%</small></span><span className="skill-arrow"><Icon name="arrow" size={16} /></span></button> })}</div></section>
          <button className="coursebook-feature-card" onClick={() => onNavigate('coursebook')}><span className="coursebook-feature-icon"><Icon name="book" size={18} /></span><span><small>START WITH THE IDEAS</small><strong>Read the coursebook</strong><span>Follow a chapter, study the worked examples, then move into practice.</span></span><span className="coursebook-feature-arrow"><Icon name="arrow" size={17} /></span></button>
          <button className="applied-feature-card" onClick={() => onNavigate('applied')}><span className="applied-feature-icon">∂</span><span className="applied-feature-copy"><small>PHYSICS, OUT IN THE LAB</small><strong>The Lab</strong><span>From circuit analysis to semiconductor device design.</span></span><span className="applied-feature-arrow"><Icon name="arrow" size={18} /></span><span className="applied-feature-equation" aria-hidden="true">I = nAev_d · np=n_i²</span></button>
        </div>
        <aside className="right-column">
          <section className="side-panel"><div className="panel-heading"><div><p className="eyebrow">YOUR WEEK</p><h2>Showing up counts</h2></div><button className="panel-menu" aria-label="Weekly activity options">···</button></div><WeekChart records={thisWeek} /><div className="week-summary"><span><i className="chart-legend-dot" /> Problems solved</span><strong>{thisWeek.length} <small>this week</small></strong></div></section>
          <section className="side-panel recent-panel"><div className="panel-heading"><div><p className="eyebrow">LITTLE WINS</p><h2>Recent activity</h2></div><button className="text-link small-link" onClick={() => onNavigate('progress')}>View all <Icon name="arrow" size={14} /></button></div>{recent.length ? <div className="activity-list">{recent.map((record, index) => <ActivityRow key={`${record.timestamp}-${index}`} record={record} />)}</div> : <div className="empty-activity"><span className="empty-icon">✳</span><p>Your learning story starts here.</p><span>Solve a problem and your wins will show up here.</span></div>}</section>
          <section className="gentle-note"><span>✳</span><p><strong>Small steps, real understanding.</strong><br />There's no rush here. Take the time you need.</p></section>
        </aside>
      </section>
    </div>
  )
}

function StatCard({ label, value, note, icon, accent }) {
  return <article className="stat-card"><span className={`stat-icon ${accent}`}><Icon name={icon} size={17} /></span><span className="stat-label">{label}</span><strong className="stat-value">{value}</strong><span className="stat-note">{note}</span></article>
}

function WeekChart({ records = [] }) {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const values = days.map((_, index) => records.filter((record) => new Date(record.timestamp).getDay() === [1, 2, 3, 4, 5, 6, 0][index]).length)
  const heights = values.map((value) => value ? Math.min(100, 24 + value * 22) : 5)
  return <div className="week-chart" role="img" aria-label={`Activity over the week. ${values.reduce((sum, value) => sum + value, 0)} problems solved.`}><div className="chart-grid-line line-top" /><div className="chart-grid-line line-middle" /><div className="chart-bars">{days.map((day, index) => <div className={`chart-day ${index === (new Date().getDay() + 6) % 7 ? 'today' : ''}`} key={index}><span className={`chart-bar ${values[index] ? 'has-activity' : ''}`} style={{ height: `${heights[index]}%` }} /><small>{day}</small></div>)}</div></div>
}

function ActivityRow({ record }) {
  const prefix = ({ "Ohm's Law": 'Find the current: ', Power: 'Calculate power: ', 'Series/Parallel': 'Find equivalent resistance: ', 'Drift Velocity': 'Find drift velocity: ', 'Carrier Concentration': 'Find carrier concentration: ', 'Diode Equation': 'Find diode current: ', 'BJT Gains': 'Find collector current: ', 'JFET/MOSFET': 'Find drain current: ' })[record.skill] || ''
  const label = record.field ? `${record.field} · ${record.skill}` : `${record.skill} ${record.source === 'solver' ? 'solver' : 'practice'}`
  return <div className="activity-row"><span className={`activity-check ${record.correct ? 'correct' : 'missed'}`}>{record.correct ? <Icon name="check" size={13} /> : '·'}</span><span className="activity-copy"><strong>{label}</strong><small>{record.expression ? <MathDisplay className="activity-equation" value={record.expression} latex={record.mathLatex} displayMode={false} /> : record.problem.replace(prefix, '')}</small></span><span className="activity-time">{formatTime(record.timestamp)}</span></div>
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toDateString() === new Date().toDateString() ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function AppliedCalculusPage({ records, level, onRecord, onAskTutor, onOpenScratch, field, setField, problem, setProblem, selected, setSelected, feedback, setFeedback, appliedFields }) {
  const fieldInfo = appliedFields.find((item) => item.name === field)
  const fieldRecords = records.filter((record) => record.skill === 'Applied Calculus' && record.field === field)
  const helpContext = [
    `Physics lab: ${field}.`,
    `Problem: ${problem.prompt}`,
    `Expression: ${problem.expression}`,
    selected ? `My current choice: ${selected}` : '',
    feedback ? `Answer: ${problem.answer}\nWorked steps: ${problem.steps.join(' ')}` : '',
  ].filter(Boolean).join('\n')

  function changeField(nextField) {
    setField(nextField)
    setProblem(createAppliedProblem(nextField, level))
    setSelected('')
    setFeedback(null)
  }

  function checkAnswer() {
    if (!selected || feedback) return
    const correct = selected === problem.answer
    onRecord(correct, problem)
    setFeedback({ correct, answer: problem.answer, steps: problem.steps })
  }

  function nextProblem() {
    setProblem(createAppliedProblem(field, level))
    setSelected('')
    setFeedback(null)
  }

  return (
    <div className="applied-page">
      <div className="page-title-row"><div><p className="eyebrow">PHYSICS, OUT IN THE LAB</p><h1>See the theory <em>at work.</em></h1><p className="page-description">Explore the physics behind circuits, semiconductors, and electronic devices.</p></div><span className="level-chip"><Icon name="bolt" size={15} /> Adaptive level {level}</span></div>
      <section className="applied-intro"><span className="applied-intro-symbol">∂</span><div><p className="eyebrow">THE LAB TRACK</p><h2>From equations to working devices.</h2><p>Physical laws describe how systems behave. Work through practical examples, see every step, and connect the mathematics to your lab work.</p></div><span className="applied-intro-decoration" aria-hidden="true">∇f(x)</span></section>
      <section className="applied-fields" aria-label="Choose an application area">
        {appliedFields.map((item) => <button key={item.name} className={`applied-field-card ${field === item.name ? 'selected' : ''}`} onClick={() => changeField(item.name)} aria-pressed={field === item.name}><span className={`applied-field-icon ${item.tone}`}>{item.icon}</span><span className="applied-field-name">{item.name}</span><span className="applied-field-detail">{item.detail}</span><span className="applied-field-example">{item.example} <Icon name="arrow" size={13} /></span></button>)}
      </section>
      <HelpTools context={helpContext} onAskTutor={onAskTutor} onOpenScratch={onOpenScratch} />
      <div className="applied-workspace">
        <section className="question-card applied-question">
          <div className="question-top"><div className="question-topic"><span className={`applied-field-icon compact ${fieldInfo.tone}`}>{fieldInfo.icon}</span><strong>{field}</strong></div><span className="question-count"><span className="question-count-dot" /> LAB PROBLEM</span></div>
          <div className="question-content"><p className="question-prompt">{problem.prompt}</p><MathDisplay className="math-expression applied-expression" value={problem.expression} latex={problem.mathLatex} /><p className="answer-prompt">Choose the result that best fits the situation.</p></div>
          <fieldset className="answer-options" disabled={Boolean(feedback)}><legend className="sr-only">Answer choices</legend>{problem.options.map((option, index) => <label className={`answer-option ${selected === option ? 'selected' : ''} ${feedback && option === problem.answer ? 'answer-correct' : ''} ${feedback && selected === option && !feedback.correct ? 'answer-wrong' : ''}`} key={option}><input type="radio" name="applied-answer" value={option} checked={selected === option} onChange={() => setSelected(option)} /><span className="answer-letter">{String.fromCharCode(65 + index)}</span><MathDisplay className="answer-value" value={option} displayMode={false} />{feedback && option === problem.answer && <Icon name="check" size={17} />}</label>)}</fieldset>
          {feedback && <div className={`feedback-panel ${feedback.correct ? 'feedback-good' : 'feedback-try'}`} role="status"><span className="feedback-mark">{feedback.correct ? '✓' : '↗'}</span><div><strong>{feedback.correct ? 'That\'s the result.' : 'Let\'s trace the reasoning.'}</strong><p>{feedback.correct ? 'You connected the physics to the system.' : 'The answer is ' + feedback.answer + '. Here\'s how the physics gets us there.'}</p><ol>{feedback.steps.map((step) => <li key={step}><MathContent className="feedback-step-content" content={step} /></li>)}</ol></div></div>}
          <div className="question-actions">{feedback ? <button className="button button-primary submit-button" onClick={nextProblem}>Try another example <Icon name="arrow" size={16} /></button> : <button className="button button-primary submit-button" onClick={checkAnswer} disabled={!selected}>Check the result <Icon name="arrow" size={16} /></button>}</div>
          <div className="question-footnote"><Icon name="lock" size={13} /> This lab problem is saved with your local progress.</div>
        </section>
        <aside className="applied-aside">
          <section className="coach-card"><span className="coach-orb">{fieldInfo.icon}</span><p className="eyebrow">WHY PHYSICS HERE?</p><h2>{fieldInfo.example}<br />starts with fundamental laws.</h2><p>{fieldInfo.detail} Choose an answer, then unpack the equations and what their units mean.</p></section>
          <section className="practice-progress-card"><div className="panel-heading"><div><p className="eyebrow">YOUR LAB NOTES</p><h2>{field} practice</h2></div></div><div className="applied-progress-number">{fieldRecords.length}<span> examples explored</span></div><div className="topic-progress-track"><span style={{ width: `${Math.min(100, fieldRecords.length * 12)}%` }} /></div><p className="progress-note">Each scenario connects a physics principle to a practical device.</p></section>
          <section className="offline-note"><Icon name="bolt" size={16} /><span>Generated and explained on your device.</span></section>
        </aside>
      </div>
    </div>
  )
}

function InferenceMeter({ metrics }) {
  const rate = Number(metrics.tokensPerSecond) || 0
  const width = Math.max(3, Math.min(100, rate / 80 * 100))
  const approximate = metrics.metricsSource === 'estimate'
  const duration = Number.isFinite(metrics.totalDurationMs)
  return (
    <div className="inference-meter" title={`Prompt: ${metrics.promptTokens} tokens • Completion: ${metrics.completionTokens} tokens${approximate ? ' • Client estimate' : ''}${duration ? ` • ${metrics.totalDurationMs.toFixed(0)} ms` : ''}`}>
      <div className="inference-meter-bar" style={{ width: `${width}%` }} />
      <span className="inference-meter-value">{rate.toFixed(1)} tok/s{approximate && ' ~'}</span>
      {duration && <span className="inference-meter-duration">{metrics.totalDurationMs.toFixed(0)} ms</span>}
    </div>
  )
}

function HelpTools({ context, onAskTutor, onOpenScratch }) {
  return (
    <div className="help-tools">
      <button className="button button-subtle tutor-button" onClick={() => onAskTutor(context)}><Icon name="chat" size={16} /> Ask tutor</button>
      <button className="button button-subtle scratch-button" onClick={() => onOpenScratch(context)}><Icon name="pencil" size={16} /> Scratch pad</button>
    </div>
  )
}

function OllamaTutorPage({ initialContext, returnPage, onBack, onOpenScratch, onInference, copiedMessage, copyError, onCopy }) {
  const [model, setModel] = useState('')
  const [messages, setMessages] = useState(initialContext ? [{ role: 'user', content: initialContext }] : [])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState(null)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [inferenceMetrics, setInferenceMetrics] = useState(null)
  const [conversationHistory, setConversationHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('electralab-tutor-chat')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [revisionIndex, setRevisionIndex] = useState(-1)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    checkOllama().then(setOllamaStatus).catch(() => setOllamaStatus({ connected: false, models: [] }))
  }, [])

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('electralab-tutor-chat', JSON.stringify(conversationHistory))
    } catch {
      // Storage full, continue without persistence
    }
  }, [conversationHistory])

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function sendMessage(customInput = null, isRevision = false) {
    const text = customInput ?? input
    if (!text.trim() || loading) return
    if (!ollamaStatus?.connected) {
      setInput('')
      return
    }
    if (!model) {
      const preferred = preferredTutorModel(ollamaStatus.models, '')
      if (preferred) setModel(preferred)
      else return
    }

    const userMessage = { role: 'user', content: text.trim() }
    let newMessages
    if (isRevision && revisionIndex >= 0) {
      newMessages = messages.slice(0, revisionIndex + 1)
      newMessages[newMessages.length - 1] = userMessage
      setRevisionIndex(-1)
    } else {
      newMessages = [...messages, userMessage]
      setRevisionIndex(-1)
    }
    setMessages(newMessages)
    setInput('')

    setLoading(true)
    let startTime = performance.now()
    let fullResponse = ''

    try {
      await askOllamaStream({
        model,
        messages: newMessages,
        context: '',
        walkthrough: true,
        onStarted: () => {},
        onToken: (token) => {
          fullResponse += token
          setMessages((current) => {
            const last = current[current.length - 1]
            if (last && last.role === 'assistant') {
              return [...current.slice(0, -1), { ...last, content: fullResponse }]
            }
            return [...current, { role: 'assistant', content: fullResponse }]
          })
        },
      })

      const elapsedMs = performance.now() - startTime
      const metrics = getInferenceMetrics({ message: fullResponse }, newMessages, '', elapsedMs)
      setInferenceMetrics(metrics)
      onInference?.({ model, ...metrics, timestamp: new Date().toISOString() })

      const updatedMessages = messages.slice(0, -1).concat({ role: 'assistant', content: fullResponse })
      setMessages(updatedMessages)
      setConversationHistory((prev) => [...prev, { messages: updatedMessages, model, metrics, timestamp: new Date().toISOString() }].slice(-20))
    } catch (error) {
      console.error('Tutor error:', error)
      setMessages((current) => [...current, { role: 'assistant', content: `Error: ${error.message}` }])
    } finally {
      setLoading(false)
    }
  }

  function stopGeneration() {
    // In a real implementation, this would abort the fetch
    setLoading(false)
  }

  function rewindConversation(index) {
    setMessages(messages.slice(0, index + 1))
    setRevisionIndex(index)
    setInput('')
  }

  function revisePrompt(index) {
    const userMsg = messages[index]
    if (userMsg && userMsg.role === 'user') {
      setInput(userMsg.content)
      setRevisionIndex(index)
    }
  }

  function loadConversation(conv) {
    setMessages(conv.messages)
    setModel(conv.model)
    setInferenceMetrics(conv.metrics)
    setRevisionIndex(-1)
  }

  function clearChat() {
    setMessages(initialContext ? [{ role: 'user', content: initialContext }] : [])
    setRevisionIndex(-1)
    setInferenceMetrics(null)
  }

  return (
    <div className="tutor-page">
      <header className="tutor-header">
        <button className="back-button" onClick={onBack}><Icon name="arrow" size={18} /></button>
        <div className="tutor-header-info"><h1>Physics Tutor</h1><span className="tutor-subtitle">Local Ollama • {model || 'Select a model'}</span></div>
        <div className="tutor-header-actions">
          <button className="icon-button" onClick={() => setShowModelPicker(true)} aria-label="Choose model"><Icon name="agent" size={18} /></button>
          <button className="icon-button" onClick={clearChat} aria-label="New conversation"><Icon name="copy" size={18} /></button>
        </div>
      </header>
      <div className="tutor-conversation">
        {messages.map((message, index) => (
          <TutorMessage
            key={index}
            message={message}
            index={index}
            isLast={index === messages.length - 1}
            loading={loading && index === messages.length - 1 && message.role === 'assistant'}
            onCopy={(content) => onCopy(content, index)}
            copied={copiedMessage === index}
            copyError={copyError}
            onRewind={rewindConversation}
            onRevise={revisePrompt}
            showActions={index > 0}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="tutor-input-area">
        {inferenceMetrics && <InferenceMeter metrics={inferenceMetrics} />}
        <div className="tutor-input-row">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }}}
            placeholder={ollamaStatus?.connected ? 'Ask about circuits, semiconductors, or any physics concept...' : 'Start Ollama locally to enable the tutor'}
            disabled={loading || !ollamaStatus?.connected}
            rows={1}
          />
          <button className="button button-primary tutor-send" onClick={() => sendMessage()} disabled={loading || !input.trim() || !ollamaStatus?.connected}>
            {loading ? <Icon name="bolt" size={18} /> : <Icon name="arrow" size={18} />}
          </button>
          {loading && <button className="button button-subtle tutor-stop" onClick={stopGeneration}><Icon name="lock" size={16} /> Stop</button>}
        </div>
      </div>
      {showModelPicker && ollamaStatus?.connected && <ModelPicker models={ollamaStatus.models} selected={model} onSelect={(name) => { setModel(name); setShowModelPicker(false); localStorage.setItem('electralab-ollama-model', name) }} onClose={() => setShowModelPicker(false)} />}
      {showModelPicker && !ollamaStatus?.connected && <div className="model-picker-error">Start Ollama locally to see available models.</div>}
    </div>
  )
}

function TutorMessage({ message, index, isLast, loading, onCopy, copied, copyError, onRewind, onRevise, showActions }) {
  const [showMenu, setShowMenu] = useState(false)
  return (
    <article className={`tutor-message ${message.role} ${loading ? 'streaming' : ''}`}>
      <div className="message-header">
        <span className="message-role">{message.role === 'user' ? 'You' : 'Tutor'}</span>
        {showActions && <button className="message-menu" onClick={() => setShowMenu(!showMenu)} aria-label="Message options"><Icon name="mic" size={14} /></button>}
      </div>
      <div className="message-content"><MathContent content={normalizeTutorResponse(message.content)} /></div>
      {message.metrics && !loading && <InferenceMeter metrics={message.metrics} />}
      {showActions && showMenu && (
        <div className="message-dropdown">
          <button onClick={() => onCopy(message.content)}><Icon name="copy" size={14} /> Copy</button>
          <button onClick={() => onRewind(index)}><Icon name="arrow" size={14} /> Rewind here</button>
          <button onClick={() => onRevise(index)}><Icon name="pencil" size={14} /> Revise prompt</button>
        </div>
      )}
      {copied && <div className="copy-toast">Copied!</div>}
      {copyError && <div className="copy-error-toast">{copyError}</div>}
    </article>
  )
}

function ModelPicker({ models, selected, onSelect, onClose }) {
  return (
    <div className="model-picker-overlay" onClick={onClose}>
      <div className="model-picker" onClick={(e) => e.stopPropagation()}>
        <header><h2>Choose a model</h2><button onClick={onClose} aria-label="Close"><Icon name="lock" size={18} /></button></header>
        <ul>{models.map((m) => <li key={m.name}><button className={m.name === selected ? 'selected' : ''} onClick={() => onSelect(m.name)}>{m.name} <small>({(m.size / 1e9).toFixed(1)} GB)</small></button></li>)}</ul>
      </div>
    </div>
  )
}

function ProblemSolverPage({ mode, setMode, result, error, onSolve, onAskTutor }) {
  const [input, setInput] = useState('')
  const modes = [
    { id: "Ohm's Law", label: "Ohm's Law", mark: 'Ω', detail: 'V = I R' },
    { id: 'Power', label: 'Power', mark: 'P', detail: 'P = VI = I²R = V²/R' },
    { id: 'Series/Parallel', label: 'Series/Parallel', mark: '∥', detail: 'Equivalent resistance' },
    { id: 'Drift Velocity', label: 'Drift Velocity', mark: 'v_d', detail: 'I = n A e v_d' },
    { id: 'Carrier Concentration', label: 'Carrier Concentration', mark: 'n,p', detail: 'n p = n_i²' },
    { id: 'Diode Equation', label: 'Diode Equation', mark: 'I₀', detail: 'I = I₀[e^(qV/nkT) - 1]' },
    { id: 'BJT Gains', label: 'BJT Gains', mark: 'β', detail: 'β = I_C/I_B, α = I_C/I_E' },
    { id: 'JFET/MOSFET', label: 'JFET/MOSFET', mark: 'I_D', detail: 'I_D = I_DSS(1 - V_GS/V_P)²' },
  ]

  const modeInfo = modes.find((m) => m.id === mode)
  const tutorQuestion = `I am learning when and how to use the ${mode} solver.${input ? ` My current expression is ${input}${result ? ` and the result is ${result.answer}` : ''}.` : ''} Explain the key idea and give me one guided example.`

  return (
    <div className="solver-page">
      <header className="solver-page-heading">
        <div><p className="eyebrow">A TOOL FOR THINKING</p><h1>The Solver <em>lab</em></h1><p>Choose a physics topic, enter your problem, then work through it step by step.</p></div>
        <span className="solver-local-mark">Ω <small>OFFLINE READY</small></span>
      </header>

      <nav className="solver-mode-select" aria-label="Solver topic">
        {modes.map((item) => <button key={item.id} type="button" className={`solver-mode-tab ${mode === item.id ? 'active' : ''}`} aria-pressed={mode === item.id} onClick={() => { setMode(item.id); setInput('') }}><span className="solver-mode-mark">{item.mark}</span><span><strong>{item.label}</strong><small>{item.detail}</small></span></button>)}
      </nav>

      <div className="solver-workspace">
        <section className="solver-device" aria-label={`${modeInfo?.label || mode} solver`}>
          <div className="solver-display">
            <span className="solver-display-mode">{modeInfo?.label || mode} · READY</span>
            <input aria-label="Solver expression" value={input} onChange={(event) => { setInput(event.target.value); setError('') }} placeholder="Enter your problem..." inputMode="text" autoComplete="off" />
            {result && <output aria-live="polite">= {result.answer}</output>}
            {error && <span className="solver-error" role="status">{error}</span>}
          </div>
          <div className="solver-key-grid">
            <button type="button" className="solver-key" onClick={() => { onSolve(input); setInput('') }}>Solve</button>
            <button type="button" className="solver-key" onClick={() => setInput('')}>Clear</button>
          </div>
          <p className="solver-key-hint">Enter your problem, then press Solve or Enter</p>
        </section>

        <aside className="solver-purpose-card">
          <span className="solver-purpose-symbol">{modeInfo?.mark || 'Ω'}</span>
          <p className="eyebrow">CURRENT TOPIC</p>
          <h2>{modeInfo?.label || mode}, with intention.</h2>
          <p>{modeInfo?.detail || 'Physics solver.'} The solver is a check on your reasoning—not a substitute for deciding what the problem is asking.</p>
          <div className="solver-caution"><strong>Good habit</strong><span>Estimate the size and sign of your answer before you solve. Then compare.</span></div>
          <button className="button button-primary solver-tutor-button" onClick={() => onAskTutor(tutorQuestion)}>Ask local tutor <span aria-hidden="true">↗</span></button>
          <small className="solver-local-note">Your question opens the Physics Tutor with this solver context.</small>
        </aside>
      </div>

      {result && <SolverResult result={result} mode={mode} />}
    </div>
  )
}

function SolverResult({ result, mode }) {
  return (
    <section className="solver-result-card">
      <div className="solver-result-heading"><p className="eyebrow">WORKED SOLUTION</p><h2>Step by step</h2></div>
      <div className="solver-result-content">
        <p className="solver-result-input">Input: {result.input}</p>
        <p className="solver-result-answer"><strong>Answer:</strong> {result.answer}</p>
        <ol>{result.steps.map((step, index) => <li key={index}><MathContent content={step} /></li>)}</ol>
      </div>
    </section>
  )
}

function PracticePage({ skill, records, setSkill, problem, selected, setSelected, feedback, onSubmit, onNext, onVoice, voiceMessage, level, onAskTutor }) {
  const skillProgress = getSkillProgress(records, skill)
  const skillRecords = records.filter((r) => r.skill === skill && r.source !== 'solver')
  const skillAccuracy = skillRecords.length ? Math.round((skillRecords.filter((r) => r.correct).length / skillRecords.length) * 100) : 0

  return (
    <div className="practice-page">
      <header className="practice-heading">
        <div><p className="eyebrow">PRACTICE MODE</p><h1>{skill} <em>practice</em></h1><p className="page-description">Work through problems at your level. Level {level} • {skillProgress}% explored • {skillAccuracy}% accuracy</p></div>
        <span className="practice-local-mark">Ω <small>OFFLINE READY</small></span>
      </header>

      <HelpTools context={[
        `Practice: ${skill}`,
        `Problem: ${problem.prompt}`,
        `Expression: ${problem.expression}`,
        selected ? `My choice: ${selected}` : '',
        feedback ? `Answer: ${problem.answer}\nSteps: ${problem.steps.join(' ')}` : '',
      ].filter(Boolean).join('\n')} onAskTutor={onAskTutor} onOpenScratch={() => {}} />

      <div className="practice-workspace">
        <section className="question-card">
          <div className="question-top"><div className="question-topic"><span className="question-topic-icon">Ω</span><strong>{skill}</strong></div><span className="question-count"><span className="question-count-dot" /> PRACTICE PROBLEM</span></div>
          <div className="question-content"><p className="question-prompt">{problem.prompt}</p><MathDisplay className="math-expression" value={problem.expression} latex={problem.mathLatex} /><p className="answer-prompt">Choose the correct answer.</p></div>
          <fieldset className="answer-options" disabled={Boolean(feedback)}><legend className="sr-only">Answer choices</legend>{problem.options.map((option, index) => <label className={`answer-option ${selected === option ? 'selected' : ''} ${feedback && option === problem.answer ? 'answer-correct' : ''} ${feedback && selected === option && !feedback.correct ? 'answer-wrong' : ''}`} key={option}><input type="radio" name="practice-answer" value={option} checked={selected === option} onChange={() => setSelected(option)} /><span className="answer-letter">{String.fromCharCode(65 + index)}</span><MathDisplay className="answer-value" value={option} displayMode={false} />{feedback && option === problem.answer && <Icon name="check" size={17} />}</label>)}</fieldset>
          {feedback && <div className={`feedback-panel ${feedback.correct ? 'feedback-good' : 'feedback-try'}`} role="status"><span className="feedback-mark">{feedback.correct ? '✓' : '↗'}</span><div><strong>{feedback.correct ? 'That\'s right.' : 'Let\'s trace the reasoning.'}</strong><p>{feedback.correct ? 'You connected the physics to the problem.' : 'The answer is ' + feedback.answer + '. Here\'s how it works.'}</p><ol>{feedback.steps.map((step) => <li key={step}><MathContent className="feedback-step-content" content={step} /></li>)}</ol></div></div>}
          <div className="question-actions">{feedback ? <button className="button button-primary submit-button" onClick={onNext}>Next problem <Icon name="arrow" size={16} /></button> : <button className="button button-primary submit-button" onClick={onSubmit} disabled={!selected}>Check answer <Icon name="arrow" size={16} /></button>}</div>
          <div className="question-footnote"><Icon name="lock" size={13} /> This problem is saved with your local progress.</div>
        </section>
        <aside className="practice-aside">
          <section className="coach-card"><span className="coach-orb">Ω</span><p className="eyebrow">WHY THIS SKILL?</p><h2>{skill}<br />builds the foundation.</h2><p>Every circuit, device, and system rests on these core principles. Choose an answer, then unpack the reasoning.</p></section>
          <section className="practice-progress-card"><div className="panel-heading"><div><p className="eyebrow">YOUR PROGRESS</p><h2>{skill}</h2></div></div><div className="practice-progress-number">{skillRecords.length}<span> problems solved</span></div><div className="topic-progress-track"><span style={{ width: `${skillProgress}%` }} /></div><p className="progress-note">{skillAccuracy}% accuracy • Level {level}</p></section>
          {voiceMessage && <div className="voice-status" role="status">{voiceMessage}</div>}
          <div className="practice-voice"><button className="voice-button" onClick={onVoice} aria-label="Start voice input"><Icon name="mic" size={20} /></button><span>Say "option A", "option B"...</span></div>
          <section className="offline-note"><Icon name="bolt" size={16} /><span>Generated and explained on your device.</span></section>
        </aside>
      </div>
    </div>
  )
}

function QuizPage({ quiz, quizIndex, quizAnswers, skill, problem, selected, setSelected, onStart, onNext, onAskTutor, onOpenScratch }) {
  if (!quiz) return <div className="quiz-page"><p>Select a quiz from the Practice page.</p></div>
  const isComplete = quiz.complete
  const score = quizAnswers.filter((a) => a.correct).length
  const total = quizAnswers.length

  return (
    <div className="quiz-page">
      <header className="quiz-heading">
        <div><p className="eyebrow">QUIZ MODE</p><h1>{skill} <em>quiz</em></h1><p className="page-description">5 questions • No hints • See your score at the end</p></div>
        <span className="quiz-local-mark">Ω <small>OFFLINE READY</small></span>
      </header>

      {isComplete ? (
        <section className="quiz-complete">
          <div className="quiz-score"><span className="score-circle">{score}/5</span><h2>{score === 5 ? 'Perfect!' : score >= 3 ? 'Good work!' : 'Keep practicing!'}</h2><p>{score} out of 5 correct</p></div>
          <div className="quiz-review">{quizAnswers.map((answer, index) => <div key={index} className={`quiz-review-item ${answer.correct ? 'correct' : 'incorrect'}`}><span className="review-number">{index + 1}</span><div className="review-content"><MathContent className="review-problem" content={answer.problem.prompt} /><MathDisplay className="review-expression" value={answer.problem.expression} displayMode={false} /></div><div className="review-result"><span className={answer.correct ? 'correct-mark' : 'incorrect-mark'}>{answer.correct ? '✓' : '✗'}</span><span>Your answer: {answer.selected || '—'}</span>{!answer.correct && <span className="review-correct">Correct: {answer.problem.answer}</span>}</div></div>)}</div>
          <div className="quiz-actions"><button className="button button-primary" onClick={() => onStart(skill, true)}>Retake quiz</button><button className="button button-subtle" onClick={() => onStart(skill, false)}>Practice more</button></div>
        </section>
      ) : (
        <>
          <HelpTools context={[
            `Quiz: ${skill}, Question ${quizIndex + 1}/5`,
            `Problem: ${problem.prompt}`,
            `Expression: ${problem.expression}`,
            selected ? `My choice: ${selected}` : '',
          ].filter(Boolean).join('\n')} onAskTutor={onAskTutor} onOpenScratch={onOpenScratch} />
          <div className="quiz-workspace">
            <section className="question-card quiz-question">
              <div className="question-top"><div className="question-topic"><span className="question-topic-icon">Ω</span><strong>{skill}</strong></div><span className="question-count"><span className="question-count-dot" /> QUESTION {quizIndex + 1} OF 5</span></div>
              <div className="question-content"><p className="question-prompt">{problem.prompt}</p><MathDisplay className="math-expression" value={problem.expression} latex={problem.mathLatex} /><p className="answer-prompt">Choose the correct answer.</p></div>
              <fieldset className="answer-options" disabled={Boolean(selected)}><legend className="sr-only">Answer choices</legend>{problem.options.map((option, index) => <label className={`answer-option ${selected === option ? 'selected' : ''}`} key={option}><input type="radio" name="quiz-answer" value={option} checked={selected === option} onChange={() => setSelected(option)} /><span className="answer-letter">{String.fromCharCode(65 + index)}</span><MathDisplay className="answer-value" value={option} displayMode={false} /></label>)}</fieldset>
              <div className="question-actions"><button className="button button-primary submit-button" onClick={onNext} disabled={!selected}>Submit answer <Icon name="arrow" size={16} /></button></div>
              <div className="question-footnote"><Icon name="lock" size={13} /> This quiz is saved with your local progress.</div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function ProgressPage({ progress, accuracy, level, onPractice, onNavigate, skills }) {
  const records = progress.records
  const count = records.length
  const skillStats = skills.map((skill) => {
    const skillRecords = records.filter((r) => r.skill === skill.name && r.source !== 'solver')
    const skillCount = skillRecords.length
    const skillAccuracy = skillCount ? Math.round((skillRecords.filter((r) => r.correct).length / skillCount) * 100) : 0
    return { ...skill, count: skillCount, accuracy: skillAccuracy }
  })

  return (
    <div className="progress-page">
      <header className="progress-heading">
        <div><p className="eyebrow">MY PROGRESS</p><h1>Your learning <em>journey</em></h1><p className="page-description">Every problem solved builds understanding. Here's the full picture.</p></div>
        <span className="progress-local-mark">Ω <small>OFFLINE READY</small></span>
      </header>
      <section className="progress-summary">
        <StatCard label="Total problems" value={count} note="All practice and solver work" icon="check" accent="purple" />
        <StatCard label="Overall accuracy" value={`${accuracy}%`} note={count ? 'Consistent and thoughtful' : 'Start practicing to see your accuracy'} icon="chart" accent="green" />
        <StatCard label="Current level" value={`Level ${level}`} note="Adapts to your performance" icon="bolt" accent="orange" />
        <StatCard label="Topics explored" value={skills.filter((s) => getSkillProgress(records, s.name) > 0).length} note={`of ${skills.length} core skills`} icon="spark" accent="blue" />
      </section>
      <section className="progress-skills" aria-label="Skill breakdown">
        <div className="section-heading"><p className="eyebrow">SKILL BREAKDOWN</p><h2>See where you're strong and where to focus</h2></div>
        <div className="skill-grid">{skillStats.map((item) => <button className="skill-card" key={item.name} onClick={() => onPractice(item.name)}><span className={`skill-icon ${item.tone}`}>{item.icon}</span><span className="skill-title">{item.name}</span><span className="skill-detail">{item.detail}</span><span className="skill-progress"><span><i style={{ width: `${Math.min(100, item.count * 12)}%` }} /></span><small>{item.count} problems • {item.accuracy}%</small></span><span className="skill-arrow"><Icon name="arrow" size={16} /></span></button>)}</div>
      </section>
      <section className="progress-activity">
        <div className="section-heading"><p className="eyebrow">ALL ACTIVITY</p><h2>Every problem, every step</h2></div>
        {records.length ? <div className="activity-list-full">{records.map((record, index) => <ActivityRow key={`${record.timestamp}-${index}`} record={record} />)}</div> : <div className="empty-activity"><span className="empty-icon">✳</span><p>No activity yet.</p><span>Start practicing to build your learning record.</span></div>}
      </section>
    </div>
  )
}

function CalculatorModal({ onClose, onAskTutor }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel calculator-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header"><h2>Calculator</h2><button className="modal-close" onClick={onClose} aria-label="Close"><Icon name="lock" size={18} /></button></header>
        <CalculatorPage onAskTutor={onAskTutor} />
      </div>
    </div>
  )
}

function ScratchPadModal({ context, onClose, onAskTutor }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel scratch-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header"><h2>Scratch Pad</h2><button className="modal-close" onClick={onClose} aria-label="Close"><Icon name="lock" size={18} /></button></header>
        <ScratchPad context={context} returnPage="modal" onBack={onClose} onAskTutor={onAskTutor} />
      </div>
    </div>
  )
}

export default App
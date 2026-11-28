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
  { id: 'chiplab', label: 'Chip Lab', icon: 'chip' },
  { id: 'practice', label: 'Practice', icon: 'spark' },
  { id: 'quizzes', label: 'Quizzes', icon: 'clipboard' },
  { id: 'progress', label: 'My progress', icon: 'chart' },
]

const FALLBACK_SKILLS = [
  { name: "Ohm's Law", detail: 'V = I R', icon: 'Ω', tone: 'blue', progress: 0 },
  { name: 'Power', detail: 'P = V I = I²R = V²/R', icon: 'P', tone: 'mint', progress: 0 },
  { name: 'Series/Parallel', detail: 'Equivalent resistance', icon: '∥', tone: 'peach', progress: 0 },
  { name: 'Drift Velocity', detail: 'I = n A e v_d', icon: 'v_d', tone: 'lavender', progress: 0 },
  { name: 'Carrier Concentration', detail: 'n p = n_i²', icon: 'n,p', tone: 'blue', progress: 0 },
  { name: 'Diode Equation', detail: 'I = I₀[e^(qV/nkT) - 1]', icon: 'I₀', tone: 'mint', progress: 0 },
  { name: 'BJT Gains', detail: 'β = I_C/I_B, α = I_C/I_E', icon: 'β', tone: 'peach', progress: 0 },
  { name: 'JFET/MOSFET', detail: 'I_D = I_DSS(1 - V_GS/V_P)²', icon: 'I_D', tone: 'lavender', progress: 0 },
]

const FALLBACK_QUIZ_TOPICS = [
  { name: "Ohm's Law & Resistance", skill: "Ohm's Law", questions: 5, time: '5 min', icon: 'Ω', tone: 'blue' },
  { name: 'Drift Velocity & Current Density', skill: 'Drift Velocity', questions: 5, time: '5 min', icon: 'v_d', tone: 'mint' },
  { name: "Kirchhoff's Laws", skill: 'Series/Parallel', questions: 5, time: '5 min', icon: '∑', tone: 'peach' },
  { name: 'Semiconductor Doping', skill: 'Carrier Concentration', questions: 5, time: '5 min', icon: 'n,p', tone: 'lavender' },
  { name: 'PN Junction & Diodes', skill: 'Diode Equation', questions: 5, time: '5 min', icon: 'I₀', tone: 'blue' },
  { name: 'BJT & FET Operation', skill: 'BJT Gains', questions: 5, time: '5 min', icon: 'β', tone: 'mint' },
]

const FALLBACK_APPLIED_FIELDS = [
  { name: 'Circuit Analysis', icon: '⚡', detail: "Analyze DC circuits using Ohm's Law, Kirchhoff's Laws, and equivalent resistance.", example: 'Multi-loop circuit', tone: 'blue' },
  { name: 'Semiconductor Devices', icon: '🔬', detail: 'Calculate carrier concentrations, diode currents, and transistor biasing.', example: 'Diode/transistor design', tone: 'mint' },
  { name: 'Electronic Design', icon: '📐', detail: 'Design simple amplifiers, switches, and voltage regulators.', example: 'Amplifier biasing', tone: 'lavender' },
]

const SOLVER_EXAMPLES = {
  "Ohm's Law": 'V = 12, R = 6',
  Power: 'V = 12, I = 2',
  'Series/Parallel': 'R1 = 10, R2 = 20',
  'Drift Velocity': 'n = 8.5e28, A = 1e-6, I = 5',
  'Carrier Concentration': 'Nd = 1e16, ni = 1.5e10',
  'Diode Equation': 'I0 = 1e-12, V = 0.7, n = 1',
  'BJT Gains': 'β = 100, IB = 20',
  'JFET/MOSFET': 'IDSS = 8, VP = -4, VGS = -1',
}

const LazyMathDisplay = lazy(() => import('./MathDisplay.jsx').then((module) => ({ default: module.MathDisplay })))
const LazyMathContent = lazy(() => import('./MathContent.jsx'))
const LazyAgentPage = lazy(() => import('./AgentPage.jsx'))
const LazyChipDesignLab = lazy(() => import('./ChipDesignLab.jsx'))
const LazyUniversalSearch = lazy(() => import('./UniversalSearch.jsx'))
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
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0 2 2h3" /></>,
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
    chip: <><rect x="7" y="7" width="10" height="10" rx="2" /><rect x="10.5" y="10.5" width="3" height="3" /><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
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
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [searchContext, setSearchContext] = useState('')
  const [inferenceHistory, setInferenceHistory] = useState(loadInferenceHistory)
  const [copiedMessage, setCopiedMessage] = useState(null)
  const [copyError, setCopyError] = useState('')
  const scratchUtilityRef = useRef(null)
  const calculatorUtilityRef = useRef(null)
  const searchUtilityRef = useRef(null)

  useEffect(() => {
    loadElectraData().then((data) => {
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

  useEffect(() => {
    if (!searchModalOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function closeOnEscape(event) {
      if (event.key === 'Escape') closeSearchModal()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [searchModalOpen])

  const NAV_ITEMS = electraData?.navItems || FALLBACK_NAV_ITEMS
  const SKILLS = electraData?.solverSkills || FALLBACK_SKILLS
  const QUIZ_TOPICS = electraData?.quizTopics || FALLBACK_QUIZ_TOPICS
  const APPLIED_FIELDS = electraData?.appliedFields || FALLBACK_APPLIED_FIELDS

  const SEARCH_INDEX = useMemo(() => {
    const items = NAV_ITEMS.map((nav) => ({ kind: 'page', id: nav.id, title: nav.label, detail: 'Open the page', keywords: `${nav.id} navigate go` }))
    for (const s of SKILLS) {
      items.push({ kind: 'practice', name: s.name, title: `Practice ${s.name}`, detail: s.detail, keywords: 'practice problems skill learn' })
      items.push({ kind: 'solver', name: s.name, title: `Solve with ${s.name}`, detail: s.detail, keywords: 'solver equation calculate compute' })
    }
    for (const q of QUIZ_TOPICS) items.push({ kind: 'quiz', name: q.name, skill: q.skill, title: `${q.name} quiz`, detail: `${q.questions} questions · ${q.time}`, keywords: 'quiz test check knowledge' })
    for (const f of APPLIED_FIELDS) items.push({ kind: 'field', name: f.name, title: `The Lab: ${f.name}`, detail: f.detail, keywords: 'lab applied scenario design' })
    for (const c of electraData?.courseChapters || []) items.push({ kind: 'chapter', id: c.id, title: c.title, detail: c.unit, keywords: 'coursebook chapter read theory' })
    for (const v of electraData?.vocabulary || []) items.push({ kind: 'vocab', id: v.id, title: v.title, detail: v.meaning.slice(0, 90), keywords: 'vocabulary term definition ' + v.say })
    return items
  }, [NAV_ITEMS, SKILLS, QUIZ_TOPICS, APPLIED_FIELDS, electraData])

  const records = progress.records
  const practiceRecords = records.filter((record) => record.source !== 'solver')
  const accuracy = practiceRecords.length ? Math.round((practiceRecords.filter((record) => record.correct).length / practiceRecords.length) * 100) : 0
  const level = Math.min(5, Math.max(1, 1 + Math.floor(practiceRecords.filter((record) => record.correct).length / 3) - Math.floor(practiceRecords.filter((record) => !record.correct).length / 4)))
  const streak = calculateStreak(records)

  const pageSearchContext = (() => {
    const label = NAV_ITEMS.find((item) => item.id === page)?.label || page
    const parts = [`the "${label}" page`]
    if (page === 'practice' && problem) parts.push(`practicing ${skill}: "${problem.prompt}"`)
    if (page === 'quizzes' && quiz) parts.push(`on question ${quizIndex + 1} of a ${skill} quiz`)
    if (page === 'applied') parts.push(`in the ${appliedField} lab field`)
    if (page === 'solver') parts.push(`using the ${solverMode} solver`)
    return `User is on ${parts.join('; ')}.`
  })()

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
    setSearchModalOpen(false)
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

  function openSearchModal(context = '') {
    setSearchContext(context)
    setSearchModalOpen(true)
  }

  function closeSearchModal() {
    setSearchModalOpen(false)
    window.requestAnimationFrame(() => searchUtilityRef.current?.focus())
  }

  function runSearchAction(item) {
    setSearchModalOpen(false)
    if (item.kind === 'page') setPage(item.id)
    else if (item.kind === 'solver') {
      setSolverMode(item.name)
      setSolverResult(null)
      setSolverError('')
      setPage('solver')
    } else if (item.kind === 'practice') {
      startPractice(item.name)
      return
    } else if (item.kind === 'quiz') {
      startPractice(item.skill, true)
      return
    } else if (item.kind === 'field') {
      openAppliedField(item.name)
      return
    } else if (item.kind === 'chapter') setPage('coursebook')
    else if (item.kind === 'vocab') setPage('vocabulary')
    setMobileNavOpen(false)
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
          <span className="brand-mark">e<span>.</span></span><span className="brand-name">electra<span>lab</span></span>
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
          <div className="topbar-right"><button ref={scratchUtilityRef} className="scratch-utility-trigger" onClick={() => openScratchModal()} disabled={page === 'scratch'} aria-label="Open scratch pad utility"><Icon name="pencil" size={15} /><span>Scratch pad</span></button><button ref={calculatorUtilityRef} className="scratch-utility-trigger calculator-utility-trigger" onClick={openCalculatorModal} disabled={page === 'calculator'} aria-label="Open calculator utility"><Icon name="calculator" size={15} /><span>Calculator</span></button><button ref={searchUtilityRef} className="scratch-utility-trigger search-utility-trigger" onClick={() => openSearchModal()} aria-label="Open universal search"><Icon name="search" size={15} /><span>Search</span></button><span className="streak-pill"><span>✳</span> {streak} day streak</span><span className="topbar-divider" /><span className="topbar-date">{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date())}</span></div>
        </header>
        <div className="page-content">
          {page === 'overview' && <Dashboard onNavigate={navigate} onPractice={startPractice} progress={progress} accuracy={accuracy} level={level} streak={streak} skills={SKILLS} />}
          {page === 'coursebook' && <Suspense fallback={<div className="course-loading">Opening the coursebook…</div>}><LazyCoursebookPage onPractice={startPractice} onApplied={openAppliedField} onAgent={() => navigate('agent')} onAskTutor={openTutor} onOpenScratch={openScratchModal} /></Suspense>}
          {page === 'vocabulary' && <Suspense fallback={<div className="course-loading">Opening the vocabulary guide…</div>}><LazyVocabularyPage onPractice={startPractice} onApplied={openAppliedField} onAgent={() => navigate('agent')} onAskTutor={openTutor} onOpenScratch={openScratchModal} onInference={recordInference} /></Suspense>}
          {page === 'solver' && <ProblemSolverPage mode={solverMode} setMode={(mode) => { setSolverMode(mode); setSolverResult(null); setSolverError('') }} result={solverResult} error={solverError} onSolve={solveProblem} onAskTutor={openTutor} skills={SKILLS} />}
          {page === 'calculator' && <CalculatorPage onAskTutor={openTutor} />}
          {page === 'tutor' && <OllamaTutorPage initialContext={tutorContext} returnPage={tutorReturnPage} onBack={() => setPage(tutorReturnPage)} onOpenScratch={openScratchModal} onInference={recordInference} copiedMessage={copiedMessage} copyError={copyError} onCopy={copyTutorResponse} />}
          {page === 'agent' && <Suspense fallback={<div className="agent-loading">Loading local agent tools…</div>}><LazyAgentPage inferenceHistory={inferenceHistory} onInference={recordInference} onOpenScratch={openScratchModal} /></Suspense>}
          {page === 'scratch' && <ScratchPad context={scratchContext} returnPage={scratchReturnPage} onBack={() => setPage(scratchReturnPage)} onAskTutor={openTutor} />}
          {page === 'applied' && <AppliedCalculusPage records={records} level={level} onRecord={saveAnswer} onAskTutor={openTutor} onOpenScratch={openScratchModal} field={appliedField} setField={setAppliedField} problem={appliedProblem} setProblem={setAppliedProblem} selected={appliedSelected} setSelected={setAppliedSelected} feedback={appliedFeedback} setFeedback={setAppliedFeedback} appliedFields={APPLIED_FIELDS} />}
          {page === 'chiplab' && <Suspense fallback={<div className="course-loading">Opening the chip lab…</div>}><LazyChipDesignLab onAskTutor={openTutor} /></Suspense>}
          {page === 'practice' && <PracticePage skill={skill} records={records} setSkill={(next) => { setSkill(next); setProblem(createProblem(next, level)); setFeedback(null); setSelected('') }} problem={problem} selected={selected} setSelected={setSelected} feedback={feedback} onSubmit={submitAnswer} onNext={nextProblem} onVoice={startListening} voiceMessage={voiceMessage} level={level} onAskTutor={openTutor} skills={SKILLS} />}
          {page === 'quizzes' && <QuizPage quiz={quiz} quizIndex={quizIndex} quizAnswers={quizAnswers} skill={skill} problem={problem} selected={selected} setSelected={setSelected} onStart={startPractice} onNext={handleQuizAnswer} onAskTutor={openTutor} onOpenScratch={openScratchModal} quizTopics={QUIZ_TOPICS} />}
          {page === 'progress' && <ProgressPage progress={progress} accuracy={accuracy} level={level} onPractice={startPractice} onNavigate={navigate} skills={SKILLS} />}
        </div>
        <footer className="footer"><span>Physics learning, offline-first.</span><span><Icon name="lock" size={13} /> Your learning data stays yours</span></footer>
      </main>
      {scratchModalOpen && <ScratchPadModal context={scratchContext} onClose={closeScratchModal} onAskTutor={openTutor} />}
      {calculatorModalOpen && <CalculatorModal onClose={closeCalculatorModal} onAskTutor={openTutor} />}
      {searchModalOpen && <Suspense fallback={null}><LazyUniversalSearch context={searchContext} pageContext={pageSearchContext} index={SEARCH_INDEX} onAction={runSearchAction} onClose={closeSearchModal} onInference={recordInference} /></Suspense>}
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
        <div><p className="eyebrow">{today} <span className="eyebrow-line" /></p><h1>A little progress<br className="mobile-break" /> goes a <em>long way.</em></h1><p className="welcome-subtitle">Good to see you, Alex. Ready to make a circuit click?</p></div>
        <div className="welcome-illustration" aria-hidden="true"><span className="illustration-orbit orbit-one" /><span className="illustration-orbit orbit-two" /><span className="illustration-spark spark-a">✳</span><span className="illustration-spark spark-b">·</span><span className="illustration-number">Ω</span><span className="illustration-equation">V = IR</span><span className="illustration-caption">little by little</span></div>
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
          <button className="applied-feature-card" onClick={() => onNavigate('applied')}><span className="applied-feature-icon">Ω</span><span className="applied-feature-copy"><small>PHYSICS, OUT IN THE LAB</small><strong>The Lab</strong><span>From circuit analysis to semiconductor device design.</span></span><span className="applied-feature-arrow"><Icon name="arrow" size={18} /></span><span className="applied-feature-equation" aria-hidden="true">np=n_i²</span></button>
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
  const prefix = ({ "Ohm's Law": 'Find the current: ', Power: 'Find the power: ', 'Series/Parallel': 'Find the equivalent resistance: ', 'Drift Velocity': 'Find the drift velocity: ', 'Carrier Concentration': 'Find the carrier concentration: ', 'Diode Equation': 'Find the diode current: ', 'BJT Gains': 'Find the collector current: ', 'JFET/MOSFET': 'Find the drain current: ' })[record.skill] || ''
  const label = record.field ? `${record.field} · ${record.skill}` : `${record.skill} ${record.source === 'solver' ? 'solver' : 'practice'}`
  return <div className="activity-row"><span className={`activity-check ${record.correct ? 'correct' : 'missed'}`}>{record.correct ? <Icon name="check" size={13} /> : '·'}</span><span className="activity-copy"><strong>{label}</strong><small>{record.expression ? <MathDisplay className="activity-equation" value={record.expression} latex={record.mathLatex} displayMode={false} /> : record.problem.replace(prefix, '')}</small></span><span className="activity-time">{formatTime(record.timestamp)}</span></div>
}

function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toDateString() === new Date().toDateString() ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function AppliedCalculusPage({ records, level, onRecord, onAskTutor, onOpenScratch, field, setField, problem, setProblem, selected, setSelected, feedback, setFeedback, appliedFields }) {
  const fieldInfo = appliedFields.find((item) => item.name === field) || appliedFields[0]
  const fieldRecords = records.filter((record) => record.skill === 'Applied Physics' && record.field === field)
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
      <section className="applied-intro"><span className="applied-intro-symbol">Ω</span><div><p className="eyebrow">THE LAB TRACK</p><h2>From equations to working devices.</h2><p>Physical laws describe how circuits and devices behave. Work through practical examples, see every step, and connect the mathematics to your lab work.</p></div><span className="applied-intro-decoration" aria-hidden="true">V = IR</span></section>
      <section className="applied-fields" aria-label="Choose an application area">
        {appliedFields.map((item) => <button key={item.name} className={`applied-field-card ${field === item.name ? 'selected' : ''}`} onClick={() => changeField(item.name)} aria-pressed={field === item.name}><span className={`applied-field-icon ${item.tone}`}>{item.icon}</span><span className="applied-field-name">{item.name}</span><span className="applied-field-detail">{item.detail}</span><span className="applied-field-example">{item.example} <Icon name="arrow" size={13} /></span></button>)}
      </section>
      <HelpTools title="Stuck on this scenario?" description="Ask the tutor for a hint or sketch the circuit on your scratch pad." context={helpContext} onAskTutor={onAskTutor} onOpenScratch={onOpenScratch} />
      <div className="applied-workspace">
        <section className="question-card applied-question">
          <div className="question-top"><div className="question-topic"><span className={`applied-field-icon compact ${fieldInfo.tone}`}>{fieldInfo.icon}</span><strong>{field}</strong></div><span className="question-count"><span className="question-count-dot" /> LAB PROBLEM</span></div>
          <div className="question-content"><p className="question-prompt">{problem.prompt}</p><MathDisplay className="math-expression applied-expression" value={problem.expression} latex={problem.mathLatex} /><p className="answer-prompt">Choose the result that best fits the situation.</p></div>
          <fieldset className="answer-options" disabled={Boolean(feedback)}><legend className="sr-only">Answer choices</legend>{problem.options.map((option, index) => <label className={`answer-option ${selected === option ? 'selected' : ''} ${feedback && option === problem.answer ? 'answer-correct' : ''} ${feedback && selected === option && !feedback.correct ? 'answer-wrong' : ''}`} key={option}><input type="radio" name="applied-answer" value={option} checked={selected === option} onChange={() => setSelected(option)} /><span className="answer-letter">{String.fromCharCode(65 + index)}</span><MathDisplay className="answer-value" value={option} displayMode={false} />{feedback && option === problem.answer && <Icon name="check" size={17} />}</label>)}</fieldset>
          {feedback && <div className={`feedback-panel ${feedback.correct ? 'feedback-good' : 'feedback-try'}`} role="status"><span className="feedback-mark">{feedback.correct ? '✓' : '↗'}</span><div><strong>{feedback.correct ? 'That\'s the result.' : 'Let\'s trace the reasoning.'}</strong><p>{feedback.correct ? 'You connected the physics to the system.' : `The answer is ${feedback.answer}. Here's how the physics gets us there.`}</p><ol>{feedback.steps.map((step) => <li key={step}><MathContent className="feedback-step-content" content={step} /></li>)}</ol></div></div>}
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
    ? metrics.totalDurationMs < 1000 ? `${Math.round(metrics.totalDurationMs)} ms` : `${(metrics.totalDurationMs / 1000).toFixed(1)} s`
    : 'time n/a'
  const evaluation = Number.isFinite(metrics.evaluationDurationMs) ? `${Math.round(metrics.evaluationDurationMs)} ms generation` : 'generation time n/a'
  return <div className={`tutor-inference-meter ${approximate ? 'estimated' : ''}`} title={approximate ? 'Estimated from response length and total request time. Restart npm run dev to enable exact Ollama metrics.' : `${metrics.promptTokens} prompt tokens · ${metrics.completionTokens} generated tokens · ${evaluation} · ${duration}`}>
    <span className="inference-meter-track"><i style={{ width: `${width}%` }} /></span>
    <strong>{rate ? `${approximate ? '≈' : ''}${rate.toFixed(1)} tok/s` : '— tok/s'}</strong>
    <small>{metrics.promptTokens || 0} in · {metrics.completionTokens || 0} out · {approximate ? 'estimated' : duration}</small>
  </div>
}

function OllamaTutorPage({ initialContext, returnPage, onBack, onOpenScratch, onInference, copiedMessage, copyError, onCopy }) {
  const [connection, setConnection] = useState('checking')
  const [models, setModels] = useState([])
  const [model, setModel] = useState(() => localStorage.getItem('electralab-ollama-model') || '')
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const draftTextareaRef = useRef(null)
  const [context, setContext] = useState(initialContext)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [streamingAnswer, setStreamingAnswer] = useState('')
  const [stoppedNotice, setStoppedNotice] = useState('')
  const abortControllerRef = useRef(null)
  const cancelReasonRef = useRef('')
  const messageEndRef = useRef(null)

  async function refreshConnection() {
    setConnection('checking')
    try {
      const status = await checkOllama()
      setModels(status.models)
      setConnection(status.connected ? 'connected' : 'offline')
      setModel((current) => preferredTutorModel(status.models, current))
    } catch {
      setModels([])
      setConnection('offline')
    }
  }

  useEffect(() => {
    refreshConnection()
  }, [])

  useEffect(() => {
    setContext(initialContext)
  }, [initialContext])

  useEffect(() => {
    if (model) localStorage.setItem('electralab-ollama-model', model)
  }, [model])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, sending, streamingAnswer])

  useEffect(() => () => {
    cancelReasonRef.current = 'unmount'
    abortControllerRef.current?.abort()
  }, [])

  async function sendMessage(event) {
    event.preventDefault()
    const question = draft.trim()
    if (!question || !model || sending) return
    const selectedModel = model
    const conversation = [...messages, { role: 'user', content: question }].slice(-12)
    const controller = new AbortController()
    let partialAnswer = ''
    const startedAt = performance.now()
    abortControllerRef.current = controller
    cancelReasonRef.current = ''
    setMessages(conversation)
    setDraft('')
    setError('')
    setStoppedNotice('')
    setStreamingAnswer('')
    setSending(true)
    try {
      const answer = await askOllamaStream({
        model: selectedModel,
        messages: conversation,
        context,
        walkthrough: false,
        signal: controller.signal,
        onToken: (token) => {
          partialAnswer += token
          setStreamingAnswer(partialAnswer)
        },
      })
      const metrics = getInferenceMetrics(answer, conversation, context, performance.now() - startedAt)
      const inference = { model: answer.model || selectedModel, ...metrics, timestamp: new Date().toISOString() }
      setMessages((current) => [...current, { role: 'assistant', content: answer.message, metrics }].slice(-12))
      onInference(inference)
    } catch (requestError) {
      const cancelReason = cancelReasonRef.current
      if (partialAnswer.trim()) {
        const metrics = getInferenceMetrics({ message: partialAnswer }, conversation, context, performance.now() - startedAt)
        onInference({ model: selectedModel, ...metrics, timestamp: new Date().toISOString() })
        if (!['revise', 'unmount'].includes(cancelReason)) {
          setMessages((current) => [...current, { role: 'assistant', content: partialAnswer, metrics, interrupted: true }].slice(-12))
        }
      }
      if (controller.signal.aborted) {
        if (cancelReason === 'stop' && !partialAnswer.trim()) setStoppedNotice('Generation stopped before a reply arrived.')
      } else {
        if (partialAnswer.trim()) setError(`The response stopped early: ${requestError.message}`)
        else setError(requestError.message)
      }
    } finally {
      const cancelReason = cancelReasonRef.current
      const isUnmounting = cancelReasonRef.current === 'unmount'
      if (abortControllerRef.current === controller) abortControllerRef.current = null
      if (!isUnmounting) {
        cancelReasonRef.current = ''
        setStreamingAnswer('')
        setSending(false)
        if (cancelReason === 'revise') window.requestAnimationFrame(() => draftTextareaRef.current?.focus())
      }
    }
  }

  function stopGeneration() {
    if (!abortControllerRef.current) return
    cancelReasonRef.current = 'stop'
    abortControllerRef.current.abort()
  }

  function reviseMessage(index) {
    const message = messages[index]
    if (message?.role !== 'user') return
    if (abortControllerRef.current) {
      cancelReasonRef.current = 'revise'
      abortControllerRef.current.abort()
    }
    setMessages(messages.slice(0, index))
    setDraft(message.content)
    setError('')
    setStoppedNotice('')
    setStreamingAnswer('')
    window.requestAnimationFrame(() => draftTextareaRef.current?.focus())
  }

  function insertTutorNotation(insertion, cursorOffset) {
    const textarea = draftTextareaRef.current
    const start = textarea?.selectionStart ?? draft.length
    const end = textarea?.selectionEnd ?? start
    if (draft.length - (end - start) + insertion.length > 4000) return
    setDraft(`${draft.slice(0, start)}${insertion}${draft.slice(end)}`)
    const cursor = start + (cursorOffset ?? insertion.length)
    window.requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(cursor, cursor)
    })
  }

  function clearContext() {
    setContext('')
  }

  const ready = connection === 'connected' && Boolean(model)
  const draftPreview = prepareMathPreviewContent(draft)
  const showDraftPreview = draftPreview !== draft || ['$', '\\(', '\\[', '**', '__', '`'].some((marker) => draft.includes(marker))
  return (
    <div className="tutor-page">
      <div className="page-title-row"><div><button className="back-link tutor-back" onClick={onBack}>← Back to {pageLabel(returnPage)}</button><p className="eyebrow">YOUR PRIVATE, LOCAL PHYSICS GUIDE</p><h1>Let’s figure it <em>out together.</em></h1><p className="page-description">Ask for a hint, a clearer explanation, or another way to think about the problem.</p></div><span className={`level-chip tutor-connection ${connection}`}><span className="tutor-connection-dot" />{connection === 'connected' ? 'Ollama connected' : connection === 'checking' ? 'Checking Ollama' : 'Ollama not connected'}</span></div>
      <div className="tutor-layout">
        <section className="tutor-chat-card">
          <header className="tutor-chat-header"><div className="tutor-avatar"><Icon name="spark" size={18} /></div><div className="tutor-header-copy"><strong>ElectraLab tutor</strong><span>{ready ? `Running locally with ${model}` : 'Your questions stay on this device'}</span></div><div className="tutor-model-picker"><label htmlFor="ollama-model">MODEL</label><select id="ollama-model" value={model} onChange={(event) => setModel(event.target.value)} disabled={!models.length || sending} aria-label="Choose a local Ollama model" title={sending ? 'Stop the current turn before changing models' : 'Choose an installed local model'}>{models.length ? models.map((item) => <option key={item.name} value={item.name}>{item.name}</option>) : <option value="">No local models found</option>}</select></div></header>
          <div className="tutor-transcript" aria-live="polite" aria-label="Tutoring conversation">
            {!messages.length && <div className="tutor-welcome"><span className="tutor-welcome-mark">Ω</span><p className="eyebrow">{ready ? 'READY WHEN YOU ARE' : 'LOCAL TUTORING'}</p><h2>{ready ? 'What are you working through?' : connection === 'checking' ? 'Checking for your local model…' : 'Your tutor runs with Ollama.'}</h2><p>{ready ? 'I can offer a hint first, explain a step, or help connect the physics to a circuit or semiconductor problem.' : 'Start Ollama and install a model on this device to enable private, in-app guidance.'}</p>{!ready && <div className="tutor-setup"><span>1</span><p>Start the Ollama app or service.</p><span>2</span><p>Install a model, for example <code>ollama pull qwen2.5:3b</code>.</p><span>3</span><p>Refresh this connection to begin.</p></div>}</div>}
            {messages.map((message, index) => <article className={`tutor-message ${message.role}${message.interrupted ? ' interrupted' : ''}`} key={`${message.role}-${index}`}><div className="tutor-message-head"><span className="tutor-message-label">{message.role === 'assistant' ? `ELECTRALAB TUTOR${message.interrupted ? ' · STOPPED' : ''}` : 'YOU'}</span><div className="tutor-message-actions">{message.role === 'user' && <button className="tutor-message-action" type="button" title="Edit this prompt and remove all later turns" aria-label="Revise this prompt and remove later turns" onClick={() => reviseMessage(index)}>Revise</button>}{message.role === 'assistant' && <button className="tutor-copy-button" onClick={() => onCopy(message.content, index)} aria-label={copiedMessage === index ? 'Tutor response copied' : 'Copy tutor response'}><Icon name={copiedMessage === index ? 'check' : 'copy'} size={13} />{copiedMessage === index ? 'Copied' : 'Copy'}</button>}</div></div><MathContent className="tutor-message-content" content={message.role === 'user' ? prepareMathPreviewContent(message.content) : message.content} />{message.interrupted && <p className="tutor-interrupted-note">Partial response; generation was stopped.</p>}{message.metrics && <InferenceMeter metrics={message.metrics} />}</article>)}
            {sending && (streamingAnswer ? <article className="tutor-message assistant tutor-streaming"><span className="tutor-message-label">ELECTRALAB TUTOR · GENERATING</span><MathContent className="tutor-message-content" content={streamingAnswer} /></article> : <article className="tutor-message assistant tutor-thinking"><span className="tutor-message-label">ELECTRALAB TUTOR</span><p><span /><span /><span /> Thinking through it…</p></article>)}
            {stoppedNotice && <p className="tutor-stopped-notice" role="status">{stoppedNotice}</p>}
            <div ref={messageEndRef} />
          </div>
          {context && <div className="tutor-context"><span><Icon name="check" size={13} /> Problem context attached</span><button onClick={clearContext} aria-label="Remove attached problem context">Remove</button><p>{context.split('\n')[0]}</p></div>}
          {error && <div className="tutor-error" role="alert"><span>{error}</span><button onClick={refreshConnection}>Check connection</button></div>}
          {copyError && <p className="copy-error" role="status">{copyError}</p>}
          <form className="tutor-composer" onSubmit={sendMessage}>
            <label className="sr-only" htmlFor="tutor-question">Ask the local physics tutor</label>
            <textarea ref={draftTextareaRef} id="tutor-question" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={4000} placeholder={ready ? 'Ask a question or request a hint…' : 'Connect a local Ollama model to start tutoring…'} disabled={!ready || sending} rows={2} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit() } }} />
            {showDraftPreview && <section className="tutor-draft-preview" aria-label="Formatted message preview"><span className="tutor-draft-preview-label">FORMATTED PREVIEW</span><MathContent className="tutor-draft-preview-content" content={draftPreview} /></section>}
            <div className="tutor-composer-tools">
              <span>Build a formula · pasted notation previews below</span>
              <MathNotationPicker className="tutor-formula-picker" mode="formula" buttonLabel="Formula builder" onSelect={insertTutorNotation} />
            </div>
            <div className="tutor-composer-bottom"><span>{sending ? `Generating with ${model} · stop to switch models` : ready ? `Private local session · ${draft.length}/4,000` : 'No cloud tutor fallback is used'}</span>{sending ? <button className="button tutor-stop-button" type="button" aria-label="Stop the current tutor response" onClick={stopGeneration}>Stop</button> : <button className="button button-primary" type="submit" disabled={!ready || !draft.trim()}>Ask tutor <Icon name="arrow" size={15} /></button>}</div>
          </form>
        </section>
        <aside className="tutor-aside"><section className="coach-card"><span className="coach-orb"><Icon name="lock" size={15} /></span><p className="eyebrow">LOCAL BY DESIGN</p><h2>Your tutor stays<br />on your machine.</h2><p>ElectraLab sends your question to the Ollama service on this device. It does not use a hosted AI or save chat messages to your learning history.</p><p className="tutor-caveat">AI explanations can make mistakes. Check the reasoning, units, and sign against your worked solution.</p></section><section className="tutor-scratch-card"><span className="tutor-scratch-mark"><Icon name="pencil" size={16} /></span><div><p className="eyebrow">WORK IT OUT</p><strong>Scratch alongside your tutor</strong><span>Draw a circuit diagram or keep your steps nearby.</span></div><button className="button button-subtle" onClick={() => onOpenScratch(context)}><Icon name="arrow" size={14} /> Open</button></section><section className="tutor-hints"><p className="eyebrow">A FEW WAYS TO START</p>{['Can you give me a hint, not the answer?', 'Why is the depletion region wider in reverse bias?', 'How does drift velocity relate to current?'].map((question) => <button key={question} onClick={() => setDraft(question)} disabled={!ready}>{question}<Icon name="arrow" size={14} /></button>)}</section><button className="button button-subtle tutor-refresh" onClick={refreshConnection} disabled={connection === 'checking'}><Icon name="bolt" size={15} /> {connection === 'checking' ? 'Checking…' : 'Check Ollama connection'}</button></aside>
      </div>
    </div>
  )
}

function ProblemSolverPage({ mode, setMode, result, error, onSolve, onAskTutor, skills }) {
  const [input, setInput] = useState('')
  const example = SOLVER_EXAMPLES[mode] || 'V = 12, R = 6'
  function readSteps() {
    if (!result || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(`${result.answer}. ${result.steps.join(' ')}`))
  }
  return (
    <div className="solver-page">
      <div className="page-title-row"><div><p className="eyebrow">A TOOL FOR THINKING</p><h1>The Solver <em>lab.</em></h1><p className="page-description">Choose a physics topic, type your problem, then work through it step by step.</p></div><span className="level-chip"><Icon name="bolt" size={15} /> Works offline</span></div>
      <div className="solver-layout">
        <section className="solver-card">
          <div className="solver-heading"><span className="solver-icon">Ω</span><div><p className="eyebrow">YOUR PERSONAL PHYSICS HELPER</p><h2>What are you working on?</h2></div></div>
          <div className="solver-modes" role="group" aria-label="Physics topic">{skills.map((item) => <button key={item.name} className={`solver-mode ${mode === item.name ? 'active' : ''}`} onClick={() => setMode(item.name)} aria-pressed={mode === item.name}><span className={`topic-symbol ${item.tone}`}>{item.icon}</span>{item.name}</button>)}</div>
          <form onSubmit={(event) => { event.preventDefault(); onSolve(input) }}>
            <label className="solver-label" htmlFor="physics-problem">Your problem</label>
            <div className="solver-input-row"><input id="physics-problem" value={input} onChange={(event) => setInput(event.target.value)} placeholder={example} autoComplete="off" /><button className="button button-primary" type="submit" disabled={!input.trim()}>Solve it <Icon name="arrow" size={16} /></button></div>
            <p className="solver-example">Try an example: <button type="button" onClick={() => setInput(example)}>{example}</button></p>
          </form>
          {error && <p className="solver-error" role="alert">{error}</p>}
          {result ? <section className="solver-result" aria-live="polite"><div className="result-top"><span className="result-check"><Icon name="check" size={15} /></span><span className="eyebrow">LET’S BREAK IT DOWN</span><button className="text-link" onClick={readSteps}><Icon name="volume" size={15} /> Read it aloud</button></div><div className="result-answer">{result.answer}</div><ol className="solver-steps">{result.steps.map((step) => <li key={step}><MathContent className="solver-step-content" content={step} /></li>)}</ol><button className="button button-subtle tutor-context-button" onClick={() => onAskTutor(`Problem: ${result.input}\nMy current result: ${result.answer}\nMy working: ${result.steps.join(' ')}`)}><Icon name="chat" size={15} /> Ask your local tutor about this</button></section> : <div className="solver-empty"><span className="empty-icon">Ω</span><p>Your explanation will show up here.</p><span>We’ll take it one step at a time.</span></div>}
          <p className="solver-privacy"><Icon name="lock" size={13} /> Your problem and progress stay on this device.</p>
        </section>
        <aside className="solver-aside"><section className="coach-card"><span className="coach-orb">✳</span><p className="eyebrow">A NOTE FROM YOUR STUDY BUDDY</p><h2>Answers are nice.<br />Understanding is better.</h2><p>Use the steps as a guide, then try explaining the idea in your own words. That’s when it really sticks.</p></section><section className="solver-support"><p className="eyebrow">WHAT I CAN HELP WITH</p><div><span>Ω</span><p><strong>Circuits</strong><small>Ohm’s law, power, series & parallel resistance</small></p></div><div><span>n,p</span><p><strong>Semiconductors</strong><small>Drift velocity, carriers, diode equation</small></p></div><div><span>β</span><p><strong>Transistors</strong><small>BJT gains, JFET & MOSFET bias current</small></p></div></section><section className="offline-note"><Icon name="bolt" size={16} /><span>No internet needed. No data leaves your device.</span></section></aside>
      </div>
    </div>
  )
}

function PracticePage({ skill, records, setSkill, problem, selected, setSelected, feedback, onSubmit, onNext, onVoice, voiceMessage, level, onAskTutor, skills }) {
  const skillProgress = useMemo(() => getSkillProgress(records, skill), [records, skill])
  const selectedSkill = skills.find((item) => item.name === skill) || skills[0]
  return (
    <div className="practice-page">
      <div className="page-title-row"><div><p className="eyebrow">PRACTICE, YOUR WAY</p><h1>Make it <em>click.</em></h1><p className="page-description">One thoughtful question at a time. You’ve got this.</p></div><span className="level-chip"><Icon name="bolt" size={15} /> Adaptive level {level}</span></div>
      <div className="practice-layout">
        <section className="question-card">
          <div className="question-top"><div className="question-topic"><span className={`topic-symbol ${selectedSkill.tone}`}>{selectedSkill.icon}</span><select value={skill} onChange={(event) => setSkill(event.target.value)} aria-label="Choose a practice topic">{skills.map((item) => <option key={item.name}>{item.name}</option>)}</select></div><span className="question-count"><span className="question-count-dot" /> YOUR NEXT QUESTION</span></div>
          <div className="question-content"><p className="question-prompt">{problem.prompt}</p><MathDisplay className="math-expression" value={problem.expression} latex={problem.mathLatex} /><p className="answer-prompt">Choose the answer that feels right.</p></div>
          <fieldset className="answer-options" disabled={Boolean(feedback)}><legend className="sr-only">Answer choices</legend>{problem.options.map((option, index) => <label className={`answer-option ${selected === option ? 'selected' : ''} ${feedback && option === problem.answer ? 'answer-correct' : ''} ${feedback && selected === option && !feedback.correct ? 'answer-wrong' : ''}`} key={option}><input type="radio" name="answer" value={option} checked={selected === option} onChange={() => setSelected(option)} /><span className="answer-letter">{String.fromCharCode(65 + index)}</span><MathDisplay className="answer-value" value={option} displayMode={false} />{feedback && option === problem.answer && <Icon name="check" size={17} />}</label>)}</fieldset>
          {feedback && <><div className={`feedback-panel ${feedback.correct ? 'feedback-good' : 'feedback-try'}`} role="status"><span className="feedback-mark">{feedback.correct ? '✓' : '↗'}</span><div><strong>{feedback.correct ? 'That’s it. Nice work.' : 'Not quite—and that’s okay.'}</strong><p>{feedback.correct ? 'You got there by thinking it through.' : `The answer is ${feedback.answer}. Let’s walk through it together.`}</p><ol>{feedback.steps.map((step) => <li key={step}><MathContent className="feedback-step-content" content={step} /></li>)}</ol></div></div><button className="button button-subtle tutor-context-button" onClick={() => onAskTutor(`Practice problem (${skill}): ${problem.prompt}\n${problem.expression}\nMy answer: ${selected}\nCorrect answer: ${problem.answer}\nWorking: ${problem.steps.join(' ')}`)}><Icon name="chat" size={15} /> Ask your local tutor about this</button></>}
          {voiceMessage && <p className="voice-message" role="status">{voiceMessage}</p>}
          <div className="question-actions">{!feedback ? <><button className="button button-primary submit-button" onClick={onSubmit} disabled={!selected}>Check my answer <Icon name="arrow" size={16} /></button><button className="button button-subtle voice-button" onClick={onVoice}><Icon name="mic" size={16} /> Say your answer</button></> : <button className="button button-primary submit-button" onClick={onNext}>Try another <Icon name="arrow" size={16} /></button>}</div>
          <div className="question-footnote"><Icon name="lock" size={13} /> Your work is saved privately on this device.</div>
        </section>
        <aside className="practice-aside"><section className="coach-card"><span className="coach-orb">✳</span><p className="eyebrow">A FRIENDLY REMINDER</p><h2>Understanding<br />takes its own time.</h2><p>Try a guess, notice what happens, and use the steps to make sense of it.</p></section><section className="practice-progress-card"><div className="panel-heading"><div><p className="eyebrow">YOUR LEARNING PATH</p><h2>Topic progress</h2></div></div><div className="topic-progress-row"><span className={`skill-icon small ${selectedSkill.tone}`}>{selectedSkill.icon}</span><span className="topic-progress-copy"><strong>{skill}</strong><small>{skillProgress}% explored</small></span></div><div className="topic-progress-track"><span style={{ width: `${skillProgress}%` }} /></div><p className="progress-note">Each practice session helps personalize what you see next.</p></section><section className="offline-note"><Icon name="bolt" size={16} /><span>Works offline, too.</span></section></aside>
      </div>
    </div>
  )
}

function QuizPage({ quiz, quizIndex, quizAnswers, skill, problem, selected, setSelected, onStart, onNext, onAskTutor, onOpenScratch, quizTopics }) {
  if (!quiz) {
    return <div className="quiz-page"><div className="page-title-row"><div><p className="eyebrow">LOW-PRESSURE CHECK-IN</p><h1>Practice what <em>you know.</em></h1><p className="page-description">Short quizzes, no timers, and no judgment. Just a way to notice how far you’ve come.</p></div></div><div className="quiz-grid">{quizTopics.map((item) => <article className="quiz-topic-card" key={item.name}><span className={`skill-icon ${item.tone}`}>{item.icon}</span><span className="quiz-duration"><Icon name="clock" size={14} /> {item.time}</span><h2>{item.name}</h2><p>{item.questions} questions to help it all settle in.</p><button className="button button-secondary" onClick={() => onStart(item.skill, true)}>Start a little quiz <Icon name="arrow" size={15} /></button></article>)}</div><HelpTools title="Want a little help before you begin?" description="Ask for a concept refresher or open a page to work things out." context="I am preparing for an ElectraLab physics quiz. Help me review a concept with a hint-first explanation." onAskTutor={onAskTutor} onOpenScratch={onOpenScratch} /><section className="quiz-reassurance"><span>✳</span><p><strong>It’s about learning, not scoring.</strong> Take a breath, take your time, and remember: every answer teaches you something.</p></section></div>
  }

  if (quiz.complete) {
    const score = quizAnswers.filter((answer) => answer.correct).length
    const reviewContext = `I finished a ${skill} quiz and got ${score} out of ${quizAnswers.length} correct. Help me review the ideas I may need to revisit.`
    return <div className="quiz-page"><QuizComplete answers={quizAnswers} onAgain={() => onStart(skill, true)} onBack={() => onStart(skill)} /><HelpTools title="Review anything that felt tricky?" description="Take a question to the tutor or work it through on the scratch pad." context={reviewContext} onAskTutor={onAskTutor} onOpenScratch={onOpenScratch} /></div>
  }

  const questionContext = [
    `I am on question ${quizIndex + 1} of a ${skill} quiz.`,
    `Problem: ${problem.prompt}`,
    `Expression: ${problem.expression}`,
    selected ? `My current choice is ${selected}.` : '',
    'Please give me a hint without revealing the answer.',
  ].filter(Boolean).join('\n')
  return <div className="quiz-page"><button className="back-link" onClick={() => onStart(skill)}><span>←</span> Leave quiz</button><div className="quiz-session"><div className="quiz-session-top"><div><p className="eyebrow">A MOMENT TO CHECK IN</p><h1>{skill} <em>quiz</em></h1></div><span className="quiz-step">Question {quizIndex + 1} <span>/ 5</span></span></div><div className="quiz-step-track"><span style={{ width: `${((quizIndex + 1) / 5) * 100}%` }} /></div><div className="question-content quiz-question-content"><p className="question-prompt">{problem.prompt}</p><MathDisplay className="math-expression" value={problem.expression} latex={problem.mathLatex} /><p className="answer-prompt">Which answer feels right to you?</p></div><fieldset className="answer-options"><legend className="sr-only">Answer choices</legend>{problem.options.map((option, index) => <label className={`answer-option ${selected === option ? 'selected' : ''}`} key={option}><input type="radio" name="quiz-answer" value={option} checked={selected === option} onChange={() => setSelected(option)} /><span className="answer-letter">{String.fromCharCode(65 + index)}</span><MathDisplay className="answer-value" value={option} displayMode={false} /></label>)}</fieldset><HelpTools title="Need a hand with this question?" description="Get a hint from the local tutor or open it on your scratch pad. Your quiz will be here when you return." context={questionContext} onAskTutor={onAskTutor} onOpenScratch={onOpenScratch} /><button className="button button-primary quiz-next" onClick={onNext} disabled={!selected}>{quizIndex === 4 ? 'See how I did' : 'Next question'} <Icon name="arrow" size={16} /></button><p className="quiz-no-timer"><Icon name="clock" size={14} /> No timer. Take all the time you need.</p></div></div>
}

function HelpTools({ title, description, context, onAskTutor, onOpenScratch }) {
  return <section className="help-tools" aria-label="Study help"><div className="help-tools-copy"><span className="help-tools-mark">?</span><div><strong>{title}</strong><p>{description}</p></div></div><div className="help-tools-actions"><button className="button button-secondary" onClick={() => onAskTutor(context)}><Icon name="chat" size={15} /> Ask physics tutor</button><button className="button button-subtle" onClick={() => onOpenScratch(context)}><Icon name="pencil" size={15} /> Open scratch pad</button></div></section>
}

function QuizComplete({ answers, onAgain, onBack }) {
  const correct = answers.filter((answer) => answer.correct).length
  return <div className="quiz-complete"><span className="complete-burst">✳</span><p className="eyebrow">THAT’S FIVE MOMENTS OF PRACTICE</p><h1>You showed up.<br /><em>That’s what counts.</em></h1><p className="complete-score">{correct} <span>out of</span> {answers.length} <span>felt familiar this time</span></p><div className="complete-review">{answers.map((answer, index) => <div key={index} className="review-row"><span className={`review-icon ${answer.correct ? 'correct' : ''}`}>{answer.correct ? '✓' : '·'}</span><span>{answer.problem.skill}</span><MathDisplay className="review-expression" value={answer.problem.expression} displayMode={false} /><MathDisplay className="review-answer" value={answer.problem.answer} displayMode={false} /></div>)}</div><div className="complete-actions"><button className="button button-primary" onClick={onAgain}>Try another quiz <Icon name="arrow" size={15} /></button><button className="button button-subtle" onClick={onBack}>Practice a topic</button></div></div>
}

function ScratchPadModal({ context, onClose, onAskTutor }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current?.querySelector('textarea, button')?.focus()
  }, [])

  function keepFocusInside(event) {
    if (event.key !== 'Tab') return
    const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)')]
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return <div className="scratch-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section ref={dialogRef} className="scratch-modal" role="dialog" aria-modal="true" aria-labelledby="scratch-modal-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={keepFocusInside}><ScratchPad context={context} inModal onClose={onClose} onAskTutor={onAskTutor} /></section></div>
}

function CalculatorModal({ onClose, onAskTutor }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current?.querySelector('button, input')?.focus()
  }, [])

  function keepFocusInside(event) {
    if (event.key !== 'Tab') return
    const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)')]
    if (!focusable.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return <div className="calculator-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section ref={dialogRef} className="calculator-modal" role="dialog" aria-modal="true" aria-labelledby="calculator-modal-title" onMouseDown={(event) => event.stopPropagation()} onKeyDown={keepFocusInside}>
    <header className="calculator-modal-header"><div><p className="eyebrow">QUICK UTILITY</p><h2 id="calculator-modal-title">Calculator</h2></div><button className="calculator-modal-close" type="button" onClick={onClose} aria-label="Close calculator">×</button></header>
    <CalculatorPage onAskTutor={onAskTutor} />
  </section></div>
}

function ProgressPage({ progress, accuracy, level, onPractice, onNavigate, skills }) {
  const records = progress.records
  const correct = records.filter((record) => record.correct).length
  const topics = [...skills, { name: 'Applied Physics', detail: 'Circuits, semiconductors & electronic design', icon: 'Ω', tone: 'mint' }]
  const bySkill = topics.map((item) => ({ ...item, solved: records.filter((record) => record.skill === item.name).length, progress: getSkillProgress(records, item.name) }))
  return <div className="progress-page"><div className="page-title-row"><div><p className="eyebrow">YOUR STORY SO FAR</p><h1>Look how far <em>you’ve come.</em></h1><p className="page-description">Progress isn’t a straight line. Every little bit belongs here.</p></div><span className="level-chip"><Icon name="bolt" size={15} /> Level {level}</span></div><section className="progress-summary"><StatCard label="Problems explored" value={records.length} note="Every attempt matters" icon="check" accent="purple" /><StatCard label="Found your answer" value={correct} note="Thoughtful work adds up" icon="chart" accent="green" /><StatCard label="Accuracy" value={`${accuracy}%`} note="A reflection, not a grade" icon="spark" accent="orange" /></section><div className="progress-content-grid"><section className="progress-panel"><div className="section-heading"><div><p className="eyebrow">GROWING AT YOUR PACE</p><h2>Your topics</h2></div></div><div className="topic-progress-list">{bySkill.map((item) => <div className="topic-detail-row" key={item.name}><span className={`skill-icon ${item.tone}`}>{item.icon}</span><div className="topic-detail-main"><strong>{item.name}</strong><small>{item.solved} {item.solved === 1 ? 'question' : 'questions'} explored</small><span className="topic-progress-track"><i style={{ width: `${item.progress}%` }} /></span></div><button className="text-link" onClick={() => item.name === 'Applied Physics' ? onNavigate('applied') : onPractice(item.name)}>Keep going <Icon name="arrow" size={14} /></button></div>)}</div></section><section className="progress-panel reflection-panel"><span className="reflection-star">✳</span><p className="eyebrow">A THOUGHT TO KEEP</p><h2>Showing up is the hard part. You’re already doing it.</h2><p>Progress is built from the questions you try, the mistakes you learn from, and the curiosity that brings you back.</p><button className="button button-secondary" onClick={() => onPractice("Ohm's Law")}>Try one more <Icon name="arrow" size={15} /></button></section></div></div>
}

export default App

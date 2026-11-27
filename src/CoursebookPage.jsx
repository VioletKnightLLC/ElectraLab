import { useEffect, useMemo, useState } from 'react'
import MathContent from './MathContent.jsx'
import { MathDisplay } from './MathDisplay.jsx'
import './coursebook.css'
import './dark-reading.css'
import './coursebook-content.css'

const STORAGE_KEY = 'electralab-course-progress'

async function loadCourseChapters() {
  try {
    const response = await fetch('/src/data/electra_data.json')
    if (response.ok) {
      const data = await response.json()
      return data.courseChapters || []
    }
  } catch {
    // Fallback handled by component state
  }
  return []
}

function loadCourseProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return {
      currentChapter: saved?.currentChapter || '',
      completedChapters: Array.isArray(saved?.completedChapters) ? saved.completedChapters : [],
    }
  } catch {
    return { currentChapter: '', completedChapters: [] }
  }
}

export default function CoursebookPage({ onPractice, onApplied, onAgent, onAskTutor, onOpenScratch }) {
  const [chapters, setChapters] = useState([])
  const [progress, setProgress] = useState(loadCourseProgress)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [checkResult, setCheckResult] = useState(null)

  useEffect(() => {
    loadCourseChapters().then(data => {
      if (data.length > 0) {
        setChapters(data)
        if (!progress.currentChapter || !data.some(c => c.id === progress.currentChapter)) {
          setProgress(prev => ({ ...prev, currentChapter: data[0].id }))
        }
      }
    })
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    } catch {
      // The reader remains available if browser storage is full.
    }
  }, [progress])

  const chapter = chapters.find(c => c.id === progress.currentChapter) || chapters[0]
  const chapterIndex = chapters.findIndex(c => c.id === progress.currentChapter)
  const readPercent = chapters.length ? Math.round((progress.completedChapters.length / chapters.length) * 100) : 0
  const lessonContext = useMemo(() => [
    `Coursebook chapter: ${chapter?.title || ''}.`,
    chapter?.summary || '',
    `Current section: ${chapter?.sections[0]?.heading || chapter?.title || ''}.`,
    `Key equation: ${chapter?.sections.find(s => s.formula)?.formula || ''}`,
  ].filter(Boolean).join('\n'), [chapter])

  function openChapter(id) {
    setProgress(current => ({ ...current, currentChapter: id }))
    setSelectedAnswer('')
    setCheckResult(null)
  }

  function markRead() {
    if (!chapter) return
    setProgress(current => current.completedChapters.includes(chapter.id)
      ? current
      : { ...current, completedChapters: [...current.completedChapters, chapter.id] })
  }

  function checkRecall() {
    if (!selectedAnswer || !chapter) return
    setCheckResult(selectedAnswer === chapter.check.answer ? 'correct' : 'try-again')
  }

  function goToPractice() {
    if (!chapter) return
    if (chapter.practice.kind === 'skill') onPractice(chapter.practice.value)
    if (chapter.practice.kind === 'applied') onApplied(chapter.practice.value)
    if (chapter.practice.kind === 'matrix') onAgent()
  }

  if (chapters.length === 0) {
    return <div className="coursebook-page"><div className="course-loading">Loading physics coursebook...</div></div>
  }

  return (
    <div className="coursebook-page">
      <header className="coursebook-heading">
        <div><p className="eyebrow">THE ELECTRALAB COURSEBOOK</p><h1>Read, understand, <em>then try.</em></h1><p className="page-description">A guided course in NCERT Physics Class 12: Current Electricity & Semiconductors. Work through each idea at your own pace.</p></div>
        <div className="coursebook-progress-card"><span>{progress.completedChapters.length} <small>/ {chapters.length} chapters read</small></span><div className="coursebook-progress-track"><i style={{ width: `${readPercent}%` }} /></div><small>{readPercent}% through the course</small></div>
      </header>

      <div className="coursebook-layout">
        <nav className="coursebook-toc" aria-label="Course chapters">
          <div className="coursebook-toc-heading"><p className="eyebrow">COURSE CONTENTS</p><strong>Physics for engineering & computing</strong></div>
          {groupChapters(chapters).map(([unit, chaps]) => <section className="coursebook-unit" key={unit}><p>{unit}</p>{chaps.map(item => <button key={item.id} className={`coursebook-toc-link ${chapter?.id === item.id ? 'active' : ''}`} onClick={() => openChapter(item.id)} aria-current={chapter?.id === item.id ? 'page' : undefined}><span className={`chapter-status ${progress.completedChapters.includes(item.id) ? 'read' : ''}`}>{progress.completedChapters.includes(item.id) ? '✓' : ''}</span><span>{item.title}</span><small>{item.minutes} min</small></button>)}</section>)}
          <div className="coursebook-toc-footer"><span className="offline-icon">∿</span><span>Saved on this device. Pick up where you left off.</span></div>
        </nav>

        <article className="course-reader">
          <header className="chapter-header"><div className="chapter-meta"><span>{chapter?.unit || ''}</span><span>·</span><span>{chapter?.minutes || 0} min read</span></div><h2>{chapter?.title || ''}</h2><p>{chapter?.subtitle || ''}</p><div className="chapter-header-actions"><span className="chapter-read-status">{progress.completedChapters.includes(chapter?.id) ? '✓ Chapter read' : 'Reading at your pace'}</span><button className="button button-subtle" onClick={markRead} disabled={progress.completedChapters.includes(chapter?.id)}>{progress.completedChapters.includes(chapter?.id) ? 'Completed' : 'Mark as read'}</button></div></header>

          <section className="chapter-objectives"><p className="eyebrow">AFTER THIS CHAPTER, YOU CAN</p><ul>{chapter?.objectives?.map(objective => <li key={objective}>{objective}</li>)}</ul></section>

          {chapter?.sections?.map(section => <section className="reading-section" key={section.heading}><h3>{section.heading}</h3>{section.paragraphs?.map((paragraph, index) => <MathContent className="reading-prose" content={paragraph} key={index} />)}{section.formula && <MathDisplay className="reading-equation" latex={section.formula} />}{section.note && <aside className="reading-note"><span>NOTE</span><MathContent content={section.note} /></aside>}</section>)}

          <section className="worked-example"><div className="worked-example-kicker"><span>✳</span><p className="eyebrow">WORKED EXAMPLE</p></div><h3>{chapter?.example?.title || ''}</h3><MathContent className="worked-example-setup" content={chapter?.example?.setup || ''} /><ol>{chapter?.example?.steps?.map((step, index) => <li key={index}><span>{index + 1}</span><MathContent content={step} /></li>)}</ol></section>

          <section className="recall-check">
            <div><p className="eyebrow">PAUSE & RECALL</p><MathContent className="recall-question" content={chapter?.check?.question || ''} /></div>
            <fieldset><legend className="sr-only">Choose an answer</legend>{chapter?.check?.options?.map(option => <label key={option} className={`recall-option ${selectedAnswer === option ? 'selected' : ''} ${checkResult && option === chapter?.check?.answer ? 'recall-correct' : ''}`}><input type="radio" name={`recall-${chapter?.id}`} value={option} checked={selectedAnswer === option} onChange={() => { setSelectedAnswer(option); setCheckResult(null) }} /><span>{option}</span></label>)}</fieldset>
            {checkResult && <div className={`recall-feedback ${checkResult}`} role="status"><MathContent content={checkResult === 'correct' ? 'That\'s right. ' + (chapter?.check?.explanation || '') : 'Not quite. The answer is ' + (chapter?.check?.answer || '') + '. ' + (chapter?.check?.explanation || '')} /></div>}
            <button className="button button-primary" onClick={checkRecall} disabled={!selectedAnswer}>Check my understanding</button>
          </section>

          <section className="course-next-steps"><div><p className="eyebrow">READY TO PUT IT TO WORK?</p><h3>Take this idea into practice.</h3><p>Try a problem, ask the local tutor a question, or sketch your own working.</p></div><div className="course-next-actions"><button className="button button-primary" onClick={goToPractice}>{chapter?.practice?.label || 'Practice'}</button><button className="button button-subtle" onClick={() => onAskTutor(lessonContext)}>Ask tutor</button><button className="button button-subtle" onClick={() => onOpenScratch(lessonContext)}>Open scratch pad</button></div></section>

          <nav className="chapter-pagination" aria-label="Chapter navigation"><button className="button button-subtle" onClick={() => openChapter(chapters[chapterIndex - 1].id)} disabled={chapterIndex <= 0}>← Previous chapter</button><span>Chapter {chapterIndex + 1} of {chapters.length}</span><button className="button button-subtle" onClick={() => openChapter(chapters[chapterIndex + 1].id)} disabled={chapterIndex >= chapters.length - 1}>Next chapter →</button></nav>
        </article>
      </div>
    </div>
  )
}

function groupChapters(chapters) {
  return chapters.reduce((groups, chapter) => {
    const group = groups.find(([unit]) => unit === chapter.unit)
    if (group) group[1].push(chapter)
    else groups.push([chapter.unit, [chapter]])
    return groups
  }, [])
}
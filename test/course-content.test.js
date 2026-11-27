import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const data = JSON.parse(readFileSync(new URL('../src/data/electra_data.json', import.meta.url), 'utf8'))
const COURSE_CHAPTERS = data.courseChapters

test('coursebook chapters form a complete reading-to-practice path', () => {
  assert.ok(COURSE_CHAPTERS.length >= 6)
  assert.equal(new Set(COURSE_CHAPTERS.map((chapter) => chapter.id)).size, COURSE_CHAPTERS.length)

  for (const chapter of COURSE_CHAPTERS) {
    assert.ok(chapter.title)
    assert.ok(chapter.unit)
    assert.ok(chapter.minutes > 0)
    assert.ok(chapter.objectives.length > 0)
    assert.ok(chapter.sections.length > 0)
    assert.ok(chapter.example.steps.length > 0)
    assert.ok(chapter.check.options.includes(chapter.check.answer))
    assert.ok(['skill', 'applied', 'matrix'].includes(chapter.practice.kind))
  }
})

test('coursebook units cover both NCERT units for this app', () => {
  const units = new Set(COURSE_CHAPTERS.map((chapter) => chapter.unit))
  assert.ok(units.has('Unit 3 · Current Electricity'))
  assert.ok(units.has('Unit 14 · Semiconductors'))
})

test('coursebook skill practices reference real solver skills', () => {
  const SKILLS = new Set([
    "Ohm's Law",
    'Power',
    'Series/Parallel',
    'Drift Velocity',
    'Carrier Concentration',
    'Diode Equation',
    'BJT Gains',
    'JFET/MOSFET',
  ])
  for (const chapter of COURSE_CHAPTERS) {
    if (chapter.practice.kind === 'skill') {
      assert.ok(SKILLS.has(chapter.practice.value), `${chapter.id} practice value "${chapter.practice.value}" is not a solver skill`)
    }
  }
})

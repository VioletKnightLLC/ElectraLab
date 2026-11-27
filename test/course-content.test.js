import test from 'node:test'
import assert from 'node:assert/strict'
import { COURSE_CHAPTERS } from '../src/courseContent.js'
import { parseMathMarkdown } from '../src/math-markdown.js'

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

test('Coursebook RC worked-example notation is marked for typesetting', () => {
  const chapter = COURSE_CHAPTERS.find((item) => item.id === 'limits-continuity')
  const blocks = parseMathMarkdown(chapter.example.setup)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].type, 'paragraph')
  assert.match(blocks[0].text, /\$V\(t\)=10\(1-e\^\{-t\/7\}\)\\,\\mathrm\{V\}\$/)
  assert.match(blocks[0].text, /\$t=0\$/)
})

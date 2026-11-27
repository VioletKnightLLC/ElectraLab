import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import katex from 'katex'

const data = JSON.parse(readFileSync(new URL('../src/data/electra_data.json', import.meta.url), 'utf8'))
const VOCABULARY = data.vocabulary

test('vocabulary entries include pronunciation, meaning, and a valid worked example', () => {
  assert.ok(VOCABULARY.length >= 10)
  assert.equal(new Set(VOCABULARY.map((item) => item.id)).size, VOCABULARY.length)

  for (const item of VOCABULARY) {
    assert.ok(item.title)
    assert.ok(item.say)
    assert.ok(item.meaning)
    assert.ok(item.example.prompt)
    assert.ok(item.example.steps.length > 0)
    assert.ok(item.example.answer)
    assert.ok(['skill', 'applied', 'matrix'].includes(item.practice.kind))
    assert.doesNotThrow(() => katex.renderToString(item.latex, { throwOnError: true, trust: false }))
    assert.doesNotThrow(() => katex.renderToString(item.example.latex, { throwOnError: true, trust: false }))
  }
})

test('vocabulary skill practices reference real solver skills', () => {
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
  for (const item of VOCABULARY) {
    if (item.practice.kind === 'skill') {
      assert.ok(SKILLS.has(item.practice.value), `${item.id} practice value "${item.practice.value}" is not a solver skill`)
    }
  }
})

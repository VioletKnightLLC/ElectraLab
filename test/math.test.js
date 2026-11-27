import test from 'node:test'
import assert from 'node:assert/strict'
import { createAppliedProblem, createProblem, solveMathInput } from '../src/math.js'

const SKILLS = [
  "Ohm's Law",
  'Power',
  'Series/Parallel',
  'Drift Velocity',
  'Carrier Concentration',
  'Diode Equation',
  'BJT Gains',
  'JFET/MOSFET',
]

test('generated problems have one selectable answer and worked steps', () => {
  for (const skill of SKILLS) {
    for (let level = 1; level <= 5; level += 1) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const problem = createProblem(skill, level)

        assert.equal(problem.skill, skill)
        assert.equal(problem.options.length, 4)
        assert.equal(new Set(problem.options).size, 4)
        assert.ok(problem.options.includes(problem.answer))
        assert.ok(problem.steps.length >= 3)
        assert.ok(problem.steps.every((step) => step.length > 0))
      }
    }
  }
})

test('the local solver returns accurate physics answers with worked steps', () => {
  assert.equal(solveMathInput("Ohm's Law", 'V = 12, R = 6').answer, 'I = 2 A')
  assert.equal(solveMathInput("Ohm's Law", 'I = 2, R = 6').answer, 'V = 12 V')
  assert.equal(solveMathInput("Ohm's Law", 'V = 12, I = 2').answer, 'R = 6 Ω')
  assert.equal(solveMathInput('Power', 'V = 12, I = 2').answer, 'P = 24 W')
  assert.equal(solveMathInput('Power', 'I = 2, R = 6').answer, 'P = 24 W')
  assert.equal(solveMathInput('Series/Parallel', 'R1 = 10, R2 = 20').answer, 'R_eq = 6.6667 Ω (parallel)')
  assert.equal(solveMathInput('Series/Parallel', 'R1 = 10, R2 = 20, R3 = 30').answer, 'R_eq = 60 Ω (series)')
  assert.equal(solveMathInput('Drift Velocity', 'n = 8.5e28, A = 1e-6, I = 5').answer, 'v_d = 3.68e-4 m/s')
  assert.equal(solveMathInput('BJT Gains', 'beta = 100, IB = 20').answer, 'I_C = 2000 μA')
  assert.equal(solveMathInput('BJT Gains', 'IC = 2000, IB = 20').answer, 'β = 100')
  assert.equal(solveMathInput('BJT Gains', 'alpha = 0.99').answer, 'β = 99')
  assert.equal(solveMathInput('JFET/MOSFET', 'IDSS = 8, VP = -4, VGS = -1').answer, 'I_D = 4.5 mA')
  assert.match(solveMathInput('Diode Equation', 'I0 = 1e-12, V = 0.7, n = 1').answer, /^I = .+ A$/)
  assert.match(
    solveMathInput('Carrier Concentration', 'Nd = 1e16, ni = 1.5e10').answer,
    /^n = 1\.0e\+16 cm.+p = 2\.3e\+4 cm/,
  )
  assert.throws(() => solveMathInput("Ohm's Law", 'not physics'), /Try a format like/)
})

test('solver results always include the skill name and worked steps', () => {
  for (const mode of SKILLS) {
    const example = {
      "Ohm's Law": 'V = 12, R = 6',
      'Power': 'V = 12, I = 2',
      'Series/Parallel': 'R1 = 10, R2 = 20',
      'Drift Velocity': 'n = 8.5e28, A = 1e-6, I = 5',
      'Carrier Concentration': 'Nd = 1e16, ni = 1.5e10',
      'Diode Equation': 'I0 = 1e-12, V = 0.7',
      'BJT Gains': 'beta = 100, IB = 20',
      'JFET/MOSFET': 'IDSS = 8, VP = -4, VGS = -1',
    }[mode]
    const result = solveMathInput(mode, example)
    assert.equal(result.skill, mode)
    assert.ok(result.answer.length > 0)
    assert.ok(result.steps.length >= 3)
  }
})

test('applied physics problems are contextual, selectable, and stepped', () => {
  for (const field of ['Circuit Analysis', 'Semiconductor Devices', 'Electronic Design']) {
    for (let level = 1; level <= 5; level += 1) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const problem = createAppliedProblem(field, level)

        assert.equal(problem.skill, 'Applied Physics')
        assert.equal(problem.field, field)
        assert.ok(problem.prompt.length > 20)
        assert.equal(problem.options.length, 4)
        assert.equal(new Set(problem.options).size, 4)
        assert.ok(problem.options.includes(problem.answer))
        assert.ok(problem.steps.length >= 3)
      }
    }
  }
})

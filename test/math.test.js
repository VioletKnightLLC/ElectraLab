import test from 'node:test'
import assert from 'node:assert/strict'
import { createAppliedProblem, createProblem, solveMathInput } from '../src/math.js'

test('generated problems have one selectable answer and worked steps', () => {
  for (const skill of ['Algebra', 'Derivatives', 'Integrals', 'Statistics']) {
    for (let level = 1; level <= 5; level += 1) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const problem = createProblem(skill, level)

        assert.equal(problem.skill, skill)
        assert.equal(problem.options.length, 4)
        assert.equal(new Set(problem.options).size, 4)
        assert.ok(problem.options.includes(problem.answer))
        assert.equal(problem.steps.length, 3)
        assert.ok(problem.steps.every((step) => step.length > 0))
      }
    }
  }
})

test('the local solver returns accurate answers with worked steps', () => {
  assert.equal(solveMathInput('Algebra', '2x + 4 = 16').answer, 'x = 6')
  assert.equal(solveMathInput('Algebra', '3x - 6 = 9').answer, 'x = 5')
  assert.equal(solveMathInput('Derivatives', '3x^2').answer, '6x')
  assert.equal(solveMathInput('Derivatives', 'x³').answer, '3x²')
  assert.equal(solveMathInput('Integrals', '6x^2').answer, '2x³ + C')
  assert.equal(solveMathInput('Statistics', '4, 7, 9, 12').answer, 'Mean = 8, Median = 8')
  assert.throws(() => solveMathInput('Algebra', 'not math'), /Try a linear equation/)
})

test('applied calculus problems are contextual, selectable, and stepped', () => {
  for (const field of ['Engineering', 'Electronics', 'Computer Science']) {
    for (let level = 1; level <= 5; level += 1) {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const problem = createAppliedProblem(field, level)

        assert.equal(problem.skill, 'Applied Calculus')
        assert.equal(problem.field, field)
        assert.ok(problem.prompt.length > 20)
        assert.equal(problem.options.length, 4)
        assert.equal(new Set(problem.options).size, 4)
        assert.ok(problem.options.includes(problem.answer))
        assert.equal(problem.steps.length, 3)
      }
    }
  }
})

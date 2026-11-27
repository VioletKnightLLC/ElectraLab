import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateCalculatorExpression,
  MAX_CALCULATOR_HISTORY,
  normalizeCalculatorHistory,
  prependCalculatorHistory,
} from '../src/calculator.js'

test('basic calculator respects parentheses and arithmetic precedence', () => {
  assert.equal(evaluateCalculatorExpression('(7 + 5) × 3'), 36)
  assert.equal(evaluateCalculatorExpression('18 ÷ 3 + 2'), 8)
  assert.equal(evaluateCalculatorExpression('2^3^2'), 512)
  assert.equal(evaluateCalculatorExpression('-2^2'), -4)
  assert.equal(evaluateCalculatorExpression('2(3 + 1)'), 8)
  assert.equal(evaluateCalculatorExpression('2pi'), Math.PI * 2)
})

test('scientific calculator supports angle modes, constants, functions, percent, and factorial', () => {
  assert.equal(evaluateCalculatorExpression('sin(30)'), 0.49999999999999994)
  assert.equal(evaluateCalculatorExpression('sin(pi/6)', { angleMode: 'RAD' }), 0.49999999999999994)
  assert.equal(evaluateCalculatorExpression('sqrt(3^2 + 4^2)'), 5)
  assert.equal(evaluateCalculatorExpression('log(1000)'), 3)
  assert.equal(evaluateCalculatorExpression('50% + 4!'), 24.5)
})

test('graphing expressions can be evaluated at a supplied x value', () => {
  assert.equal(evaluateCalculatorExpression('x^2 - 4', { x: 3 }), 5)
  assert.throws(() => evaluateCalculatorExpression('x + 1'), /graphing layout/)
})

test('calculator rejects malformed input and non-real results safely', () => {
  assert.throws(() => evaluateCalculatorExpression('2 + @'), /Unrecognized input/)
  assert.throws(() => evaluateCalculatorExpression('1 / 0'), /Division by zero/)
  assert.throws(() => evaluateCalculatorExpression('sqrt(-1)'), /finite real result/)
})

test('calculator history validates entries, keeps newest calculations first, and stays bounded', () => {
  const entries = Array.from({ length: MAX_CALCULATOR_HISTORY + 5 }, (_, index) => ({
    id: `entry-${index}`,
    expression: `${index} + 1`,
    result: String(index + 1),
    mode: 'basic',
    angleMode: null,
    timestamp: 1_700_000_000_000 + index,
  }))
  const normalized = normalizeCalculatorHistory([...entries, { id: 'invalid' }])
  assert.equal(normalized.length, MAX_CALCULATOR_HISTORY)
  assert.equal(normalized[0].id, 'entry-0')

  const latest = { ...entries[0], id: 'latest', expression: '6 × 7', result: '42' }
  const updated = prependCalculatorHistory(normalized, latest)
  assert.equal(updated.length, MAX_CALCULATOR_HISTORY)
  assert.equal(updated[0].id, 'latest')
  assert.equal(updated.at(-1).id, 'entry-48')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { renderMathHtml } from '../src/math-render.js'

test('math rendering keeps valid notation and safely flags malformed LaTeX', () => {
  const valid = renderMathHtml(String.raw`\sqrt{\frac{3.6\,\mathrm{A}}{10^{30}}}`, false)
  assert.equal(valid.failed, false)
  assert.match(valid.html, /class="katex"/)

  const malformed = renderMathHtml(String.raw`\sqrt{\frac{1}{2}`, false)
  assert.deepEqual(malformed, { html: null, failed: true })
})

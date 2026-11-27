import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { createApp } from '../server/index.js'
import { createAppliedProblem } from '../src/math.js'
import { parseInlineMarkdown, parseMathMarkdown, prepareMathPreviewContent } from '../src/math-markdown.js'
import { askOllamaStream, combineAgentRuntime, getInferenceMetrics, normalizeTutorResponse, readJsonResponse } from '../src/ollama.js'
import { toMathLatex } from '../src/math-format.js'

test('local tutor API validates inputs before forwarding to Ollama', async (t) => {
  const server = createApp().listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(() => {
    server.closeAllConnections()
    server.close()
  })

  const address = server.address()
  const endpoint = `http://127.0.0.1:${address.port}/api/tutor`
  const invalidModel = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: '', messages: [{ role: 'user', content: 'Help with a derivative.' }] }),
  })
  assert.equal(invalidModel.status, 400)

  const invalidMessage = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'local-model:latest', messages: [null] }),
  })
  assert.equal(invalidMessage.status, 400)

  const invalidWalkthrough = await fetch(endpoint.replace('/api/tutor', '/api/agent/stream'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'local-model:latest', messages: [{ role: 'user', content: 'Explain a derivative.' }], walkthrough: 'yes' }),
  })
  assert.equal(invalidWalkthrough.status, 400)
  assert.match(invalidWalkthrough.headers.get('content-type'), /application\/json/)

  const unknownApi = await fetch(endpoint.replace('/api/tutor', '/api/missing'))
  assert.equal(unknownApi.status, 404)
  assert.match(unknownApi.headers.get('content-type'), /application\/json/)

  const runtimeMetrics = await fetch(endpoint.replace('/api/tutor', '/api/ollama/metrics'))
  assert.equal(runtimeMetrics.status, 200)
  const runtime = await runtimeMetrics.json()
  assert.equal(typeof runtime.connected, 'boolean')
  assert.ok(Array.isArray(runtime.installedModels))
  assert.ok(Array.isArray(runtime.runningModels))
})

test('API client explains when a stale UI server returns HTML instead of JSON', async () => {
  const html = new Response('<!doctype html><html><body>Calculus(t)</body></html>', {
    headers: { 'content-type': 'text/html' },
  })

  await assert.rejects(
    readJsonResponse(html, 'The local inference API'),
    /HTML page \(HTTP 200, text\/html\).*Restart the local app/,
  )
})

test('API client surfaces structured JSON errors from the local server', async () => {
  const response = new Response(JSON.stringify({ error: 'Ollama is unavailable.' }), {
    status: 503,
    headers: { 'content-type': 'application/json' },
  })

  await assert.rejects(readJsonResponse(response, 'The local inference API'), /Ollama is unavailable/)
})

test('Tutor stream forwards a caller abort to the active request', async (t) => {
  const originalFetch = globalThis.fetch
  let requestSignal
  globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
    requestSignal = options.signal
    requestSignal.addEventListener('abort', () => reject(requestSignal.reason), { once: true })
  })
  t.after(() => { globalThis.fetch = originalFetch })

  const controller = new AbortController()
  const pending = askOllamaStream({
    model: 'local-model:latest',
    messages: [{ role: 'user', content: 'Explain a derivative.' }],
    walkthrough: false,
    signal: controller.signal,
  })
  await new Promise((resolve) => setImmediate(resolve))
  controller.abort()

  await assert.rejects(pending, (error) => error.name === 'AbortError')
  assert.equal(requestSignal.aborted, true)
})

test('Agent Markdown parsing preserves data tables and fenced code blocks', () => {
  const blocks = parseMathMarkdown([
    '## Evaluation',
    '',
    '| Quantity | Dimensions |',
    '| :--- | ---: |',
    '| Matrix A | 2 × 3 |',
    '| Velocity | $\\mathrm{m/s}$ |',
    '',
    '```python',
    'shape = (2, 3)',
    '```',
  ].join('\n'))

  assert.deepEqual(blocks.map((block) => block.type), ['heading', 'table', 'code'])
  assert.deepEqual(blocks[1].headers, ['Quantity', 'Dimensions'])
  assert.deepEqual(blocks[1].alignments, ['left', 'right'])
  assert.deepEqual(blocks[1].rows[0], ['Matrix A', '2 × 3'])
  assert.equal(blocks[2].language, 'python')
  assert.equal(blocks[2].text, 'shape = (2, 3)')
})

test('inline math stays typeset inside bold Markdown text', () => {
  const [paragraph] = parseMathMarkdown(String.raw`**Step 3a: Calculate the ratio $\frac{v_d}{E}$**`)
  const [strong] = parseInlineMarkdown(paragraph.text)

  assert.equal(strong.type, 'strong')
  assert.deepEqual(strong.children, [
    { type: 'text', text: 'Step 3a: Calculate the ratio ' },
    { type: 'math', text: String.raw`\frac{v_d}{E}` },
  ])
  assert.doesNotThrow(() => katex.renderToString(strong.children[1].text, { throwOnError: true, trust: false }))
})

test('Tutor math preview formats standalone TeX without rewriting prose or code blocks', () => {
  const formula = String.raw`\frac{v_d}{E}`
  assert.equal(prepareMathPreviewContent(formula), String.raw`\(\frac{v_d}{E}\)`)
  assert.equal(prepareMathPreviewContent(`Calculate the ratio ${formula}`), `Calculate the ratio ${formula}`)

  const fencedCode = ['```tex', formula, '```'].join('\n')
  assert.equal(prepareMathPreviewContent(fencedCode), fencedCode)
})

test('tutor responses preserve LaTeX delimiters for visual typesetting', () => {
  const normalized = normalizeTutorResponse(String.raw`Inline \(x^2\), then display \[ \frac{dV}{dt} = \frac{5}{2}e^{-t/2} \]`)
  assert.match(normalized, /Inline \$x\^\{2\}\$/)
  assert.match(normalized, /display\s+\$\$\s+\\frac\{dV\}\{dt\}/)
  assert.ok(normalized.includes('$$\n'))
})

test('agent stays connected when optional running-model telemetry is unavailable', () => {
  const health = { connected: true, models: [{ name: 'qwen2.5:3b' }] }
  const runtime = combineAgentRuntime(health, null)

  assert.equal(runtime.connected, true)
  assert.equal(runtime.telemetryAvailable, false)
  assert.equal(runtime.installedModelCount, 1)
  assert.equal(runtime.installedModels[0].name, 'qwen2.5:3b')
  assert.deepEqual(runtime.runningModels, [])
})

test('inference metrics fall back to a labeled client estimate when the API is stale', () => {
  const estimate = getInferenceMetrics({ message: 'The derivative is 2x.' }, [{ role: 'user', content: 'Differentiate x^2.' }], '', 1000)
  assert.equal(estimate.metricsSource, 'estimate')
  assert.equal(estimate.totalDurationMs, 1000)
  assert.ok(estimate.tokensPerSecond > 0)

  const measured = getInferenceMetrics({ message: '2x', metrics: { tokensPerSecond: 42 } }, [], '', 100)
  assert.equal(measured.metricsSource, 'ollama')
  assert.equal(measured.tokensPerSecond, 42)
})

test('applied physics notation typesets exponents and units', () => {
  const latex = toMathLatex('V(t) = 10(1 − e^(−t/7)) V,  t in ms')
  assert.equal(latex, String.raw`V(t) = 10(1 - e^{-\frac{t}{7}}) V,\quad t\text{ in ms}`)

  const html = katex.renderToString(latex, { displayMode: true, trust: false, throwOnError: false })
  assert.match(html, /class="mfrac"/)
  assert.match(html, /<msup>/)
  assert.doesNotMatch(html, /e\^\(/)

  const problem = createAppliedProblem('Circuit Analysis', 2)
  assert.doesNotThrow(() => katex.renderToString(problem.mathLatex, { throwOnError: true, trust: false }))
  assert.match(problem.mathLatex, /\\Omega/)
})

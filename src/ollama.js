export async function readJsonResponse(response, endpoint) {
  const contentType = response.headers.get('content-type') || 'unknown content type'
  const body = await response.text()
  let payload
  try {
    payload = JSON.parse(body)
  } catch {
    const responseKind = /text\/html/i.test(contentType) || /^\s*<!doctype html/i.test(body)
      ? 'an HTML page'
      : 'a non-JSON body'
    throw new Error(`${endpoint} returned ${responseKind} (HTTP ${response.status}, ${contentType}). Restart the local app so its page and API use the same server.`)
  }
  if (!response.ok) throw new Error(payload?.error || `The local API request failed with HTTP ${response.status}.`)
  return payload
}

export async function checkOllama() {
  const response = await fetch('/api/ollama/status', {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  })
  return readJsonResponse(response, 'The Ollama status endpoint')
}

export async function getOllamaMetrics() {
  const response = await fetch('/api/ollama/metrics', {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  })
  return readJsonResponse(response, 'The Ollama metrics endpoint')
}

export function combineAgentRuntime(health, telemetry) {
  const installedModels = Array.isArray(health?.models) ? health.models : []
  const telemetryAvailable = health?.connected === true && telemetry?.connected === true
  const runningModels = telemetryAvailable && Array.isArray(telemetry.runningModels) ? telemetry.runningModels : []
  return {
    connected: health?.connected === true,
    telemetryAvailable,
    version: telemetryAvailable ? telemetry.version || 'Unknown' : null,
    installedModels,
    installedModelCount: installedModels.length,
    runningModels,
    runningModelCount: runningModels.length,
  }
}

export async function askOllama({ model, messages, context }) {
  const response = await fetch('/api/tutor', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages, context }),
    signal: AbortSignal.timeout(125000),
  })
  const payload = await readJsonResponse(response, 'The local inference API')
  if (typeof payload.message !== 'string' || !payload.message.trim()) {
    throw new Error('The local inference API returned JSON without a readable answer. Restart the local app and try again.')
  }
  return payload
}

export async function askOllamaStream({ model, messages, context = '', walkthrough = true, onToken = () => {}, onStarted = () => {}, signal }) {
  const timeoutSignal = AbortSignal.timeout(125000)
  const response = await fetch('/api/agent/stream', {
    method: 'POST',
    headers: { accept: 'text/event-stream, application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ model, messages, context, walkthrough }),
    signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal,
  })
  if (!response.ok) return readJsonResponse(response, 'The local agent stream')

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('text/event-stream') || !response.body) {
    const payload = await readJsonResponse(response, 'The local agent stream')
    if (typeof payload.message === 'string' && payload.message.trim()) return payload
    throw new Error('The local agent did not start a readable response stream. Restart the local app and retry.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let streamedMessage = ''
  let completedResponse = null

  function processEvent(eventText) {
    const data = eventText.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n')
    if (!data) return
    let event
    try {
      event = JSON.parse(data)
    } catch {
      throw new Error('The local agent stream contained malformed data. Retry the inference.')
    }
    if (event.type === 'started') onStarted(event)
    if (event.type === 'token' && typeof event.content === 'string') {
      streamedMessage += event.content
      onToken(event.content)
    }
    if (event.type === 'error') throw new Error(event.error || 'The local agent stream stopped unexpectedly.')
    if (event.type === 'done') completedResponse = event
  }

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() || ''
    events.forEach(processEvent)
    if (done) break
  }
  if (buffer.trim()) processEvent(buffer)
  if (!completedResponse) throw new Error('The local agent stream ended before the response was complete. Retry the inference.')
  return { ...completedResponse, message: completedResponse.message || streamedMessage }
}

export function getInferenceMetrics(response, messages, context, elapsedMs) {
  if (response.metrics) return { ...response.metrics, metricsSource: 'ollama' }

  const estimateTokens = (text) => Math.ceil(String(text || '').length / 4)
  const promptText = [context, ...messages.map((message) => message.content)].filter(Boolean).join(' ')
  const promptTokens = estimateTokens(promptText)
  const completionTokens = estimateTokens(response.message)
  const totalDurationMs = Math.max(1, elapsedMs)
  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    modelLoadDurationMs: null,
    promptEvaluationDurationMs: null,
    promptTokensPerSecond: null,
    evaluationDurationMs: null,
    totalDurationMs,
    tokensPerSecond: completionTokens / (totalDurationMs / 1000),
    metricsSource: 'estimate',
  }
}

export function normalizeTutorResponse(response) {
  const formula = (math) => math
    .replace(/([A-Za-z0-9)])\^\(([^()]*)\)/g, '$1^{$2}')
    .replace(/([A-Za-z0-9)])\^([+-]?\d+)/g, '$1^{$2}')
    .replace(/([A-Za-z0-9)])([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ]+)/g, (_match, base, power) => {
      const superscripts = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+', 'ⁿ': 'n' }
      return `${base}^{${[...power].map((char) => superscripts[char]).join('')}}`
    })

  return response
    .replace(/\\\[([\s\S]*?)\\\]/g, (_match, math) => `\n$$\n${math.trim()}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_match, math) => `$${math.trim()}$`)
    .replace(/\$\$([\s\S]*?)\$\$/g, (_match, math) => `$$${formula(math)}$$`)
    .replace(/(?<!\$)\$([^$\n]+)\$(?!\$)/g, (_match, math) => `$${formula(math)}$`)
}

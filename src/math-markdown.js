import { normalizeTutorResponse } from './ollama.js'

function splitTableRow(line) {
  return line.trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, '|'))
}

function isTableSeparator(line) {
  return line.includes('|') && splitTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')))
}

function getColumnAlignment(cell) {
  const value = cell.replace(/\s/g, '')
  if (value.startsWith(':') && value.endsWith(':')) return 'center'
  if (value.endsWith(':')) return 'right'
  return 'left'
}

export function prepareMathPreviewContent(content) {
  const normalized = normalizeTutorResponse(String(content || ''))
  let inCode = false
  return normalized.split(/\r?\n/).map((line) => {
    const trimmed = line.trim()
    if (/^```/.test(trimmed)) {
      inCode = !inCode
      return line
    }
    if (inCode || !trimmed || /[$]|\\\(|\\\[/.test(trimmed)) return line

    const hasTexCommand = /\\(?:frac|sqrt|sum|prod|int|lim|mathbb|overline|partial|mathrm|text|cdot|times|alpha|beta|gamma|delta|epsilon|theta|tau|pi|lambda|mu|sigma|omega|in|to|leq|geq|neq|approx)\b/.test(trimmed)
    const formulaOnly = /^[\\A-Za-z0-9{}_^=+\-*\/(),.\s]+$/.test(trimmed)
    const startsLikeMath = /^(?:\\[A-Za-z]+|[A-Za-z][\\A-Za-z0-9{}_^]*\s*(?:=|<|>|[+\-*\/]|\\(?:leq|geq|approx|to))|\d+(?:\.\d+)?(?:\\[A-Za-z]+|[A-Za-z]|\s*(?:=|<|>|[+\-*\/])))/.test(trimmed)
    return hasTexCommand && formulaOnly && startsLikeMath ? `\\(${trimmed}\\)` : line
  }).join('\n')
}

export function parseInlineMarkdown(text) {
  const tokens = String(text || '').split(/(\$[^$\n]+\$|\*\*.+?\*\*|__.+?__|`[^`\n]+`)/g).filter(Boolean)
  return tokens.map((token) => {
    if (token.startsWith('$') && token.endsWith('$')) return { type: 'math', text: token.slice(1, -1) }
    if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
      return { type: 'strong', children: parseInlineMarkdown(token.slice(2, -2)) }
    }
    if (token.startsWith('`') && token.endsWith('`')) return { type: 'code', text: token.slice(1, -1) }
    return { type: 'text', text: token }
  })
}

export function parseMathMarkdown(content) {
  const blocks = []
  const paragraph = []
  let list = null
  let math = null
  let code = null
  const lines = normalizeTutorResponse(String(content || '')).split(/\r?\n/)

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', text: paragraph.splice(0).join(' ') })
  }
  const flushList = () => {
    if (list) blocks.push(list)
    list = null
  }
  const pushListItem = (type, text) => {
    flushParagraph()
    if (list?.type !== type) {
      flushList()
      list = { type, items: [] }
    }
    list.items.push(text)
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()

    if (code) {
      if (/^```/.test(trimmed)) {
        blocks.push({ type: 'code', language: code.language, text: code.lines.join('\n') })
        code = null
      } else {
        code.lines.push(line)
      }
      continue
    }

    const codeFence = trimmed.match(/^```([\w#+.-]*)\s*$/)
    if (codeFence) {
      flushParagraph()
      flushList()
      code = { language: codeFence[1], lines: [] }
      continue
    }

    const tableSeparator = lines[index + 1]
    if (trimmed.includes('|') && tableSeparator && isTableSeparator(tableSeparator)) {
      flushParagraph()
      flushList()
      const headers = splitTableRow(line)
      const alignments = splitTableRow(tableSeparator).map(getColumnAlignment)
      const rows = []
      index += 2
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        rows.push(splitTableRow(lines[index]))
        index += 1
      }
      index -= 1
      blocks.push({ type: 'table', headers, alignments, rows })
      continue
    }

    const sameLineMath = trimmed.match(/^\$\$([\s\S]+)\$\$$/)
    if (sameLineMath) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'math', text: sameLineMath[1].trim() })
      continue
    }
    if (trimmed === '$$') {
      flushParagraph()
      flushList()
      if (math === null) math = []
      else {
        blocks.push({ type: 'math', text: math.join('\n').trim() })
        math = null
      }
      continue
    }
    if (math !== null) {
      math.push(line)
      continue
    }
    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }
    const heading = trimmed.match(/^#{1,3}\s+(.+)$/)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push({ type: 'heading', text: heading[1] })
      continue
    }
    const unorderedItem = trimmed.match(/^[-*]\s+(.+)$/)
    if (unorderedItem) {
      pushListItem('unordered', unorderedItem[1])
      continue
    }
    const orderedItem = trimmed.match(/^\d+[.)]\s+(.+)$/)
    if (orderedItem) {
      pushListItem('ordered', orderedItem[1])
      continue
    }
    flushList()
    paragraph.push(trimmed)
  }

  flushParagraph()
  flushList()
  if (math !== null) blocks.push({ type: 'math', text: math.join('\n').trim() })
  if (code) blocks.push({ type: 'code', language: code.language, text: code.lines.join('\n') })
  return blocks
}

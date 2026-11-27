const TOKEN_PATTERN = /\s*(?:(\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|([a-zA-Z]+|π)|([+\-−×÷*/^()%!]))/gy
export const MAX_CALCULATOR_HISTORY = 50

const HISTORY_MODES = new Set(['basic', 'scientific'])

export function normalizeCalculatorHistory(entries) {
  if (!Array.isArray(entries)) return []
  return entries.filter((entry) => entry
    && typeof entry.id === 'string'
    && typeof entry.expression === 'string'
    && entry.expression.trim()
    && typeof entry.result === 'string'
    && HISTORY_MODES.has(entry.mode)
    && Number.isSafeInteger(entry.timestamp)
    && entry.timestamp >= 0
    && entry.timestamp <= 8.64e15
    && (entry.angleMode == null || entry.angleMode === 'DEG' || entry.angleMode === 'RAD'))
    .slice(0, MAX_CALCULATOR_HISTORY)
}

export function prependCalculatorHistory(entries, entry) {
  const [validEntry] = normalizeCalculatorHistory([entry])
  if (!validEntry) return normalizeCalculatorHistory(entries)
  return [validEntry, ...normalizeCalculatorHistory(entries)].slice(0, MAX_CALCULATOR_HISTORY)
}

export function evaluateCalculatorExpression(expression, { angleMode = 'DEG', x = null } = {}) {
  const source = String(expression).trim()
  if (!source) throw new Error('Enter an expression to calculate.')

  const tokens = []
  TOKEN_PATTERN.lastIndex = 0
  let match
  while (TOKEN_PATTERN.lastIndex < source.length) {
    match = TOKEN_PATTERN.exec(source)
    if (!match) throw new Error(`Unrecognized input near "${source.slice(TOKEN_PATTERN.lastIndex).trim()}".`)
    if (match[1]) tokens.push({ type: 'number', value: Number(match[0].trim()) })
    else if (match[2]) tokens.push({ type: 'name', value: match[2].toLowerCase() })
    else tokens.push({ type: 'operator', value: match[3] })
  }

  let position = 0
  const peek = () => tokens[position]
  const take = (value) => {
    if (peek()?.value !== value) return false
    position += 1
    return true
  }
  const requireFinite = (value) => {
    if (!Number.isFinite(value)) throw new Error('This expression does not have a finite real result.')
    return value
  }

  function parseExpression() {
    let value = parseTerm()
    while (peek()?.value === '+' || peek()?.value === '-' || peek()?.value === '−') {
      const operator = tokens[position++].value
      const right = parseTerm()
      value = operator === '+' ? value + right : value - right
    }
    return value
  }

  function parseTerm() {
    let value = parseUnary()
    while (true) {
      const operator = peek()?.value
      if (['*', '×', '/', '÷'].includes(operator)) {
        position += 1
        const right = parseUnary()
        if (operator === '/' || operator === '÷') {
          if (right === 0) throw new Error('Division by zero is undefined.')
          value /= right
        } else value *= right
      } else if (peek()?.type === 'number' || peek()?.type === 'name' || operator === '(') {
        value *= parseUnary()
      } else break
    }
    return value
  }

  function parseUnary() {
    if (take('+')) return parseUnary()
    if (take('-') || take('−')) return -parseUnary()
    return parsePower()
  }

  function parsePower() {
    let value = parsePostfix()
    if (take('^')) value **= parseUnary()
    return value
  }

  function parsePostfix() {
    let value = parsePrimary()
    while (peek()?.value === '%' || peek()?.value === '!') {
      if (take('%')) value /= 100
      else if (take('!')) {
        if (!Number.isInteger(value) || value < 0 || value > 170) {
          throw new Error('Factorial requires a whole number from 0 to 170.')
        }
        let factorial = 1
        for (let factor = 2; factor <= value; factor += 1) factorial *= factor
        value = factorial
      }
    }
    return value
  }

  function parsePrimary() {
    const token = tokens[position++]
    if (!token) throw new Error('Complete the expression before calculating.')
    if (token.type === 'number') return token.value
    if (token.value === '(') {
      const value = parseExpression()
      if (!take(')')) throw new Error('Add a closing parenthesis.')
      return value
    }
    if (token.type !== 'name') throw new Error(`Unexpected "${token.value}".`)

    if (take('(')) {
      const argument = parseExpression()
      if (!take(')')) throw new Error('Add a closing parenthesis after the function input.')
      const angle = angleMode === 'DEG' ? Math.PI / 180 : 1
      const functions = {
        sin: (value) => Math.sin(value * angle),
        cos: (value) => Math.cos(value * angle),
        tan: (value) => Math.tan(value * angle),
        asin: (value) => Math.asin(value) / angle,
        acos: (value) => Math.acos(value) / angle,
        atan: (value) => Math.atan(value) / angle,
        sqrt: Math.sqrt,
        ln: Math.log,
        log: Math.log10,
        abs: Math.abs,
        exp: Math.exp,
      }
      const calculate = functions[token.value]
      if (!calculate) throw new Error(`Unknown function "${token.value}".`)
      return requireFinite(calculate(argument))
    }
    if (token.value === 'pi' || token.value === 'π') return Math.PI
    if (token.value === 'e') return Math.E
    if (token.value === 'x' && x !== null) return x
    if (token.value === 'x') throw new Error('Use the graphing layout to evaluate an expression containing x.')
    throw new Error(`Unknown value "${token.value}".`)
  }

  const result = parseExpression()
  if (position < tokens.length) throw new Error(`Unexpected "${tokens[position].value}".`)
  return requireFinite(result)
}

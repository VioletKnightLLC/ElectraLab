import { useEffect, useRef, useState } from 'react'

const SYMBOL_GROUPS = [
  { label: 'Variables', symbols: [['x', 'x variable'], ['y', 'y variable'], ['t', 'time variable'], ['π', 'pi'], ['θ', 'theta'], ['Δ', 'delta']] },
  { label: 'Functions', symbols: [['sin', 'sine'], ['cos', 'cosine'], ['tan', 'tangent'], ['lim', 'limit'], ['log', 'logarithm'], ['ln', 'natural logarithm'], ['√', 'square root']] },
  { label: 'Operators', symbols: [['+', 'plus'], ['−', 'minus'], ['×', 'multiply'], ['÷', 'divide'], ['±', 'plus or minus'], ['=', 'equals'], ['^', 'power']] },
  { label: 'Relations & symbols', symbols: [['→', 'tends to or maps to'], ['<', 'less than'], ['>', 'greater than'], ['≤', 'less than or equal'], ['≥', 'greater than or equal'], ['≠', 'not equal'], ['≈', 'approximately equal'], ['∞', 'infinity']] },
  { label: 'Calculus', symbols: [['∫', 'integral'], ['∑', 'sum'], ['∂', 'partial derivative'], ['d/dx', 'derivative with respect to x']] },
]

const FORMULA_GROUP = {
  label: 'Formula templates',
  symbols: [
    ['a/b', 'fraction', '\\(\\frac{}{}\\)', '\\(\\frac{}{}\\)'.indexOf('{}') + 1],
    ['xⁿ', 'power with exponent', '\\(x^{}\\)', '\\(x^{}\\)'.indexOf('{}') + 1],
    ['xₙ', 'subscript', '\\(x_{}\\)', '\\(x_{}\\)'.indexOf('{}') + 1],
    ['√x', 'square root expression', '\\(\\sqrt{}\\)', '\\(\\sqrt{}\\)'.indexOf('{}') + 1],
    ['dy/dx', 'derivative', '\\(\\frac{dy}{dx}\\)'],
    ['lim', 'limit', '\\(\\lim_{x\\to 0} f(x)\\)'],
    ['∫ f(x)', 'definite integral', '\\(\\int_{a}^{b} f(x)\\,dx\\)'],
    ['∑ aᵢ', 'summation', '\\(\\sum_{i=1}^{n} a_i\\)'],
  ],
}

const REPEATING_DECIMAL_GROUP = {
  label: 'Repeating decimals',
  symbols: [
    ['0.3̅', 'repeating digit', '\\(0.\\overline{}\\)', '\\(0.\\overline{}\\)'.indexOf('{}') + 1],
    ['3.2 4̅ = ?', 'repeating decimal equation', '\\(\\large{3.2\\overline{} = {?}}\\)', '\\(\\large{3.2\\overline{} = {?}}\\)'.indexOf('{}') + 1],
    ['overline', 'repeat a digit block', '\\(\\overline{}\\)', '\\(\\overline{}\\)'.indexOf('{}') + 1],
  ],
}

const NUMBER_SET_GROUP = {
  label: 'Number sets',
  symbols: [
    ['ℕ', 'natural numbers', '\\mathbb{N}'],
    ['ℤ', 'integers', '\\mathbb{Z}'],
    ['ℚ', 'rational numbers', '\\mathbb{Q}'],
    ['ℝ', 'real numbers', '\\mathbb{R}'],
    ['ℂ', 'complex numbers', '\\mathbb{C}'],
    ['x ∈ ℝ', 'x belongs to the real numbers', 'x \\in \\mathbb{R}'],
    ['{x | P(x)}', 'set-builder notation', '\\{x \\mid {}\\}', '\\{x \\mid {}\\}'.indexOf('{}') + 1],
    ['{1, 2, 3}', 'finite set', '\\{1, 2, 3\\}'],
  ],
}

export default function MathNotationPicker({ onSelect, className = '', buttonLabel = 'Math notation', mode = 'symbols' }) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef(null)
  const groups = mode === 'formula'
    ? [FORMULA_GROUP, REPEATING_DECIMAL_GROUP, NUMBER_SET_GROUP, ...SYMBOL_GROUPS]
    : SYMBOL_GROUPS

  useEffect(() => {
    function closeOnOutside(event) {
      if (!pickerRef.current?.contains(event.target)) setOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  return (
    <div className={`scratch-symbol-picker ${className}`} ref={pickerRef}>
      <button className="button button-secondary scratch-symbol-toggle" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        {buttonLabel} <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="scratch-symbol-popover" role="dialog" aria-label="Common math notation">
        {groups.map((group) => <section className="scratch-symbol-group" key={group.label}>
          <h3>{group.label}</h3>
          <div>{group.symbols.map(([symbol, name, insertion = symbol, cursorOffset]) => <button key={symbol} type="button" className="scratch-symbol-option" title={`Insert ${name}`} aria-label={`Insert ${name}, ${symbol}`} onClick={() => { setOpen(false); onSelect(insertion, cursorOffset) }}><strong>{symbol}</strong><span>{name}</span></button>)}</div>
        </section>)}
      </div>}
    </div>
  )
}

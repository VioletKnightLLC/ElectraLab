const SUPERSCRIPTS = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5',
  '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-', '⁺': '+', 'ⁿ': 'n',
}

const SUBSCRIPTS = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4', '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9' }

export function toMathLatex(value) {
  return String(value)
    .replaceAll('−', '-')
    .replace(/([A-Za-z0-9)])\^\(([^()]*)\)/g, '$1^{$2}')
    .replace(/([A-Za-z0-9)])\^([+-]?\d+)/g, '$1^{$2}')
    .replace(/([A-Za-z0-9)])([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ]+)/g, (_match, base, power) => `${base}^{${[...power].map((char) => SUPERSCRIPTS[char]).join('')}}`)
    .replace(/([A-Za-z])([₀₁₂₃₄₅₆₇₈₉]+)/g, (_match, base, subscript) => `${base}_{${[...subscript].map((char) => SUBSCRIPTS[char]).join('')}}`)
    .replace(/\^\{\s*-([^{}\/]+?)\s*\/\s*([^{}\/]+?)\s*\}/g, '^{-\\frac{$1}{$2}}')
    .replace(/\^\{\s*([^{}]+?)\s*\/\s*([^{}]+?)\s*\}/g, '^{\\frac{$1}{$2}}')
    .replace(/(\d+(?:\.\d+)?)\s+V\/ms\b/g, '$1\\,\\mathrm{V/ms}')
    .replace(/(\d+(?:\.\d+)?)\s+m\b/g, '$1\\,\\mathrm{m}')
    .replace(/,\s*t in ms\b/g, ',\\quad t\\text{ in ms}')
    .replaceAll('×', '\\times ')
    .replaceAll('·', '\\cdot ')
    .replaceAll('∫', '\\int ')
    .replaceAll('∑', '\\sum ')
    .replaceAll('∂', '\\partial ')
    .replaceAll('∇', '\\nabla ')
    .replaceAll('σ', '\\sigma ')
    .replaceAll('π', '\\pi ')
    .replaceAll('≈', '\\approx ')
    .replaceAll('≤', '\\le ')
    .replaceAll('≥', '\\ge ')
    .replaceAll('→', '\\to ')
    .replaceAll('ƒ', 'f')
    .replaceAll('′', "'")
}

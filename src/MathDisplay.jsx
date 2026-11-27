import 'katex/dist/katex.min.css'
import { toMathLatex } from './math-format.js'
import { renderMathHtml } from './math-render.js'
import MathRenderFallback from './MathRenderFallback.jsx'
import './math-rendering.css'

export { toMathLatex }

export function MathDisplay({ value, latex, className = '', displayMode = true }) {
  const source = latex || toMathLatex(value)
  const { html, failed } = renderMathHtml(source, displayMode)
  const Component = displayMode ? 'div' : 'span'
  if (failed) {
    return <Component className={`math-typeset math-render-error ${className}`.trim()}><MathRenderFallback source={source} displayMode={displayMode} /></Component>
  }
  return <Component className={`math-typeset ${className}`.trim()} dangerouslySetInnerHTML={{ __html: html }} />
}

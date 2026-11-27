import katex from 'katex'

export function renderMathHtml(latex, displayMode = true) {
  try {
    return {
      html: katex.renderToString(latex, {
        displayMode,
        output: 'htmlAndMathml',
        strict: 'ignore',
        throwOnError: true,
        trust: false,
      }),
      failed: false,
    }
  } catch {
    return { html: null, failed: true }
  }
}

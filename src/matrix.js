function validateMatrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length !== 4 || matrix.some((value) => String(value).trim() === '' || !Number.isFinite(Number(value)))) {
    throw new Error('A 2 × 2 matrix needs four finite numbers.')
  }
  return matrix.map(Number)
}

function tidy(value) {
  const rounded = Math.round(value * 1e8) / 1e8
  return Object.is(rounded, -0) ? 0 : rounded
}

export function addMatrices(first, second) {
  const a = validateMatrix(first)
  const b = validateMatrix(second)
  return a.map((value, index) => tidy(value + b[index]))
}

export function multiplyMatrices(first, second) {
  const [a, b, c, d] = validateMatrix(first)
  const [e, f, g, h] = validateMatrix(second)
  return [
    tidy(a * e + b * g),
    tidy(a * f + b * h),
    tidy(c * e + d * g),
    tidy(c * f + d * h),
  ]
}

export function determinant2x2(matrix) {
  const [a, b, c, d] = validateMatrix(matrix)
  return tidy(a * d - b * c)
}

export function formatMatrixLatex(matrix) {
  const [a, b, c, d] = validateMatrix(matrix)
  return String.raw`\begin{bmatrix}${a} & ${b} \\ ${c} & ${d}\end{bmatrix}`
}

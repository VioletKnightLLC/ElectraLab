import test from 'node:test'
import assert from 'node:assert/strict'
import { addMatrices, determinant2x2, formatMatrixLatex, multiplyMatrices } from '../src/matrix.js'

test('2 × 2 matrix addition, multiplication, and determinant use row-major inputs', () => {
  const first = [1, 2, 3, 4]
  const second = [5, 6, 7, 8]

  assert.deepEqual(addMatrices(first, second), [6, 8, 10, 12])
  assert.deepEqual(multiplyMatrices(first, second), [19, 22, 43, 50])
  assert.equal(determinant2x2(first), -2)
  assert.equal(formatMatrixLatex([6, 8, 10, 12]), String.raw`\begin{bmatrix}6 & 8 \\ 10 & 12\end{bmatrix}`)
  assert.throws(() => determinant2x2([1, 2, 3]), /four finite numbers/)
  assert.throws(() => determinant2x2([1, '', 3, 4]), /four finite numbers/)
})

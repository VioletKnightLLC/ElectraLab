import { MathDisplay } from './MathDisplay.jsx'
import { parseInlineMarkdown, parseMathMarkdown } from './math-markdown.js'

function renderInlineTokens(tokens, prefix) {
  return tokens.map((token, index) => {
    const key = `${prefix}-${index}`
    if (token.type === 'math') return <MathDisplay key={key} className="tutor-inline-math" latex={token.text} displayMode={false} />
    if (token.type === 'strong') return <strong key={key}>{renderInlineTokens(token.children, key)}</strong>
    if (token.type === 'code') return <code key={key}>{token.text}</code>
    return token.text
  })
}

function renderInline(text, prefix) {
  return renderInlineTokens(parseInlineMarkdown(text), prefix)
}

export default function MathContent({ content, className = '' }) {
  const blocks = parseMathMarkdown(content)
  return (
    <div className={`math-content ${className}`.trim()}>
      {blocks.map((block, index) => {
        if (block.type === 'math') return <MathDisplay key={index} className="tutor-block-math" latex={block.text} />
        if (block.type === 'heading') return <h3 key={index}>{renderInline(block.text, `heading-${index}`)}</h3>
        if (block.type === 'code') return <div className="math-code-block" key={index}><span className="math-code-language">{block.language || 'Code'}</span><pre><code>{block.text}</code></pre></div>
        if (block.type === 'table') {
          return <div className="math-table-scroll" role="region" aria-label="Model output data table" tabIndex={0} key={index}><table className="math-output-table"><thead><tr>{block.headers.map((header, columnIndex) => <th scope="col" style={{ textAlign: block.alignments[columnIndex] }} key={columnIndex}>{renderInline(header, `table-${index}-head-${columnIndex}`)}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{block.headers.map((_header, columnIndex) => <td style={{ textAlign: block.alignments[columnIndex] }} key={columnIndex}>{renderInline(row[columnIndex] || '', `table-${index}-${rowIndex}-${columnIndex}`)}</td>)}</tr>)}</tbody></table></div>
        }
        if (block.type === 'unordered' || block.type === 'ordered') {
          const List = block.type === 'ordered' ? 'ol' : 'ul'
          return <List key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item, `list-${index}-${itemIndex}`)}</li>)}</List>
        }
        return <p key={index}>{renderInline(block.text, `paragraph-${index}`)}</p>
      })}
    </div>
  )
}

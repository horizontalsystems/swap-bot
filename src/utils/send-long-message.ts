export function splitLongMessage(text: string, maxLen = 3500): string[] {
  const normalized = text.split('\r').join('').trim()
  if (!normalized) return ['']

  const paragraphs = normalized.split('\n\n')
  const chunks: string[] = []
  let current = ''

  const flush = () => {
    if (current.trim()) chunks.push(current.trim())
    current = ''
  }

  const appendParagraph = (paragraph: string) => {
    const piece = paragraph.trim()
    if (!piece) return

    if (!current) {
      if (piece.length <= maxLen) {
        current = piece
      } else {
        splitLargePiece(piece)
      }
      return
    }

    const candidate = current + '\n\n' + piece
    if (candidate.length <= maxLen) {
      current = candidate
    } else {
      flush()
      if (piece.length <= maxLen) {
        current = piece
      } else {
        splitLargePiece(piece)
      }
    }
  }

  const splitLargePiece = (piece: string) => {
    const lines = piece.split('\n')
    let part = ''
    for (const line of lines) {
      const candidate = part ? part + '\n' + line : line
      if (candidate.length > maxLen && part) {
        chunks.push(part)
        part = line
      } else if (candidate.length > maxLen) {
        for (let i = 0; i < line.length; i += maxLen) {
          chunks.push(line.slice(i, i + maxLen))
        }
        part = ''
      } else {
        part = candidate
      }
    }
    if (part) {
      if (!current) current = part
      else {
        const cand = current + '\n\n' + part
        if (cand.length <= maxLen) current = cand
        else {
          flush()
          current = part
        }
      }
    }
  }

  for (const paragraph of paragraphs) appendParagraph(paragraph)
  flush()
  return chunks.length ? chunks : [normalized]
}

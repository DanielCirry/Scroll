import { getDocumentProxy } from 'unpdf'
import { classifyHeading } from './sectionMap.js'

/**
 * Convert PDF buffer to HTML that the existing parser pipeline can consume.
 * Uses font size metadata to detect headings rather than keyword matching alone.
 */
export async function pdfToHtml(buffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buffer))
  const lines = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    groupIntoLines(content.items, lines)
  }

  if (!lines.length) return ''

  const bodyHeight = findBodyHeight(lines)
  const majorThreshold = bodyHeight * 1.25
  const minorThreshold = bodyHeight * 1.1
  const hasLargeText = lines.some(l => l.maxHeight >= majorThreshold)

  if (!hasLargeText) {
    return keywordFallback(lines)
  }

  const htmlParts = []

  for (const line of lines) {
    const text = line.text.trim()
    if (!text) continue

    if (line.maxHeight >= majorThreshold) {
      if (classifyHeading(text)) {
        htmlParts.push(`<h1>${escapeHtml(text)}</h1>`)
      } else {
        htmlParts.push(`<h2>${escapeHtml(text)}</h2>`)
      }
    } else if (line.maxHeight >= minorThreshold) {
      htmlParts.push(`<h3>${escapeHtml(text)}</h3>`)
    } else {
      htmlParts.push(`<p>${escapeHtml(text)}</p>`)
    }
  }

  return htmlParts.join('\n')
}

function groupIntoLines(items, lines) {
  for (const item of items) {
    const y = Math.round(item.transform[5])
    const last = lines[lines.length - 1]
    if (last && Math.abs(last.y - y) <= 2) {
      last.items.push(item)
      last.text += item.str
      if (item.height > last.maxHeight) last.maxHeight = item.height
    } else {
      lines.push({ y, items: [item], text: item.str, maxHeight: item.height })
    }
  }
}

function findBodyHeight(lines) {
  const counts = {}
  for (const line of lines) {
    const h = Math.round(line.maxHeight * 10) / 10
    if (h > 0) counts[h] = (counts[h] || 0) + 1
  }
  let best = 0, bestCount = 0
  for (const [h, count] of Object.entries(counts)) {
    if (count > bestCount) { best = Number(h); bestCount = count }
  }
  return best
}

function keywordFallback(lines) {
  const htmlParts = []
  for (const line of lines) {
    const t = line.text.trim()
    if (!t) continue
    if (t.length < 60 && classifyHeading(t)) {
      htmlParts.push(`<h1>${escapeHtml(t)}</h1>`)
    } else {
      htmlParts.push(`<p>${escapeHtml(t)}</p>`)
    }
  }
  return htmlParts.join('\n')
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

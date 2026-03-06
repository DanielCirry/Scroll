import mammoth from 'mammoth'
import * as cheerio from 'cheerio'
import { classifyHeading } from './sectionMap.js'
import { classifySkills } from './skillMap.js'

const EMAIL_REGEX = /[\w.-]+@[\w.-]+\.\w{2,}/g
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g
const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/g
// Matches "City, Country/Code" — generic, no hardcoded names
const STANDALONE_LOCATION_REGEX = /^[A-Za-z\u00C0-\u024F]+(?:[\s-][A-Za-z\u00C0-\u024F]+)*,?\s+[A-Za-z\u00C0-\u024F]{2,}(?:\s[A-Za-z\u00C0-\u024F]+)*$/i

export async function parseCv(buffer, isPdf = false) {
  let html
  if (isPdf) {
    const { pdfToHtml } = await import('./parsePdf.js')
    html = await pdfToHtml(buffer)
  } else {
    const result = await mammoth.convertToHtml({ buffer })
    html = result.value
  }
  const $ = cheerio.load(html)

  const headings = detectHeadings($)
  const { sections, sectionHeadings } = groupBySections($, headings)
  const contactInfo = extractContactInfo($)
  const name = extractName($, headings, contactInfo)
  const initials = deriveInitials(name)
  const title = extractTitle($, headings, name, contactInfo)
  const location = extractLocation($, headings, name, contactInfo)
  if (location) contactInfo.location = location

  const contact = { encrypted: false, data: contactInfo }

  let profileHtml = sections.profile || ''

  // If no profile section, collect preamble lines that aren't name/title/contact
  // Use the first *section* heading (one that classifies as a known section) as the boundary,
  // not the first heading overall (which may be the name heading in PDFs)
  if (!profileHtml && headings.length > 0) {
    const preambleLines = []
    const firstSectionHeading = headings.find(h => classifyHeading(h.text))
    const boundary = firstSectionHeading || headings[0]
    $('body').children().each((_, el) => {
      if (boundary && el === boundary.element) return false
      if ($(el).prop('tagName')?.toLowerCase() === 'p') {
        const text = $(el).text().trim()
        if (!text || text.length < 30) return  // skip short lines (name, contact, etc.)
        if (EMAIL_REGEX.test(text) || PHONE_REGEX.test(text)) return
        if (text === name) return
        preambleLines.push(text)
      }
    })
    profileHtml = preambleLines.join(' ')
  }

  const profileText = cheerio.load(profileHtml).text().trim()

  const experience = parseExperience(sections.experience || '')
  const projects = parseProjects(sections.projects || '')

  // Cross-reference: extract links from experience highlights and enrich projects
  crossReferenceLinks(experience, projects)

  return {
    meta: {
      initials,
      title,
      generatedAt: new Date().toISOString(),
      version: 1,
      sectionHeadings,
    },
    profile: { summary: profileText },
    skills: parseSkills(sections.skills || ''),
    experience,
    education: parseEducation(sections.education || ''),
    projects,
    other: buildOtherSections(sections),
    contact,
  }
}

// Keep old name for backwards compat
export const parseDocx = parseCv

function detectHeadings($) {
  const headings = []

  $('h1, h2, h3, h4').each((_, el) => {
    const text = $(el).text().trim()
    const tag = $(el).prop('tagName').toLowerCase()
    if (text) headings.push({ text, element: el, type: 'heading', tag })
  })

  if (headings.length === 0) {
    $('p').each((_, el) => {
      const $el = $(el)
      const text = $el.text().trim()
      if (!text || text.length > 60) return

      const isBold = $el.find('strong').length > 0 && $el.find('strong').text().trim() === text
      const isAllCaps = text === text.toUpperCase() && text.length > 2 && /[A-Z]/.test(text)

      if (isBold || isAllCaps) {
        headings.push({ text, element: el, type: isBold ? 'bold' : 'allcaps', tag: 'p' })
      }
    })
  }

  return headings
}

// Groups content by top-level section headings.
// Sub-headings (h2 under h1, h3 under h2, etc.) are included as content
// within the parent section rather than creating separate sections.
function groupBySections($, headings) {
  const sections = {}
  const sectionHeadings = {}

  // Find the top-level heading tag (usually h1)
  const topTag = headings.reduce((min, h) => {
    const level = parseInt(h.tag?.replace('h', '') || '99')
    return level < min ? level : min
  }, 99)

  // Only top-level headings define sections
  const topHeadings = headings.filter((h) => {
    const level = parseInt(h.tag?.replace('h', '') || '99')
    return level <= topTag
  })

  for (let i = 0; i < topHeadings.length; i++) {
    const heading = topHeadings[i]
    const classification = classifyHeading(heading.text)
    const key = classification || `other:${heading.text}`

    // Store the first original heading text for each classified section
    if (!sectionHeadings[key]) {
      sectionHeadings[key] = heading.text
    }

    let content = ''
    let current = $(heading.element).next()
    const nextHeadingEl = i + 1 < topHeadings.length ? topHeadings[i + 1].element : null

    while (current.length > 0) {
      if (nextHeadingEl && current[0] === nextHeadingEl) break
      content += $.html(current)
      current = current.next()
    }

    // Append if section already exists (e.g. "Professional Experience" + "Selected Work" both classify as "experience")
    if (sections[key]) {
      sections[key] += '\n' + content.trim()
    } else {
      sections[key] = content.trim()
    }
  }

  if (!sections.profile && topHeadings.length === 0) {
    sections.profile = $.text().trim()
  }

  return { sections, sectionHeadings }
}

function extractContactInfo($) {
  const info = {}

  // Try mailto links first (most reliable when <br>-separated text gets concatenated)
  $('a[href^="mailto:"]').each((_, el) => {
    if (!info.email) info.email = $(el).attr('href').replace('mailto:', '')
  })

  const text = $.text()
  // Insert space before email patterns that may be glued to preceding text
  const cleaned = text.replace(/([a-z])([A-Za-z]*@)/g, '$1 $2')

  if (!info.email) {
    const emails = cleaned.match(EMAIL_REGEX)
    if (emails) info.email = emails[0]
  }

  const phones = cleaned.match(PHONE_REGEX)
  if (phones) info.phone = phones[0]

  const linkedin = text.match(LINKEDIN_REGEX)
  if (linkedin) info.linkedin = linkedin[0]

  return info
}

// Collect raw preamble <p> texts before the first heading,
// then split concatenated lines by stripping out known contact info.
// Uses the already-extracted contactInfo to precisely remove emails/phones/etc.
function collectPreamble($, headings, contactInfo) {
  // Use the first heading that's a recognized section (not a name/title h2)
  const firstHeading = headings.find(h => classifyHeading(h.text)) || headings[0]
  const rawLines = []
  const preambleTags = ['p', 'h2', 'h3', 'h4']
  $('body').children().each((_, el) => {
    if (firstHeading && el === firstHeading.element) return false
    const tag = $(el).prop('tagName')?.toLowerCase()
    if (preambleTags.includes(tag)) {
      // Split on <br> tags to handle multi-line <p> elements (e.g. name<br>title<br>email)
      const html = $(el).html()
      if (html && /<br\s*\/?>/i.test(html)) {
        for (const part of html.split(/<br\s*\/?>/i)) {
          const text = cheerio.load(part).text().trim()
          if (text) rawLines.push(text)
        }
      } else {
        const text = $(el).text().trim()
        if (text) rawLines.push(text)
      }
    }
  })

  const result = []
  for (let raw of rawLines) {
    // Strip known contact info values from the text
    if (contactInfo.email) raw = raw.replace(contactInfo.email, '\n')
    if (contactInfo.phone) raw = raw.replace(contactInfo.phone, '\n')
    if (contactInfo.linkedin) raw = raw.replace(contactInfo.linkedin, '\n')

    // Also strip any remaining email/phone patterns that may have captured extra chars
    raw = raw.replace(EMAIL_REGEX, '\n')
    raw = raw.replace(PHONE_REGEX, '\n')
    raw = raw.replace(LINKEDIN_REGEX, '\n')

    const lines = raw.split('\n').map((s) => s.trim()).filter(Boolean)
    result.push(...lines)
  }
  return result
}

// Extract name: look for text BEFORE the first section heading.
function extractName($, headings, contactInfo) {
  const preamble = collectPreamble($, headings, contactInfo)

  // First preamble line that looks like a name (no section keyword, has letters, no @/+)
  // Skip label fragments left over from contact stripping (e.g. "Location:", "Mail:", "Github:")
  const LABEL_REGEX = /^(Location|Mail|Phone|Github|Email|LinkedIn|Address|Website|Portfolio|Tel)\s*:?$/i
  for (const text of preamble) {
    if (LABEL_REGEX.test(text)) continue
    if (text.length < 80 && /[A-Za-z]/.test(text) && !classifyHeading(text) && !/@/.test(text) && !/^\+?\d/.test(text)) {
      if (STANDALONE_LOCATION_REGEX.test(text) && text.includes(',')) continue
      // "Name - Title" format: split on dash and take the first part
      const dashPart = text.split(/\s*[-–—]\s*/)[0].trim()
      if (/engineer|developer|architect|designer|manager|analyst|consultant|lead|director|specialist/i.test(dashPart)) continue
      if (dashPart && /[A-Za-z]/.test(dashPart)) return dashPart
      if (!text.includes('|') && !text.includes(',')) return text
      return text.split(/[|–—]/)[0].trim()
    }
  }

  // Fallback: first heading (h1 or h2) that isn't a section heading
  const firstHeadingEl = $('h1, h2').first().text().trim()
  if (firstHeadingEl && firstHeadingEl.length < 80 && !classifyHeading(firstHeadingEl)) {
    const dashPart = firstHeadingEl.split(/\s*[-–—]\s*/)[0].trim()
    if (dashPart && /[A-Za-z]/.test(dashPart) && !/engineer|developer|architect|designer|manager|analyst|consultant|lead|director|specialist/i.test(dashPart)) {
      return dashPart
    }
  }

  // Fallback: first bold text that isn't a section heading
  const firstBold = $('p strong').first().text().trim()
  if (firstBold && firstBold.length < 50 && !classifyHeading(firstBold)) return firstBold

  return ''
}

function deriveInitials(name) {
  if (!name) return '?'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase() + '.'
  return parts[0][0].toUpperCase() + '.' + parts[parts.length - 1][0].toUpperCase() + '.'
}

// Extract title from the preamble text (line after name, usually has a pipe or subtitle)
function extractTitle($, headings, name, contactInfo) {
  const preamble = collectPreamble($, headings, contactInfo)

  for (const text of preamble) {
    if (text === name) continue
    // Skip contact info and location lines
    if (/@/.test(text) || /^\+?\d/.test(text)) continue
    if (STANDALONE_LOCATION_REGEX.test(text)) continue
    if (/linkedin\.com/i.test(text)) continue

    // "Name - Title" format: strip the name part and use what's after the dash
    let candidate = text
    if (name && candidate.toLowerCase().startsWith(name.toLowerCase())) {
      candidate = candidate.substring(name.length).replace(/^\s*[-–—|]\s*/, '').trim()
    }

    // Line like "Backend Software Engineer | AI-Driven Product Teams"
    const titlePart = candidate.split(/[|–—]/)[0].trim()
    if (titlePart && titlePart.length < 80 && /[A-Za-z]/.test(titlePart)) {
      // Must contain a role-like word
      if (!/engineer|developer|architect|designer|manager|analyst|consultant|lead|director|specialist/i.test(titlePart)) {
        continue
      }
      // Strip parenthesized details like "(Backend / .NET)"
      const coreTitle = titlePart.replace(/\s*\(.*$/, '').trim()
      return coreTitle || titlePart
    }
  }

  // Fallback: check first heading for "Name - Title" format
  const firstHeadingText = $('h1, h2').first().text().trim()
  if (firstHeadingText && name) {
    let candidate = firstHeadingText
    if (candidate.toLowerCase().startsWith(name.toLowerCase())) {
      candidate = candidate.substring(name.length).replace(/^\s*[-–—|]\s*/, '').trim()
    }
    if (candidate && /engineer|developer|architect|designer|manager|analyst|consultant|lead|director|specialist/i.test(candidate)) {
      return candidate.replace(/\s*\(.*$/, '').trim()
    }
  }

  return 'Software Engineer'
}

// Extract location from preamble text for contact info
function extractLocation($, headings, name, contactInfo) {
  // First try: look for "Location: <value>" in raw text before stripping
  const firstSectionHeading = headings.find(h => classifyHeading(h.text)) || headings[0]
  const rawTexts = []
  $('body').children().each((_, el) => {
    if (firstSectionHeading && el === firstSectionHeading.element) return false
    const text = $(el).text().trim()
    if (text) rawTexts.push(text)
  })
  for (const text of rawTexts) {
    const locMatch = text.match(/Location\s*:\s*([^,]+(?:,\s*\w+)?)/i)
    if (locMatch) return locMatch[1].trim()
  }

  // Fallback: preamble-based detection
  const preamble = collectPreamble($, headings, contactInfo)
  const LABEL_RE = /^(Location|Mail|Phone|Github|Email|LinkedIn|Address|Website|Portfolio|Tel)\s*:?$/i

  for (const text of preamble) {
    if (text === name) continue
    if (LABEL_RE.test(text)) continue
    if (/:\s*$/.test(text)) continue
    if (STANDALONE_LOCATION_REGEX.test(text)) return text
  }
  return ''
}

// Parse skills from HTML. Handles two common formats:
// 1. <p>Category: item1, item2, item3</p> (inline format)
// 2. <h3>Category</h3> followed by <ul> or comma-separated text
function parseSkills(html) {
  if (!html) return []
  const $ = cheerio.load(html)
  const allItems = []

  // Try inline "Category: item1, item2" format first (common in CVs)
  $('p').each((_, el) => {
    const text = $(el).text().trim()
    const colonMatch = text.match(/^([^:]+):\s*(.+)$/)
    if (colonMatch) {
      const items = colonMatch[2].split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      allItems.push(...items)
    }
  })

  // Also try h3/h4/strong based categories
  if (allItems.length === 0) {
    $('h3, h4, strong').each((_, el) => {
      const category = $(el).text().trim().replace(/:$/, '')
      if (!category) return

      let items = []
      let next = $(el).parent().is('li, p') ? $(el).parent().next() : $(el).next()

      if (next.is('ul')) {
        next.find('li').each((_, li) => items.push($(li).text().trim()))
      } else {
        const text = next.text() || $(el).parent().text().replace(category, '')
        items = text.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)
      }

      allItems.push(...items)
    })
  }

  // Fallback: split all text
  if (allItems.length === 0) {
    const text = $.text().trim()
    const items = text.split(/[,;\n|]/).map((s) => s.trim()).filter((s) => s && s.length < 40)
    allItems.push(...items)
  }

  // Always auto-classify into standard categories
  if (allItems.length > 0) return classifySkills(allItems)
  return []
}

// Parse experience entries from HTML containing h2 sub-headings.
// Format: <h2>Company – Location</h2> <p>Role | Period</p> <p>descriptions...</p>
function parseExperience(html) {
  if (!html) return []
  const $ = cheerio.load(html)
  const entries = []

  const rolePattern = /^(.+?)(?:\s*[-–—|@]\s*)(.+?)$/
  const datePattern = /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}/i

  // Check if a heading looks like a company entry (contains a date) vs a sub-project
  function isCompanyHeading(text) {
    return datePattern.test(text)
  }

  // Check if the next <p> sibling has a date (for headings like "Company – Location" where role/period is in the next line)
  function nextParagraphHasDate($, el) {
    const next = $(el).next()
    if (!next.is('p')) return false
    const text = next.text().trim()
    return datePattern.test(text) || /\d{4}\s*[-–—]\s*(?:Present|\d{4})/i.test(text)
  }

  // Collect content paragraphs after a heading until next heading, returns array of text lines
  function collectContent($el) {
    const lines = []
    let next = $el.next()
    const stopTags = ['h2', 'h3', 'h4']
    while (next.length && !stopTags.includes(next.prop('tagName')?.toLowerCase())) {
      const text = next.text().trim()
      if (next.is('ul')) {
        next.find('li').each((_, li) => lines.push($(li).text().trim()))
      } else if (next.is('p') && text && text !== '•') {
        lines.push(text)
      }
      next = next.next()
    }
    return lines
  }

  $('h2, h3, h4').each((_, el) => {
    const companyText = $(el).text().trim()
    if (!companyText) return

    const headingHasDate = isCompanyHeading(companyText)
    if (headingHasDate || nextParagraphHasDate($, el)) {
      // This is a real company entry
      // Extract role and period from heading if present (e.g. "Dakik - Founder / Director May 2021 - Present")
      const companyParts = companyText.match(/^(.+?)(?:\s*[-–—]\s*)(.+)$/)
      let company = companyParts ? companyParts[1].trim() : companyText
      let role = ''
      let period = ''

      if (companyParts) {
        const rest = companyParts[2].trim()
        if (headingHasDate) {
          // Split role from period at the first month name
          const periodMatch = rest.match(/((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}.*)$/i)
          if (periodMatch) {
            role = rest.substring(0, periodMatch.index).replace(/\s*[-–—|]\s*$/, '').trim()
            period = periodMatch[1].trim()
          } else {
            role = rest
          }
        }
        // When heading has no date, rest is likely a location (e.g. "Remote", "Manchester")
        // — leave role/period empty so the next <p> provides them
      }

      const highlights = []

      let next = $(el).next()
      const stopTags = ['h2', 'h3', 'h4']

      while (next.length && !stopTags.includes(next.prop('tagName')?.toLowerCase())) {
        const text = next.text().trim()

        if (next.is('ul')) {
          next.find('li').each((_, li) => highlights.push($(li).text().trim()))
        } else if (next.is('p') && text) {
          if (text === '•') { next = next.next(); continue }
          // If role/period already extracted from heading, all <p> are highlights
          if (role || period) {
            const strong = next.find('strong').text().trim()
            if (strong) {
              highlights.push(text)
            } else if (text.toLowerCase().startsWith('stack:')) {
              // Skip stack lines
            } else {
              highlights.push(text)
            }
          } else {
            // Role/period not in heading — first <p> is "Role | Period"
            const rolePeriod = text.match(rolePattern)
            if (rolePeriod) {
              role = rolePeriod[1].trim()
              period = rolePeriod[2].trim()
            } else if (text.match(/\d{4}/)) {
              period = text
            } else {
              role = text
            }
          }
        }

        next = next.next()
      }

      // Merge PDF line-wrapped highlights (prev line doesn't end with sentence punctuation = continuation)
      const merged = []
      for (const h of highlights) {
        const prev = merged[merged.length - 1]
        if (prev && !/[.!?]$/.test(prev)) {
          merged[merged.length - 1] += ' ' + h
        } else {
          merged.push(h)
        }
      }

      if (company) {
        entries.push({ role, company, period, highlights: merged })
      }
    } else {
      // Sub-project heading (no date) — fold into previous company entry
      const lastEntry = entries[entries.length - 1]
      if (lastEntry) {
        const subLines = collectContent($(el))
        // Last line is tech stack if it's a comma-separated list of short items (no sentence punctuation)
        const lastLine = subLines[subLines.length - 1] || ''
        // Tech line: comma-separated short items, no sentence-ending punctuation (but allow dots in tech names like "Fal.ai")
        const isTechLine = lastLine.includes(',') && !lastLine.includes('—') &&
          !/\.\s/.test(lastLine) && !lastLine.endsWith('.') &&
          lastLine.split(',').every(item => item.trim().length < 40)
        const techLine = isTechLine ? subLines.pop() : null
        // Join remaining lines into description (handles PDF line-wrapping)
        const desc = subLines.join(' ')
        let highlight = companyText
        if (desc) highlight += ' – ' + desc
        if (techLine) highlight += ' [' + techLine + ']'
        lastEntry.highlights.push(highlight)
      }
    }
  })

  // Fallback: try strong-based parsing if no h2/h3/h4 found
  if (entries.length === 0) {
    $('strong').each((_, el) => {
      const headerText = $(el).text().trim()
      const match = headerText.match(rolePattern)

      const entry = {
        role: match ? match[1].trim() : headerText,
        company: match ? match[2].trim() : '',
        period: '',
        highlights: [],
      }

      const parent = $(el).parent().is('li, p') ? $(el).parent() : $(el)
      let next = parent.next()

      while (next.length && !next.find('strong').length) {
        if (next.is('ul')) {
          next.find('li').each((_, li) => entry.highlights.push($(li).text().trim()))
        } else if (next.is('p')) {
          const text = next.text().trim()
          if (!entry.period && text.match(/\d{4}/)) {
            entry.period = text
          } else {
            entry.highlights.push(text)
          }
        }
        next = next.next()
      }

      entries.push(entry)
    })
  }

  // Fallback: <p>-only content (PDF) — detect "Company - Role Date" lines
  if (entries.length === 0) {
    const companyLineRegex = /^(.+?)\s*[-–—]\s*(.+?)\s+((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}.*)$/i
    const allP = []
    $('p').each((_, el) => allP.push($(el).text().trim()))

    let i = 0
    while (i < allP.length) {
      const match = allP[i].match(companyLineRegex)
      if (match) {
        const company = match[1].trim()
        const role = match[2].trim()
        const period = match[3].trim()
        const highlights = []
        i++
        while (i < allP.length && !allP[i].match(companyLineRegex)) {
          const line = allP[i].replace(/^[•\-*–]\s*/, '').trim()
          if (line) highlights.push(line)
          i++
        }
        entries.push({ role, company, period, highlights })
      } else {
        i++
      }
    }
  }

  return entries
}

function parseEducation(html) {
  if (!html) return []
  const $ = cheerio.load(html)
  const entries = []

  $('h3, h4, strong, li, p').each((_, el) => {
    const text = $(el).text().trim()
    if (!text || text.length > 200) return

    const yearMatch = text.match(/(\d{4})/)
    if (yearMatch || text.toLowerCase().includes('degree') || text.toLowerCase().includes('bsc') || text.toLowerCase().includes('msc')) {
      entries.push({
        degree: text.replace(/[-–—]\s*\d{4}.*$/, '').trim(),
        institution: '',
        year: yearMatch?.[1] || '',
      })
    }
  })

  return entries
}

// Parse projects from HTML. Handles:
// - <h2/h3>Project Name</h2> followed by description
// - <p><strong>Project Name –</strong> description</p> (inline bold format)
function parseProjects(html) {
  if (!html) return []
  const $ = cheerio.load(html)
  const projects = []

  // Try h2/h3/h4 headings first
  $('h2, h3, h4').each((_, el) => {
    const name = $(el).text().trim()
    if (!name) return

    let description = ''
    let link = ''
    let tech = []
    let next = $(el).next()

    // Check for link in the heading itself
    const headingLink = $(el).find('a').attr('href')
    if (headingLink) link = headingLink

    while (next.length && !['h2', 'h3', 'h4'].includes(next.prop('tagName')?.toLowerCase())) {
      // Extract links from <a> tags in description paragraphs
      if (!link) {
        const foundLink = next.find('a').attr('href')
        if (foundLink) link = foundLink
      }
      if (next.is('p')) description += (description ? ' ' : '') + next.text().trim()
      if (next.is('ul')) {
        next.find('li').each((_, li) => {
          description += (description ? ' ' : '') + $(li).text().trim()
        })
      }
      next = next.next()
    }

    // Fallback: detect plain-text URLs in description
    if (!link) {
      const urlMatch = description.match(/(https?:\/\/\S+)/)
      if (urlMatch) {
        link = urlMatch[1]
        // Remove the URL from description text
        description = description.replace(urlMatch[0], '').trim()
      }
    }

    projects.push({ name, description: description.trim(), tech, highlights: [], link: link || undefined })
  })

  // Fallback: look for <p> with links or bold project names
  if (projects.length === 0) {
    $('p').each((_, el) => {
      const $el = $(el)
      const text = $el.text().trim()
      const link = $el.find('a').attr('href') || ''
      const strong = $el.find('strong').text().trim()

      if (strong) {
        const desc = text.replace(strong, '').replace(/^[\s–—-]+/, '').trim()
        projects.push({ name: strong.replace(/[\s–—-]+$/, ''), description: desc, tech: [], highlights: [], link: link || undefined })
      } else if (link && text) {
        projects.push({ name: text.split(/[–—-]/)[0].trim(), description: '', tech: [], highlights: [], link })
      } else if (text) {
        // Plain text like "Project Name – https://url" or "Project Name – description"
        const urlMatch = text.match(/(https?:\/\/\S+)/)
        const parts = text.split(/\s*[–—-]\s*/)
        const name = parts[0]?.trim()
        if (name) {
          const desc = urlMatch ? '' : (parts.slice(1).join(' – ').trim())
          projects.push({ name, description: desc, tech: [], highlights: [], link: urlMatch?.[1] || undefined })
        }
      }
    })
  }

  return projects
}

// Cross-reference experience highlights with projects:
// 1. Extract URLs from highlights and clean them
// 2. Match highlights to existing projects by name (with or without URLs)
// 3. Enrich projects with descriptions, links, and company from experience
// 4. Deduplicate projects, keeping the entry with the most content
function crossReferenceLinks(experience, projects) {
  const URL_REGEX = /(https?:\/\/[^\s]+)/

  for (const entry of experience) {
    for (let i = 0; i < entry.highlights.length; i++) {
      const highlight = entry.highlights[i]

      // Parse "ProjectName – description" format
      const dashParts = highlight.split(/\s*[–—]\s*/)
      const highlightProjectName = dashParts[0]?.trim()
      const highlightDesc = dashParts.length > 1 ? dashParts.slice(1).join(' – ').trim() : ''

      // Extract and clean URL if present
      const urlMatch = highlight.match(URL_REGEX)
      let url = ''
      let cleanDesc = highlightDesc

      if (urlMatch) {
        url = urlMatch[1].replace(/[.,;:!?)]+$/, '')
        const tldGlue = url.match(/(\.\w{2,6})([A-Z][a-z])/)
        if (tldGlue) url = url.substring(0, tldGlue.index + tldGlue[1].length)

        // Remove URL from description, recover text glued to URL
        const trimmedFromUrl = urlMatch[1].substring(url.length)
        const rawAfter = highlight.substring(urlMatch.index + urlMatch[0].length).trim()
        cleanDesc = (trimmedFromUrl + (rawAfter ? ' ' + rawAfter : '')).trim()
        // If desc was just the URL, use the part after dash instead
        if (!cleanDesc && highlightDesc) {
          cleanDesc = highlightDesc.replace(URL_REGEX, '').trim()
        }

        // Clean the highlight text shown in experience
        entry.highlights[i] = (highlightProjectName + (cleanDesc ? ' – ' + cleanDesc : '')).trim() || highlight
      }

      // Match to existing project by name
      if (highlightProjectName) {
        const existing = projects.find((p) =>
          p.name.toLowerCase() === highlightProjectName.toLowerCase()
        )

        if (existing) {
          if (url && !existing.link) existing.link = url
          if (!existing.company && entry.company) existing.company = entry.company
          // Use the longer description
          if (cleanDesc && cleanDesc.length > (existing.description || '').length) {
            existing.description = cleanDesc
          }
        } else if (url) {
          // Only create new project entries when there's a URL
          projects.push({
            name: highlightProjectName,
            description: cleanDesc,
            tech: [],
            highlights: [],
            link: url,
            company: entry.company || undefined,
          })
        }
      }
    }
  }

  // Deduplicate projects by name — keep the entry with the most content
  const seen = new Map()
  for (const project of projects) {
    const key = project.name.toLowerCase()
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, project)
    } else {
      // Merge: pick longer description, prefer entry with link
      if ((project.description || '').length > (existing.description || '').length) {
        existing.description = project.description
      }
      if (project.link && !existing.link) existing.link = project.link
      if (project.company && !existing.company) existing.company = project.company
    }
  }
  // Replace projects array with deduped entries
  projects.length = 0
  projects.push(...seen.values())
}

function buildOtherSections(sections) {
  const known = ['profile', 'experience', 'skills', 'education', 'projects', 'contact']
  const other = []

  for (const [key, content] of Object.entries(sections)) {
    if (key.startsWith('other:')) {
      const heading = key.replace('other:', '')
      const $ = cheerio.load(content)
      other.push({ heading, content: $.text().trim() })
    } else if (!known.includes(key) && key !== 'certifications' && key !== 'languages') {
      const $ = cheerio.load(content)
      other.push({ heading: key.charAt(0).toUpperCase() + key.slice(1), content: $.text().trim() })
    }
  }

  return other
}


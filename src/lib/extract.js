import { todayKey } from './dates.js'

/* ------------------------------------------------------------------ *
 * Local (offline) extractor — works with zero setup, no API key.
 * Catches the patterns that show up in real college messages:
 *   "DBMS assignment due Friday, 20 marks"
 *   "submit by 25/10 before 11:59 pm"
 *   "Lab report by tomorrow"
 * ------------------------------------------------------------------ */

const MONTHS = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
}

const WEEKDAYS = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5, sat: 6, saturday: 6,
}

const KNOWN_SUBJECTS = [
  'Operating Systems', 'Computer Networks', 'Software Engineering', 'Machine Learning',
  'Deep Learning', 'Cyber Security', 'Compiler Design', 'Data Structures', 'DBMS',
  'OS', 'CN', 'SE', 'TOC', 'DSA', 'OOP', 'DAA', 'PPL', 'CD', 'ATCD', 'ML', 'AI',
  'Java', 'Python', 'C++', 'JavaScript', 'Flutter', 'React', 'Maths', 'Mathematics',
  'Physics', 'Chemistry', 'Biology', 'Economics', 'Statistics', 'English', 'AutoCAD',
]

function keyOf(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function nextWeekday(target, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let delta = (target - d.getDay() + 7) % 7
  if (delta === 0) delta = 7 // "Friday" said on Friday means next Friday
  d.setDate(d.getDate() + delta)
  return d
}

function validDate(year, month, day) {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null
  const d = new Date(year, month, day)
  if (d.getMonth() !== month || d.getDate() !== day) return null
  return d
}

function findDate(text) {
  const year = new Date().getFullYear()

  // 1. ISO: 2026-10-25
  let m = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (m) {
    const d = validDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    if (d) return { key: keyOf(d), matchText: m[0] }
  }

  // 2. 25 Oct / 25th October / 25 of Oct
  m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i)
  if (m) {
    const d = validDate(year, MONTHS[m[2].toLowerCase().slice(0, 3)], Number(m[1]))
    if (d) return { key: keyOf(d), matchText: m[0] }
  }

  // 3. Oct 25 / October 25th
  m = text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i)
  if (m) {
    const d = validDate(year, MONTHS[m[1].toLowerCase().slice(0, 3)], Number(m[2]))
    if (d) return { key: keyOf(d), matchText: m[0] }
  }

  // 4. 25/10 or 25-10-2026 (dd/mm, India default)
  m = text.match(/\b(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2,4}))?\b/)
  if (m) {
    let y = m[3] ? Number(m[3]) : year
    if (y < 100) y += 2000
    const d = validDate(y, Number(m[2]) - 1, Number(m[1]))
    if (d) return { key: keyOf(d), matchText: m[0] }
  }

  // 5. tomorrow / day after tomorrow / today
  if (/\btomorrow\b/i.test(text)) {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return { key: keyOf(d), matchText: text.match(/\btomorrow\b/i)[0] }
  }
  if (/day after tomorrow/i.test(text)) {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return { key: keyOf(d), matchText: 'day after tomorrow' }
  }

  // 6. weekday names: "Friday", "next Monday"
  m = text.match(/\b(?:on|by|before|next|this)?\s*\b(mon|tues?|wed|thur?s?|fri|sat|ur)s?day\b/i)
  if (m) {
    const name = m[1].toLowerCase().replace(/s$/, '')
    const target = WEEKDAYS[name.startsWith('thur') ? 'thursday' : name]
    if (target !== undefined) {
      const d = nextWeekday(target)
      return { key: keyOf(d), matchText: m[0] }
    }
  }

  return null
}

function findMarks(text) {
  const m = text.match(/\b(\d{1,3})\s*(?:marks?|mk|pts|points)\b/i)
  if (m) return { value: Number(m[1]), matchText: m[0] }
  const m2 = text.match(/\bmarks?\s*[:\-]?\s*(\d{1,3})\b/i)
  if (m2) return { value: Number(m2[1]), matchText: m2[0] }
  return null
}

function findSubject(text) {
  for (const s of KNOWN_SUBJECTS) {
    const re = new RegExp(`\\b${s.replace(/[+]/g, '\\+')}\\b`, 'i')
    if (re.test(text)) return s
  }
  // "…for DBMS…" / "DBMS ka assignment" → word right before the assignment noun
  const m = text.match(/\b([A-Za-z& ]{2,30}?)\s+(?:ka\s+|ke\s+)?(?:assignment|homework|lab|experiment|submission|project|report|worksheet|activity)\b/i)
  if (m) {
    const candidate = m[1].trim().split(/\s+/).slice(-3).join(' ')
    if (candidate.length >= 2) return candidate.replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return null
}

function cleanTitle(text, dateMatch, marksMatch) {
  let t = text
  if (dateMatch) t = t.replace(dateMatch, ' ')
  if (marksMatch) t = t.replace(marksMatch, ' ')
  t = t
    .replace(/\b(please|kindly|hi|hello|dear|team|everyone|all|note|reminder|as per|kind(?:ly)?)\b[:,]?/gi, ' ')
    .replace(/\b(submit|submission|due|deadline|on|by|before)\b\s*[:\-]?\s*$/i, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;])/g, '$1')
    .trim()
  if (!t) t = text.trim()
  t = t.replace(/^[,;:\-\s]+/, '')
  if (t.length > 110) t = t.slice(0, 107) + '…'
  return t
}

function priorityFor(dueDate, marks) {
  if (dueDate) {
    const [y, m, d] = dueDate.split('-').map(Number)
    const diff = Math.round((new Date(y, m - 1, d) - new Date(new Date().toDateString())) / 86400000)
    if (diff <= 1) return 'high'
  }
  if (marks && marks >= 15) return 'high'
  return 'normal'
}

export function extractLocal(raw) {
  const text = raw.trim().replace(/\s+/g, ' ')
  const date = findDate(text)
  const marks = findMarks(text)
  const subject = findSubject(text)
  const dueDate = date ? date.key : null
  return {
    title: cleanTitle(text, date?.matchText, marks?.matchText),
    subject,
    dueDate,
    marks: marks ? marks.value : null,
    priority: priorityFor(dueDate, marks?.value),
  }
}

/* ------------------------------------------------------------------ *
 * AI extractor — optional, OpenAI-compatible. Used when the user
 * pastes an API key in Settings. Falls back to extractLocal() on error.
 * ------------------------------------------------------------------ */

function stripFences(s) {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
}

async function extractWithAI(raw, settings) {
  const today = todayKey()
  const system = [
    'You extract assignment/deadline info from a messy message.',
    `Today is ${today}.`,
    'Reply with ONLY minified JSON, no prose, exactly this shape:',
    '{"title":string,"subject":string|null,"dueDate":"YYYY-MM-DD"|null,"marks":number|null,"priority":"high"|"normal"}',
    'title = short task name (max 90 chars). dueDate = a real calendar date derived from the text, or null if no date is mentioned. priority = "high" if due within 1 day or marks >= 15, else "normal".',
  ].join('\n')

  const res = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: raw },
      ],
    }),
  })

  if (!res.ok) throw new Error(`AI request failed: ${res.status}`)
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty AI response')

  const parsed = JSON.parse(stripFences(content))
  if (!parsed || typeof parsed.title !== 'string') throw new Error('Bad AI JSON')

  return {
    title: parsed.title.trim().slice(0, 110) || extractLocal(raw).title,
    subject: typeof parsed.subject === 'string' && parsed.subject.trim() ? parsed.subject.trim() : null,
    dueDate: typeof parsed.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate)
      ? parsed.dueDate
      : null,
    marks: Number.isFinite(parsed.marks) ? parsed.marks : null,
    priority: parsed.priority === 'high' ? 'high' : 'normal',
  }
}

/**
 * Single entry point: AI if enabled, local always available as fallback.
 */
export async function extractTask(raw, settings) {
  if (settings?.aiEnabled && settings.apiKey) {
    try {
      return await extractWithAI(raw, settings)
    } catch (err) {
      console.warn('[Deadline Radar] AI extract failed, using local parser:', err)
    }
  }
  return extractLocal(raw)
}

import { parseDateKey, todayKey } from './dates.js'

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

// Hinglish weekday spellings (common romanised forms).
const HI_WEEKDAYS = {
  ravivar: 0, ravivaar: 0, somvar: 1, somvaar: 1, somavar: 1,
  mangalvar: 2, mangalvaar: 2, mangalwaar: 2,
  budhvar: 3, budhvaar: 3, budhwaar: 3,
  guruvar: 4, guruvaar: 4, guruwaar: 4, brhaspativar: 4,
  shukravar: 5, shukravaar: 5, shanivar: 6, shanivaar: 6,
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

function nextWeekday(target, from = new Date(), allowToday = false) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let delta = (target - d.getDay() + 7) % 7
  // Bare "due Friday" read ON Friday means today (the AI parser reads it that
  // way too); only an explicit "next Friday" jumps to the following week.
  if (delta === 0 && !allowToday) delta = 7
  d.setDate(d.getDate() + delta)
  return d
}

function prevWeekday(target, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let delta = (d.getDay() - target + 7) % 7
  if (delta === 0) delta = 7 // "pichhla somvar" said on Monday = a week ago
  d.setDate(d.getDate() - delta)
  return d
}

function validDate(year, month, day) {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null
  const d = new Date(year, month, day)
  if (d.getMonth() !== month || d.getDate() !== day) return null
  return d
}

// A month/day written WITHOUT a year that landed months in the past is next
// year's date ("jan 15" read in October), not a months-late deadline.
// Recent past dates (≤45 days) stay put — those really are missed deadlines.
function rollIfLongPast(d) {
  if (!d) return null
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  if (Math.round((t - d) / 86400000) > 45) {
    return validDate(d.getFullYear() + 1, d.getMonth(), d.getDate()) || d
  }
  return d
}

// A day-number with NO month name ("by 3rd", "25 tarikh") that already passed
// this month means next month's occurrence — "by 3rd" said on the 23rd is
// Nov 3rd, not a deadline three weeks late. Clamps day to short months.
function rollDayOnly(d) {
  if (!d) return null
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  if (d >= t) return d
  const y = d.getFullYear()
  const m = d.getMonth()
  const daysInNext = new Date(y, m + 2, 0).getDate() // last day of next month
  return new Date(y, m + 1, Math.min(d.getDate(), daysInNext))
}

function findDate(text) {
  const year = new Date().getFullYear()

  // 1. ISO: 2026-10-25
  let m = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (m) {
    const d = validDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    if (d) return { key: keyOf(d), matchText: m[0] }
  }

  // 2. 25 Oct / 25th October / 25 of Oct / 27 October 2026
  m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b(?:[\s,]+(\d{4}))?/i)
  if (m) {
    const d = validDate(m[3] ? Number(m[3]) : year, MONTHS[m[2].toLowerCase().slice(0, 3)], Number(m[1]))
    if (d) return { key: keyOf(m[3] ? d : rollIfLongPast(d)), matchText: m[0] }
  }

  // 3. Oct 25 / October 25th / October 25 2026
  m = text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:[\s,]+(\d{4}))?/i)
  if (m) {
    const d = validDate(m[3] ? Number(m[3]) : year, MONTHS[m[1].toLowerCase().slice(0, 3)], Number(m[2]))
    if (d) return { key: keyOf(m[3] ? d : rollIfLongPast(d)), matchText: m[0] }
  }

  // 4. 25/10 (slash = always dd/mm in India), 25-10-2026, or "25-10" / "25.10".
  // Dot/hyphen WITHOUT a year only counts when the day > 12, so ranges
  // ("ch 3-6") and decimals ("unit 10.5") can never fake a date.
  m = text.match(/\b(\d{1,2})([/.\-])(\d{1,2})(?:[/.\-](\d{2,4}))?\b/)
  if (m) {
    const dayNum = Number(m[1])
    const monthNum = Number(m[3])
    const yearPart = m[4] ? Number(m[4]) : null
    const ambiguous = m[2] !== '/' && yearPart == null && dayNum <= 12
    if (!ambiguous) {
      let y = yearPart ?? year
      if (y < 100) y += 2000
      const d = validDate(y, monthNum - 1, dayNum)
      if (d) return { key: keyOf(yearPart == null ? rollIfLongPast(d) : d), matchText: m[0] }
    }
  }

  // 5. day after tomorrow / tomorrow / today
  // (longer phrase first — "day after tomorrow" also contains "tomorrow")
  if (/day after tomorrow/i.test(text)) {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return { key: keyOf(d), matchText: text.match(/day after tomorrow/i)[0] }
  }
  if (/\btomorrow\b/i.test(text)) {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return { key: keyOf(d), matchText: text.match(/\btomorrow\b/i)[0] }
  }
  if (/\btoday\b|\btonight\b/i.test(text)) {
    return { key: keyOf(new Date()), matchText: text.match(/\btoday\b|\btonight\b/i)[0] }
  }

  // 6. weekday names & short forms: "Friday", "next Monday", "this Sat", "due fri".
  // Full spellings first — Saturday/Wednesday don't end in "…sday", and the old
  // list didn't even contain "Sunday".
  m = text.match(
    /\b(?:on|by|before|next|this|every|each)?\s*\b(sundays?|mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sun|mon|tues?|weds?|thur?s?|fri|sat)\b/i,
  )
  if (m) {
    const target = WEEKDAYS[m[1].toLowerCase().replace(/s$/, '')]
    if (target !== undefined) {
      const d = nextWeekday(target, new Date(), !/\bnext\b/i.test(m[0]))
      return { key: keyOf(d), matchText: m[0] }
    }
  }

  // 7. Hinglish dates: "25 tarikh", "agle somvar", "parso", "kal", "aaj"
  m = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:tarikh|tarik|tareekh|tareek)\b/i)
  if (m) {
    const now = new Date()
    const d = validDate(now.getFullYear(), now.getMonth(), Number(m[1]))
    if (d) return { key: keyOf(rollDayOnly(d)), matchText: m[0] }
  }

  // "due on the 26th" / "by 3rd" / "26th ko" — an ordinal needs a date cue,
  // otherwise "1st internal exam" or "2nd unit test" would be read as the 1st
  // and 2nd of this month (and the ordinal stripped from the title).
  // Month-named forms like "5th November" are already caught in patterns 2/3.
  m =
    text.match(
      /\b(?:on|by|before|till|until|due|deadline|the)\s+(?:the\s+)?(\d{1,2})(?:st|nd|rd|th)\b/i,
    ) || text.match(/\b(\d{1,2})(?:st|nd|rd|th)\s+(?:ko|tak)\b/i)
  if (m) {
    const now = new Date()
    const d = validDate(now.getFullYear(), now.getMonth(), Number(m[1]))
    if (d) return { key: keyOf(rollDayOnly(d)), matchText: m[0] }
  }

  m = text.match(
    /\b(pichhla|pichhle|pichle|pichla|agle|agla|agli|har)?\s*(ravivar|ravivaar|somvar|somvaar|somavar|mangalvar|mangalvaar|mangalwaar|budhvar|budhvaar|budhwaar|guruvar|guruvaar|guruwaar|brhaspativar|shukravar|shukravaar|shanivar|shanivaar)\b/i,
  )
  if (m) {
    const target = HI_WEEKDAYS[m[2].toLowerCase()]
    if (target !== undefined) {
      const pre = (m[1] || '').toLowerCase()
      const d = /^pichh/.test(pre)
        ? prevWeekday(target)
        : nextWeekday(target, new Date(), !/^(?:agle|agla|agli)/.test(pre))
      return { key: keyOf(d), matchText: m[0] }
    }
  }

  if (/\bparso(?:n)?\b/i.test(text)) {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return { key: keyOf(d), matchText: text.match(/\bparso(?:n)?\b/i)[0] }
  }
  // "kal" = tomorrow (unless it's the phrase "aaj kal" = nowadays)
  if (/\bkal\b/i.test(text) && !/\baaj\s+kal\b/i.test(text)) {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return { key: keyOf(d), matchText: text.match(/\bkal\b/i)[0] }
  }
  if (/\baaj\b/i.test(text) && !/\baaj\s+kal\b/i.test(text)) {
    return { key: keyOf(new Date()), matchText: text.match(/\baaj\b/i)[0] }
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
    const words = m[1].trim().split(/\s+/)
    // Grammatical glue and weekday names are never the subject
    // ("har somvar lab record…" → subject must not become "Har Somvar").
    const glue = new Set([
      'and', 'or', 'but', 'the', 'a', 'an', 'of', 'in', 'on', 'at', 'by', 'to', 'is', 'are',
      'was', 'were', 'for', 'with', 'from', 'this', 'that', 'please', 'kindly', 'hi', 'hello',
      'all', 'team', 'everyone', 'reminder', 'note', 'due', 'before', 'after', 'ke', 'ki', 'ka',
      'ko', 'tak', 'se', 'hai', 'hain', 'har', 'aur', 'ya', 'pe', 'me', 'ne', 'bhi', 'ho', 'do',
      'dena', 'karna', 'kar', 'wala', 'vala',
    ])
    const filtered = words.filter((w) => {
      const lw = w.toLowerCase()
      if (glue.has(lw)) return false
      const wd = lw.replace(/s$/, '')
      if (WEEKDAYS[wd] || HI_WEEKDAYS[lw]) return false
      return true
    })
    const candidate = filtered.slice(-3).join(' ').trim()
    if (candidate) {
      const tokens = candidate.split(' ')
      if (tokens.length === 1) {
        // A lone lowercase word before the noun is usually the task itself
        // ("grade submission…") — trust proper nouns only.
        const raw = words.find((w) => w.toLowerCase() === tokens[0].toLowerCase())
        if (raw && !/^[A-Z]/.test(raw)) return null
      }
      return candidate.replace(/\b\w/g, (c) => c.toUpperCase())
    }
    return null
  }
  return null
}

function cleanTitle(text, dateMatch, marksMatch) {
  let t = text
  if (dateMatch) t = t.replace(dateMatch, ' ')
  if (marksMatch) t = t.replace(marksMatch, ' ')
  t = t
    .replace(/\b(please|kindly|hi|hello|dear|team|everyone|all|note|reminder|as per|kind(?:ly)?)\b[:,]?/gi, ' ')
    .replace(/\(\s*\)/g, ' ') // marks came out of "(10 marks)" → "( )"
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/,\s*,/g, ',') // two removals side by side → "…hai,, moodle…"
    .replace(/^[,;:\-•●▪\s]+/, '')
    .trim()
  // Date/marks-free version — a safer fallback than the raw text, which would
  // put the date straight back into the title.
  const stripped = t
  // Strip an orphaned trailing connector only when something survives.
  const trimmed = t
    .replace(/\b(submit|submission|due|deadline|on|by|before)\b\s*[:\-]?[,.;]?\s*$/i, ' ')
    .trim()
  if (trimmed) t = trimmed
  if (dateMatch) {
    // "23-10-2026 ko DBMS viva…" → don't leave the dangling "ko" at the front.
    t = t.replace(/^(?:ko|ke|ka|ki|tak|hai|hain)\b\s*/i, '').replace(/^[,;:\-\s]+/, '')
  }
  t = t
    .replace(/\s*\b(?:hai|hain)\s*[.,;]?\s*$/i, '')
    .replace(/[,;:\-\s]+$/, '')
  if (!t) t = stripped || text.trim()
  if (t.length > 110) t = t.slice(0, 107) + '…'
  return t
}

function findLink(text) {
  const m = text.match(/\bhttps?:\/\/[^\s<>"']+/i)
  if (!m) return null
  // Trim trailing sentence punctuation: "...attempt.php?id=9. thanks"
  return m[0].replace(/[.,;:!?'")\]}]+$/g, '')
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

/* ------------------------------------------------------------------ *
 * 🔁 Repeating weekly deadlines — "every Friday", "har somvar",
 * "weekly". The due date carries the weekday anchor; on tick-off the
 * next occurrence is rolled forward (nextOccurrence).
 * ------------------------------------------------------------------ */

function detectRepeat(text) {
  if (/\bevery\s+week\b|\beach\s+week\b|\bweekly\b|\bhar\s+hafte\b/i.test(text)) return 'weekly'
  if (
    /\b(?:every|each)\s+(?:sundays?|mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sun|mon|tues?|weds?|thur?s?|fri|sat)\b/i.test(
      text,
    )
  )
    return 'weekly'
  if (
    /\bhar\s+(?:ravivar|ravivaar|somvar|somvaar|somavar|mangalvar|mangalvaar|mangalwaar|budhvar|budhvaar|budhwaar|guruvar|guruvaar|guruwaar|brhaspativar|shukravar|shukravaar|shanivar|shanivaar)\b/i.test(
      text,
    )
  )
    return 'weekly'
  return null
}

/**
 * 🔁 Next occurrence of a weekly task: one week after its due date, stepped
 * forward until it is in the future (ticking off a very late lab record must
 * land on the next real deadline, not last month's).
 */
export function nextOccurrence(dueDate, from = new Date()) {
  if (typeof dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null
  const [y, m, d] = dueDate.split('-').map(Number)
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let step = new Date(y, m - 1, d + 7)
  let guard = 0
  while (step <= today && guard < 260) {
    step = new Date(step.getFullYear(), step.getMonth(), step.getDate() + 7)
    guard += 1
  }
  return keyOf(step)
}

export function extractLocal(raw) {
  const full = raw.trim().replace(/\s+/g, ' ')
  // Pull the submission link out FIRST — it must not leak into the title
  // or fake a date ("…/2026-10-25/…"), and students always lose these links.
  const link = findLink(full)
  const text = link ? full.replace(link, ' ').replace(/\s+/g, ' ').trim() : full
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
    link,
    repeat: detectRepeat(text),
  }
}

/* ------------------------------------------------------------------ *
 * Bulk capture — paste a whole notice/syllabus (one deadline per
 * line/sentence) and get every task back. Chunks that mention a date
 * but look like chatter (no task noun, no marks) are ignored.
 * ------------------------------------------------------------------ */

const TASK_NOUN =
  /assign|submit|submission|due|deadline|exam|viva|lab|report|quiz|slide|ppt|form|project|homework|practical|presentation|external|internal|synopsis|record|worksheet|paper|test|topic|seminar|workshop|registration|experiment|fee|activity/i

function tasksFrom(chunk) {
  const task = extractLocal(chunk)
  if (!task.dueDate) return []
  // Date + noun/marks are the real signal; a tiny title ("Q3", "viva") is a
  // perfectly good task name, so don't reject fragments by title length.
  if (!task.title || task.title.length < 2) return []
  if (!TASK_NOUN.test(chunk) && task.marks == null) return []
  return [task]
}

/**
 * 📋 Clipboard sniff — does this text REALLY look like a deadline notice?
 * Uses the same bar as bulk capture (a date + a task noun or marks) so a
 * random sentence copied from anywhere never triggers the "add it?" prompt.
 */
export function looksLikeDeadline(text) {
  return tasksFrom(String(text || '').trim()).length > 0
}

function splitSubs(line) {
  return line
    .split(/\s*[•●▪]\s+|\s+[.!?;]\s+|\s+(?:and|aur)\s+(?:bhi\s+)?/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 5)
}

export function extractManyLocal(raw) {
  const text = raw.trim()
  const lines = text.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  const pools = []
  for (const line of lines) {
    const direct = tasksFrom(line)
    const subs = splitSubs(line)
    const fromSubs = subs.length > 1 ? subs.flatMap(tasksFrom) : []
    pools.push(...(fromSubs.length > direct.length ? fromSubs : direct))
  }
  // Nothing date-shaped at all → behave exactly like the single extractor.
  if (!pools.length) return [extractLocal(text)]

  const seen = new Set()
  const uniq = []
  for (const t of pools) {
    const sig = `${t.dueDate}|${t.title.toLowerCase()}`
    if (seen.has(sig)) continue
    seen.add(sig)
    uniq.push(t)
  }
  return uniq
}

/* ------------------------------------------------------------------ *
 * AI extractor — optional, OpenAI-compatible. Used when the user
 * pastes an API key in Settings. Falls back to extractLocal() on error.
 * ------------------------------------------------------------------ */

function stripFences(s) {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
}

function normEntry(parsed, raw, repeatText) {
  const fallback = extractLocal(raw)
  return {
    title:
      (typeof parsed.title === 'string' && parsed.title.trim().slice(0, 110)) || fallback.title,
    subject:
      typeof parsed.subject === 'string' && parsed.subject.trim()
        ? parsed.subject.trim().slice(0, 80)
        : null,
    dueDate:
      typeof parsed.dueDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate) &&
      parseDateKey(parsed.dueDate)
        ? parsed.dueDate
        : null,
    marks:
      Number.isFinite(Number(parsed.marks)) && Number(parsed.marks) > 0
        ? Number(parsed.marks)
        : null,
    priority: parsed.priority === 'high' ? 'high' : 'normal',
    // Link: prefer a valid one the AI read, else the one in the raw message.
    link:
      (typeof parsed.link === 'string' && /^https?:\/\//i.test(parsed.link)
        ? parsed.link.slice(0, 500)
        : null) || fallback.link,
    // The AI schema has no repeat field — stamp it from the text itself
    // (per entry in bulk mode so one "every Friday" doesn't infect a notice).
    repeat: detectRepeat(repeatText ?? raw),
  }
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

  return normEntry(parsed, raw)
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

/* --- bulk AI path: every deadline in a whole notice/syllabus --- */

async function extractWithAIMany(raw, settings) {
  const today = todayKey()
  const system = [
    'You extract assignment/deadline entries from messy text (a single message or a whole notice/syllabus).',
    `Today is ${today}.`,
    'Reply with ONLY minified JSON, no prose: {"tasks":[{"title":string,"subject":string|null,"dueDate":"YYYY-MM-DD"|null,"marks":number|null,"priority":"high"|"normal"}]}',
    'Return EVERY distinct assignment/deadline mentioned, one entry per task (max 20). dueDate = a real calendar date derived from the text, or null when no date is given. priority = "high" if due within 1 day or marks >= 15, else "normal". A single task → a one-element array. Ignore chatter with no task.',
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
  const list = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.tasks)
      ? parsed.tasks
      : parsed && typeof parsed.title === 'string'
        ? [parsed]
        : null
  if (!list || !list.length) throw new Error('Bad AI JSON')

  const out = list
    .filter((e) => e && typeof e.title === 'string' && e.title.trim())
    .slice(0, 20)
    .map((e) => normEntry(e, raw, list.length === 1 ? raw : `${e.title} ${e.subject || ''}`))
  if (!out.length) throw new Error('Bad AI JSON')
  return out
}

/**
 * Bulk entry point: array of tasks. AI (array-aware) when enabled,
 * line/sentence splitting offline otherwise.
 */
export async function extractMany(raw, settings) {
  if (settings?.aiEnabled && settings.apiKey) {
    try {
      return await extractWithAIMany(raw, settings)
    } catch (err) {
      console.warn('[Deadline Radar] AI bulk extract failed, using local parser:', err)
    }
  }
  return extractManyLocal(raw)
}

/**
 * 🔁 Re-capture reconcile — teachers extend deadlines, portals re-open.
 * A re-pasted message that matches an existing PENDING task UPDATES it
 * (date / marks / link) instead of being silently dropped as a duplicate;
 * done tasks are never reopened. Returns fresh tasks to create and patches
 * to apply, so the UI can flash exactly what changed ("Fri → Mon").
 */
export function reconcile(existing, parsed) {
  const byTitle = new Map(existing.map((t) => [String(t.title).toLowerCase().trim(), t]))
  const fresh = []
  const updates = []
  for (const p of parsed) {
    const prior = byTitle.get(String(p.title).toLowerCase().trim())
    if (!prior) {
      fresh.push(p)
      continue
    }
    if (prior.done) continue
    const patch = {}
    if (p.dueDate && p.dueDate !== prior.dueDate) patch.dueDate = p.dueDate
    if (p.marks != null && p.marks !== prior.marks) patch.marks = p.marks
    if (p.link && p.link !== prior.link) patch.link = p.link
    // A re-paste can also ADD the weekly flag ("…every Friday" after a plain
    // one-off); never clears an existing flag — deleting the task does that.
    if (p.repeat && p.repeat !== prior.repeat) patch.repeat = p.repeat
    if (Object.keys(patch).length) {
      updates.push({
        id: prior.id,
        from: { dueDate: prior.dueDate, marks: prior.marks },
        ...patch,
      })
    }
  }
  return { fresh, updates }
}

/**
 * Unit tests for the offline extractor — the fallback that keeps the app working
 * with zero setup. Plus backup parser tests (restore path). Run with:  npm test
 */
import { extractLocal, extractManyLocal, looksLikeDeadline, nextOccurrence, reconcile } from '../src/lib/extract.js'
import { parseCommand } from '../src/lib/commands.js'
import { defaultSettings, parseBackup } from '../src/lib/store.js'
import { almanacGrid, dayItems, defaultDay, monthCursorOf, monthSummary, shiftMonth, undatedPending } from '../src/lib/almanac.js'
import { SUBJECT_INK_NAMES, subjectInk, subjectKeys, subjectStyle } from '../src/lib/subjects.js'
import { answerQuery, briefingText, doNow, estimateEffort, heatGrid, marksAtRisk, onTimeStreak, paceRows, pileUps, reportGrade, startAlerts, subjectLoad, weeklyTrend, weekShareText } from '../src/lib/brain.js'
import { buildICS, googleCalendarUrl } from '../src/lib/calendar.js'
import { dueTone, countdownTo, parseDateKey, dayDiff, todayKey } from '../src/lib/dates.js'
import { postponeDate, sortTasks } from '../src/lib/sort.js'
import { riskScore, riskTone } from '../src/lib/risk.js'
import { buildPlan, planCopyText, daySchedule, timetableCopyText } from '../src/lib/plan.js'
import { guessCoach, MARKING_PRESETS } from '../src/lib/marking.js'

const today = new Date()
const key = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const shift = (n) => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  d.setDate(d.getDate() + n)
  return key(d)
}
// allowToday: bare weekday names mean "today" when today IS that weekday;
// explicit "next X" / "agle x" skip a week (mirrors the parser).
const nextWeekday = (target, allowToday = true) => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let delta = (target - d.getDay() + 7) % 7
  if (delta === 0 && !allowToday) delta = 7
  d.setDate(d.getDate() + delta)
  return key(d)
}
const prevWeekday = (target) => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let delta = (d.getDay() - target + 7) % 7
  if (delta === 0) delta = 7
  d.setDate(d.getDate() - delta)
  return key(d)
}
// Mirror of the parser's no-year rule: a month/day lands this year unless it
// was written more than 45 days in the past (then it is next year's date).
const ymd = (m, d) => {
  let dt = new Date(today.getFullYear(), m, d)
  const midnight = new Date(new Date().setHours(0, 0, 0, 0))
  if (Math.round((midnight - dt) / 864e5) > 45) dt = new Date(today.getFullYear() + 1, m, d)
  return key(dt)
}

let pass = 0
let fail = 0

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) pass += 1
  else fail += 1
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ` — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`}`)
}

const friday = nextWeekday(5)

const t1 = extractLocal('DBMS assignment due Friday, 20 marks, submit Q1-Q5 on the portal')
check('weekday + marks + subject', { d: t1.dueDate, m: t1.marks, s: t1.subject }, { d: friday, m: 20, s: 'DBMS' })

const t2 = extractLocal('lab record by tomorrow')
check('tomorrow', t2.dueDate, shift(1))

const t3 = extractLocal('submit the report on 25/10 before 11:59 pm')
check('dd/mm date', t3.dueDate, ymd(9, 25))

const t4 = extractLocal('OS viva on 2026-11-02, 10 marks')
check('ISO date + marks', { d: t4.dueDate, m: t4.marks }, { d: '2026-11-02', m: 10 })

const t5 = extractLocal('physics practical file niche rakh dena')
check('no date -> null', t5.dueDate, null)

const t6 = extractLocal('DBMS quiz on ' + friday + ', 15 marks, high weightage')
check('high marks -> high priority', t6.priority, 'high')

const t7 = extractLocal('October 30 deadline for the final write-up')
check('Month DD format', t7.dueDate, ymd(9, 30))

// --- Hinglish dates ---
const t8 = extractLocal('OS viva agle somvar, 10 marks')
check('agle somvar -> the Monday after this one', t8.dueDate, nextWeekday(1, false))

const t9 = extractLocal('DBMS quiz 25 tarikh tak submit karna hai')
// The parser never puts a bare day in the past — a "25 tarikh" written on the
// 29th rolls to next month. Mirror that here so the test isn't date-flaky.
const expected25 = key(
  new Date(
    today.getFullYear(),
    today.getDate() > 25 ? today.getMonth() + 1 : today.getMonth(),
    25,
  ),
)
check('25 tarikh -> 25th, never in the past', t9.dueDate, expected25)

const t10 = extractLocal('lab record parso tak dena')
check('parso -> day after tomorrow', t10.dueDate, shift(2))

const t11 = extractLocal('assignment kal submit karna hai, 10 marks')
check('kal -> tomorrow', t11.dueDate, shift(1))

const t12 = extractLocal('viva pichhle somvar ho chuka tha')
check('pichhla somvar -> past Monday', t12.dueDate, prevWeekday(1))

const t13 = extractLocal('aaj kal bahut assignments aa rahe hain')
check('aaj kal (nowadays) -> no date', t13.dueDate, null)

// --- bulk capture (one paste → many tasks) ---
const notice =
  'DBMS assignment - 25 Oct, 20 marks\nOS lab record - 28 Oct, 10 marks\nSE presentation - 30 Oct, 15 marks'
const many = extractManyLocal(notice)
check('bulk: 3-line notice -> 3 tasks', many.length, 3)
check('bulk: per-task fields', { d: many[1].dueDate, s: many[1].subject }, { d: ymd(9, 28), s: 'OS' })

const one = extractManyLocal('dbms ka assignment friday tak, 20 marks')
check('bulk: single line stays single', one.length, 1)

const noDate = extractManyLocal('bas yahi message, koi date nahi hai isme')
check('bulk: no-date text falls back to one task', noDate.length, 1)

const two = extractManyLocal('DBMS assignment due Friday and OS lab due Monday')
check('bulk: "and" split finds two', two.length, 2)

const chatter = extractManyLocal('DBMS unit 3 - 25 Oct\nAssignment 1 - 26 Oct, 10 marks')
check('bulk: syllabus chatter line ignored', chatter.length, 1)

// --- backup restore (export/import round-trip safety) ---
const sample = {
  app: 'deadline-radar',
  version: 1,
  tasks: [
    {
      id: 'task-1',
      title: 'DBMS assignment',
      subject: 'DBMS',
      dueDate: '2026-10-30',
      marks: 20,
      priority: 'high',
      done: false,
      createdAt: 1792600000000,
      source: 'due Friday, 20 marks',
    },
    { id: 'task-2', title: 'Lab record', dueDate: null, marks: null },
    { notATask: true },
    { id: 'task-3', title: '   ' },
  ],
}
const b1 = parseBackup(JSON.stringify(sample))
check('backup: valid tasks restored, junk dropped', [b1.length, b1[0].id, b1[1].subject], [2, 'task-1', null])
check('backup: fields preserved', { m: b1[0].marks, d: b1[0].dueDate, p: b1[0].priority }, { m: 20, d: '2026-10-30', p: 'high' })

const b2 = parseBackup(JSON.stringify([{ title: 'bare array task' }]))
check('backup: bare array accepted, id auto-added', [b2.length, typeof b2[0].id], [1, 'string'])

// --- Link capture (submission portal) ---
const tLink = extractLocal(
  'DBMS quiz due Friday, 20 marks, submit on https://moodle.example.com/mod/quiz/attempt.php?id=9',
)
check(
  'link: portal URL captured',
  tLink.link,
  'https://moodle.example.com/mod/quiz/attempt.php?id=9',
)
check('link: URL stripped from the title', tLink.title.toLowerCase().includes('http'), false)
check('link: no URL -> null', extractLocal('OS lab record by tomorrow').link, null)
const bLink = parseBackup(
  JSON.stringify([{ id: 'task-link', title: 'Quiz', dueDate: null, link: 'https://moodle.example.com/q1' }]),
)
check('link: survives backup restore', bLink[0].link, 'https://moodle.example.com/q1')

// --- Re-capture reconcile (deadline moved → smart update, not a dupe) ---
const rcExisting = [
  { id: 'r1', title: 'DBMS quiz', dueDate: '2026-10-23', marks: 20, done: false },
  { id: 'r2', title: 'SE slides', dueDate: '2026-10-21', marks: 15, done: true },
]
const rc = reconcile(rcExisting, [
  { title: 'DBMS quiz', dueDate: '2026-10-27', marks: 25, link: null },
  { title: 'SE slides', dueDate: '2026-10-28', marks: null, link: null },
  { title: 'OS viva', dueDate: '2026-11-02', marks: null, link: null },
])
check(
  'reconcile: pending match with new date -> update, not duplicate',
  rc.updates.length === 1 && rc.fresh.length === 1,
  true,
)
check(
  'reconcile: patch carries new values + old ones for the flash',
  { id: rc.updates[0].id, d: rc.updates[0].dueDate, m: rc.updates[0].marks, from: rc.updates[0].from.dueDate },
  { id: 'r1', d: '2026-10-27', m: 25, from: '2026-10-23' },
)
check('reconcile: done task is never reopened', rc.updates.some((u) => u.id === 'r2'), false)
check('reconcile: genuinely new title still captured', rc.fresh[0]?.title, 'OS viva')
const rcSame = reconcile(rcExisting, [{ title: 'DBMS quiz', dueDate: '2026-10-23', marks: 20, link: null }])
check(
  'reconcile: identical re-paste -> nothing to do',
  rcSame.updates.length === 0 && rcSame.fresh.length === 0,
  true,
)
const e2eFirst = extractLocal('DBMS quiz due Friday, 20 marks')
const { updates: rcE2e } = reconcile(
  [{ id: 'r9', title: e2eFirst.title, dueDate: '2026-10-23', marks: 20, done: false }],
  [extractLocal('DBMS quiz due 27 Oct, 25 marks')],
)
check('reconcile e2e: re-pasted message moves the deadline', rcE2e[0]?.dueDate, ymd(9, 27))

let threw = 0
try { parseBackup('not json at all') } catch { threw += 1 }
try { parseBackup('{"hello": 1}') } catch { threw += 1 }
try { parseBackup('{"tasks": []}') } catch { threw += 1 }
check('backup: invalid inputs all throw', threw, 3)

// --- Radar Brain: effort model + "ab kya karun" do-now engine ---
const pace = { dbms: 4.5 }
check('effort: learned pace applies', estimateEffort({ marks: 20, subject: 'DBMS' }, pace), { minutes: 90, learned: true })
check('effort: default estimate without history', estimateEffort({ marks: 10, subject: null }, {}), { minutes: 60, learned: false })
check('effort: clamps to 6h max', estimateEffort({ marks: 100, subject: null }, {}), { minutes: 360, learned: false })

const dnTasks = [
  { id: 'a', title: 'DBMS quiz', subject: 'DBMS', dueDate: shift(1), marks: 20, done: false },
  { id: 'b', title: 'OS lab', subject: 'Operating Systems', dueDate: shift(5), marks: 10, done: false },
  { id: 'c', title: 'DBMS old 1', subject: 'DBMS', dueDate: shift(-20), marks: 10, done: true, effortMin: 50, completedAt: Date.now() - 15 * 864e5 },
  { id: 'd', title: 'DBMS old 2', subject: 'DBMS', dueDate: shift(-10), marks: 10, done: true, effortMin: 40, completedAt: Date.now() - 8 * 864e5 },
]
check('doNow: due-soonest high-ROI task wins', doNow(dnTasks).pick.task.id, 'a')

const dn2 = [
  { id: 'far', title: 'Far big', subject: null, dueDate: shift(7), marks: 30, done: false },
  { id: 'near', title: 'Near small', subject: null, dueDate: shift(1), marks: 10, done: false },
]
check('doNow: nearer task outranks higher-marks far task', doNow(dn2).pick.task.id, 'near')

const dn3 = [
  { id: 'far2', title: 'Far', subject: null, dueDate: shift(2), marks: 40, done: false },
  { id: 'late1', title: 'Late', subject: null, dueDate: shift(-1), marks: 5, done: false },
]
check('doNow: overdue jumps the queue', doNow(dn3).pick.task.id, 'late1')
check('doNow: nothing pending -> null', doNow([{ id: 'x', done: true, dueDate: shift(1) }]), null)

const dq = answerQuery('ab kya karun', { tasks: dnTasks, stats: {} })
check('voice: "ab kya karun" answers the pick', dq.text.includes('Start now: DBMS quiz'), true)

// --- Radar Samachaar (spoken briefing) ---
const briefTasks = [
  { id: 'b1', title: 'DBMS quiz', subject: 'DBMS', dueDate: '2026-10-21', done: false },
  { id: 'b2', title: 'OS lab record', subject: 'OS', dueDate: '2026-10-22', done: false },
]
const brief = briefingText(briefTasks, '2026-10-22')
check('briefing: speaks late + today items', brief.includes('already late') && brief.includes('DBMS quiz') && brief.includes('OS lab record'), true)
check('briefing: ends with the do-now pick', brief.includes('Ab kya karun?'), true)
check('briefing: warns when a start window is closing', brief.includes('Start window closing'), true)
const clearBrief = briefingText([{ id: 'b3', title: 'PPT next week', dueDate: '2026-10-27', done: false }], '2026-10-22')
check('briefing: clear-days message', clearBrief.includes('clear'), true)

// --- Pace report card (per-subject rows) ---
const paceTasks = [
  { id: 'p1', title: 'DBMS a1', subject: 'DBMS', dueDate: '2026-10-10', done: true, completedAt: new Date('2026-10-10T10:00:00Z').getTime(), effortMin: 40, marks: 10 },
  { id: 'p2', title: 'DBMS a2', subject: 'DBMS', dueDate: '2026-10-15', done: true, completedAt: new Date('2026-10-17T10:00:00Z').getTime(), effortMin: 60, marks: 10 },
  { id: 'p3', title: 'SE essay', subject: 'SE', dueDate: '2026-10-12', done: true, completedAt: new Date('2026-10-11T10:00:00Z').getTime(), effortMin: 30, marks: 10 },
]
const rows = paceRows(paceTasks)
check('paceRows: one row per subject', rows.length, 2)
check('paceRows: worst on-time subject first', rows[0].key, 'dbms')
check('paceRows: learned min/mark from focus sessions', rows[0].minPerMark, 5)
check('paceRows: buffer reflects avg days late/early', Math.abs(rows[0].avgBuffer - -1) < 0.01, true)

// --- Start-window alerts (start now, not just due soon) ---
const saTasks = [
  { id: 's1', title: 'Late thing', dueDate: '2026-10-21', done: false },
  { id: 's2', title: 'Closing report', dueDate: '2026-10-23', done: false, marks: 100 },
  { id: 's3', title: 'Relaxed task', dueDate: '2026-10-30', done: false },
]
const alerts = startAlerts(saTasks, '2026-10-22')
check('startAlerts: only the closing-window pending task', alerts.length, 1)
check('startAlerts: picks the right task, late excluded', alerts[0]?.task.id, 's2')

// --- Trend vs last week ---
const nowT = Date.now()
const DAY_MS = 24 * 60 * 60 * 1000
const tr = weeklyTrend(
  [
    { id: 'w1', done: true, completedAt: nowT - DAY_MS, dueDate: '2099-01-01', effortMin: 90 },
    { id: 'w2', done: true, completedAt: nowT - 9 * DAY_MS, dueDate: '2099-01-01', effortMin: 60 },
    { id: 'w3', done: true, completedAt: nowT - DAY_MS, dueDate: '2026-01-01', effortMin: 30 },
    { id: 'w4', done: false, completedAt: null },
    { id: 'w5', done: true, completedAt: nowT - 29 * DAY_MS, dueDate: '2099-01-01', effortMin: 45 },
  ],
  nowT,
)
check(
  'trend: buckets finished/on-time per week',
  tr.thisWeek.finished === 2 && tr.thisWeek.onTime === 1 && tr.lastWeek.finished === 1,
  true,
)
check(
  'trend: focus minutes tracked per week',
  tr.thisWeek.focusMin === 120 && tr.lastWeek.focusMin === 60,
  true,
)
check('trend: 6-week arc present, oldest first', tr.weeks.length, 6)
check(
  'trend: arc tails match thisWeek / lastWeek',
  { now: tr.weeks[5].finished, prev: tr.weeks[4].finished },
  { now: 2, prev: 1 },
)
check(
  'trend: older week buckets correctly (W-4)',
  { n: tr.weeks[1].finished, onTime: tr.weeks[1].onTime, focus: tr.weeks[1].focusMin },
  { n: 1, onTime: 1, focus: 45 },
)

// --- On-time streak ---
const streakTasks = [
  { id: 'k1', done: true, dueDate: '2099-01-05', completedAt: new Date('2099-01-04T12:00:00Z').getTime() },
  { id: 'k2', done: true, dueDate: '2099-01-02', completedAt: new Date('2099-01-03T12:00:00Z').getTime() },
  { id: 'k3', done: true, dueDate: '2099-01-10', completedAt: new Date('2099-01-09T12:00:00Z').getTime() },
]
check('streak: stops at the first late finish (newest first)', onTimeStreak(streakTasks), 2)
check(
  'streak: counts consecutive on-time finishes',
  onTimeStreak([
    { id: 'm1', done: true, dueDate: '2099-02-03', completedAt: new Date('2099-02-02T12:00:00Z').getTime() },
    { id: 'm2', done: true, dueDate: '2099-02-01', completedAt: new Date('2099-01-31T12:00:00Z').getTime() },
    { id: 'm3', done: true, dueDate: '2099-01-28', completedAt: new Date('2099-01-27T12:00:00Z').getTime() },
  ]),
  3,
)

// --- Week share text (group chat) ---
const wtext = weekShareText(
  [
    { id: 'q1', title: 'DBMS quiz', dueDate: '2026-10-21', marks: 20, done: false, link: 'https://moodle.example.com/q1' },
    { id: 'q2', title: 'Group viva', dueDate: '2026-10-25', done: false },
    { id: 'q3', title: 'Far away', dueDate: '2026-11-05', done: false },
    { id: 'q4', title: 'Done thing', dueDate: '2026-10-23', done: true },
  ],
  '2026-10-22',
)
check(
  'week share: late first, 7-day window, done skipped',
  wtext.indexOf('DBMS quiz') < wtext.indexOf('Group viva') && !wtext.includes('Far away') && !wtext.includes('Done thing'),
  true,
)
check(
  'week share: marks + app footer',
  wtext.includes('(20 marks)') && wtext.includes('Deadline Radar'),
  true,
)
check('week share: portal link included per line', wtext.includes('🔗 https://moodle.example.com/q1'), true)

// --- Pending load by subject ---
const load = subjectLoad([
  { id: 'l1', subject: 'DBMS', marks: 20, done: false },
  { id: 'l2', subject: 'DBMS', marks: 10, done: false },
  { id: 'l3', subject: 'OS', marks: 10, done: false },
  { id: 'l4', subject: 'SE', marks: 5, done: true },
  { id: 'l5', title: 'no subject', done: false },
])
check(
  'subject load: pending only, marks summed, heaviest first',
  load.length === 2 && load[0].label === 'DBMS' && load[0].marks === 30,
  true,
)
check('subject load: task counts', load[0].count === 2 && load[1].marks === 10, true)

// --- Calendar export (.ics) ---
const icsTasks = [
  { id: 'e1', title: 'DBMS quiz, Q1-Q5', subject: 'DBMS', dueDate: '2026-10-23', marks: 20, done: false },
  { id: 'e2', title: 'Done task', dueDate: '2026-10-20', done: true },
  { id: 'e3', title: 'No date task', dueDate: null, done: false },
]
const ics = buildICS(icsTasks, new Date('2026-10-22T10:00:00Z'))
check('ics: one event per pending dated task', ics.split('BEGIN:VEVENT').length - 1, 1)
check('ics: date + escaped summary present', ics.includes('DTSTART;VALUE=DATE:20261023') && ics.includes('SUMMARY:DBMS quiz\\, Q1-Q5'), true)
check('ics: calendar shell + day-before alarm', ics.startsWith('BEGIN:VCALENDAR') && ics.endsWith('END:VCALENDAR') && ics.includes('TRIGGER:-P1D'), true)
const icsLink = buildICS(
  [{ id: 'e4', title: 'Portal quiz', dueDate: '2026-10-24', done: false, link: 'https://moodle.example.com/quiz' }],
  new Date('2026-10-22T10:00:00Z'),
)
check('ics: portal link exported as URL property', icsLink.includes('URL:https://moodle.example.com/quiz'), true)

// --- Audit round: ambiguous dates must never fake a deadline ---
check('day after tomorrow beats the "tomorrow" match', extractLocal('viva day after tomorrow hai').dueDate, shift(2))
check(
  'range "chapter 3-6" is not a date (hyphen, day ≤ 12, no year)',
  extractLocal('chapter 3-6 tak padhna hai').dueDate,
  null,
)
check(
  'decimal "unit 10.5" is not a date (dot, day ≤ 12, no year)',
  extractLocal('unit 10.5 discuss karna hai').dueDate,
  null,
)
check(
  'unambiguous "25-10" (day > 12) still parses',
  extractLocal('DBMS assignment 25-10 tak submit').dueDate,
  ymd(9, 25),
)

// --- Audit round: backup restore keeps effort + rejects junk dates ---
const bEff = parseBackup(
  JSON.stringify([
    { id: 'f1', title: 'Quiz', dueDate: '2026-10-30', effortMin: 55, done: true, completedAt: 1792600000000 },
    { id: 'f2', title: 'Weird date', dueDate: 'soon', effortMin: -5 },
  ]),
)
check('backup: effortMin (pace data) survives restore', bEff[0].effortMin, 55)
check('backup: malformed dueDate downgraded to null', bEff[1].dueDate, null)

// --- Audit round: due-date pill tone ---
check('dueTone: undefined dueDate stays calm neutral', dueTone({ done: false, dueDate: undefined }).includes('text-ink-3'), true)
check('dueTone: missing dueDate key also neutral (was falsely yellow)', dueTone({ done: false }).includes('text-ink-3'), true)

// --- Fuzz round: weekday spellings the old regex silently dropped ---
check('Saturday parses (old regex missed it)', extractLocal('OS lab this Saturday, 10 marks').dueDate, nextWeekday(6))
check('Sunday parses (was not in the list at all)', extractLocal('seminar due Sunday').dueDate, nextWeekday(0))
check('Wednesday parses (full spelling)', extractLocal('viva on Wednesday').dueDate, nextWeekday(3))
check('bare short form "due fri" parses', extractLocal('DBMS writeup due fri').dueDate, nextWeekday(5))
const todayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()]
check(
  'bare weekday on that same weekday means today (matches the AI parser)',
  extractLocal(`viva ${todayName} tak`).dueDate,
  key(today),
)
check(
  '"next <weekday>" on that same weekday still skips a week',
  extractLocal(`viva next ${todayName} tak`).dueDate,
  nextWeekday(today.getDay(), false),
)
check('"today" -> today', extractLocal('attendance form bharo today').dueDate, key(today))
check(
  'bulk: "and" split catches both once every weekday parses',
  extractManyLocal('Q3 due tomorrow and Q4 due Saturday').length,
  2,
)

// --- Fuzz round: ordinals, year handling ---
check(
  'standalone ordinal "the 26th" -> future day, never the past',
  extractLocal('viva on the 26th, 10 marks').dueDate,
  key(
    new Date(
      today.getFullYear(),
      today.getDate() > 26 ? today.getMonth() + 1 : today.getMonth(),
      26,
    ),
  ),
)
const yrTask = extractLocal('deadline 27 October 2026, 20 marks')
check(
  'explicit year never rolls and is consumed from the title',
  { d: yrTask.dueDate, orphan: yrTask.title.includes('2026') },
  { d: '2026-10-27', orphan: false },
)
check('no-year month far in the past rolls forward ("jan 15")', extractLocal('jan 15 tak final report').dueDate, ymd(0, 15))

// --- Fuzz round: subject junk + title cleanup ---
check(
  'subject: weekday glue words are not a subject',
  extractLocal('har somvar lab record dena hai').subject,
  null,
)
check(
  'subject: lone lowercase word before the noun is not a subject',
  extractLocal('grade submission Friday tak teacher ko dena hai').subject,
  null,
)
check(
  'title: no double commas after field removal',
  extractLocal('DBMS assignment 1 ki last date 31/10/2026 hai, 25 marks, moodle pe submit karna').title.includes(',,'),
  false,
)

// --- 🔁 recurring weekly deadlines ---
check('repeat: "every Friday" marks the task weekly', extractLocal('DBMS lab report every Friday, 10 marks').repeat, 'weekly')
check('repeat: "har somvar" marks the task weekly', extractLocal('har somvar lab record dena hai').repeat, 'weekly')
check('repeat: bare "weekly" marks the task weekly', extractLocal('weekly viva due Monday').repeat, 'weekly')
check('repeat: one-off tasks stay one-off', extractLocal('DBMS quiz due 2026-11-02, 10 marks').repeat, null)
check('repeat: "alternate Friday" stays one-off (no bi-weekly in V1)', extractLocal('DBMS lab alternate Friday').repeat, null)
check('repeat: title drops the "every Friday" words', extractLocal('DBMS lab report every Friday').title, 'DBMS lab report')
check('repeat: rollover = +7 from the due date', nextOccurrence(shift(-3)), shift(4))
check('repeat: due today rolls to next week', nextOccurrence(key(today)), shift(7))
check(
  'repeat: a very late tick-off steps to the next future week',
  nextOccurrence(shift(-20)),
  shift(1),
)
const bkRepeat = parseBackup(JSON.stringify([{ title: 'OS lab record', dueDate: '2026-10-30', repeat: 'weekly' }]))
check('backup restore keeps the weekly flag', bkRepeat[0].repeat, 'weekly')
const rcRep = reconcile(
  [{ id: 'r1', title: 'OS lab record', dueDate: '2026-10-30', marks: 10, link: null, done: false, repeat: null }],
  [{ title: 'OS lab record', dueDate: '2026-10-30', marks: 10, link: null, repeat: 'weekly' }],
)
check('reconcile: a re-paste can add the weekly flag', rcRep.updates[0]?.repeat, 'weekly')
const icsWeekly = buildICS(
  [{ id: 'w1', title: 'OS lab', dueDate: '2026-10-30', repeat: 'weekly', done: false }],
  new Date('2026-10-22T10:00:00Z'),
)
check('ics: weekly task exports a real RRULE (Friday)', icsWeekly.includes('RRULE:FREQ=WEEKLY;BYDAY=FR'), true)
check(
  'ics: one-off task gets no RRULE',
  buildICS([{ id: 'w2', title: 'OS lab', dueDate: '2026-10-30', done: false }], new Date('2026-10-22T10:00:00Z')).includes(
    'RRULE',
  ),
  false,
)

// --- 🎤 Voice commands — orders vs questions (parseCommand) ---
const vcTasks = [
  { id: 'v1', title: 'DBMS SQL worksheet — joins and subqueries', subject: 'DBMS', dueDate: '2026-10-24', done: false },
  { id: 'v2', title: 'Operating Systems lab record — experiments 4 and 5', subject: 'Operating Systems', dueDate: '2026-10-28', done: false },
  { id: 'v3', title: 'Submit group presentation slides', subject: 'Software Engineering', dueDate: '2026-10-30', done: false },
  { id: 'v4', title: 'DBMS normalisation tutorial — 3NF problems', subject: 'DBMS', dueDate: '2026-10-26', done: false },
  { id: 'v5', title: 'Workshop registration form', subject: null, dueDate: '2026-10-20', done: true },
]
const cmd1 = parseCommand('mark DBMS worksheet done', vcTasks)
check('cmd: "mark DBMS worksheet done" ticks the right card', cmd1?.type === 'done' && cmd1.task?.id === 'v1', true)
const cmd2 = parseCommand('OS lab record ho gaya', vcTasks)
check('cmd: Hinglish "ho gaya" marks done', cmd2?.type === 'done' && cmd2.task?.id === 'v2', true)
const cmd3 = parseCommand('finish worksheet', vcTasks)
check('cmd: one distinctive word ("worksheet") is enough', cmd3?.type === 'done' && cmd3.task?.id === 'v1', true)
const cmd4 = parseCommand('tick off presentation slides', vcTasks)
check('cmd: "tick off …" ticks done', cmd4?.type === 'done' && cmd4.task?.id === 'v3', true)
check('cmd: "delete presentation slides" deletes', parseCommand('delete presentation slides', vcTasks)?.task?.id, 'v3')
check(
  'cmd: "… delete kar do" (verb at the end) still deletes',
  parseCommand('presentation slides delete kar do', vcTasks)?.task?.id,
  'v3',
)
check('cmd: "SE presentation hata do" — Hinglish remove', parseCommand('SE presentation hata do', vcTasks)?.task?.id, 'v3')
check('cmd: "add OS viva Friday" captures the phrase', parseCommand('add OS viva Friday', vcTasks)?.text, 'OS viva Friday')
check('cmd: "capture DBMS viva Friday" also captures', parseCommand('capture DBMS viva Friday', vcTasks)?.text, 'DBMS viva Friday')
check('cmd: "ab kya karun" is a question, not an order', parseCommand('ab kya karun', vcTasks), null)
check('cmd: "kitne marks risk me" stays a question', parseCommand('kitne marks risk me', vcTasks), null)
check('cmd: "what is late" stays a question', parseCommand('what is late', vcTasks), null)
check('cmd: "should I mark DBMS done?" is a question', parseCommand('should I mark DBMS done?', vcTasks), null)
const cmdTie = parseCommand('mark DBMS done', vcTasks)
check('cmd: two equal DBMS hits → clarify, not a guess', cmdTie?.type, 'clarify')
check('cmd: clarify lists the earlier-deadline option first', cmdTie?.options?.[0], 'DBMS SQL worksheet — joins and subqueries')
const cmdVague = parseCommand('mark it done', vcTasks)
check('cmd: vague "mark it done" asks which one', cmdVague?.type, 'clarify')
check('cmd: vague clarify carries no options', 'options' in (cmdVague || {}), false)
check('cmd: already-done work is never re-ticked', parseCommand('mark workshop form done', vcTasks)?.type, 'clarify')
check('cmd: a plain statement is not an order', parseCommand('dbms assignment friday tak submit karna hai', vcTasks), null)
check('cmd: empty input → null', parseCommand('', vcTasks), null)

// --- ⏳ Live countdown (countdownTo) ---
const NOW = new Date(2026, 9, 23, 10, 0, 0).getTime() // 23 Oct 2026, 10:00 local
const cdFar = countdownTo('2026-10-25', NOW)
check('countdown: 2+ days out → "Xd Yh"', cdFar.label, '2d 13h')
check('countdown: far deadline is not late', cdFar.late, false)
const cdSame = countdownTo('2026-10-23', new Date(2026, 9, 23, 20, 0, 0).getTime())
check('countdown: same day → "Xh Ym"', cdSame.label, '3h 59m')
const cdSoon = countdownTo('2026-10-23', new Date(2026, 9, 23, 23, 30, 0).getTime())
check('countdown: under an hour → "Xm"', cdSoon.label, '29m')
const cdLate = countdownTo('2026-10-20', NOW)
check('countdown: past deadline → "over"', cdLate.late, true)
check('countdown: late keeps day/hour magnitude', cdLate.label, '2d 10h over')
check('countdown: null date → null', countdownTo(null, NOW), null)
check('countdown: undefined date → null', countdownTo(undefined, NOW), null)

// --- 📋 Clipboard sniff (looksLikeDeadline) — false positives must die ---
check('clip: a real notice (date + noun) is a deadline', looksLikeDeadline('DBMS assignment due 25 Oct, submit on portal'), true)
check('clip: Hinglish notice counts', looksLikeDeadline('OS lab record somvar tak submit karna hai 20 marks'), true)
check('clip: a random sentence is NOT a deadline', looksLikeDeadline('hey bro are you coming to the party tonight'), false)
check('clip: a copied code snippet is NOT a deadline', looksLikeDeadline('const fetchData = async () => { return await response.json() }'), false)
check('clip: date alone without task noun is NOT enough', looksLikeDeadline('meeting on 25-10 at the cafe'), false)
check('clip: empty input is NOT a deadline', looksLikeDeadline(''), false)

// --- 📅 Day-only ordinal roll — "by 3rd" that already passed means NEXT month ---
{
  // "by 3rd" with no month: the 3rd of this month may already be past, so the
  // parser must roll forward rather than report a weeks-late deadline.
  const d = dayDiff(todayKey(), extractLocal('submit lab report by 3rd').dueDate)
  check('ordinal: "by 3rd" is never in the past', d !== null && d >= 0, true)
  const t = dayDiff(todayKey(), extractLocal('submit report 25 tarikh').dueDate)
  check('ordinal: "25 tarikh" is never in the past', t !== null && t >= 0, true)
  // A near-future ordinal this month stays put (e.g. a day that hasn't passed).
  const soonDay = today.getDate() + 2 > 28 ? 2 : today.getDate() + 2
  const s = extractLocal(`submit by the ${soonDay}${soonDay === 2 ? 'nd' : 'th'}`).dueDate
  check('ordinal: a future day this month stays this month', dayDiff(todayKey(), s) >= 0, true)
}

// --- 🗓️ Date validity — impossible dates read as "no date", never lie ---
check('date: impossible 2026-02-31 is rejected', parseDateKey('2026-02-31'), null)
check('date: impossible 2026-04-31 is rejected', parseDateKey('2026-04-31'), null)
check('date: valid 2026-02-28 parses', parseDateKey('2026-02-28') !== null, true)
check('date: valid leap 2028-02-29 parses', parseDateKey('2028-02-29') !== null, true)
check('date: non-leap 2027-02-29 is rejected', parseDateKey('2027-02-29'), null)

// --- ↕ Sort order + postpone (rail control, ⌘K commands) ---
const sTasks = [
  { id: 'a', title: 'Zeta', dueDate: '2026-11-05', marks: 5, priority: 'normal', createdAt: 1 },
  { id: 'b', title: 'Alpha', dueDate: '2026-10-26', marks: 20, priority: 'high', createdAt: 2 },
  { id: 'c', title: 'Beta', dueDate: null, marks: 10, priority: 'normal', createdAt: 3 },
]
check('sort: due soonest puts the earliest date first', sortTasks(sTasks, 'due').map((t) => t.id), ['b', 'a', 'c'])
check('sort: marks high first', sortTasks(sTasks, 'marks').map((t) => t.id), ['b', 'c', 'a'])
check('sort: title A to Z', sortTasks(sTasks, 'title').map((t) => t.id), ['b', 'c', 'a'])
check('sort: smart prefers the high-priority task', sortTasks(sTasks, 'smart')[0].id, 'b')
check('sort: does not mutate the caller array', sTasks.map((t) => t.id), ['a', 'b', 'c'])
check('postpone: undated task lands tomorrow', postponeDate(null, 1, '2026-10-24'), '2026-10-25')
check('postpone: shifts across a month boundary', postponeDate('2026-10-31', 1, '2026-10-24'), '2026-11-01')
check('postpone: one week later', postponeDate('2026-10-24', 7, '2026-10-24'), '2026-10-31')

// --- 🧹 Storage hygiene: poisoned/legacy entries are normalised on every path ---
const poison = parseBackup(
  JSON.stringify([
    {
      id: 'p1',
      title: 'Poisoned link',
      link: 'javascript:alert(1)',
      marks: '20',
      dueDate: '2026-02-31',
      completedAt: 'yesterday',
      createdAt: 'now',
    },
    { id: 'dup', title: 'First' },
    { id: 'dup', title: 'Second' },
  ]),
)
check('storage: javascript: link is dropped', poison[0].link, null)
check('storage: numeric string marks become a number', poison[0].marks, 20)
check('storage: impossible date becomes null', poison[0].dueDate, null)
check(
  'storage: bad timestamps become safe values',
  [poison[0].completedAt, typeof poison[0].createdAt],
  [null, 'number'],
)
check(
  'storage: duplicate ids in one backup are re-keyed',
  new Set(poison.map((t) => t.id)).size === poison.length,
  true,
)

// --- 🔢 Ordinals only count as dates when a date cue is present ---
check('ordinal: "1st internal exam" is not a date', extractLocal('1st internal exam').dueDate, null)
check('ordinal: "2nd unit test" keeps its ordinal in the title', extractLocal('2nd unit test').title, '2nd unit test')
check(
  'ordinal: "26th ko" is still read as a date',
  extractLocal('26th ko submit karna hai').dueDate !== null,
  true,
)
check(
  'ordinal: a real date later in the text still wins',
  extractLocal('1st internal exam on 25th').dueDate !== null,
  true,
)

// --- 🎯 Risk score — one honest 0–100 number per pending card ---
const riskOf = (task) => riskScore(task, { pace: {}, today: todayKey() })
check('risk: done task earns no score', riskOf({ title: 'x', dueDate: shift(-2), done: true, completedAt: 1 }), null)
check('risk: undated task earns no score', riskOf({ title: 'x', dueDate: null, done: false }), null)
check('risk: unreadable date earns no score', riskOf({ title: 'x', dueDate: '2026-02-31' }), null)
check('risk: unreadable cell blocks the pager path (rejects impossible dates)', riskOf({ title: 'x' }), null)
{
  const late = riskOf({ title: 'x', dueDate: shift(-3), marks: 5, done: false })
  const dueToday = riskOf({ title: 'x', dueDate: shift(0), marks: 5, done: false })
  const tomorrow = riskOf({ title: 'x', dueDate: shift(1), marks: 5, done: false })
  const far = riskOf({ title: 'x', dueDate: shift(30), marks: 5, done: false })
  check('risk: late outranks due today', late.score > dueToday.score, true)
  check('risk: due today outranks tomorrow', dueToday.score > tomorrow.score, true)
  check('risk: tomorrow outranks a month away', tomorrow.score > far.score, true)
  check('risk: critical level only at the top', late.level, 'critical')
  check('risk: far future hums along calm-or-watch', ['calm', 'watch'].includes(far.level), true)
  check('risk: late card names its lateness', late.reasons.some((r) => r.includes('late')), true)
  check('risk: bigger marks push the score up', riskOf({ title: 'x', dueDate: shift(2), marks: 25 }).score > riskOf({ title: 'x', dueDate: shift(2), marks: 5 }).score, true)
  check('risk: high priority pushes the score up', riskOf({ title: 'x', dueDate: shift(2), priority: 'high' }).score > riskOf({ title: 'x', dueDate: shift(2), priority: 'normal' }).score, true)
}
{
  // A subject that is usually late raises the card's risk once the brain has proof.
  const base = { title: 'Quiz', dueDate: shift(4), subject: 'DBMS', marks: 10 }
  const brain = {
    overall: null,
    subject: (s) =>
      String(s).trim().toLowerCase() === 'dbms' ? { n: 3, onTimeRate: 33, avgBuffer: -2 } : null,
  }
  const without = riskScore(base, { today: todayKey() })
  const withLateHistory = riskScore(base, { brain, today: todayKey() })
  check('risk: usually-late history lifts the score', withLateHistory.score > without.score, true)
  check('risk: usually-late reason is spoken on the card', withLateHistory.reasons.some((r) => r.includes('usually')), true)
}
check('risk: tone classes exist for every level', ['critical', 'high', 'watch', 'calm'].every((l) => typeof riskTone(l) === 'string' && riskTone(l)), true)
check('risk: score stays inside 0–100', (() => {
  for (let d = -40; d <= 40; d++) {
    const r = riskOf({ title: 'x', dueDate: shift(d), marks: 30, priority: 'high' })
    if (r && (r.score < 0 || r.score > 100)) return false
  }
  return true
})(), true)

// --- 📋 Plan banao — deadline → day-by-day study sessions ---
{
  const planning = { title: 'DBMS assignment Q1-Q12 due soon', dueDate: shift(6), marks: 20, done: false }
  const plan = buildPlan(planning, [], todayKey())
  check('plan: exists for a dated pending task', Boolean(plan), true)
  check('plan: submit step lands on the due date', plan.steps[plan.steps.length - 1].date, planning.dueDate)
  check('plan: sessions are ordered today → due', plan.steps[0].date <= plan.steps[plan.steps.length - 1].date, true)
  check('plan: every session carries minutes', plan.steps.every((s) => s.minutes > 0), true)
  check('plan: caps sessions at 4 rounds', plan.steps.length <= 4, true)
  check('plan: no sprint stamp while days fit', plan.sprint, false)

  const tonight = buildPlan({ title: 'OS viva tomorrow morning', dueDate: shift(0), marks: 10 }, [], todayKey())
  check('plan: due-today collapses into a sprint', tonight.sprint, true)
  check('plan: sprint still ends at submit', tonight.steps[tonight.steps.length - 1].label.toLowerCase().includes('submit'), true)

  const overdue = buildPlan({ title: 'lab record', dueDate: shift(-2), marks: 10 }, [], todayKey())
  check('plan: overdue task also gets a sprint, not a fantasy schedule', overdue.sprint, true)
  check('plan: sprint work is scheduled today', overdue.steps[0].date, todayKey())

  check('plan: done task needs no plan', buildPlan({ title: 'x', dueDate: shift(2), done: true }, []), null)
  check('plan: undated task needs no plan', buildPlan({ title: 'x', dueDate: null }, []), null)

  const diffSubjects = [
    buildPlan({ title: 'DBMS lab record', dueDate: shift(3), marks: 10 }, [], todayKey()).steps[0],
    buildPlan({ title: 'DBMS quiz revision', dueDate: shift(3), marks: 10 }, [], todayKey()).steps[0],
    buildPlan({ title: 'SE presentation slides', dueDate: shift(3), marks: 10 }, [], todayKey()).steps[0],
  ]
  check('plan: labels adapt to what the work actually is', new Set(diffSubjects.map((s) => s.label)).size, 3)

  const copy = planCopyText(planning, plan, todayKey())
  check('plan: copy text is a numbered checklist', /^\^?1\. /m.test(copy) || copy.includes('1. '), true)
  check('plan: copy mentions the total effort', copy.includes('2h') || copy.includes('1h') || copy.includes('h'), true)

  // Hours that obviously don't fit still fit in a bounded plan — max 4 rounds.
  const huge = buildPlan({ title: 'Big assignment', dueDate: shift(2), marks: null }, [], todayKey())
  check('plan: never more rounds than the days left', huge.steps.length <= 3, true)
}

// --- 🔥 12-week consistency heat ---
{
  const now = Date.now()
  const dayMs = 864e5
  const mk = (daysAgo, n = 1) =>
    Array.from({ length: n }, (_, i) => ({
      id: `h${daysAgo}-${i}`,
      title: `heat ${daysAgo}`,
      done: true,
      dueDate: key(new Date(now - daysAgo * dayMs)), // same local day → on time
      completedAt: now - daysAgo * dayMs - i, // inside the same local day
    }))
  const heatTasks = [
    ...mk(0), // today
    ...mk(1, 2), // yesterday — 2 finished
    ...mk(2, 5), // 2 days ago — the busy day
    ...mk(10), // isolated finish
    // One late finish: completed after dueDate.
    {
      id: 'late-finish',
      title: 'late lab',
      done: true,
      dueDate: key(new Date(new Date(now - 3 * dayMs).setDate(new Date(now - 3 * dayMs).getDate() - 1))),
      completedAt: now - 3 * dayMs,
    },
  ]
  const heat = heatGrid(heatTasks, 12, now)
  check('heat: one cell per day across 12 weeks', heat.cells.length, 84)
  check('heat: newest cell is today', key(new Date(now)), heat.cells[heat.cells.length - 1].key)
  check('heat: counts finishes by local day', heat.cells[heat.cells.length - 1].count, 1)
  check('heat: busiest day is day -2', heat.cells[heat.cells.length - 3].count, 5)
  check('heat: on-time counts are split out', heat.cells[heat.cells.length - 3].onTime, 5)
  check('heat: late finish shows in the day -3 cell', heat.cells[heat.cells.length - 4].late, 1)
  check('heat: total done matches the input', heat.totalDone, heatTasks.length, )
  check('heat: longest streak counts the 3-day run', heat.longest >= 3, true)
  check('heat: current streak ends today', heat.current >= 1, true)
  const empty = heatGrid([], 12, now)
  check('heat: empty history is all-zero with no streaks', [empty.totalDone, empty.longest, empty.current], [0, 0, 0])
}

// --- 📅 Google Calendar quick add ---
{
  const gcal = googleCalendarUrl({ id: 'g1', title: 'DBMS assignment', dueDate: '2026-11-05', marks: 20, subject: 'DBMS' })
  check('gcal: builds a real template URL', gcal?.startsWith('https://calendar.google.com/calendar/render?'), true)
  const plain = gcal ? decodeURIComponent(gcal).replace(/\+/g, ' ') : ''
  check('gcal: all-day event uses an exclusive next-day end', plain.includes('dates=20261105/20261106'), true)
  check('gcal: title travels in the URL', plain.includes('DBMS'), true)
  check('gcal: marks travel in the details', plain.includes('20 marks'), true)
  check('gcal: undated task has nothing to schedule', googleCalendarUrl({ title: 'x', dueDate: null }), null)
  check('gcal: impossible date is rejected, not mangled', googleCalendarUrl({ title: 'x', dueDate: '2026-02-31' }), null)
}

// --- 🕐 Aaj ka timetable — hour-by-hour block schedule for the day ---
{
  const noon = () => {
    const d = new Date()
    d.setHours(13, 0, 0, 0)
    return d.getTime()
  }
  check('timetable: no pending dated work → null', daySchedule([{ title: 'x', done: true }], noon()), null)
  check('timetable: undated pending → null', daySchedule([{ title: 'x', done: false, dueDate: null }], noon()), null)

  const mkPending = (id, daysLeft, marks, minuteEst) => ({
    id,
    title: `task-${id}`,
    subject: 'DBMS',
    done: false,
    dueDate: shift(daysLeft),
    marks,
    priority: 'normal',
    createdAt: Date.now() - 864e5,
  })
  const tt = daySchedule(
    [
      mkPending('late', -2, 10), // late → must open the day
      mkPending('today', 0, 20), // due today
      mkPending('soon', 3, 5), // fits the 3-day window
      mkPending('far', 10, 30), // next week → overflow today
    ],
    noon(),
  )
  check('timetable: blocks exist and a far task stays out', [tt.blocks.length, tt.overflow.length], [3, 1])
  check('timetable: far task is the overflow', tt.overflow[0].id, 'far')
  check('timetable: late task opens the day', tt.blocks[0].task.id, 'late')
  check(
    'timetable: blocks run chronologically',
    tt.blocks.every((b, i) => i === 0 || b.startMin >= tt.blocks[i - 1].endMin),
    true,
  )
  check(
    'timetable: a real break sits between blocks',
    tt.blocks.every((b, i) => i === 0 || b.startMin - tt.blocks[i - 1].endMin >= 10),
    true,
  )
  check(
    'timetable: every block is 25–90 minutes and fits before the end',
    tt.blocks.every((b) => b.minutes >= 25 && b.minutes <= 90 && b.endMin <= tt.endMin),
    true,
  )
  check('timetable: starts after now, never before 6 am', tt.blocks[0].startMin >= 13 * 60 + 5, true)
  check('timetable: total minutes match the blocks', tt.totalMin, tt.blocks.reduce((a, b) => a + b.minutes, 0))

  // A pocket of work that cannot fit (open at 9:30 pm) becomes honest overflow.
  const night = new Date()
  night.setHours(21, 30, 0, 0)
  const lateNight = daySchedule(
    [mkPending('late-1', -1, 10), mkPending('late-2', -2, 10), mkPending('late-3', -3, 10)],
    night.getTime(),
  )
  check('timetable: a nearly-gone day still schedules what fits', lateNight.blocks.length, 1)
  check('timetable: the rest is overflow, never faked', lateNight.overflow.length, 2)

  const copyText = timetableCopyText(tt)
  check('timetable: copy lists every block', tt.blocks.every((b) => copyText.includes(b.task.title)), true)
  check('timetable: copy mentions the overflow count', copyText.includes('Kal ke liye: 1'), true)
}

// --- 🏅 Weekly grade — the report card's rubber stamp ---
{
  const onTimeFinish = (daysAgo) => ({
    id: `g${daysAgo}`,
    title: `grade ${daysAgo}`,
    subject: 'DBMS',
    marks: 10,
    done: true,
    dueDate: shift(-daysAgo),
    completedAt: (() => {
      const d = new Date()
      d.setDate(d.getDate() - daysAgo)
      d.setHours(12, 0, 0, 0)
      return d.getTime()
    })(),
  })
  const lateFinish = (daysAgo) => {
    const done = onTimeFinish(daysAgo)
    done.dueDate = shift(-daysAgo)
    done.completedAt += 1.5 * 864e5 // finished 1.5 days after the deadline
    return done
  }

  // Top case: 5 rated, all on time, no late pile, improving trend.
  const topCase = [
    ...[1, 2, 3].map(onTimeFinish), // this week (0–3 days ago)
    ...[9, 12].map(onTimeFinish), // last week
  ]
  const top = reportGrade(topCase)
  check('grade: an all-on-time improving week earns A+ or A', ['A+', 'A'].includes(top.grade), true)
  check('grade: that score is honest about its ceiling', top.score >= 80, true)

  // Low case: everything late, a pile of late pending, flat trend.
  const lowCase = [
    ...[1, 3].map(lateFinish), // this week, late
    ...[9, 12].map(lateFinish), // last week, late
    {
      id: 'lp1', title: 'pending late pile', subject: 'DBMS', done: false,
      dueDate: shift(-2), marks: 20, createdAt: Date.now() - 864e5,
    },
    {
      id: 'lp2', title: 'pending late pile 2', subject: 'OS', done: false,
      dueDate: shift(-3), marks: 20, createdAt: Date.now() - 864e5,
    },
    {
      id: 'lp3', title: 'pending late pile 3', subject: 'SE', done: false,
      dueDate: shift(-4), marks: 20, createdAt: Date.now() - 864e5,
    },
  ]
  const low = reportGrade(lowCase)
  check('grade: an all-late week with a late pile cannot be B+', !['A+', 'A', 'B+', 'B'].includes(low.grade), true)
  check('grade: the score stays inside its scale', low.score >= 0 && low.score <= 100, true)
  check('grade: an A week never scores below its rate floor', top.score > low.score, true)

  // Honest absence: under 3 rated finishes, no grade is printed.
  const shy = reportGrade([onTimeFinish(1)])
  check('grade: under 3 finishes, refuse to grade (never fake it)', [shy.grade, typeof shy.note], [null, 'string'])
}

// --- 🚦 Same-day pile-ups — the deadline clash watch ---
{
  const mk = (id, title, dueDate, marks = 10, extra = {}) => ({
    id,
    title,
    subject: 'DBMS',
    marks,
    done: false,
    dueDate,
    createdAt: Date.now() - 864e5,
    ...extra,
  })

  check('pile-ups: an empty radar has no clash lanes', pileUps([]), [])
  check('pile-ups: undated and done work never clashes', pileUps([mk('u', 'undated', null), mk('d', 'done todo', shift(2), 10, { done: true })]), [])

  // Mon: OS lab (20) + DBMS viva (15) + a lone late report (excluded) — one
  // clash day; Tue: a single task → no lane. Light task listed first on
  // purpose: the lane must rank by marks, not paste order.
  const ups = pileUps([
    mk('b', 'DBMS viva', shift(2), 15),
    mk('a', 'OS lab', shift(2), 20),
    mk('c', 'alone tuesday', shift(3), 30),
    mk('l', 'late report', shift(-4), 25),
    mk('f', 'far future', shift(45), 10),
  ])
  check('pile-ups: one clash day for the double-booked date', ups.length, 1)
  check('pile-ups: the clash day is task-day +2', ups[0]?.date, shift(2))
  check('pile-ups: count and marks add the whole day', [ups[0]?.count, ups[0]?.marks], [2, 35])
  check(
    'pile-ups: heaviest first inside a lane',
    ups[0]?.titles[0],
    'OS lab',
  )

  // Two clash days → both printed, earliest first.
  const two = pileUps([
    mk('a', 'o1', shift(5), 10),
    mk('b', 'o2', shift(5), 10),
    mk('c', 't1', shift(9), 10),
    mk('d', 't2', shift(9), 10),
  ])
  check('pile-ups: two clash days, chronological', two.map((u) => u.date), [shift(5), shift(9)])
}

// --- 🧮 "Guess karun ya chhodun?" — the negative-marking coach ---
{
  // JEE-style +4/−1: half the guesses land → +1.5 EV per guess, clearly keep.
  const jee = guessCoach({ attempted: 60, sure: 30, accuracyPct: 50, award: 4, penalty: 1 })
  check('coach: guessed count = attempted − sure', jee.guesses, 30)
  check('coach: sure answers bank at face value', jee.sureMarks, 120)
  check('coach: EV per guess = p·award − (1−p)·penalty', jee.evPerGuess, 1.5)
  check('coach: expected = banked + guesses × EV', jee.expected, 165)
  check('coach: +4/−1 breaks even at 20% accuracy', jee.breakPct, 20)
  check('coach: a 50% guesser should keep guessing', jee.verdict, 'guess')

  // A shaky guesser loses marks on every crack — the honest answer is "skip".
  const shaky = guessCoach({ attempted: 60, sure: 30, accuracyPct: 10, award: 4, penalty: 1 })
  check('coach: a below-break-even guesser is told to skip', shaky.verdict, 'skip')
  check('coach: skipping means blanks score the banked marks', shaky.skipTotal, 120)
  check('coach: expected dips under the banked line', shaky.expected < shaky.skipTotal, true)
  check('coach: negative EV says how much each guess costs', shaky.evPerGuess, -0.5)

  // Exactly at break-even: zero EV, no arithmetic lied.
  const even = guessCoach({ attempted: 40, sure: 10, accuracyPct: 20, award: 4, penalty: 1 })
  check('coach: at break-even the verdict is coin-flip', even.verdict, 'flip')
  check('coach: zero EV means guessing cannot change the total', even.expected, even.skipTotal)

  // No negative marking → every scheme converges to "guess".
  const free = guessCoach({ attempted: 20, sure: 5, accuracyPct: 25, award: 1, penalty: 0 })
  check('coach: no penalty → blanks are always free points', free.verdict, 'guess')
  check('coach: free variant breaks even at 0%', free.breakPct, 0)
  check('coach: GATE-style −⅓ breaks even at 25%', guessCoach({ attempted: 10, sure: 5, accuracyPct: 25, award: 1, penalty: 1 / 3 }).breakPct, 25)

  // Junk in, honest math out.
  check('coach: attempted < sure clamps without inventing marks', guessCoach({ attempted: 5, sure: 20, accuracyPct: 50, award: 4, penalty: 1 }).guesses, 0)
  check('coach: null float noise on empty input', guessCoach().guesses, 0)
  check('coach: presets carry the real schemes', MARKING_PRESETS.length >= 4, true)
}

// --- 🗓️ Radar Almanac — the month's pure data layer ---
{
  // October 2026 starts on a Thursday, so the Monday-first grid opens on
  // 28 September and closes on 1 November (five complete weeks).
  const oct = [
    { id: 'a', title: 'DBMS assignment', subject: 'DBMS', dueDate: '2026-10-05', marks: 20, done: false },
    { id: 'b', title: 'DBMS worksheet', subject: 'DBMS', dueDate: '2026-10-05', marks: 10, done: false },
    { id: 'c', title: 'OS lab record', subject: 'OS', dueDate: '2026-10-08', marks: 15, done: false },
    { id: 'd', title: 'DBMS quiz (finished)', subject: 'DBMS', dueDate: '2026-10-05', marks: 99, done: true, completedAt: Date.now() },
    { id: 'e', title: 'September leftover', subject: 'SE', dueDate: '2026-09-30', marks: 5, done: false },
    { id: 'f', title: 'Undated brief', subject: 'SE', dueDate: null, marks: 10, done: false },
    { id: 'g', title: 'Impossible date', subject: 'SE', dueDate: '2026-02-31', marks: 10, done: false },
  ]
  const grid = almanacGrid(2026, 9, oct, '2026-10-07')
  const cells = grid.weeks.flat()
  const cell = (key) => cells.find((c) => c.key === key)

  check('almanac: October 2026 is five complete weeks', grid.weeks.length, 5)
  check('almanac: Monday-first grid opens on 28 Sep', cells[0].key, '2026-09-28')
  check('almanac: full week rows are 7 cells', grid.weeks.every((w) => w.length === 7), true)
  check('almanac: marks sum only pending work', [cell('2026-10-05').pending, cell('2026-10-05').marks, cell('2026-10-05').done], [2, 30, 1])
  check('almanac: done work never becomes a subject dot', cell('2026-10-05').subjects, ['DBMS'])
  check('almanac: out-of-month work stays out of the totals', grid.totals, { pending: 3, done: 1, marks: 45 })
  check('almanac: a past pending day is stamped late', cell('2026-10-05').late, true)
  check('almanac: a future day is not late', cell('2026-10-08').late, false)
  check('almanac: today is found even on an empty cell', [cell('2026-10-07').isToday, cell('2026-10-07').pending], [true, 0])
  check('almanac: malformed dates are ignored, never crash the grid', grid.totals.pending, 3)
  check('almanac: month summary is honest prose', monthSummary(grid.totals).parts, ['3 due', '45 marks', '1 finished'])
  check('almanac: empty months say so instead of printing zeros', monthSummary({ pending: 0, done: 0, marks: 0 }).line, 'Nothing in this month')
  check('almanac: day sheet splits pending from done', [dayItems(oct, '2026-10-05').pending.length, dayItems(oct, '2026-10-05').done.length], [2, 1])
  check('almanac: undated pending work is named', undatedPending(oct).map((t) => t.id), ['f'])
  check('almanac: today wins as the default day', defaultDay(grid, oct), '2026-10-07')
  check('almanac: an empty future month defaults to its 1st', defaultDay(almanacGrid(2026, 10, oct, '2026-10-07'), oct), '2026-11-01')
  check('almanac: month shift crosses the year boundary', shiftMonth(2026, 11, 1), { year: 2027, month: 0 })
  check('almanac: cursor follows a real key', monthCursorOf('2026-10-05'), { year: 2026, month: 9 })
  check('almanac: the list view survives a settings restore', defaultSettings.view, 'list')
}

// --- 🖋️ Subject inks — one deterministic pen per subject ---
{
  check('inks: eight readable pens in the palette', SUBJECT_INK_NAMES.length, 8)
  check('inks: same subject, same ink (case/space insensitive)', subjectInk('DBMS'), subjectInk('  dbms  '))
  check('inks: different subjects get different pens', subjectInk('DBMS') === subjectInk('Operating Systems'), false)
  check('inks: no subject means no ink', [subjectInk(''), subjectInk(null)], [null, null])
  const style = subjectStyle('DBMS', { soft: true })
  check('inks: chip style carries colour, border and wash', typeof style.color === 'string' && typeof style.borderColor === 'string' && typeof style.background === 'string', true)
  check('inks: no subject returns no inline style', subjectStyle(''), undefined)
  const keys = subjectKeys([
    { id: '1', subject: 'DBMS' },
    { id: '2', subject: 'OS' },
    { id: '3', subject: 'dbms' },
    { id: '4', subject: null },
  ])
  check('inks: subject key list dedupes in first-seen order', keys.map((k) => k.label), ['DBMS', 'OS'])
  check('inks: every key gets its ink', keys.every((k) => typeof k.ink === 'string'), true)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)

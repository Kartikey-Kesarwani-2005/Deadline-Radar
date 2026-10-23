/**
 * Unit tests for the offline extractor — the fallback that keeps the app working
 * with zero setup. Plus backup parser tests (restore path). Run with:  npm test
 */
import { extractLocal, extractManyLocal, reconcile } from '../src/lib/extract.js'
import { parseBackup } from '../src/lib/store.js'
import { answerQuery, briefingText, doNow, estimateEffort, onTimeStreak, paceRows, startAlerts, subjectLoad, weeklyTrend, weekShareText } from '../src/lib/brain.js'
import { buildICS } from '../src/lib/calendar.js'
import { dueTone } from '../src/lib/dates.js'

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
check('25 tarikh -> 25th of this month', t9.dueDate, key(new Date(today.getFullYear(), today.getMonth(), 25)))

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
check('dueTone: undefined dueDate stays calm slate', dueTone({ done: false, dueDate: undefined }).includes('slate-400'), true)
check('dueTone: missing dueDate key also slate (was falsely yellow)', dueTone({ done: false }).includes('slate-400'), true)

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
  'standalone ordinal "the 26th" -> this month',
  extractLocal('viva on the 26th, 10 marks').dueDate,
  key(new Date(today.getFullYear(), today.getMonth(), 26)),
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

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)

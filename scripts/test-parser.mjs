/**
 * Unit tests for the offline extractor — the fallback that keeps the app working
 * with zero setup. Plus backup parser tests (restore path). Run with:  npm test
 */
import { extractLocal, extractManyLocal } from '../src/lib/extract.js'
import { parseBackup } from '../src/lib/store.js'
import { answerQuery, doNow, estimateEffort } from '../src/lib/brain.js'
import { buildICS } from '../src/lib/calendar.js'

const today = new Date()
const key = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const shift = (n) => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  d.setDate(d.getDate() + n)
  return key(d)
}
const nextWeekday = (target) => {
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let delta = (target - d.getDay() + 7) % 7
  if (delta === 0) delta = 7
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
check('dd/mm date', t3.dueDate, `${today.getFullYear()}-10-25`)

const t4 = extractLocal('OS viva on 2026-11-02, 10 marks')
check('ISO date + marks', { d: t4.dueDate, m: t4.marks }, { d: '2026-11-02', m: 10 })

const t5 = extractLocal('physics practical file niche rakh dena')
check('no date -> null', t5.dueDate, null)

const t6 = extractLocal('DBMS quiz on ' + friday + ', 15 marks, high weightage')
check('high marks -> high priority', t6.priority, 'high')

const t7 = extractLocal('October 30 deadline for the final write-up')
check('Month DD format', t7.dueDate, `${today.getFullYear()}-10-30`)

// --- Hinglish dates ---
const t8 = extractLocal('OS viva agle somvar, 10 marks')
check('agle somvar -> next Monday', t8.dueDate, nextWeekday(1))

const t9 = extractLocal('DBMS quiz 25 tarikh tak submit karna hai')
check('25 tarikh -> Oct 25', t9.dueDate, `${today.getFullYear()}-10-25`)

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
check('bulk: per-task fields', { d: many[1].dueDate, s: many[1].subject }, { d: `${today.getFullYear()}-10-28`, s: 'OS' })

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

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)

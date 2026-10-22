/**
 * Unit tests for the offline extractor — the fallback that keeps the app working
 * with zero setup. Run with:  npm test
 */
import { extractLocal } from '../src/lib/extract.js'

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

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)

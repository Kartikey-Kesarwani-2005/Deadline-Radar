/**
 * Radar Brain — the personal rhythm engine.
 * Everything here is computed from the user's OWN finished work, on-device:
 *   • how often they finish on time (per subject and overall),
 *   • how many days early/late they usually submit,
 *   • how many marks are riding on late / this-week work.
 * No network, no accounts — the app gets smarter the more deadlines it sees.
 */

import { dayDiff, toDateKey, todayKey } from './dates'

/** Days early (+) or late (−) a finished task was relative to its due date. */
function bufferDays(task) {
  if (!task.dueDate || !task.completedAt) return null
  return dayDiff(toDateKey(new Date(task.completedAt)), task.dueDate)
}

function statsFor(list) {
  if (!list.length) return null
  const onTime = list.filter((t) => bufferDays(t) >= 0).length
  const avgBuffer = list.reduce((a, t) => a + bufferDays(t), 0) / list.length
  return {
    n: list.length,
    onTimeRate: Math.round((onTime / list.length) * 100),
    avgBuffer, // days; negative = usually finishes late
  }
}

/** Builds the brain from all finished, dated tasks. */
export function computeBrain(tasks) {
  const done = tasks.filter((t) => t.done && t.dueDate && t.completedAt)
  const bySubject = {}
  for (const t of done) {
    const key = (t.subject || '').trim().toLowerCase()
    if (!key) continue
    ;(bySubject[key] ||= []).push(t)
  }
  const subjects = Object.fromEntries(
    Object.entries(bySubject).map(([k, list]) => [k, statsFor(list)]),
  )
  return {
    n: done.length,
    overall: statsFor(done),
    subject: (s) => (s ? subjects[String(s).trim().toLowerCase()] || null : null),
  }
}

/** Marks riding on pending work: already-late vs due within 7 days. */
export function marksAtRisk(tasks) {
  let late = 0
  let week = 0
  for (const t of tasks) {
    if (t.done || !t.dueDate || !t.marks) continue
    const d = dayDiff(todayKey(), t.dueDate)
    if (d < 0) late += t.marks
    else if (d <= 7) week += t.marks
  }
  return { late, week, total: late + week }
}

/**
 * One-line personal chip for a pending card — null until the brain has
 * enough history (≥2 finished tasks in that subject).
 */
export function adviceFor(brain, task) {
  if (!task || task.done || !task.dueDate) return null
  const s = brain.subject(task.subject) || (task.subject ? null : brain.overall)
  if (!s || s.n < 2) return null
  const where = task.subject || 'overall'
  if (s.avgBuffer <= -0.5) {
    return { tone: 'warn', text: `Usually ${Math.abs(s.avgBuffer).toFixed(1)}d late in ${where}` }
  }
  if (s.onTimeRate < 75) {
    return { tone: 'warn', text: `Only ${s.onTimeRate}% on time in ${where}` }
  }
  return { tone: 'calm', text: `${s.onTimeRate}% on time in ${where}` }
}

/** Tiny intent parser for the voice query — Hinglish + English keywords. */
export function answerQuery(query, { tasks, stats }) {
  const s = String(query || '').toLowerCase()
  const pending = tasks.filter((t) => !t.done && t.dueDate)
  const late = pending.filter((t) => dayDiff(todayKey(), t.dueDate) < 0)
  const today = pending.filter((t) => dayDiff(todayKey(), t.dueDate) === 0)
  const tomorrow = pending.filter((t) => dayDiff(todayKey(), t.dueDate) === 1)
  const week = pending.filter((t) => {
    const d = dayDiff(todayKey(), t.dueDate)
    return d > 0 && d <= 7
  })
  const top = (arr) =>
    arr
      .slice(0, 3)
      .map((t) => `${t.title}${t.marks ? `, ${t.marks} marks` : ''}`)
      .join('; ')

  if (/mark|risk/.test(s)) {
    const m = marksAtRisk(tasks)
    return {
      text: m.total
        ? `${m.total} marks at risk — ${m.late} already late, ${m.week} due this week.`
        : 'No marks at risk right now. The radar is clear.',
    }
  }
  if (/(on ?time|score|percentage|result)/.test(s) && stats.done) {
    return {
      text: `${stats.onTime} of ${stats.done} finished tasks were on time — ${Math.round((stats.onTime / stats.done) * 100)} percent.`,
    }
  }
  if (/late|overdue|pichhle/.test(s)) {
    return { text: late.length ? `${late.length} late: ${top(late)}.` : 'Nothing is late. Good.' }
  }
  if (/(tomorrow|parso|agle kal)/.test(s)) {
    return { text: tomorrow.length ? `Tomorrow: ${top(tomorrow)}.` : 'Nothing due tomorrow.' }
  }
  if (/(today|aaj)/.test(s)) {
    return { text: today.length ? `Today: ${top(today)}.` : 'Nothing due today.' }
  }
  if (/(week|upcoming|agle)/.test(s)) {
    return { text: week.length ? `This week: ${top(week)}.` : 'Nothing due this week.' }
  }
  const m = marksAtRisk(tasks)
  return {
    text: `Radar check: ${late.length} late, ${today.length} due today, ${week.length} this week. ${m.total} marks at risk.`,
  }
}

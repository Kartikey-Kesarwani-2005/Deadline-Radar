/**
 * Radar Brain — the personal rhythm engine.
 * Everything here is computed from the user's OWN finished work, on-device:
 *   • how often they finish on time (per subject and overall),
 *   • how many days early/late they usually submit,
 *   • how many marks are riding on late / this-week work.
 * No network, no accounts — the app gets smarter the more deadlines it sees.
 */

import { addDays, dayDiff, toDateKey, todayKey } from './dates.js'

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

const WEEKDAY = (key) =>
  new Date(`${key}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' })

/**
 * 🌦️ Deadline Weather — the next 7 days as a weather forecast.
 * Each day gets a level from the marks/count landing on it:
 *   ☀️ free · ⛅ light · 🌧️ heavy · ⛈️ storm (3+ submissions or 25+ marks).
 */
export function forecastWeather(tasks) {
  const today = todayKey()
  const days = []
  for (let i = 0; i < 7; i++) {
    const key = addDays(today, i)
    let marks = 0
    let count = 0
    for (const t of tasks) {
      if (t.done || !t.dueDate || t.dueDate !== key) continue
      count++
      marks += t.marks || 0
    }
    let icon = '☀️'
    let level = 'free'
    if (count >= 3 || marks > 25) {
      icon = '⛈️'
      level = 'storm'
    } else if (marks > 10 || count >= 2) {
      icon = '🌧️'
      level = 'heavy'
    } else if (count > 0) {
      icon = '⛅'
      level = 'light'
    }
    days.push({ key, label: WEEKDAY(key), isToday: i === 0, icon, level, marks, count })
  }
  return days
}

/**
 * ⏱️ Effort model — the radar learns minutes-per-mark per subject from your own
 * focus-timer sessions (finished tasks with effortMin). Until you have data it
 * falls back to an honest default (~6 min per mark, clamped 30 min – 6 h).
 */
const DEFAULT_MIN_PER_MARK = 6
const ASSUMED_HOURS_PER_DAY = 3 // latest-start math: plausible focused hours per day

function pacePerMark(tasks) {
  const acc = {}
  for (const t of tasks) {
    if (!t.done || !t.effortMin || !t.marks || !t.subject) continue
    const key = String(t.subject).trim().toLowerCase()
    ;(acc[key] ||= []).push(t.effortMin / t.marks)
  }
  const pace = {}
  for (const [k, list] of Object.entries(acc)) {
    pace[k] = list.reduce((a, b) => a + b, 0) / list.length
  }
  return pace
}

/** Estimated minutes for one task — learned subject pace if it exists. */
export function estimateEffort(task, pace) {
  const marks = task.marks || 10
  const p = task.subject ? pace[String(task.subject).trim().toLowerCase()] : null
  const minutes = Math.min(360, Math.max(30, Math.round(marks * (p || DEFAULT_MIN_PER_MARK))))
  return { minutes, learned: p != null }
}

export function fmtHours(minutes) {
  if (minutes < 60) return `${minutes}m`
  const h = minutes / 60
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`
}

/**
 * 🎯 "Ab kya karun?" — the do-now engine. Lists show what exists; this ranks
 * what to START RIGHT NOW: marks-per-hour ROI weighted by urgency, so overdue
 * and latest-start tasks (their estimate no longer fits comfortably before the
 * due date) jump the queue. Pure function of your own data — no accounts.
 */
export function doNow(tasks) {
  const pace = pacePerMark(tasks)
  const today = todayKey()
  const pending = tasks.filter((t) => !t.done && t.dueDate)
  if (!pending.length) return null
  const items = pending.map((t) => {
    const { minutes, learned } = estimateEffort(t, pace)
    const hours = minutes / 60
    const roi = (t.marks || 10) / hours
    const daysLeft = dayDiff(today, t.dueDate)
    const fitsDays = Math.ceil(hours / ASSUMED_HOURS_PER_DAY)
    return {
      task: t,
      minutes,
      learned,
      roi,
      daysLeft,
      latestStart: daysLeft <= fitsDays,
      score: roi / (1 + Math.max(0, daysLeft)),
    }
  })
  items.sort((a, b) => b.score - a.score)
  return { pick: items[0], next: items.slice(1, 3) }
}

/** One-line reason for a ranked item — spoken by the voice query too. */
export function doNowReason(item) {
  if (item.daysLeft < 0) return `already late — about ${Math.round(item.roi)} marks/hr, finish it first`
  if (item.latestStart)
    return `latest start — begin now to fit ~${fmtHours(item.minutes)} before ${WEEKDAY(item.task.dueDate)}`
  return `highest marks/hr — about ${Math.round(item.roi)} marks per hour`
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
    const lateDays = Math.max(1, Math.ceil(Math.abs(s.avgBuffer)))
    const startKey = addDays(task.dueDate, -lateDays)
    const urgent = dayDiff(todayKey(), startKey) < 0
    return {
      tone: 'warn',
      text: urgent
        ? `Usually ${Math.abs(s.avgBuffer).toFixed(1)}d late — start NOW`
        : `Usually ${Math.abs(s.avgBuffer).toFixed(1)}d late — start by ${WEEKDAY(startKey)}`,
    }
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
  if (/(weather|mausam|forecast)/.test(s)) {
    const busy = forecastWeather(tasks).filter((d) => d.level === 'heavy' || d.level === 'storm')
    return {
      text: busy.length
        ? `Heaviest day coming up: ${WEEKDAY(busy[0].key)} — ${busy[0].marks} marks, ${busy[0].count} submissions.`
        : 'Clear week ahead — no submission storms.',
    }
  }
  if (/(ab kya|kya karu|kya karun|what next|start what|pehle kya|kaunsa|which one)/.test(s)) {
    const plan = doNow(tasks)
    if (!plan) return { text: 'Nothing pending with a due date — nothing to start right now.' }
    const { task, minutes, learned } = plan.pick
    return {
      text: `Start now: ${task.title}${task.marks ? `, ${task.marks} marks` : ''} — about ${fmtHours(minutes)}${learned ? ', from your own pace' : ''}. ${doNowReason(plan.pick)}.`,
    }
  }
  const m = marksAtRisk(tasks)
  return {
    text: `Radar check: ${late.length} late, ${today.length} due today, ${week.length} this week. ${m.total} marks at risk.`,
  }
}

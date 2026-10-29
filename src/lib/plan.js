/**
 * 📋 "Plan banao" — the deadline → study-plan generator.
 * The radar says "≈2h, start by Wednesday" — this goes one step further and
 * lays out the actual SESSIONS: what to do in each round, on which day, so a
 * scary deadline becomes a short checklist. Sessions are spaced evenly between
 * today and the due date, the final step is always "submit", and if the work
 * no longer fits the remaining days it honestly collapses into one sprint.
 *
 * Pure function of the user's own data — the pace model feeds the minutes, so
 * the plan sharpens as focus sessions accumulate. Deterministic + testable.
 */

import { addDays, dayDiff, todayKey } from './dates.js'
import { estimateEffort, fmtHours, paceModel } from './brain.js'

/** Round labels matched to what the work actually is — parsed from the title. */
function roundLabels(title) {
  const t = String(title || '').toLowerCase()
  if (/(lab|record|practical|experiment)/.test(t))
    return ['Set up + first experiments', 'Remaining experiments + record', 'Final format + submit']
  if (/(quiz|test|viva|exam|revision)/.test(t))
    return ['Re-read notes + key points', 'Practice questions', 'Quick recap + go']
  if (/(assignment|worksheet|homework|problem|question|solve|answer)/.test(t))
    return ['Read + solve the first half', 'Solve the rest + verify', 'Proofread + submit']
  if (/(presentation|slides|report|essay|write-up|project|pdf|docs)/.test(t))
    return ['Outline + rough content', 'Main content round', 'Polish + submit']
  return ['Understand the task + rough work', 'Main work round', 'Final pass + submit']
}

/** The last step always says "submit" — a plan that doesn't end in submission isn't one. */
function asSubmit(label) {
  return /submit|send|upload|file/.test(label.toLowerCase()) ? label : 'Submit — hand it in'
}

/**
 * @param {object} task - a single pending task
 * @param {object[]} tasks - the full list (for the learned pace model)
 * @param {string} today - injectable date key for tests
 * @returns {{
 *   minutes:number, learned:boolean, daysLeft:number, sprint:boolean,
 *   steps:Array<{ label:string, date:string, minutes:number }>
 * } | null} null for done / undated / unreadable tasks
 */
export function buildPlan(task, tasks = [], today = todayKey()) {
  if (!task || task.done || !task.dueDate) return null
  const diff = dayDiff(today, task.dueDate)
  if (diff === null) return null

  const pace = paceModel(tasks)
  const { minutes, learned } = estimateEffort(task, pace)
  const labels = roundLabels(task.title)

  // Late or due today — no schedule left to spread over. One honest sprint,
  // then the submit step, instead of pretending three calm rounds exist.
  if (diff <= 0) {
    return {
      minutes,
      learned,
      daysLeft: diff,
      sprint: true,
      steps: [
        { label: `Sprint now — ${labels[1] || labels[0]}`, date: today, minutes },
        { label: asSubmit(labels[labels.length - 1]), date: task.dueDate, minutes: 0 },
      ],
    }
  }

  // Session count: ~90 min of real work per session, capped 1–4 rounds, and
  // never more rounds than the days that are left.
  const n = Math.max(1, Math.min(Math.ceil(minutes / 90), 4, diff + 1))
  const share = Math.max(10, Math.round(minutes / n))
  const steps = []
  for (let i = 0; i < n; i++) {
    const first = i === 0
    const last = i === n - 1
    const date = last ? task.dueDate : addDays(today, Math.round((diff * i) / (n - 1)))
    const label = first
      ? labels[0]
      : last
        ? asSubmit(labels[labels.length - 1])
        : (labels[1] || `Continue — round ${i + 1}`)
    steps.push({ label, date, minutes: share })
  }
  return { minutes, learned, daysLeft: diff, sprint: false, steps }
}

/** One-step human date for the plan rows ("aaj", "Tomorrow", "Fri 31 Oct"). */
function stepDate(date) {
  const diff = dayDiff(todayKey(), date)
  if (diff === 0) return 'aaj'
  if (diff === 1) return 'Tomorrow'
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/** Ready-to-paste checklist for a group chat / notes app. */
export function planCopyText(task, plan, today = todayKey()) {
  if (!plan) return ''
  const hours = fmtHours(plan.minutes)
  const head = task?.subject
    ? `${task.title} (${task.subject})`
    : String(task?.title || 'Deadline')
  const lines = plan.steps.map(
    (s, i) => `${i + 1}. [${stepDate(s.date)}] ${s.label}${s.minutes ? ` (~${fmtHours(s.minutes)})` : ''}`,
  )
  return `📋 Plan for "${head}" — about ${hours}${plan.sprint ? ', single sprint' : ''}\n${lines.join('\n')}`
}

export { stepDate as formatStepDate }

/**
 * 🕐 "Aaj ka timetable" — one honest day plan, printed like a bell schedule.
 * Unlike "Plan banao" (one deadline spread over days) this answers the other
 * question: TODAY, hour by hour — what works in which slot. Pending work is
 * ranked by the do-now engine (late first, then marks-per-hour ROI), fit into
 * 25–90 min blocks from "now" (next 5 min) until 10 pm, with a 10 min breath
 * between blocks. Work that doesn't fit is listed as overflow — never faked.
 *
 * Deterministic given `now` — tests stay stable.
 */
const DAY_START_MIN = 6 * 60
const DAY_END_MIN = 22 * 60
const BREAK_MIN = 10

/** Minutes-of-day "now + a small nudge", rounded up to the next 5 minutes. */
function nextSlotMin(now) {
  const d = new Date(now)
  const min = d.getHours() * 60 + d.getMinutes() + 5
  const rounded = Math.ceil(min / 5) * 5
  return Math.max(DAY_START_MIN, rounded)
}

/** 12-hour clock for the block times ("4:35 pm"). */
function fmtClock(min) {
  const h24 = Math.floor(min / 60) % 24
  const m = min % 60
  const ampm = h24 < 12 ? 'am' : 'pm'
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

export function formatClock(min) {
  return fmtClock(min)
}

/**
 * @param {object[]} tasks - the full task list
 * @param {number} now - injectable timestamp
 * @returns {{
 *   blocks: Array<{task, minutes, startMin, endMin}>,
 *   overflow: object[], startMin: number, endMin: number, totalMin: number
 * } | null} null when nothing pending is schedulable
 */
export function daySchedule(tasks, now = Date.now()) {
  const today = todayKey()
  const pending = tasks.filter((t) => !t.done && t.dueDate)
  if (!pending.length) return null

  // Rank exactly like the do-now engine: late work quadruples its score, ROI
  // decays with distance, so the queue is always "most damaging first".
  const pace = paceModel(tasks)
  const ranked = pending
    .map((t) => {
      const { minutes } = estimateEffort(t, pace)
      const daysLeft = dayDiff(today, t.dueDate)
      const hours = minutes / 60
      const roi = (t.marks || 10) / hours
      // Tomorrow counts as urgent for today's timetable; next week is not.
      const urgent = daysLeft < 2
      const score = daysLeft < 0 ? roi * 4 : daysLeft < 2 ? roi : roi / (1 + daysLeft)
      return { task: t, minutes: Math.min(90, Math.max(25, minutes)), daysLeft, urgent, score }
    })
    .sort((a, b) => b.score - a.score)

  const fitRanked = ranked.filter((r) => r.urgent || r.daysLeft <= 3)
  const rest = ranked.filter((r) => !(r.urgent || r.daysLeft <= 3))

  let cursor = nextSlotMin(now)
  const endMin = DAY_END_MIN
  const blocks = []
  const overflow = []
  for (const r of fitRanked) {
    // Shrink to what's actually left of the day — a 25-minute honest slot
    // beats a skipped deadline — and let the 10 pm wall stand firm.
    const dur = Math.min(r.minutes, endMin - cursor)
    if (dur < 25) {
      overflow.push(r.task)
      continue
    }
    blocks.push({ task: r.task, minutes: dur, startMin: cursor, endMin: cursor + dur })
    cursor = cursor + dur + BREAK_MIN
  }
  // Anything farther out stays out of today — but say so honestly.
  overflow.push(...rest.map((r) => r.task))
  if (!blocks.length) return { blocks, overflow, startMin: cursor, endMin, totalMin: 0 }
  return {
    blocks,
    overflow,
    startMin: blocks[0].startMin,
    endMin: blocks[blocks.length - 1].endMin,
    totalMin: blocks.reduce((a, b) => a + b.minutes, 0),
  }
}

/** Ready-to-paste timetable for a study-group/notes post. */
export function timetableCopyText(schedule) {
  if (!schedule || !schedule.blocks.length) return 'Aaj ka timetable — kuch schedulable nahi.'
  const lines = schedule.blocks.map(
    (b) =>
      `${fmtClock(b.startMin)}–${fmtClock(b.endMin)} · ${b.task.title}${b.task.subject ? ` (${b.task.subject})` : ''} (~${b.minutes}m)`,
  )
  const over = schedule.overflow.length ? `\nKal ke liye: ${schedule.overflow.length} pending (${schedule.overflow[0].title}${schedule.overflow.length > 1 ? '…' : ''})` : ''
  return `🕐 Aaj ka timetable (Deadline Radar)\n${lines.join('\n')}${over}\n\nvia Deadline Radar + Wispr Flow`
}

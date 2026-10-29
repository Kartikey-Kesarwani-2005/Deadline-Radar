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

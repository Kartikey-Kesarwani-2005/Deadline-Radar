/**
 * 🎯 Risk Score — one honest 0–100 number per pending card.
 * The radar already KNOWS each deadline's danger level (days left, marks,
 * learned pace, the user's own lateness history) — until now that knowledge
 * was scattered across chips and rail widgets. This folds it into a single
 * dial: glance at a card, see how badly it can bite.
 *
 * Pure function of the user's own data — no network, no accounts. The `today`
 * option is injectable so the tests stay deterministic.
 */

import { dayDiff, todayKey } from './dates.js'
import { fmtHours, estimateEffort } from './brain.js'

/** The same plausible focused-hours-per-day the start-window engine uses. */
const HOURS_PER_DAY = 3

/**
 * @param {object} task
 * @param {object} opts - { pace, brain, today } — pace is the learned
 *   minutes-per-mark model, brain the computeBrain() result. Both optional.
 * @returns {{ score:number, level:'critical'|'high'|'watch'|'calm', reasons:string[] } | null}
 *   null for done / undated / unreadable dates — no fake urgency.
 */
export function riskScore(task, { pace = {}, brain = null, today = todayKey() } = {}) {
  if (!task || task.done || !task.dueDate) return null
  // Defensive: ensure task has priority field (normalizeTask sets default but old data may lack it)
  const priority = task.priority === 'high' ? 'high' : 'normal'
  const diff = dayDiff(today, task.dueDate)
  if (diff === null) return null

  const reasons = []
  let score = 0

  // 1. Deadline proximity — the backbone of the score. Late always outranks
  //    "due today"; a far-away deadline still earns a floor, never zero.
  if (diff < 0) {
    score = 95 + Math.min(5, -diff * 2)
    reasons.push(`${-diff}d late`)
  } else if (diff === 0) {
    score = 90
    reasons.push('due TODAY')
  } else if (diff === 1) {
    score = 76
    reasons.push('due tomorrow')
  } else if (diff <= 3) {
    score = 62
    reasons.push(`${diff}d left`)
  } else if (diff <= 7) {
    score = 45
    reasons.push(`${diff}d left`)
  } else {
    score = 22
    reasons.push(`${diff}d left`)
  }

  // 2. Will the work even fit? Learned pace vs the hours actually left.
  const { minutes, learned } = estimateEffort(task, pace)
  const availableHours = Math.max(diff, 0) * HOURS_PER_DAY + (diff <= 0 ? 2 : 0)
  const minutesTag = `${learned ? '~from your pace: ' : '~'}${fmtHours(minutes)} needed`
  if (minutes / 60 > availableHours) {
    score += 8
    reasons.push(`${minutesTag} — tight`)
  } else if ((minutes / 60) > availableHours * 0.6) {
    score += 4
    reasons.push(minutesTag)
  }

  // 3. Marks at stake — a 25-mark submission outranks a 5-mark form fill.
  const marks = task.marks
  if (marks >= 25) {
    score += 6
    reasons.push(`${marks} marks — big one`)
  } else if (marks >= 15) {
    score += 4
    reasons.push(`${marks} marks`)
  } else if (marks === null || !Number.isFinite(marks) || marks >= 8) {
    score += 2
    if (marks === null || !Number.isFinite(marks)) reasons.push('marks unknown')
  }

  // 4. The user's own lateness rhythm — if this subject is usually late,
  //    the card says so before the deadline does.
  const stats = task.subject
    ? brain?.subject?.(task.subject)
    : (brain?.overall ?? null)
  if (stats && stats.n >= 2) {
    if (stats.avgBuffer <= -1) {
      score += 5
      reasons.push(`usually ${Math.round(Math.abs(stats.avgBuffer))}d late in ${task.subject || 'your work'}`)
    } else if (stats.avgBuffer <= -0.5) {
      score += 3
      reasons.push(`usually a bit late in ${task.subject || 'your work'}`)
    }
  }

  // 5. The stamp itself — high priority is the user telling us it matters.
  if (priority === 'high') {
    score += 4
    reasons.push('high priority')
  }

  const final = Math.round(Math.max(4, Math.min(100, score)))
  const level = final >= 80 ? 'critical' : final >= 60 ? 'high' : final >= 35 ? 'watch' : 'calm'
  return { score: final, level, reasons }
}

/** Tailwind tone classes for the dial, shared between card and rail uses. */
export function riskTone(level) {
  if (level === 'critical') return 'text-late'
  if (level === 'high') return 'text-today'
  if (level === 'watch') return 'text-week'
  return 'text-later'
}

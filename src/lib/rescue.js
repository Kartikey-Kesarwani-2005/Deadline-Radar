/**
 * 🚨 Deadline Rescue Mode — one short study window, spent where it hurts least.
 *
 * The radar already knows the honest inputs: due dates, marks, the learned
 * minutes-per-mark pace, and which work is late. This module turns those same
 * inputs into a finite rescue plan: pick 30, 60 or 120 minutes, get the ranked
 * tasks that actually fit, the reason each one is first, and an honest
 * overflow list when the window cannot cover the backlog.
 *
 * The scoring intentionally mirrors the existing do-now / timetable engines:
 * late work is multiplied, work due within two days is ranked by marks-per-hour,
 * and later work is discounted per day left. Pure + clock injectable.
 */

import { dayDiff, todayKey } from './dates.js'
import { estimateEffort, fmtHours, paceModel } from './brain.js'

/** The three rescue windows offered to the student. */
export const RESCUE_LEVELS = [
  { minutes: 30, label: '30 min', hint: 'one sprint' },
  { minutes: 60, label: '1 hour', hint: 'two rounds' },
  { minutes: 120, label: '2 hours', hint: 'full block' },
]

export const RESCUE_MINUTES = RESCUE_LEVELS.map((level) => level.minutes)

/** A rescue slice below this is not worth carving out of a task. */
const MIN_SLICE = 10

/** Same assumption the risk/start-window engines use for "latest start" math. */
const FOCUSED_HOURS_PER_DAY = 3

/** Explain the ranking in one line, shown under the plan. */
export const RESCUE_POLICY =
  'Order: late work jumps the queue (×4); due within 2 days ranks by marks-per-hour; later work is discounted by each day left.'

const TIER_BY_DAYS = (daysLeft) => {
  if (daysLeft < 0) return { key: 'late', label: 'Late', tone: 'late' }
  if (daysLeft === 0) return { key: 'today', label: 'Today', tone: 'today' }
  if (daysLeft === 1) return { key: 'tomorrow', label: 'Tomorrow', tone: 'today' }
  if (daysLeft <= 3) return { key: 'soon', label: `${daysLeft}d left`, tone: 'week' }
  if (daysLeft <= 7) return { key: 'week', label: `${daysLeft}d left`, tone: 'week' }
  return { key: 'later', label: `${daysLeft}d left`, tone: 'later' }
}

/** Human explanation for why this task earned its place in the queue. */
function rescueReasons(item) {
  const { task, daysLeft, minutes, learned, marks, roi } = item
  const reasons = []

  if (daysLeft < 0) reasons.push(`${-daysLeft}d late — rescue first`)
  else if (daysLeft === 0) reasons.push('due today')
  else if (daysLeft === 1) reasons.push('due tomorrow')
  else if (daysLeft <= 3) reasons.push(`only ${daysLeft}d left`)
  else if (daysLeft <= 7) reasons.push(`due in ${daysLeft}d`)
  else reasons.push(`${daysLeft}d of runway`)

  reasons.push(`~${fmtHours(minutes)} estimated${learned ? ' from your pace' : ''}`)

  if (marks >= 15) reasons.push(`${marks} marks at stake`)
  else if (marks >= 8) reasons.push(`${marks} marks`)
  if (task.priority === 'high') reasons.push('high priority')

  const fitsDays = Math.ceil(minutes / 60 / FOCUSED_HOURS_PER_DAY)
  if (daysLeft >= 0 && daysLeft <= fitsDays) reasons.push('latest start window')
  if (roi >= 8) reasons.push(`${Math.round(roi)} marks/hr`)

  return reasons
}

/**
 * Ranks every pending, dated task for rescue. Kept separate from the allocation
 * step so the ordering is easy to test and reuse.
 *
 * @param {object[]} tasks
 * @param {{ today?: string, pace?: object }} opts
 * @returns {Array<object>} ranked rescue candidates
 */
export function rankRescue(tasks = [], { today = todayKey(), pace = paceModel(tasks) } = {}) {
  return tasks
    .filter((task) => task && !task.done && task.dueDate)
    .map((task) => {
      const daysLeft = dayDiff(today, task.dueDate)
      if (daysLeft === null) return null

      const { minutes, learned } = estimateEffort(task, pace)
      const marks = Number.isFinite(task.marks) ? task.marks : 10
      const hours = minutes / 60
      const roi = marks / hours
      // Identical urgency weighting to daySchedule/doNow: late ×4, imminent
      // work by marks-per-hour, later work discounted by distance.
      const score = daysLeft < 0 ? roi * 4 : daysLeft < 2 ? roi : roi / (1 + daysLeft)
      const tier = TIER_BY_DAYS(daysLeft)

      return {
        task,
        minutes,
        learned,
        daysLeft,
        marks,
        roi,
        score,
        tier,
        reasons: [],
      }
    })
    .filter(Boolean)
    .map((item) => ({ ...item, reasons: rescueReasons(item) }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.daysLeft - b.daysLeft ||
        b.marks - a.marks ||
        String(a.task.title).localeCompare(String(b.task.title)),
    )
}

/**
 * Builds a finite rescue plan for one study window.
 *
 * @param {object[]} tasks - the full task list
 * @param {number} budgetMin - 30, 60 or 120; invalid input falls back to 60
 * @param {string} today - injectable date key for tests
 * @returns {{
 *   budget:number, used:number, remaining:number, items:Array<object>,
 *   pendingCount:number, requiredMinutes:number, urgentMinutes:number,
 *   deferredCount:number, deferred:Array<object>, partialCount:number,
 *   overloaded:boolean, urgentOverloaded:boolean
 * } | null} null when no pending dated work exists
 */
export function buildRescuePlan(tasks = [], budgetMin = 60, today = todayKey()) {
  const ranked = rankRescue(tasks, { today })
  if (!ranked.length) return null

  const budget = RESCUE_MINUTES.includes(Number(budgetMin)) ? Number(budgetMin) : 60
  const requiredMinutes = ranked.reduce((sum, item) => sum + item.minutes, 0)
  // "Must-do" work: late, due today, or due tomorrow. This is the part that
  // cannot politely roll into next week, so it drives the strongest warning.
  const urgentMinutes = ranked
    .filter((item) => item.daysLeft <= 1)
    .reduce((sum, item) => sum + item.minutes, 0)

  const items = []
  let cursor = 0
  for (const item of ranked) {
    const left = budget - cursor
    if (left < MIN_SLICE) break

    const allocated = Math.min(item.minutes, left)
    if (allocated < MIN_SLICE) break

    const partial = allocated < item.minutes
    items.push({
      ...item,
      allocated,
      partial,
      startMin: cursor,
      endMin: cursor + allocated,
    })
    cursor += allocated
    if (partial) break // the window is spent; no point slicing the next task
  }

  const includedIds = new Set(items.map((item) => item.task.id))
  const deferred = ranked.filter((item) => !includedIds.has(item.task.id))
  const partialCount = items.filter((item) => item.partial).length
  const used = items.reduce((sum, item) => sum + item.allocated, 0)

  return {
    budget,
    used,
    remaining: budget - used,
    items,
    pendingCount: ranked.length,
    requiredMinutes,
    urgentMinutes,
    deferredCount: deferred.length + partialCount,
    deferred,
    partialCount,
    overloaded: requiredMinutes > used,
    urgentOverloaded: urgentMinutes > budget,
  }
}

/** Compact due-date label for the rescue rows ("3d late", "due today"). */
export function rescueDueLabel(item, today = todayKey()) {
  if (!item || !item.task?.dueDate) return ''
  const daysLeft = dayDiff(today, item.task.dueDate)
  if (daysLeft === null) return ''
  if (daysLeft < 0) return `${-daysLeft}d late`
  if (daysLeft === 0) return 'due today'
  if (daysLeft === 1) return 'due tomorrow'
  return `${daysLeft}d left`
}

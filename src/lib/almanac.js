/**
 * 🗓️ Radar Almanac — the month view's pure data layer.
 *
 * A list answers "what next"; a calendar answers "which week is about to hurt".
 * Everything here is date-key based (the app's single date language), Monday
 * first (India's planner convention), and injectable-clock so tests stay
 * deterministic. No React, no DOM.
 */

import { parseDateKey, toDateKey, todayKey } from './dates.js'

export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Month cursor helpers — a plain { year, month } object (month is 0-based). */
export function monthOf(date = new Date()) {
  return { year: date.getFullYear(), month: date.getMonth() }
}

export function shiftMonth(year, month, delta) {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

export function monthLabel(year, month, style = 'long') {
  return new Date(year, month, 1).toLocaleDateString('en-IN', {
    month: style,
    year: 'numeric',
  })
}

/**
 * Builds the full month grid: complete weeks (Mon → Sun), including the
 * trailing/leading days of the neighbouring months that share those weeks.
 *
 * Each cell carries only aggregates — the actual tasks are fetched by date in
 * `dayItems`, so the grid stays cheap even with hundreds of deadlines.
 */
export function almanacGrid(year, month, tasks = [], today = todayKey()) {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // getDay(): 0 = Sunday. Convert to a Monday-first offset.
  const offset = (first.getDay() + 6) % 7
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7

  const byDay = new Map()
  for (const t of tasks) {
    if (!t?.dueDate || !parseDateKey(t.dueDate)) continue
    const bucket = byDay.get(t.dueDate) || {
      pending: 0,
      done: 0,
      marks: 0,
      subjects: new Set(),
    }
    if (t.done) {
      bucket.done += 1
    } else {
      bucket.pending += 1
      bucket.marks += Number(t.marks) || 0
      if (t.subject) bucket.subjects.add(String(t.subject).trim())
    }
    byDay.set(t.dueDate, bucket)
  }

  const cells = []
  for (let i = 0; i < cellCount; i++) {
    const d = new Date(year, month, i - offset + 1)
    const key = toDateKey(d)
    const hit = byDay.get(key)
    cells.push({
      key,
      day: d.getDate(),
      inMonth: d.getMonth() === month && d.getFullYear() === year,
      isToday: key === today,
      isPast: key < today,
      pending: hit?.pending || 0,
      done: hit?.done || 0,
      marks: hit?.marks || 0,
      // A past day that still has undone work is the honest "you missed this".
      late: Boolean(hit?.pending) && key < today,
      subjects: hit ? [...hit.subjects].slice(0, 4) : [],
    })
  }

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const totals = cells
    .filter((c) => c.inMonth)
    .reduce(
      (acc, c) => ({
        pending: acc.pending + c.pending,
        done: acc.done + c.done,
        marks: acc.marks + c.marks,
      }),
      { pending: 0, done: 0, marks: 0 },
    )

  return {
    year,
    month,
    label: monthLabel(year, month),
    weeks,
    totals,
    hasToday: cells.some((c) => c.isToday),
  }
}

/** Everything due on one date, split into still-pending and done. */
export function dayItems(tasks = [], key) {
  if (!key) return { pending: [], done: [] }
  const onDay = tasks.filter((t) => t?.dueDate === key)
  return {
    pending: onDay.filter((t) => !t.done),
    done: onDay.filter((t) => t.done),
  }
}

/** Pending tasks with no date — the almanac can't place them, so it names them. */
export function undatedPending(tasks = []) {
  return tasks.filter((t) => !t.done && !t.dueDate)
}

/**
 * The best day to open when the almanac loads: today when it is in view,
 * otherwise the first day of the month that carries pending work, otherwise
 * the 1st. Never forces a filter the user did not ask for.
 */
export function defaultDay(grid, tasks = []) {
  if (!grid?.weeks?.length) return null
  const cells = grid.weeks.flat()
  const today = cells.find((c) => c.isToday)
  if (today) return today.key
  const firstBusy = cells.find((c) => c.inMonth && c.pending > 0)
  if (firstBusy) return firstBusy.key
  return cells.find((c) => c.inMonth)?.key || null
}

/**
 * A short, honest month summary line for the almanac header:
 * "5 due · 60 marks · 3 finished". Empty months say so instead of printing 0s.
 */
export function monthSummary(totals) {
  if (!totals) return { line: 'Nothing in this month', parts: [] }
  const parts = []
  if (totals.pending) parts.push(`${totals.pending} due`)
  if (totals.marks) parts.push(`${totals.marks} marks`)
  if (totals.done) parts.push(`${totals.done} finished`)
  return {
    parts,
    line: parts.length ? parts.join(' · ') : 'Nothing in this month',
  }
}

/** Parse a date key safely into a month cursor (falls back to today). */
export function monthCursorOf(key) {
  const d = parseDateKey(key)
  return monthOf(d || new Date())
}

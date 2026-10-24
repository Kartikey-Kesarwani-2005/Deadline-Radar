import { addDays, todayKey } from './dates.js'

/** The order choices shown in the rail and in the ⌘K palette. */
export const SORT_MODES = [
  { value: 'smart', label: 'Smart · urgency' },
  { value: 'due', label: 'Due soonest' },
  { value: 'marks', label: 'Marks · high' },
  { value: 'newest', label: 'Newest first' },
  { value: 'title', label: 'A → Z' },
]

export const SORT_VALUES = new Set(SORT_MODES.map((m) => m.value))

/**
 * Smart order: high-priority first, then nearest deadline (undated last),
 * then higher marks, then newest. Kept pure so the palette, tests and the
 * sections all agree on one definition of "most urgent".
 */
export function smartSort(a, b) {
  if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
  if (a.dueDate && !b.dueDate) return -1
  if (!a.dueDate && b.dueDate) return 1
  const marksDiff = (b.marks || 0) - (a.marks || 0)
  if (marksDiff) return marksDiff
  return (b.createdAt || 0) - (a.createdAt || 0)
}

const UNDATED = '9999-12-31'

/** Sorts a copy of the list — never mutates the caller's array. */
export function sortTasks(list, mode = 'smart') {
  const arr = [...list]
  switch (mode) {
    case 'due':
      return arr.sort(
        (a, b) =>
          (a.dueDate || UNDATED).localeCompare(b.dueDate || UNDATED) ||
          (b.marks || 0) - (a.marks || 0) ||
          smartSort(a, b),
      )
    case 'marks':
      return arr.sort(
        (a, b) =>
          (b.marks || 0) - (a.marks || 0) ||
          (a.dueDate || UNDATED).localeCompare(b.dueDate || UNDATED) ||
          smartSort(a, b),
      )
    case 'newest':
      return arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0) || smartSort(a, b))
    case 'title':
      return arr.sort(
        (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) || smartSort(a, b),
      )
    default:
      return arr.sort(smartSort)
  }
}

/**
 * Moves a deadline forward without touching anything else. An undated task
 * gets tomorrow (the most common "I'll deal with it then" choice); anything
 * else shifts by `days` using the calendar-safe addDays helper.
 */
export function postponeDate(dueDate, days = 1, today = todayKey()) {
  return addDays(dueDate || today, days)
}

const MS_DAY = 24 * 60 * 60 * 1000

export function toDateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey() {
  return toDateKey(new Date())
}

export function parseDateKey(key) {
  if (!key) return null
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function addDays(key, n) {
  const d = parseDateKey(key) || new Date()
  d.setDate(d.getDate() + n)
  return toDateKey(d)
}

/** Signed days from `from` to `to` (0 = same day, -2 = two days late). */
export function dayDiff(from, to) {
  const a = parseDateKey(from)
  const b = parseDateKey(to)
  if (!a || !b) return null
  return Math.round((b - a) / MS_DAY)
}

export function formatDue(key) {
  if (!key) return 'No date'
  const diff = dayDiff(todayKey(), key)
  if (diff === null) return 'No date'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return '1 day late'
  if (diff < 0) return `${-diff} days late`
  const d = parseDateKey(key)
  const label = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  return `in ${diff} days · ${label}`
}

export function formatLongToday() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/**
 * Tailwind classes for a due-date pill based on urgency.
 */
export function dueTone(task) {
  if (task.done) return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
  const diff = dayDiff(todayKey(), task.dueDate)
  if (task.dueDate === null) return 'border-slate-500/30 bg-slate-500/10 text-slate-400'
  if (diff < 0) return 'border-red-500/40 bg-red-500/15 text-red-300'
  if (diff === 0) return 'border-amber-400/40 bg-amber-400/15 text-amber-300'
  if (diff <= 3) return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200'
  return 'border-sky-500/30 bg-sky-500/10 text-sky-300'
}

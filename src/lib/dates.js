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

const MS_MIN = 60 * 1000
const MS_HOUR = 60 * MS_MIN

/**
 * Live countdown to a deadline's end-of-day (23:59:59). Returns null when the
 * task has no/invalid date. `now` is injectable so the ticking clock and the
 * tests stay deterministic. Includes both a compact `label` (for task cards)
 * and raw parts (for the seconds-precision rail).
 */
export function countdownTo(dueDate, now = Date.now()) {
  if (!dueDate) return null
  const end = parseDateKey(dueDate)
  if (!end) return null
  end.setHours(23, 59, 59, 999)
  const ms = end.getTime() - now
  const late = ms < 0
  const abs = Math.abs(ms)
  const d = Math.floor(abs / 864e5)
  const h = Math.floor((abs % 864e5) / MS_HOUR)
  const m = Math.floor((abs % MS_HOUR) / MS_MIN)
  const s = Math.floor((abs % MS_MIN) / 1000)
  let core
  if (d > 0) core = `${d}d ${h}h`
  else if (h > 0) core = `${h}h ${m}m`
  else core = `${Math.max(m, late ? 0 : 1)}m`
  return { ms, late, label: late ? `${core} over` : core, d, h, m, s }
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
  // `!task.dueDate` (not `=== null`) so an undefined dueDate can never slip
  // into the `diff <= 3` branch below and show as falsely urgent.
  if (!task.dueDate) return 'border-slate-500/30 bg-slate-500/10 text-slate-400'
  const diff = dayDiff(todayKey(), task.dueDate)
  if (diff < 0) return 'border-red-500/40 bg-red-500/15 text-red-300'
  if (diff === 0) return 'border-amber-400/40 bg-amber-400/15 text-amber-300'
  if (diff <= 3) return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-200'
  return 'border-sky-500/30 bg-sky-500/10 text-sky-300'
}

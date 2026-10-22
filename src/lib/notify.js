import { dayDiff, todayKey } from './dates'
import { startAlerts } from './brain'

const NOTIFIED_ON_KEY = 'deadline-radar.notifiedOn'

export function getPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  return Notification.permission
}

export async function requestPermission() {
  if (typeof Notification === 'undefined') return 'unsupported'
  const result = await Notification.requestPermission()
  return result
}

function fire(title, body) {
  try {
    new Notification(title, { body, tag: 'deadline-radar' })
    return true
  } catch {
    return false
  }
}

/**
 * At most once per day: if anything is late or due today, show a browser
 * notification summarising it. Called on every app load / task change.
 */
export function notifyDaily(tasks) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false

  const today = todayKey()
  try {
    if (localStorage.getItem(NOTIFIED_ON_KEY) === today) return false
  } catch {
    /* storage blocked — still notify */
  }

  const late = tasks.filter((t) => !t.done && t.dueDate && dayDiff(today, t.dueDate) < 0)
  const dueToday = tasks.filter((t) => !t.done && t.dueDate && dayDiff(today, t.dueDate) === 0)
  const startSoon = startAlerts(tasks, today)
  if (!late.length && !dueToday.length && !startSoon.length) return false

  const parts = []
  if (late.length) parts.push(`${late.length} late`)
  if (dueToday.length) parts.push(`${dueToday.length} due today`)
  if (startSoon.length) parts.push(`${startSoon.length} start window closing`)
  const first = (late[0] || dueToday[0] || startSoon[0]?.task)?.title || 'a deadline'
  const bodyLead = late.length || dueToday.length ? '' : 'Start window closing: '
  const total = late.length + dueToday.length + startSoon.length

  const ok = fire(
    `📡 Deadline Radar — ${parts.join(' · ')}`,
    bodyLead + first + (total > 1 ? ` (+${total - 1} more)` : ''),
  )
  if (ok) {
    try {
      localStorage.setItem(NOTIFIED_ON_KEY, today)
    } catch {
      /* ignore */
    }
  }
  return ok
}

/** Immediate confirmation notification (used when enabling reminders). */
export function notifyTest(lateCount, todayCount) {
  return fire(
    '📡 Reminders are on',
    `Deadline Radar will alert you once a day when something is late (${lateCount}) or due today (${todayCount}).`,
  )
}

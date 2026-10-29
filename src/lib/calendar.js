/**
 * 📅 Calendar export — a standard .ics file of every pending, dated deadline,
 * so radar dates can travel to any phone calendar (Google / Apple / Outlook).
 * Plain text, no dependencies, nothing leaves the device.
 */

import { parseDateKey } from './dates.js'

function esc(text) {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

function vEvent(t, stamp) {
  const lines = [
    'BEGIN:VEVENT',
    `UID:${t.id}@deadline-radar`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${t.dueDate.replace(/-/g, '')}`,
    `SUMMARY:${esc(t.title)}`,
  ]
  // 🔁 Weekly tasks travel as a real RRULE, so the phone calendar keeps
  // repeating them too instead of a single stale occurrence.
  if (t.repeat === 'weekly') {
    const [y, m, d] = t.dueDate.split('-').map(Number)
    const byDay = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][new Date(y, m - 1, d).getDay()]
    lines.push(`RRULE:FREQ=WEEKLY;BYDAY=${byDay}`)
  }
  const detail = [t.subject, t.marks ? `${t.marks} marks` : null].filter(Boolean).join(' · ')
  if (detail) lines.push(`DESCRIPTION:${esc(detail)}`)
  if (t.link) lines.push(`URL:${t.link}`)
  // All-day event + a day-before reminder, matching how students actually work.
  lines.push('BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Deadline tomorrow', 'END:VALARM')
  lines.push('END:VEVENT')
  return lines
}

/** Builds a complete .ics document for all pending dated tasks. */
export function buildICS(tasks, now = new Date()) {
  const stamp = `${now.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`
  const events = tasks.filter((t) => !t.done && t.dueDate).flatMap((t) => vEvent(t, stamp))
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Deadline Radar//No Hands Challenge//EN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n')
}

/** Triggers a deadline-radar.ics download in the browser. */
export function downloadICS(tasks) {
  const blob = new Blob([buildICS(tasks)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'deadline-radar.ics'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/**
 * 📅 One-tap "Add to Google Calendar" link for a single task — a template
 * event prefilled with title, marks, portal link and the deadline as an
 * all-day event, so the phone calendar gets it without downloading anything.
 * Returns null when the task has no usable date (nothing to schedule).
 */
export function googleCalendarUrl(task) {
  if (!task?.dueDate) return null
  const due = parseDateKey(task.dueDate)
  if (!due) return null
  // All-day events run [start, end) — the exclusive end must be the next day.
  const end = new Date(due)
  end.setDate(due.getDate() + 1)
  const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
  const details = [
    task.subject,
    task.marks ? `${task.marks} marks` : null,
    'via Deadline Radar',
  ]
    .filter(Boolean)
    .join('\n')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${task.title}`,
    dates: `${task.dueDate.replace(/-/g, '')}/${endKey.replace(/-/g, '')}`,
    details,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

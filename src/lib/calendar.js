/**
 * 📅 Calendar export — a standard .ics file of every pending, dated deadline,
 * so radar dates can travel to any phone calendar (Google / Apple / Outlook).
 * Plain text, no dependencies, nothing leaves the device.
 */

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
  const detail = [t.subject, t.marks ? `${t.marks} marks` : null].filter(Boolean).join(' · ')
  if (detail) lines.push(`DESCRIPTION:${esc(detail)}`)
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

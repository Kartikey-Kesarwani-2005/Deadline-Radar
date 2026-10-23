const TASKS_KEY = 'deadline-radar.tasks.v1'
const SETTINGS_KEY = 'deadline-radar.settings.v1'

/**
 * A UUID that works everywhere — `crypto.randomUUID` only exists on secure
 * origins (https/localhost), so judges opening the app over plain http on a
 * LAN (a very common hackathon move) would otherwise have every capture fail.
 */
export function uid() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  } catch {
    /* fall through to the manual generator */
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export const defaultSettings = {
  aiEnabled: false,
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  clipDetect: true,
}

export function loadTasks() {
  try {
    const raw = JSON.parse(localStorage.getItem(TASKS_KEY))
    if (!Array.isArray(raw)) return []
    // Sanitize on load: a poisoned/legacy entry (null, missing title, wrong
    // types) must never reach render — previously `[null]` in storage crashed
    // the app into an unrecoverable ErrorBoundary loop. This also guarantees
    // every task has a stable id (so toggle/update can't hit many at once).
    return raw
      .filter((t) => t && typeof t === 'object' && typeof t.title === 'string' && t.title.trim())
      .map((t) => ({
        ...t,
        id: typeof t.id === 'string' && t.id ? t.id : uid(),
        title: String(t.title).slice(0, 300),
        subject: typeof t.subject === 'string' && t.subject ? t.subject.slice(0, 80) : null,
        dueDate:
          typeof t.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) ? t.dueDate : null,
        done: Boolean(t.done),
        priority: t.priority === 'high' ? 'high' : 'normal',
      }))
  } catch {
    return []
  }
}

export function saveTasks(tasks) {
  try {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
  } catch {
    /* storage full or blocked — app still works for this session */
  }
}

export function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY))
    return { ...defaultSettings, ...(raw || {}) }
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* ignore */
  }
}

/** Downloads all tasks as a JSON file (backup before clearing browser data). */
export function exportTasks(tasks) {
  const payload = {
    app: 'deadline-radar',
    version: 1,
    exportedAt: new Date().toISOString(),
    tasks,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `deadline-radar-backup-${date}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Parses a backup file (our export format or a bare task array).
 * Throws with a friendly message on anything that is not a valid backup.
 */
export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('that file is not valid JSON')
  }
  const list = Array.isArray(data) ? data : data?.tasks
  if (!Array.isArray(list)) throw new Error('that file is not a Deadline Radar backup')
  const cleaned = list
    .filter((t) => t && typeof t === 'object' && typeof t.title === 'string' && t.title.trim())
    .map((t) => ({
      id: typeof t.id === 'string' && t.id ? t.id : uid(),
      title: String(t.title).slice(0, 300),
      subject: typeof t.subject === 'string' && t.subject ? t.subject.slice(0, 80) : null,
      dueDate:
        typeof t.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate) ? t.dueDate : null,
      marks: Number.isFinite(t.marks) && t.marks > 0 ? t.marks : null,
      priority: t.priority === 'high' ? 'high' : 'normal',
      repeat: t.repeat === 'weekly' ? 'weekly' : null,
      done: Boolean(t.done),
      completedAt: Number.isFinite(t.completedAt) ? t.completedAt : null,
      // Focus-timer minutes — without this the pace model reset on every restore.
      effortMin: Number.isFinite(t.effortMin) && t.effortMin > 0 ? t.effortMin : null,
      createdAt: Number.isFinite(t.createdAt) ? t.createdAt : Date.now(),
      // Links the auto-rolled copy back to the task it came from (undo chain).
      rolledFrom: typeof t.rolledFrom === 'string' ? t.rolledFrom : null,
      source: typeof t.source === 'string' ? t.source.slice(0, 600) : '',
      link:
        typeof t.link === 'string' && /^https?:\/\//i.test(t.link) ? t.link.slice(0, 500) : null,
    }))
  if (!cleaned.length) throw new Error('no tasks found inside that file')
  return cleaned
}

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

// Format AND validity: "2026-02-31" matches the pattern but isn't a real date
// (it would render nowhere / read "Invalid Date"). Round-trip the Date.
function isValidDateKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
}

export const defaultSettings = {
  aiEnabled: false,
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  clipDetect: true,
  sortBy: 'smart',
  displayMode: 'auto',
  // Which reading room the radar opens in: the urgency list or the month almanac.
  view: 'list',
}

/**
 * The single gate every task passes through before it can be rendered —
 * localStorage load, JSON import, or a hand-edited backup. Normalising in one
 * place means a poisoned entry cannot smuggle a `javascript:` link, a NaN
 * timestamp or a malformed date past one path but not the other.
 * Returns null for anything that is not a usable task.
 */
export function normalizeTask(t) {
  if (!t || typeof t !== 'object' || typeof t.title !== 'string' || !t.title.trim()) return null
  // Numbers may arrive as strings from a hand-edited backup or an AI response.
  const num = (v) => {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  const marks = num(t.marks)
  const completedAt = num(t.completedAt)
  const effortMin = num(t.effortMin)
  const createdAt = num(t.createdAt)
  return {
    id: typeof t.id === 'string' && t.id ? t.id : uid(),
    title: String(t.title).trim().slice(0, 300),
    subject: typeof t.subject === 'string' && t.subject.trim() ? t.subject.trim().slice(0, 80) : null,
    dueDate: isValidDateKey(t.dueDate) ? t.dueDate : null,
    marks: marks != null && marks > 0 ? marks : null,
    priority: t.priority === 'high' ? 'high' : 'normal',
    repeat: t.repeat === 'weekly' ? 'weekly' : null,
    done: Boolean(t.done),
    completedAt: completedAt != null && completedAt > 0 ? completedAt : null,
    // Focus-timer minutes — without this the pace model reset on every restore.
    effortMin: effortMin != null && effortMin > 0 ? effortMin : null,
    createdAt: createdAt != null && createdAt > 0 ? createdAt : Date.now(),
    // Links the auto-rolled copy back to the task it came from (undo chain).
    rolledFrom: typeof t.rolledFrom === 'string' ? t.rolledFrom : null,
    source: typeof t.source === 'string' ? t.source.slice(0, 600) : '',
    // Only real http(s) URLs — `javascript:` / `data:` must never reach an <a href>.
    link: typeof t.link === 'string' && /^https?:\/\//i.test(t.link) ? t.link.slice(0, 500) : null,
  }
}

/**
 * Duplicate ids make toggle/update hit several tasks at once (a poisoned
 * backup can contain the same id twice). Re-key the later copies instead of
 * dropping real work.
 */
function uniqueIds(list) {
  const seen = new Set()
  for (const t of list) {
    if (seen.has(t.id)) t.id = uid()
    seen.add(t.id)
  }
  return list
}

export function loadTasks() {
  try {
    const raw = JSON.parse(localStorage.getItem(TASKS_KEY))
    if (!Array.isArray(raw)) return []
    // Sanitize on load: a poisoned/legacy entry (null, missing title, wrong
    // types) must never reach render — previously `[null]` in storage crashed
    // the app into an unrecoverable ErrorBoundary loop.
    return uniqueIds(raw.map(normalizeTask).filter(Boolean))
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
    const src = raw && typeof raw === 'object' ? raw : {}
    // Same rule as tasks: only known-good shapes reach the app. A hand-edited
    // `sortBy: {}` or `displayMode: 123` used to leak into render/API calls.
    return {
      ...defaultSettings,
      aiEnabled: Boolean(src.aiEnabled),
      apiKey: typeof src.apiKey === 'string' ? src.apiKey : '',
      baseUrl:
        typeof src.baseUrl === 'string' && src.baseUrl.trim()
          ? src.baseUrl.trim()
          : defaultSettings.baseUrl,
      model:
        typeof src.model === 'string' && src.model.trim()
          ? src.model.trim()
          : defaultSettings.model,
      clipDetect: src.clipDetect !== false,
      sortBy: ['smart', 'due', 'marks', 'newest', 'title'].includes(src.sortBy)
        ? src.sortBy
        : 'smart',
      displayMode: ['auto', 'desktop', 'phone'].includes(src.displayMode)
        ? src.displayMode
        : 'auto',
      view: ['list', 'calendar'].includes(src.view) ? src.view : 'list',
    }
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
  const cleaned = list.map(normalizeTask).filter(Boolean)
  if (!cleaned.length) throw new Error('no tasks found inside that file')
  return uniqueIds(cleaned)
}

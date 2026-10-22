const TASKS_KEY = 'deadline-radar.tasks.v1'
const SETTINGS_KEY = 'deadline-radar.settings.v1'

export const defaultSettings = {
  aiEnabled: false,
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
}

export function loadTasks() {
  try {
    const raw = JSON.parse(localStorage.getItem(TASKS_KEY))
    return Array.isArray(raw) ? raw : []
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

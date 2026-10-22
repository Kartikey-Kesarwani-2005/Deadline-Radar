import { useEffect, useMemo, useRef, useState } from 'react'
import { extractTask } from './lib/extract'
import { addDays, dayDiff, formatDue, formatLongToday, toDateKey, todayKey } from './lib/dates'
import {
  exportTasks,
  loadSettings,
  loadTasks,
  parseBackup,
  saveSettings,
  saveTasks,
} from './lib/store'
import { getPermission, notifyDaily, notifyTest, requestPermission } from './lib/notify'
import { extractFromImage, fileToDataUrl } from './lib/vision'
import AddBar from './components/AddBar'
import StatsBar from './components/StatsBar'
import TaskCard from './components/TaskCard'
import SettingsModal from './components/SettingsModal'
import WeeklyReport from './components/WeeklyReport'
import TaskEditModal from './components/TaskEditModal'

const SECTION_TONES = {
  red: 'bg-red-500',
  amber: 'bg-amber-400',
  yellow: 'bg-yellow-400',
  sky: 'bg-sky-400',
  slate: 'bg-slate-500',
  green: 'bg-emerald-400',
}

function chipCls(active) {
  return `rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
    active
      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
      : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-slate-200'
  }`
}

const SECTION_DEFS = [
  { key: 'late', title: 'Late — handle now', tone: 'red' },
  { key: 'today', title: 'Due today', tone: 'amber' },
  { key: 'week', title: 'This week', tone: 'yellow' },
  { key: 'later', title: 'Later', tone: 'sky' },
  {
    key: 'noDate',
    title: 'No date yet — pick one',
    tone: 'slate',
    hint: 'use the date box on the card',
  },
  { key: 'done', title: 'Done', tone: 'green' },
]

/** Priority first, then nearest deadline, then higher marks, then newest. */
function byUrgency(a, b) {
  if (a.priority !== b.priority) return a.priority === 'high' ? -1 : 1
  if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1
  if (a.dueDate && !b.dueDate) return -1
  if (!a.dueDate && b.dueDate) return 1
  const marksDiff = (b.marks || 0) - (a.marks || 0)
  if (marksDiff) return marksDiff
  return b.createdAt - a.createdAt
}

function Section({ title, tone, hint, tasks, onToggle, onDelete, onEdit, onDateChange }) {
  if (!tasks.length) return null
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
        <span className={`h-2 w-2 rounded-full ${SECTION_TONES[tone]}`} />
        {title}
        <span className="font-medium text-slate-600">· {tasks.length}</span>
        {hint && <span className="ml-auto font-normal normal-case tracking-normal text-slate-600">{hint}</span>}
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggle={() => onToggle(task.id)}
            onDelete={() => onDelete(task.id)}
            onEdit={() => onEdit(task.id)}
            onDateChange={(date) => onDateChange(task.id, date)}
          />
        ))}
      </div>
    </section>
  )
}

function buildSampleTasks() {
  const now = Date.now()
  const today = todayKey()
  return [
    {
      id: crypto.randomUUID(),
      title: 'DBMS normalization assignment — solve Q1 to Q5 and submit on the portal',
      subject: 'DBMS',
      dueDate: addDays(today, 1),
      marks: 20,
      priority: 'high',
      done: false,
      createdAt: now - 3000,
      source: 'DBMS assignment due tomorrow, Q1-Q5 on normalization, 20 marks, submit on the portal',
    },
    {
      id: crypto.randomUUID(),
      title: 'Operating Systems lab record — complete experiments 4 and 5',
      subject: 'Operating Systems',
      dueDate: addDays(today, 5),
      marks: 10,
      priority: 'normal',
      done: false,
      createdAt: now - 2000,
      source: 'OS lab record exp 4 and 5 due next week, 10 marks',
    },
    {
      id: crypto.randomUUID(),
      title: 'Submit group presentation slides for Software Engineering',
      subject: 'Software Engineering',
      dueDate: addDays(today, -1),
      marks: 15,
      priority: 'high',
      done: false,
      createdAt: now - 1000,
      source: 'SE presentation slides were due yesterday, 15 marks, submit in the shared drive',
    },
    {
      id: crypto.randomUUID(),
      title: 'Attend workshop registration form (free for first 50)',
      subject: null,
      dueDate: today,
      marks: null,
      priority: 'normal',
      done: true,
      completedAt: now - 400,
      createdAt: now - 500,
      source: 'Fill the workshop registration form today',
    },
  ]
}

export default function App() {
  const [tasks, setTasks] = useState(loadTasks)
  const [settings, setSettings] = useState(loadSettings)
  const [busy, setBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [flash, setFlash] = useState(null)
  const [perm, setPerm] = useState(() => getPermission())
  const [reportOpen, setReportOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [query, setQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState(null)
  const inputRef = useRef(null)
  const [installEvt, setInstallEvt] = useState(null)

  useEffect(() => saveTasks(tasks), [tasks])

  // One browser alert a day when something is late or due today (once granted).
  useEffect(() => {
    notifyDaily(tasks)
  }, [tasks])

  // ?demo=1 prefills an empty radar with samples — README/screenshots/demo link.
  // Never touches tasks someone already captured.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('demo')) return
    setTasks((prev) => (prev.length === 0 ? buildSampleTasks() : prev))
  }, [])

  useEffect(() => {
    if (!flash) return undefined
    const timer = setTimeout(() => setFlash(null), 5000)
    return () => clearTimeout(timer)
  }, [flash])

  // "/" jumps to the capture box (unless already typing somewhere).
  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable
      if (e.key === '/' && !typing) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Chrome/Edge "install app" prompt (satisfied by the manifest + service worker).
  useEffect(() => {
    function onPrompt(e) {
      e.preventDefault()
      setInstallEvt(e)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  async function addTask(text) {
    setBusy(true)
    try {
      const parsed = await extractTask(text, settings)
      const task = {
        id: crypto.randomUUID(),
        ...parsed,
        source: text,
        done: false,
        createdAt: Date.now(),
      }
      setTasks((prev) => [task, ...prev])
      setFlash({ msg: `Captured: ${task.title} · ${formatDue(task.dueDate)}` })
    } finally {
      setBusy(false)
    }
  }

  async function addFromImage(file) {
    if (!settings.apiKey) {
      setSettingsOpen(true)
      setFlash({
        msg: 'AI not set up yet — turn on Smart extract, click a quick-fill preset, paste your key, Save.',
      })
      return
    }
    setBusy(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      const parsed = await extractFromImage(dataUrl, settings)
      const task = {
        id: crypto.randomUUID(),
        ...parsed,
        source: `📷 ${file.name}`,
        done: false,
        createdAt: Date.now(),
      }
      setTasks((prev) => [task, ...prev])
      setFlash({ msg: `Read from image: ${task.title} · ${formatDue(task.dueDate)}` })
    } catch (err) {
      console.error('[Deadline Radar] image extract failed:', err)
      setFlash({ msg: `Could not read that image — ${err.message || 'try again'}` })
    } finally {
      setBusy(false)
    }
  }

  const toggleTask = (id) =>
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : null }
          : t,
      ),
    )
  const deleteTask = (id) => {
    const index = tasks.findIndex((t) => t.id === id)
    if (index === -1) return
    const removed = tasks[index]
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setFlash({
      msg: `Deleted: ${removed.title}`,
      action: {
        label: 'Undo',
        run: () =>
          setTasks((prev) => {
            const next = [...prev]
            next.splice(Math.min(index, next.length), 0, removed)
            return next
          }),
      },
    })
  }

  const updateTask = (id, patch) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    setEditingId(null)
    setFlash({ msg: 'Task updated ✓' })
  }

  // Restores tasks from a JSON backup, skipping ones already captured (same id).
  async function importBackup(file) {
    try {
      const imported = parseBackup(await file.text())
      const existing = new Set(tasks.map((t) => t.id))
      const fresh = imported.filter((t) => !existing.has(t.id))
      if (!fresh.length) {
        setFlash({ msg: 'Nothing new in that backup — all tasks already here.' })
        return
      }
      setTasks((prev) => [...fresh, ...prev])
      setSettingsOpen(false)
      setFlash({
        msg: `Restored ${fresh.length} task${fresh.length > 1 ? 's' : ''} from backup ✓`,
      })
    } catch (err) {
      setFlash({ msg: `Import failed — ${err.message}` })
    }
  }

  const changeDate = (id, date) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, dueDate: date } : t)))

  const subjects = useMemo(() => {
    const set = new Set()
    tasks.forEach((t) => t.subject && set.add(t.subject))
    return [...set].sort()
  }, [tasks])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tasks.filter((t) => {
      if (subjectFilter && t.subject !== subjectFilter) return false
      if (!q) return true
      return `${t.title} ${t.subject || ''} ${t.source || ''}`.toLowerCase().includes(q)
    })
  }, [tasks, query, subjectFilter])

  const sections = useMemo(() => {
    const today = todayKey()
    const isDone = (t) => t.done
    const diffOf = (t) => (t.dueDate ? dayDiff(today, t.dueDate) : null)

    return {
      late: visible.filter((t) => !isDone(t) && t.dueDate && diffOf(t) < 0).sort(byUrgency),
      today: visible.filter((t) => !isDone(t) && diffOf(t) === 0).sort(byUrgency),
      week: visible
        .filter((t) => !isDone(t) && diffOf(t) !== null && diffOf(t) > 0 && diffOf(t) <= 7)
        .sort(byUrgency),
      later: visible
        .filter((t) => !isDone(t) && diffOf(t) !== null && diffOf(t) > 7)
        .sort(byUrgency),
      noDate: visible.filter((t) => !isDone(t) && !t.dueDate).sort(byUrgency),
      done: visible.filter(isDone).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
    }
  }, [visible])

  // "Real result" metric: tasks finished before their deadline.
  const onTime = tasks.filter(
    (t) => t.done && t.dueDate && t.completedAt && toDateKey(new Date(t.completedAt)) <= t.dueDate,
  ).length

  const stats = {
    total: tasks.length,
    dueToday: tasks.filter((t) => !t.done && t.dueDate && dayDiff(todayKey(), t.dueDate) === 0)
      .length,
    late: tasks.filter((t) => !t.done && t.dueDate && dayDiff(todayKey(), t.dueDate) < 0).length,
    done: tasks.filter((t) => t.done).length,
    onTime,
  }

  async function toggleReminders() {
    const current = getPermission()
    if (current === 'unsupported') {
      setFlash({ msg: 'This browser does not support notifications.' })
      return
    }
    let permission = current
    if (permission === 'default') permission = await requestPermission()
    setPerm(permission)
    if (permission === 'granted') {
      notifyTest(stats.late, stats.dueToday)
      setFlash({ msg: 'Reminders on — one alert a day when something is late or due today.' })
    } else {
      setFlash({ msg: 'Notifications blocked — allow them from the 🔒 icon in your address bar.' })
    }
  }

  async function installApp() {
    if (!installEvt) return
    installEvt.prompt()
    await installEvt.userChoice
    setInstallEvt(null)
  }

  const editingTask = tasks.find((t) => t.id === editingId) || null

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-8 sm:pt-12">
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-emerald-500/15 text-lg ring-1 ring-emerald-500/40">
              <span aria-hidden="true" className="radar-sweep" />
              <span className="relative">📡</span>
            </span>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight text-slate-50">
                Deadline Radar
              </h1>
              <p className="text-xs text-slate-500">{formatLongToday()}</p>
            </div>
          </div>
          <p className="mt-3 max-w-md text-[13px] leading-relaxed text-slate-400">
            Assignments arrive in WhatsApp groups and notes — nothing stays in one place.
            <span className="text-slate-300"> Paste or speak them here</span>, and always know
            what is due <span className="text-amber-300">today</span> and what is getting{' '}
            <span className="text-red-400">late</span>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {installEvt && (
            <button
              type="button"
              onClick={installApp}
              title="Install Deadline Radar on this device"
              aria-label="Install app"
              className="rounded-lg border border-sky-500/40 bg-sky-500/10 p-2 text-sky-300 transition hover:bg-sky-500/20"
            >
              ⬇️
            </button>
          )}
          <button
            type="button"
            onClick={toggleReminders}
            title={perm === 'granted' ? 'Daily reminders on — click to test' : 'Enable daily reminders'}
            aria-label="Toggle reminders"
            className={`rounded-lg border p-2 transition ${
              perm === 'granted'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-slate-200'
            }`}
          >
            {perm === 'granted' ? '🔔' : '🔕'}
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-slate-400 transition hover:border-white/25 hover:text-slate-200"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Input */}
      <AddBar onAdd={addTask} busy={busy} inputRef={inputRef} onImage={addFromImage} />

      {flash && (
        <div className="mt-2 flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300">
          <span className="min-w-0 flex-1 break-words">✓ {flash.msg}</span>
          {flash.action && (
            <button
              type="button"
              onClick={flash.action.run}
              className="shrink-0 rounded border border-emerald-400/40 px-2 py-0.5 text-[11px] font-bold text-emerald-200 transition hover:bg-emerald-500/20"
            >
              {flash.action.label}
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 mb-6">
        <StatsBar {...stats} />
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-emerald-500/40 hover:text-emerald-300"
        >
          📊 Weekly report — real result + copy check-in post
        </button>
      </div>

      {/* Search + subject filters */}
      {tasks.length > 0 && (
        <div className="mb-5 space-y-2">
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-slate-500">
              🔍
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks — or press / to jump here"
              aria-label="Search tasks"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pr-3 pl-9 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none"
            />
          </div>
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSubjectFilter(null)}
                className={chipCls(!subjectFilter)}
              >
                All
              </button>
              {subjects.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubjectFilter(subjectFilter === s ? null : s)}
                  className={chipCls(subjectFilter === s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Dashboard */}
      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
          <p className="text-3xl">📡</p>
          <p className="mt-2 text-sm font-semibold text-slate-200">No deadlines captured yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
            Paste your most recent assignment WhatsApp message above — or hold your Wispr key and
            describe it. The radar fills itself.
          </p>
          <button
            type="button"
            onClick={() => setTasks(buildSampleTasks())}
            className="mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
          >
            Load sample data (see how it looks)
          </button>
        </div>
      ) : (
        <>
          {SECTION_DEFS.map(({ key, title, tone, hint }) => (
            <Section
              key={key}
              title={title}
              tone={tone}
              hint={key === 'done' ? `${onTime} finished on time` : hint}
              tasks={sections[key]}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onEdit={setEditingId}
              onDateChange={changeDate}
            />
          ))}
          {visible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-sm text-slate-400">
              No tasks match this filter.{' '}
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setSubjectFilter(null)
                }}
                className="font-semibold text-emerald-300 underline hover:text-emerald-200"
              >
                Clear filters
              </button>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <footer className="mt-10 border-t border-white/10 pt-4 text-center text-[11px] leading-relaxed text-slate-600">
        Built hands-free with <span className="text-slate-500">Wispr Flow</span> ·{' '}
        <span className="text-slate-500">#NoHandsChallenge</span> · WeMakeDevs × Wispr Flow
        <br />
        All data stays in this browser (localStorage).
      </footer>

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onClose={() => setEditingId(null)}
          onSave={(patch) => updateTask(editingTask.id, patch)}
          onDelete={() => {
            deleteTask(editingTask.id)
            setEditingId(null)
          }}
        />
      )}

      {reportOpen && <WeeklyReport tasks={tasks} onClose={() => setReportOpen(false)} />}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={(next) => {
            setSettings(next)
            saveSettings(next)
            setSettingsOpen(false)
          }}
          onClearAll={() => {
            setTasks([])
            setSettingsOpen(false)
          }}
          onExport={() => {
            exportTasks(tasks)
            setFlash({ msg: `Backup downloaded — ${tasks.length} task${tasks.length === 1 ? '' : 's'} inside.` })
          }}
          onImport={importBackup}
        />
      )}
    </div>
  )
}

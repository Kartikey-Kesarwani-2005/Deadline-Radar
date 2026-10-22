import { useEffect, useMemo, useState } from 'react'
import { extractTask } from './lib/extract'
import { addDays, dayDiff, formatDue, formatLongToday, todayKey } from './lib/dates'
import { loadSettings, loadTasks, saveSettings, saveTasks } from './lib/store'
import AddBar from './components/AddBar'
import StatsBar from './components/StatsBar'
import TaskCard from './components/TaskCard'
import SettingsModal from './components/SettingsModal'

const SECTION_TONES = {
  red: 'bg-red-500',
  amber: 'bg-amber-400',
  yellow: 'bg-yellow-400',
  sky: 'bg-sky-400',
  slate: 'bg-slate-500',
  green: 'bg-emerald-400',
}

function Section({ title, tone, hint, tasks, onToggle, onDelete, onDateChange }) {
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

  useEffect(() => saveTasks(tasks), [tasks])

  useEffect(() => {
    if (!flash) return undefined
    const timer = setTimeout(() => setFlash(null), 5000)
    return () => clearTimeout(timer)
  }, [flash])

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
      setFlash({ title: task.title, due: formatDue(task.dueDate) })
    } finally {
      setBusy(false)
    }
  }

  const toggleTask = (id) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
  const deleteTask = (id) => setTasks((prev) => prev.filter((t) => t.id !== id))
  const changeDate = (id, date) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, dueDate: date } : t)))

  const sections = useMemo(() => {
    const today = todayKey()
    const isDone = (t) => t.done
    const diffOf = (t) => (t.dueDate ? dayDiff(today, t.dueDate) : null)

    return {
      late: tasks.filter((t) => !isDone(t) && t.dueDate && diffOf(t) < 0),
      today: tasks.filter((t) => !isDone(t) && diffOf(t) === 0),
      week: tasks.filter((t) => !isDone(t) && diffOf(t) !== null && diffOf(t) > 0 && diffOf(t) <= 7),
      later: tasks.filter((t) => !isDone(t) && diffOf(t) !== null && diffOf(t) > 7),
      noDate: tasks.filter((t) => !isDone(t) && !t.dueDate),
      done: tasks.filter(isDone),
    }
  }, [tasks])

  const stats = {
    total: tasks.length,
    dueToday: sections.today.length,
    late: sections.late.length,
    done: sections.done.length,
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-8 sm:pt-12">
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-lg ring-1 ring-emerald-500/40">
              📡
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
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Open settings"
          className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-slate-400 transition hover:border-white/25 hover:text-slate-200"
        >
          ⚙️
        </button>
      </header>

      {/* Input */}
      <AddBar onAdd={addTask} busy={busy} />

      {flash && (
        <div className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          ✓ Captured: <span className="font-semibold">{flash.title}</span> · {flash.due}
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 mb-6">
        <StatsBar {...stats} />
      </div>

      {/* Dashboard */}
      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
          <p className="text-3xl"> radar silent </p>
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
          <Section
            title="Late — handle now"
            tone="red"
            tasks={sections.late}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onDateChange={changeDate}
          />
          <Section
            title="Due today"
            tone="amber"
            tasks={sections.today}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onDateChange={changeDate}
          />
          <Section
            title="This week"
            tone="yellow"
            tasks={sections.week}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onDateChange={changeDate}
          />
          <Section
            title="Later"
            tone="sky"
            tasks={sections.later}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onDateChange={changeDate}
          />
          <Section
            title="No date yet — pick one"
            tone="slate"
            hint="use the date box on the card"
            tasks={sections.noDate}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onDateChange={changeDate}
          />
          <Section
            title="Done"
            tone="green"
            tasks={sections.done}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onDateChange={changeDate}
          />
        </>
      )}

      {/* Footer */}
      <footer className="mt-10 border-t border-white/10 pt-4 text-center text-[11px] leading-relaxed text-slate-600">
        Built hands-free with <span className="text-slate-500">Wispr Flow</span> ·{' '}
        <span className="text-slate-500">#NoHandsChallenge</span> · WeMakeDevs × Wispr Flow
        <br />
        All data stays in this browser (localStorage).
      </footer>

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
        />
      )}
    </div>
  )
}

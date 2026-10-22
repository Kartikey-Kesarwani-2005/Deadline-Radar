import { useEffect, useMemo, useRef, useState } from 'react'
import { extractMany, extractManyLocal } from './lib/extract'
import { adviceFor, answerQuery, computeBrain, doNow, forecastWeather, marksAtRisk } from './lib/brain'
import { canListen, listenOnce, speak } from './lib/voice'
import { addDays, dayDiff, formatDue, formatLongToday, toDateKey, todayKey } from './lib/dates'
import {
  exportTasks,
  loadSettings,
  loadTasks,
  parseBackup,
  saveSettings,
  saveTasks,
} from './lib/store'
import { burstConfetti } from './lib/confetti'
import { getPermission, notifyDaily, notifyTest, requestPermission } from './lib/notify'
import { extractFromImage, fileToDataUrl } from './lib/vision'
import AddBar from './components/AddBar'
import StatsBar from './components/StatsBar'
import RadarDial from './components/RadarDial'
import WeatherStrip from './components/WeatherStrip'
import DoNowCard from './components/DoNowCard'
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

function Section({ sectionKey, title, tone, hint, tasks, getAdvice, onToggle, onDelete, onEdit, onDateChange, onShare, onFocus, focusId }) {
  if (!tasks.length) return null
  return (
    <section id={`radar-${sectionKey}`} className="mb-6 scroll-mt-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400">
        <span className={`h-2 w-2 rounded-full ${SECTION_TONES[tone]}`} />
        {title}
        <span className="font-medium text-slate-600">· {tasks.length}</span>
        {hint && <span className="ml-auto font-normal normal-case tracking-normal text-slate-600">{hint}</span>}
      </div>
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            advice={getAdvice ? getAdvice(task) : null}
            style={{ animationDelay: `${Math.min(index * 45, 320)}ms` }}
            onToggle={(e) => onToggle(task.id, e)}
            onDelete={() => onDelete(task.id)}
            onEdit={() => onEdit(task.id)}
            onDateChange={(date) => onDateChange(task.id, date)}
            onShare={() => onShare(task.id)}
            onFocus={() => onFocus(task.id)}
            focusing={focusId === task.id}
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
    // Finished history — this is what the Radar Brain learns your rhythm from.
    {
      id: crypto.randomUUID(),
      title: 'DBMS SQL worksheet — joins and subqueries (set 2)',
      subject: 'DBMS',
      dueDate: addDays(today, -12),
      marks: 10,
      effortMin: 55,
      priority: 'normal',
      done: true,
      completedAt: now - 11 * 864e5,
      createdAt: now - 14 * 864e5,
      source: 'DBMS SQL worksheet set 2, 10 marks, submitted on the portal',
    },
    {
      id: crypto.randomUUID(),
      title: 'DBMS normalisation tutorial — 3NF problems 1 to 6',
      subject: 'DBMS',
      dueDate: addDays(today, -6),
      marks: 10,
      effortMin: 40,
      priority: 'normal',
      done: true,
      completedAt: now - 3 * 864e5,
      createdAt: now - 8 * 864e5,
      source: 'Normalisation tutorial due last week, 10 marks',
    },
    {
      id: crypto.randomUUID(),
      title: 'Operating Systems memory management assignment',
      subject: 'Operating Systems',
      dueDate: addDays(today, -9),
      marks: 15,
      effortMin: 120,
      priority: 'normal',
      done: true,
      completedAt: now - 9 * 864e5,
      createdAt: now - 12 * 864e5,
      source: 'OS memory management assignment, 15 marks',
    },
    {
      id: crypto.randomUUID(),
      title: 'Software Engineering sprint retrospective write-up',
      subject: 'Software Engineering',
      dueDate: addDays(today, -15),
      marks: 5,
      effortMin: 25,
      priority: 'normal',
      done: true,
      completedAt: now - 14 * 864e5,
      createdAt: now - 17 * 864e5,
      source: 'SE sprint retro write-up, 5 marks',
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
  const [dateFilter, setDateFilter] = useState(null)
  const [clipSuggest, setClipSuggest] = useState(null)
  const [askCard, setAskCard] = useState(null)
  const [listening, setListening] = useState(false)
  // ⏱️ Focus timer — { taskId, startedAt }; survives refresh via localStorage.
  const [focus, setFocus] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dr_focus'))
    } catch {
      return null
    }
  })
  const [focusTick, setFocusTick] = useState(0)
  const lastClipRef = useRef('')
  const armedRef = useRef(false)
  const inputRef = useRef(null)
  const [installEvt, setInstallEvt] = useState(null)
  // Connectivity + screen size drive the offline banner and desktop / phone modes.
  const [online, setOnline] = useState(() => navigator.onLine)
  const [vw, setVw] = useState(() => window.innerWidth)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    const resize = () => setVw(window.innerWidth)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // ⏱️ Focus timer: persist + tick the header display once a second.
  useEffect(() => {
    if (focus) localStorage.setItem('dr_focus', JSON.stringify(focus))
    else localStorage.removeItem('dr_focus')
  }, [focus])
  useEffect(() => {
    if (!focus) return undefined
    const id = setInterval(() => setFocusTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [focus])
  const focusTask = focus ? tasks.find((t) => t.id === focus.taskId) || null : null
  const fmtElapsed = (ms) => {
    const s = Math.floor(ms / 1000)
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  // Dev-only: log elements wider than the viewport (debug overflow).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const t = setTimeout(() => {
      const w = document.documentElement.clientWidth
      const bad = [...document.querySelectorAll('*')]
        .map((el) => ({ el, r: el.getBoundingClientRect().right }))
        .filter((x) => x.r > w + 1)
        .slice(0, 10)
        .map((x) => `${x.el.tagName}.${String(x.el.className).slice(0, 70)} right=${Math.round(x.r)}`)
      console.log('[overflow-debug] viewport=', w, JSON.stringify(bad, null, 1))
    }, 1200)
    return () => clearTimeout(t)
  }, [])

  const displayMode = settings.displayMode || 'auto'
  const isPhone = displayMode === 'phone' || (displayMode === 'auto' && vw < 640)
  const isWide = !isPhone && vw >= 1024

  useEffect(() => saveTasks(tasks), [tasks])

  // One browser alert a day when something is late or due today (once granted).
  useEffect(() => {
    notifyDaily(tasks)
  }, [tasks])

  // ?demo=1 loads sample deadlines for reviewers/screenshots — merged in,
  // deduped by title, never replacing anything the visitor captured themselves.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('demo')) return
    const have = new Set(tasks.map((t) => t.title.toLowerCase()))
    const fresh = buildSampleTasks().filter((s) => !have.has(s.title.toLowerCase()))
    if (fresh.length) {
      setTasks((prev) => [...fresh, ...prev])
      setFlash({
        msg: `Demo mode ✓ ${fresh.length} sample deadlines added — your own tasks are untouched.`,
      })
    } else {
      setFlash({ msg: 'Demo mode ✓ samples already on the radar — your own tasks are untouched.' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount only
  }, [])

  // Share Target (PWA): any app's share sheet → Deadline Radar lands here with
  // ?text=… and captures it automatically.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shared = (params.get('text') || params.get('body') || '').trim()
    if (shared) {
      addTask(shared, 'from the share sheet')
      window.history.replaceState({}, '', window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  // Clipboard auto-detect: copy a notice (WhatsApp etc.), come back to this tab —
  // we check the clipboard and offer a one-tap capture. Never prompts on page load.
  async function detectClipboard() {
    try {
      const text = ((await navigator.clipboard?.readText?.()) || '').trim()
      if (text.length < 15 || text === lastClipRef.current) return
      if (!extractManyLocal(text).length) return
      setClipSuggest((prev) => (prev?.text === text ? prev : { text }))
    } catch {
      /* clipboard permission denied or unsupported — stay quiet */
    }
  }

  useEffect(() => {
    if (!settings.clipDetect) return undefined
    const onBlur = () => {
      armedRef.current = true
    }
    const onFocus = () => {
      if (!armedRef.current) return
      armedRef.current = false
      detectClipboard()
    }
    const onVis = () => {
      if (!document.hidden) detectClipboard()
    }
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVis)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-arm only when the setting flips
  }, [settings.clipDetect])

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

  async function addTask(text, via) {
    setBusy(true)
    try {
      const parsed = await extractMany(text, settings)
      const created = parsed.map((p) => ({
        id: crypto.randomUUID(),
        ...p,
        source: text,
        done: false,
        createdAt: Date.now(),
      }))
      // Dedupe by exact title so share/clipboard re-runs never double-capture.
      const have = new Set(tasks.map((t) => t.title.toLowerCase().trim()))
      const fresh = created.filter((c) => !have.has(c.title.toLowerCase().trim()))
      if (!fresh.length) {
        setFlash({ msg: 'Already on the radar — nothing new in that text.' })
        return
      }
      setTasks((prev) => [...fresh, ...prev])
      const where = via ? ` ${via}` : created.length > 1 ? ' from one paste' : ''
      setFlash(
        fresh.length > 1
          ? { msg: `Captured ${fresh.length} deadlines${where} ✓` }
          : { msg: `Captured: ${fresh[0].title} · ${formatDue(fresh[0].dueDate)}` },
      )
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
      setFlash({
        msg: navigator.onLine
          ? `Could not read that image — ${err.message || 'try again'}`
          : '📵 Screenshot reading needs internet — type or paste the notice instead; the offline parser handles it.',
      })
    } finally {
      setBusy(false)
    }
  }

  const toggleTask = (id, event) => {
    const current = tasks.find((t) => t.id === id)
    if (!current?.done && typeof event?.clientX === 'number') {
      burstConfetti(event.clientX, event.clientY)
    }
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : null }
          : t,
      ),
    )
  }
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

  // ⏱️ Focus timer — real minutes on a task train the effort model (marks/hr).
  const startFocus = (id) => {
    const task = tasks.find((t) => t.id === id)
    if (!task || focus?.taskId === id) return
    setFocus({ taskId: id, startedAt: Date.now() })
    setFlash({ msg: `⏱ Focus: ${task.title.slice(0, 48)} — stop from the header when done.` })
  }
  const stopFocus = () => {
    if (!focus) return
    const minutes = Math.round((Date.now() - focus.startedAt) / 60000)
    const task = tasks.find((t) => t.id === focus.taskId)
    setFocus(null)
    if (!task) return
    if (minutes < 1) {
      setFlash({ msg: 'Focus stopped — under a minute, not counted.' })
      return
    }
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, effortMin: (t.effortMin || 0) + minutes } : t)),
    )
    setFlash({
      msg: `⏱ ${minutes} min added to "${task.title.slice(0, 36)}" — your pace estimate just got real.`,
    })
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

  // 📤 copies a ready-to-paste line (plus the app link) for study groups.
  async function shareTask(id) {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const when = task.dueDate ? `due ${formatDue(task.dueDate)}` : 'no date set'
    const line =
      `📡 ${task.title}${task.subject ? ` (${task.subject})` : ''} — ${when}` +
      `${task.marks ? `, ${task.marks} marks` : ''}\n` +
      'https://kartikey-kesarwani-2005.github.io/Deadline-Radar/'
    try {
      await navigator.clipboard.writeText(line)
      setFlash({ msg: 'Share text copied — paste it in your group ✓' })
    } catch {
      const ta = document.createElement('textarea')
      ta.value = line
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      setFlash({
        msg: ok ? 'Share text copied — paste it in your group ✓' : 'Copy failed — try again.',
      })
    }
  }

  const subjects = useMemo(() => {
    const set = new Set()
    tasks.forEach((t) => t.subject && set.add(t.subject))
    return [...set].sort()
  }, [tasks])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tasks.filter((t) => {
      if (subjectFilter && t.subject !== subjectFilter) return false
      if (dateFilter && t.dueDate !== dateFilter) return false
      if (!q) return true
      return `${t.title} ${t.subject || ''} ${t.source || ''}`.toLowerCase().includes(q)
    })
  }, [tasks, query, subjectFilter, dateFilter])

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
    week: tasks.filter(
      (t) =>
        !t.done && t.dueDate && dayDiff(todayKey(), t.dueDate) > 0 && dayDiff(todayKey(), t.dueDate) <= 7,
    ).length,
    later: tasks.filter((t) => !t.done && t.dueDate && dayDiff(todayKey(), t.dueDate) > 7).length,
    done: tasks.filter((t) => t.done).length,
    onTime,
  }

  // Radar Brain: personal rhythm from finished work + marks riding on pending work.
  const brain = useMemo(() => computeBrain(tasks), [tasks])
  const risk = useMemo(() => marksAtRisk(tasks), [tasks])
  const forecast = useMemo(() => forecastWeather(tasks), [tasks])
  const plan = useMemo(() => doNow(tasks), [tasks])
  const canAsk = canListen()

  // 🎙️ "Ask the radar" — one spoken question, spoken answer.
  async function askRadar() {
    if (!canAsk || listening || busy) return
    setListening(true)
    try {
      const q = await listenOnce()
      const { text } = answerQuery(q, { tasks, stats })
      setAskCard({ q, a: text })
      speak(text)
    } catch (err) {
      setFlash({
        msg:
          err?.message === 'not-allowed'
            ? 'Mic blocked — allow microphone access and try again.'
            : 'Could not catch that — try again (Chrome/Edge work best).',
      })
    } finally {
      setListening(false)
    }
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
    <div
      className={`mx-auto w-full px-4 pb-16 pt-8 sm:pt-12 ${
        isPhone ? 'phone-mode max-w-full' : isWide ? 'desktop-mode max-w-5xl' : 'max-w-2xl'
      }`}
    >
      {/* Header */}
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-emerald-500/15 text-lg shadow-[0_0_22px_-6px_rgba(16,185,129,0.65)] ring-1 ring-emerald-500/40">
              <span aria-hidden="true" className="radar-sweep" />
              <span className="relative">📡</span>
            </span>
            <div>
              <h1 className="app-title bg-gradient-to-r from-emerald-200 via-sky-200 to-slate-100 bg-clip-text text-lg font-extrabold tracking-tight text-transparent">
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
          {focusTask && (
            <button
              type="button"
              onClick={stopFocus}
              title="Stop focus — the minutes train your pace estimate"
              aria-label="Stop focus timer"
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/25"
            >
              <span aria-hidden="true">⏱</span>
              <span className="hidden max-w-[150px] truncate sm:inline">{focusTask.title}</span>
              <span key={focusTick} className="tabular-nums">
                {fmtElapsed(Date.now() - focus.startedAt)}
              </span>
              <span aria-hidden="true">⏹</span>
            </button>
          )}
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

      {/* Offline mode — everything below keeps working without a connection */}
      {!online && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-200">
          <span aria-hidden="true">📴</span>
          <p>
            <b>You are offline — the radar keeps working.</b> Capture, parsing, reminders and your
            data all live in this browser. AI extract falls back to the built-in offline parser.
          </p>
        </div>
      )}

      {/* Input */}
      <AddBar
        onAdd={addTask}
        busy={busy}
        inputRef={inputRef}
        onImage={addFromImage}
        onAsk={askRadar}
        listening={listening}
        canAsk={canAsk}
      />

      {flash && (
        <div className="rise mt-2 flex items-center gap-3 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 shadow-[0_10px_30px_-18px_rgba(16,185,129,0.8)]">
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

      {/* Clipboard auto-detect suggestion */}
      {clipSuggest && (
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-slate-200">
          <span aria-hidden="true">📋</span>
          <p className="min-w-0 flex-1 break-words">
            <b>Clipboard check</b> — looks like a deadline notice. Add it?{' '}
            <span className="text-slate-500">{clipSuggest.text.slice(0, 80)}…</span>
          </p>
          <button
            type="button"
            onClick={() => {
              const t = clipSuggest.text
              lastClipRef.current = t
              setClipSuggest(null)
              addTask(t, 'from your clipboard')
            }}
            className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            ✓ Add
          </button>
          <button
            type="button"
            onClick={() => {
              lastClipRef.current = clipSuggest.text
              setClipSuggest(null)
            }}
            aria-label="Dismiss clipboard suggestion"
            className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1.5 text-slate-400 transition hover:text-slate-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* 🎙️ Voice query answer */}
      {askCard && (
        <div className="mt-2 flex items-start gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs text-slate-200">
          <span aria-hidden="true">🎙️</span>
          <p className="min-w-0 flex-1 leading-relaxed">
            <span className="text-slate-400">«{askCard.q}»</span>
            <br />
            {askCard.a}
          </p>
          <button
            type="button"
            onClick={() => setAskCard(null)}
            aria-label="Dismiss answer"
            className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-slate-400 transition hover:text-slate-200"
          >
            ✕
          </button>
        </div>
      )}

      {/* Dashboard grid — on wide screens the radar sections sit beside the stat rail */}
      <div
        className={`mt-4 grid gap-5 ${isWide ? 'lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start' : ''}`}
      >
        {/* Left rail: stats + search (stacked above the sections on phones) */}
        <div className="rail flex min-w-0 flex-col gap-4">
          {/* Stats + radar dial */}
          <div
            className={`stats-row flex items-stretch gap-3 ${isWide ? 'lg:flex-col lg:items-stretch' : ''}`}
          >
            <RadarDial
              late={stats.late}
              today={stats.dueToday}
              week={stats.week}
              later={stats.later}
              onTime={stats.onTime}
              done={stats.done}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <StatsBar total={stats.total} dueToday={stats.dueToday} late={stats.late} done={stats.done} />
              {risk.total > 0 && (
                <p
                  className="px-0.5 text-[11px] font-semibold text-amber-300/90"
                  title="Marks riding on late + this-week submissions"
                >
                  🎯 {risk.total} marks at risk
                  {risk.late > 0 && (
                    <span className="font-medium text-red-300"> · {risk.late} already late</span>
                  )}
                </p>
              )}
              <WeatherStrip
                days={forecast}
                active={dateFilter}
                onPick={(key) => setDateFilter((cur) => (cur === key ? null : key))}
              />
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="weekly-btn mt-auto rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-emerald-500/40 hover:text-emerald-300"
              >
                📊 Weekly report — real result + copy check-in post
              </button>
            </div>
          </div>

          {/* Search + subject filters */}
          {tasks.length > 0 && (
            <div className="space-y-2">
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
              {(subjects.length > 0 || dateFilter) && (
                <div className="flex flex-wrap gap-1.5">
                  {subjects.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSubjectFilter(null)}
                      className={chipCls(!subjectFilter)}
                    >
                      All
                    </button>
                  )}
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
                  {dateFilter && (
                    <button
                      type="button"
                      onClick={() => setDateFilter(null)}
                      className={chipCls(true)}
                      title="Clear the day filter"
                    >
                      📅{' '}
                      {new Date(`${dateFilter}T00:00:00`).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      ✕
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: the radar sections */}
        <div className="flex min-w-0 flex-col gap-4">
          {tasks.length > 0 && (
            <DoNowCard plan={plan} onStart={startFocus} focusId={focus?.taskId} />
          )}
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
                  getAdvice={(task) => adviceFor(brain, task)}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onEdit={setEditingId}
                  onDateChange={changeDate}
                  onShare={shareTask}
                  onFocus={startFocus}
                  focusId={focus?.taskId}
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
                      setDateFilter(null)
                    }}
                    className="font-semibold text-emerald-300 underline hover:text-emerald-200"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 border-t border-white/[0.07] pt-5 text-center text-[11px] leading-relaxed text-slate-600">
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

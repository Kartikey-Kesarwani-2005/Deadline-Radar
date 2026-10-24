import { useEffect, useMemo, useRef, useState } from 'react'
import { extractMany, looksLikeDeadline, nextOccurrence, reconcile } from './lib/extract'
import { adviceFor, answerQuery, briefingText, computeBrain, doNow, estimateEffort, forecastWeather, marksAtRisk, onTimeStreak, paceModel, startAlerts, weeklyTrend, weekShareText } from './lib/brain'
import { downloadICS } from './lib/calendar'
import { canListen, canSpeak, listenOnce, speak } from './lib/voice'
import { parseCommand } from './lib/commands'
import { addDays, dayDiff, formatDue, formatLongToday, toDateKey, todayKey } from './lib/dates'
import {
  exportTasks,
  loadSettings,
  loadTasks,
  parseBackup,
  saveSettings,
  saveTasks,
  uid,
} from './lib/store'
import { burstConfetti } from './lib/confetti'
import { getPermission, notifyDaily, notifyTest, requestPermission } from './lib/notify'
import { extractFromImage, fileToDataUrl } from './lib/vision'
import AddBar from './components/AddBar'
import StatsBar from './components/StatsBar'
import RadarDial from './components/RadarDial'
import WeatherStrip from './components/WeatherStrip'
import TrendSpark from './components/TrendSpark'
import DoNowCard from './components/DoNowCard'
import LiveRail from './components/LiveRail'
import TaskCard from './components/TaskCard'
import SettingsModal from './components/SettingsModal'
import WeeklyReport from './components/WeeklyReport'
import TaskEditModal from './components/TaskEditModal'

const SECTION_TONES = {
  red: 'bg-late',
  amber: 'bg-today',
  yellow: 'bg-week',
  sky: 'bg-later',
  slate: 'bg-ink-3',
  green: 'bg-done',
}

function chipCls(active) {
  return `rounded-[3px] border px-2 py-1 font-mono text-[10px] tracking-[0.06em] uppercase transition ${
    active
      ? 'border-ink bg-ink text-paper'
      : 'border-line bg-paper-2 text-ink-2 hover:border-ink hover:text-ink'
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

function Section({ sectionKey, title, tone, hint, tasks, getAdvice, getEst, onToggle, onDelete, onEdit, onDateChange, onShare, onFocus, focusId }) {
  if (!tasks.length) return null
  return (
    <section id={`radar-${sectionKey}`} className="mb-7 scroll-mt-4">
      <div className="mb-2.5 flex flex-wrap items-end gap-x-2 gap-y-1 border-b border-ink/25 pb-1.5">
        <span className={`mb-1 h-2.5 w-2.5 shrink-0 rounded-full ${SECTION_TONES[tone]}`} />
        <h2 className="font-serif text-[18px] leading-none font-semibold text-ink">{title}</h2>
        <span className="mb-0.5 font-mono text-[9px] tracking-[0.1em] text-ink-3 uppercase">
          {tasks.length} {tasks.length === 1 ? 'item' : 'items'}
        </span>
        <span className="flex-1" />
        {hint && <span className="font-mono text-[9px] tracking-wide text-ink-3">{hint}</span>}
      </div>
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            advice={getAdvice ? getAdvice(task) : null}
            estimate={getEst ? getEst(task) : null}
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
      id: uid(),
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
      id: uid(),
      title: 'Operating Systems lab record — complete experiments 4 and 5',
      subject: 'Operating Systems',
      dueDate: addDays(today, 5),
      marks: 10,
      priority: 'normal',
      repeat: 'weekly',
      done: false,
      createdAt: now - 2000,
      source: 'OS lab record exp 4 and 5 due next week, 10 marks',
    },
    {
      id: uid(),
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
      id: uid(),
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
      id: uid(),
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
      id: uid(),
      title: 'DBMS normalization tutorial — 3NF problems 1 to 6',
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
      id: uid(),
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
      id: uid(),
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
  const [hintsClosed, setHintsClosed] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const isDemo = useMemo(() => new URLSearchParams(window.location.search).has('demo'), [])
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
  const searchRef = useRef(null)
  const resizeRef = useRef(null)
  const [installEvt, setInstallEvt] = useState(null)
  // Connectivity + screen size drive the offline banner and desktop / phone modes.
  const [online, setOnline] = useState(() => navigator.onLine)
  const [vw, setVw] = useState(() => window.innerWidth)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    const resize = () => {
      // Debounce — a window drag fires resize every pixel; re-rendering the
      // whole app each time is wasteful.
      clearTimeout(resizeRef.current)
      resizeRef.current = setTimeout(() => setVw(window.innerWidth), 120)
    }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      window.removeEventListener('resize', resize)
      clearTimeout(resizeRef.current)
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
  const demoLoadedRef = useRef(false)
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('demo')) return
    // Guard: React StrictMode (dev) double-invokes effects with a stale `tasks`
    // closure, which used to add every sample twice when a reviewer ran
    // `npm run dev` + ?demo=1. The ref persists across the double-invoke.
    if (demoLoadedRef.current) return
    demoLoadedRef.current = true
    const have = new Set(tasks.map((t) => t.title.toLowerCase()))
    const fresh = buildSampleTasks().filter((s) => !have.has(s.title.toLowerCase()))
    if (fresh.length) {
      setTasks((prev) => {
        // Re-dedupe against live state in case anything landed in between.
        const seen = new Set(prev.map((t) => t.title.toLowerCase()))
        const toAdd = fresh.filter((s) => !seen.has(s.title.toLowerCase()))
        return toAdd.length ? [...toAdd, ...prev] : prev
      })
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
      // Require a real date + task noun/marks — a random sentence must never
      // trigger the "looks like a deadline" prompt.
      if (!looksLikeDeadline(text)) return
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

  // Desktop-first keyboard shortcuts: / search · n new · b briefing · w report
  // · ? help · Esc close. Never fires while typing in a field.
  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '/') {
        e.preventDefault()
        ;(searchRef.current || inputRef.current)?.focus()
      } else if (e.key === 'n') {
        e.preventDefault()
        inputRef.current?.focus()
      } else if (e.key === 'b') {
        playBriefing()
      } else if (e.key === 'w') {
        setReportOpen(true)
      } else if (e.key === '?') {
        setShortcutsOpen((v) => !v)
      } else if (e.key === 'Escape') {
        // "Esc — close anything": peel off the topmost layer.
        if (editingId) setEditingId(null)
        else if (settingsOpen) setSettingsOpen(false)
        else if (reportOpen) setReportOpen(false)
        else if (shortcutsOpen) setShortcutsOpen(false)
        else if (askCard) setAskCard(null)
        else if (clipSuggest) setClipSuggest(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-arm when tasks/busy change (briefing closure) and when modal layers change (Esc peeling)
  }, [tasks, busy, editingId, settingsOpen, reportOpen, shortcutsOpen, askCard, clipSuggest])

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
      // 🔁 Re-capture: a re-pasted message that matches a pending task
      // UPDATES it (teacher moved the deadline) instead of being dropped.
      const { fresh: freshParsed, updates } = reconcile(tasks, parsed)
      const created = freshParsed.map((p) => ({
        id: uid(),
        ...p,
        // Cap stored source — a whole pasted syllabus ×N tasks used to risk
        // blowing the localStorage quota (silent data loss). 600 matches backup.
        source: text.slice(0, 600),
        done: false,
        createdAt: Date.now(),
      }))
      if (!created.length && !updates.length) {
        const doneHit = parsed.some((p) =>
          tasks.some((t) => t.done && t.title.toLowerCase().trim() === String(p.title).toLowerCase().trim()),
        )
        setFlash({
          msg: doneHit
            ? 'That one is already done ✓ — tick it off again if it came back to life.'
            : 'Already on the radar — nothing new in that text.',
        })
        return 0
      }
      if (updates.length) {
        const byId = new Map(tasks.map((t) => [t.id, t]))
        setTasks((prev) => {
          let next = prev
          if (created.length) next = [...created, ...next]
          const map = new Map(updates.map((u) => [u.id, u]))
          next = next.map((t) => {
            const u = map.get(t.id)
            if (!u) return t
            const { from, ...patch } = u
            return { ...t, ...patch, source: text.slice(0, 600) }
          })
          return next
        })
        const msgs = []
        const u0 = updates[0]
        const prior = byId.get(u0.id)
        const changes = []
        if (u0.dueDate && prior?.dueDate && u0.dueDate !== prior.dueDate) {
          changes.push(`📅 ${formatDue(prior.dueDate)} → ${formatDue(u0.dueDate)}`)
        } else if (u0.dueDate) {
          changes.push(`📅 ${formatDue(u0.dueDate)}`)
        }
        if (u0.marks != null && u0.marks !== prior?.marks) {
          changes.push(`${prior?.marks ?? '—'} → ${u0.marks} marks`)
        }
        if (u0.link && u0.link !== prior?.link) changes.push(prior?.link ? '🔗 link swapped' : '🔗 link added')
        if (u0.repeat && u0.repeat !== prior?.repeat) changes.push('🔁 now weekly')
        const extra = updates.length > 1 ? ` (+${updates.length - 1} more)` : ''
        msgs.push(`🔄 ${prior?.title ?? 'Task'} updated: ${changes.join(', ')}${extra}`)
        if (created.length) msgs.push(`+ ${created.length} new ✓`)
        setFlash({ msg: msgs.join('  ·  ') })
        return created.length + updates.length
      }
      setTasks((prev) => [...created, ...prev])
      const where = via ? ` ${via}` : created.length > 1 ? ' from one paste' : ''
      setFlash(
        created.length > 1
          ? { msg: `Captured ${created.length} deadlines${where} ✓` }
          : { msg: `Captured: ${created[0].title} · ${formatDue(created[0].dueDate)}` },
      )
      return created.length
    } catch (err) {
      console.error('[Deadline Radar] capture failed:', err)
      setFlash({ msg: `Could not read that text — ${err?.message || 'try again'}`, tone: 'error' })
      // null = failure (distinct from 0 = "nothing new") so callers like the
      // AddBar can restore the user's pasted text instead of losing it.
      return null
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
        id: uid(),
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
        tone: 'error',
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
    const markingDone = !current?.done
    setTasks((prev) => {
      let next = prev.map((t) =>
        t.id === id
          ? { ...t, done: !t.done, completedAt: !t.done ? Date.now() : null }
          : t,
      )
      if (markingDone && current?.repeat && current.dueDate) {
        // 🔁 Repeating deadline: rolling a fresh copy onto the radar the moment
        // you tick it off, so "har Friday" always shows the next real Friday.
        const coming = nextOccurrence(current.dueDate)
        const waiting =
          coming &&
          next.some((t) => !t.done && t.rolledFrom === current.id && t.dueDate === coming)
        if (coming && !waiting) {
          next = [
            ...next,
            {
              ...current,
              id: uid(),
              done: false,
              completedAt: null,
              dueDate: coming,
              effortMin: null,
              createdAt: Date.now(),
              rolledFrom: current.id,
            },
          ]
        }
      } else if (!markingDone && current) {
        // Undo: pull back the copy that this tick-off created (still pending).
        next = next.filter((t) => !(t.rolledFrom === current.id && !t.done))
      }
      return next
    })
  }
  const deleteTask = (id) => {
    const index = tasks.findIndex((t) => t.id === id)
    if (index === -1) return
    const removed = tasks[index]
    // ⏱️ Never leave a zombie focus timer: if the deleted task is being
    // focused, bank the minutes and stop the interval first.
    if (focus?.taskId === id) {
      const minutes = Math.round((Date.now() - focus.startedAt) / 60000)
      if (minutes >= 1) removed.effortMin = (removed.effortMin || 0) + minutes
      setFocus(null)
    }
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
  // Cap one session at 8h so an abandoned timer (overnight laptop sleep) can't
  // poison the pace model with a thousand bogus minutes.
  const FOCUS_CAP_MIN = 480
  const bankFocus = () => {
    if (!focus) return 0
    const minutes = Math.min(Math.round((Date.now() - focus.startedAt) / 60000), FOCUS_CAP_MIN)
    const taskId = focus.taskId
    setFocus(null)
    if (minutes >= 1) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, effortMin: (t.effortMin || 0) + minutes } : t)),
      )
    }
    return minutes
  }
  const startFocus = (id) => {
    const task = tasks.find((t) => t.id === id)
    if (!task || focus?.taskId === id) return
    // Switching tasks banks the running timer's minutes first — never silently
    // throw away focus time when moving to another task.
    bankFocus()
    setFocus({ taskId: id, startedAt: Date.now() })
    setFlash({ msg: `⏱ Focus: ${task.title.slice(0, 48)} — stop from the header when done.` })
  }
  const stopFocus = () => {
    if (!focus) return
    const minutes = Math.min(Math.round((Date.now() - focus.startedAt) / 60000), FOCUS_CAP_MIN)
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
      setFlash({ msg: `Import failed — ${err.message}`, tone: 'error' })
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
      `${task.marks ? `, ${task.marks} marks` : ''}` +
      `${task.link ? `\n🔗 ${task.link}` : ''}\n` +
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
  const streak = onTimeStreak(tasks)

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
    // Scoreable finishes: only dated + timestamped completions count toward
    // the on-time percentage (undated work has no deadline to miss).
    rated: tasks.filter((t) => t.done && t.dueDate && t.completedAt).length,
  }

  // Radar Brain: personal rhythm from finished work + marks riding on pending work.
  const brain = useMemo(() => computeBrain(tasks), [tasks])
  const risk = useMemo(() => marksAtRisk(tasks), [tasks])
  const forecast = useMemo(() => forecastWeather(tasks), [tasks])
  // Do-Now must match what's on screen: with a subject/day/search filter active,
  // recommending a hidden task is a contradiction. `visible` === all tasks when
  // no filter is set, so this is a no-op in the unfiltered view.
  const plan = useMemo(() => doNow(visible), [visible])
  // True when every captured task is ticked off — the radar is genuinely clear.
  const cleared = useMemo(() => tasks.length > 0 && tasks.every((t) => t.done), [tasks])
  const startSoon = useMemo(() => startAlerts(tasks), [tasks])
  const trend = useMemo(() => weeklyTrend(tasks), [tasks])
  const pace = useMemo(() => paceModel(tasks), [tasks])
  const canAsk = canListen()

  // 🎙️ "Ask the radar" — one spoken question, spoken answer. Orders
  // ("mark DBMS done", "delete OS lab", "add viva Friday") execute instead.
  async function askRadar() {
    if (!canAsk || listening || busy) return
    setListening(true)
    try {
      const q = await listenOnce()
      const cmd = parseCommand(q, tasks)
      if (cmd?.type === 'clarify') {
        // Order heard, target unclear — never tick the wrong card.
        const a = cmd.options?.length
          ? `Kaunsa — ${cmd.options[0]}, ya ${cmd.options[1]}? Subject ya title bol do.`
          : 'Kaun sa task? Subject ya title bol do.'
        setAskCard({ q, a })
        speak(a)
        return
      }
      if (cmd?.type === 'done') {
        toggleTask(cmd.task.id)
        const a = `Done: ${cmd.task.title}.`
        setAskCard({ q, a })
        speak(a)
        return
      }
      if (cmd?.type === 'delete') {
        deleteTask(cmd.task.id)
        const a = `Deleted: ${cmd.task.title}`
        setAskCard({ q, a })
        speak(a)
        return
      }
      if (cmd?.type === 'add') {
        const n = await addTask(cmd.text, 'by voice')
        const a =
          n > 0
            ? `Captured ${n > 1 ? `${n} deadlines` : 'it'} — radar pe aa gaya.`
            : 'Woh radar pe pehle se hai ya padh nahi paaya.'
        setAskCard({ q, a })
        speak(a)
        return
      }
      const { text } = answerQuery(q, { tasks, stats })
      setAskCard({ q, a: text })
      speak(text)
    } catch (err) {
      setFlash({
        msg:
          err?.message === 'not-allowed'
            ? 'Mic blocked — allow microphone access and try again.'
            : 'Could not catch that — try again (Chrome/Edge work best).',
        tone: 'error',
      })
    } finally {
      setListening(false)
    }
  }

  // 🔊 Radar Samachaar — the radar speaks your whole day on one tap.
  function playBriefing() {
    if (busy) return
    // Never claim to be speaking on a browser without speech synthesis.
    if (!canSpeak()) {
      setFlash({ msg: 'This browser can\'t read aloud — Chrome or Edge will speak your briefing.', tone: 'error' })
      return
    }
    speak(briefingText(tasks))
    setFlash({ msg: '🔊 Radar Samachaar — bol raha hoon…' })
  }

  // 📤 One-tap week plan for the study group — native share sheet, clipboard fallback.
  async function shareWeek() {
    const text = weekShareText(tasks)
    if (navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setFlash({ msg: '📤 Week plan copied — paste it in your group chat.' })
    } catch {
      setFlash({ msg: 'Sharing blocked by the browser — copy it from the weekly report instead.', tone: 'error' })
    }
  }

  async function toggleReminders() {
    const current = getPermission()
    if (current === 'unsupported') {
      setFlash({ msg: 'This browser does not support notifications.', tone: 'error' })
      return
    }
    let permission = current
    if (permission === 'default') permission = await requestPermission()
    setPerm(permission)
    if (permission === 'granted') {
      notifyTest(stats.late, stats.dueToday)
      setFlash({ msg: 'Reminders on — one alert a day when something is late or due today.' })
    } else {
      setFlash({ msg: 'Notifications blocked — allow them from the 🔒 icon in your address bar.', tone: 'error' })
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
      className={`mx-auto w-full px-4 pb-16 pt-5 sm:pt-7 ${
        isPhone ? 'phone-mode max-w-full' : isWide ? 'desktop-mode max-w-6xl xl:max-w-7xl' : 'max-w-2xl'
      }`}
    >
      {/* Masthead strip — the newspaper dateline */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-y border-ink/70 py-1 font-mono text-[9px] tracking-[0.18em] text-ink-3 uppercase">
        <span className="font-semibold text-ink-2">Deadline Radar · Field Notes</span>
        <span className="hidden sm:inline">No Hands Challenge · Wispr Flow</span>
        <span>{formatLongToday()}</span>
      </div>

      {/* Header */}
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-ink bg-paper-2">
              <span
                aria-hidden="true"
                className="compass-needle absolute bottom-1/2 left-1/2 h-[15px] w-[2px] -translate-x-1/2 rounded-full bg-late"
              />
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full border border-ink bg-paper" />
            </span>
            <div>
              <p className="eyebrow">Field notes · {stats.total} on the radar</p>
              <h1 className="app-title font-serif text-[2rem] leading-none font-semibold tracking-tight text-ink sm:text-[2.3rem]">
                Deadline Radar<span className="text-late">.</span>
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-ink-2">
            Assignments arrive in WhatsApp groups and notes — nothing stays in one place.
            <span className="font-medium text-ink"> Paste or speak them here</span>, and always know
            what is due <span className="font-semibold text-today">today</span> and what is getting{' '}
            <span className="font-semibold text-late">late</span>.
          </p>
        </div>
        <div className="ms-auto flex flex-wrap items-center justify-end gap-1.5">
          {focusTask && (
            <button
              type="button"
              onClick={stopFocus}
              title="Stop focus — the minutes train your pace estimate"
              aria-label="Stop focus timer"
              className="btn border-done bg-done-soft text-done shadow-[2px_2px_0_var(--color-done)] hover:bg-done-soft"
            >
              <span aria-hidden="true">⏱</span>
              <span className="hidden max-w-[130px] truncate tracking-normal normal-case sm:inline">
                {focusTask.title}
              </span>
              <span key={focusTick} className="tabular-nums">
                {fmtElapsed(Date.now() - focus.startedAt)}
              </span>
              <span aria-hidden="true">⏹</span>
            </button>
          )}
          {isWide && (
            <button
              type="button"
              onClick={() => setShortcutsOpen(true)}
              title="Keyboard shortcuts — / search · n new · b briefing · w report"
              aria-label="Show keyboard shortcuts"
              className="icon-btn w-auto gap-1 px-2"
            >
              <span aria-hidden="true">⌨️</span>
              <kbd>?</kbd>
            </button>
          )}
          {installEvt && (
            <button
              type="button"
              onClick={installApp}
              title="Install Deadline Radar on this device"
              aria-label="Install app"
              className="icon-btn"
            >
              ⬇️
            </button>
          )}
          <button
            type="button"
            onClick={toggleReminders}
            title={perm === 'granted' ? 'Daily reminders on — click to test' : 'Enable daily reminders'}
            aria-label="Toggle reminders"
            className={`icon-btn ${perm === 'granted' ? 'border-done bg-done-soft text-done' : ''}`}
          >
            {perm === 'granted' ? '🔔' : '🔕'}
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
            className="icon-btn"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Offline mode — everything below keeps working without a connection */}
      {!online && (
        <div className="rise mb-4 flex items-start gap-2.5 rounded-[4px] border border-today/40 bg-today-soft px-3 py-2.5 text-xs leading-relaxed text-ink-2">
          <span aria-hidden="true">📴</span>
          <p>
            <b className="font-semibold text-ink">You are offline — the radar keeps working.</b>{' '}
            Capture, parsing, reminders and your data all live in this browser. AI extract falls back
            to the built-in offline parser.
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
        onBrief={playBriefing}
        listening={listening}
        canAsk={canAsk}
      />

      {/* Demo mode — a one-line tour for judges opening ?demo=1 cold */}
      {isDemo && !hintsClosed && (
        <div className="rise mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[4px] border border-later/35 bg-later-soft px-3.5 py-2 text-xs text-ink-2">
          <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-later uppercase">
            ✨ Demo mode — try
          </span>
          <span>🔊 Briefing — the radar speaks your day</span>
          <span>🎙️ Ask → “ab kya karun?” · “mark DBMS done” ✅</span>
          <span>▶ focus timer · 🔁 weekly tasks roll over</span>
          <button
            type="button"
            onClick={() => setHintsClosed(true)}
            aria-label="Dismiss tips"
            className="ml-auto rounded-[3px] p-0.5 text-later transition hover:bg-later/10"
          >
            ✕
          </button>
        </div>
      )}

      {flash && (
        <div
          role="status"
          aria-live="polite"
          className={`stamp-in mt-2 flex items-center gap-3 rounded-[4px] border px-3 py-2 text-xs font-medium ${
            flash.tone === 'error'
              ? 'border-late/45 bg-late-soft text-late'
              : 'border-done/40 bg-done-soft text-done'
          }`}
        >
          {/* Success gets a ✓; errors must NOT wear a checkmark (a green tick
              announcing "Mic blocked" is exactly the kind of contradiction a
              judge screenshots). Strip a trailing ✓ so we never show two. */}
          <span className="min-w-0 flex-1 break-words">
            {flash.tone === 'error' ? flash.msg : `✓ ${flash.msg.replace(/\s*✓$/u, '')}`}
          </span>
          {flash.action && (
            <button
              type="button"
              onClick={() => {
                flash.action.run()
                // Clear after acting so a double-click can't run the action twice
                // (an undo re-inserting a task twice would duplicate its id).
                setFlash(null)
              }}
              className={`btn !px-2 !py-0.5 !text-[10px] ${
                flash.tone === 'error'
                  ? 'border-late text-late shadow-[2px_2px_0_var(--color-late)] hover:bg-late-soft'
                  : 'border-done bg-paper-2 text-done shadow-[2px_2px_0_var(--color-done)] hover:bg-done-soft'
              }`}
            >
              {flash.action.label}
            </button>
          )}
        </div>
      )}

      {/* ⏳ Start window closing — "start now", not just "due soon" */}
      {startSoon.length > 0 && (
        <div className="rise mt-2 rounded-[4px] border border-today/40 bg-today-soft px-3.5 py-2 text-xs text-ink-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono text-[9px] font-semibold tracking-[0.14em] text-today uppercase">
              ⏳ Start window closing
            </span>
            {startSoon.slice(0, 3).map((a) => (
              <span key={a.task.id} className="rounded-[2px] border border-today/30 bg-paper-2/70 px-1.5 py-0.5">
                {a.task.title.length > 36 ? `${a.task.title.slice(0, 35)}…` : a.task.title}
                {' · '}
                <b className="font-semibold text-ink">
                  {a.daysLeft === 0 ? 'aaj shuru!' : `${a.daysLeft}d fit hain`}
                </b>
              </span>
            ))}
            <span className="font-mono text-[9px] tracking-wide text-ink-3">
              — varna deadline se pehle fit nahi hoga
            </span>
          </div>
        </div>
      )}

      {/* ⌨️ Shortcuts card (desktop) */}
      {shortcutsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px]"
          onClick={() => setShortcutsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            className="w-full max-w-sm rounded-[5px] border border-ink bg-paper-2 shadow-[6px_6px_0_rgba(29,27,22,0.22)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b-2 border-ink px-5 pt-4 pb-3">
              <div>
                <p className="eyebrow">Keyboard desk</p>
                <h2 className="font-serif text-xl leading-tight font-semibold text-ink">
                  ⌨️ Shortcuts
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShortcutsOpen(false)}
                className="icon-btn mt-0.5"
                aria-label="Close shortcuts"
              >
                ✕
              </button>
            </div>
            <div className="px-5 py-2">
              {[
                ['/', 'Search the radar'],
                ['n', 'Capture a new deadline'],
                ['b', '🔊 Briefing — Radar Samachaar'],
                ['w', '📊 Weekly report'],
                ['?', 'This card'],
                ['Esc', 'Close anything'],
              ].map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 border-b border-dotted border-line py-2 last:border-0"
                >
                  <kbd className="min-w-[3rem] text-center">{key}</kbd>
                  <span className="flex-1 text-right text-[12px] text-ink-2">{label}</span>
                </div>
              ))}
            </div>
            <p className="border-t border-line bg-paper px-5 py-2.5 text-center font-mono text-[9px] leading-relaxed tracking-wide text-ink-3">
              Desktop mode — hands stay on the keyboard, voice still runs the app.
            </p>
          </div>
        </div>
      )}

      {/* Clipboard auto-detect suggestion */}
      {clipSuggest && (
        <div className="mt-2 flex items-center gap-3 rounded-[4px] border border-later/35 bg-later-soft px-3 py-2 text-xs text-ink-2">
          <span aria-hidden="true">📋</span>
          <p className="min-w-0 flex-1 break-words">
            <b className="font-semibold text-ink">Clipboard check</b> — looks like a deadline notice.
            Add it? <span className="text-ink-3">{clipSuggest.text.slice(0, 80)}…</span>
          </p>
          <button
            type="button"
            onClick={() => {
              const t = clipSuggest.text
              lastClipRef.current = t
              setClipSuggest(null)
              addTask(t, 'from your clipboard')
            }}
            className="btn btn-primary !px-2.5 !py-1 !text-[10px]"
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
            className="icon-btn h-7 w-7 text-[11px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* 🎙️ Voice query answer — announced to screen readers (a voice app's
          answer must reach AT too, not just play out loud). */}
      {askCard && (
        <div
          role="status"
          aria-live="polite"
          className="mt-2 flex items-start gap-3 rounded-[4px] border border-later/35 bg-later-soft px-3 py-2 text-xs text-ink-2"
        >
          <span aria-hidden="true">🎙️</span>
          <p className="min-w-0 flex-1 leading-relaxed">
            <span className="font-mono text-[10px] text-ink-3">“{askCard.q}”</span>
            <br />
            <span className="text-ink">{askCard.a}</span>
          </p>
          <button
            type="button"
            onClick={() => setAskCard(null)}
            aria-label="Dismiss answer"
            className="icon-btn h-7 w-7 text-[11px]"
          >
            ✕
          </button>
        </div>
      )}

      {/* Dashboard grid — on wide screens the radar sections sit beside the stat
          rail; from xl up a live countdown + subject-load rail fills the right
          edge so the middle column stops stretching into dead space. */}
      <div
        className={`mt-4 grid gap-5 ${isWide ? 'lg:grid-cols-[330px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_270px] 2xl:grid-cols-[340px_minmax(0,1fr)_290px] xl:gap-6 lg:items-start' : ''}`}
      >
        {/* Left rail: stats + search (stacked above the sections on phones) */}
        <div
          className={`rail flex min-w-0 flex-col gap-4 ${
            isWide
              ? 'paper-panel p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto'
              : ''
          }`}
        >
          {/* Stats + compass dial */}
          <div
            className={`stats-row flex items-stretch gap-3 ${isWide ? 'lg:flex-col lg:items-stretch' : ''}`}
          >
            <RadarDial
              late={stats.late}
              today={stats.dueToday}
              week={stats.week}
              later={stats.later}
              onTime={stats.onTime}
              rated={stats.rated}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <StatsBar total={stats.total} dueToday={stats.dueToday} late={stats.late} done={stats.done} focusH={(trend.thisWeek.focusMin / 60).toFixed(1)} />
              {risk.total > 0 && (
                <p
                  className="px-0.5 font-mono text-[10px] font-medium text-today"
                  title="Marks riding on late + this-week submissions"
                >
                  🎯 {risk.total} marks at risk
                  {risk.late > 0 && <span className="text-late"> · {risk.late} already late</span>}
                </p>
              )}
              <TrendSpark weeks={trend.weeks} />
              <WeatherStrip
                days={forecast}
                active={dateFilter}
                onPick={(key) => setDateFilter((cur) => (cur === key ? null : key))}
              />
              <button
                type="button"
                onClick={() => setReportOpen(true)}
                className="weekly-btn mt-auto flex items-center justify-between gap-2 rounded-[3px] border border-line bg-paper-2 px-3 py-2 text-left text-[11px] font-medium text-ink-2 transition hover:border-ink hover:text-ink"
              >
                <span>📊 Weekly report — real result + check-in post</span>
                <span aria-hidden="true" className="font-mono text-ink-3">→</span>
              </button>
              <button
                type="button"
                onClick={() => downloadICS(tasks)}
                title="Download an .ics file — opens in Google / Apple / Outlook calendar"
                className="export-btn flex items-center justify-between gap-2 rounded-[3px] border border-line bg-paper-2 px-3 py-2 text-left text-[11px] font-medium text-ink-2 transition hover:border-ink hover:text-ink"
              >
                <span>📅 Export deadlines to phone calendar (.ics)</span>
                <span aria-hidden="true" className="font-mono text-ink-3">→</span>
              </button>
              <button
                type="button"
                onClick={shareWeek}
                title="Native share sheet (phone) or clipboard copy — this week's deadlines for the group chat"
                className="share-week-btn flex items-center justify-between gap-2 rounded-[3px] border border-line bg-paper-2 px-3 py-2 text-left text-[11px] font-medium text-ink-2 transition hover:border-ink hover:text-ink"
              >
                <span>📤 Share this week to the group</span>
                <span aria-hidden="true" className="font-mono text-ink-3">→</span>
              </button>
            </div>
          </div>

          {/* Search + subject filters */}
          {tasks.length > 0 && (
            <div className="space-y-2">
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-ink-3">
                  🔍
                </span>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tasks — or press / to jump here"
                  aria-label="Search tasks"
                  className="field !py-2 !pl-8"
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
            <DoNowCard plan={plan} cleared={cleared} onStart={startFocus} focusId={focus?.taskId} />
          )}
          {tasks.length === 0 ? (
            <div className="rounded-[5px] border border-dashed border-ink/30 bg-paper-2/60 p-8 text-center">
              <p className="eyebrow">Nothing on the radar</p>
              <p className="mx-auto mt-2 max-w-sm font-serif text-xl font-semibold text-ink">
                No deadlines captured yet
              </p>
              <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-ink-3">
                Paste your most recent assignment WhatsApp message above — or hold your Wispr key
                and describe it. The radar fills itself.
              </p>
              <button
                type="button"
                onClick={() => setTasks(buildSampleTasks())}
                className="btn btn-primary mt-4"
              >
                Load sample data →
              </button>
            </div>
          ) : (
            <>
              {SECTION_DEFS.map(({ key, title, tone, hint }) => (
                <Section
                  key={key}
                  title={title}
                  tone={tone}
                  hint={key === 'done' ? `${onTime} finished on time${streak > 1 ? ` · 🔥 ${streak} in a row` : ''}` : hint}
                  tasks={sections[key]}
                  getAdvice={(task) => adviceFor(brain, task)}
                  getEst={(task) => estimateEffort(task, pace)}
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
                <div className="rounded-[4px] border border-dashed border-ink/30 bg-paper-2/60 p-6 text-center text-sm text-ink-2">
                  No tasks match this filter.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('')
                      setSubjectFilter(null)
                      setDateFilter(null)
                    }}
                    className="font-semibold text-late underline decoration-late/40 underline-offset-2 hover:decoration-late"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right edge (xl and up): live countdown + subject load — keeps the
            middle column from stretching into empty space on big monitors */}
        {isWide && (
          <div className="hidden xl:block">
            <LiveRail tasks={tasks} activeSubject={subjectFilter} onPickSubject={(s) => setSubjectFilter((cur) => (cur === s ? null : s))} />
          </div>
        )}
      </div>

      {/* Footer / colophon */}
      <footer className="mt-12 border-t border-ink/25 pt-4 text-center font-mono text-[9px] leading-relaxed tracking-[0.14em] text-ink-3 uppercase">
        <p>Built hands-free with Wispr Flow · #NoHandsChallenge · WeMakeDevs</p>
        <p className="mt-1 tracking-normal normal-case">
          Set in Fraunces &amp; IBM Plex Mono · all data stays in this browser
        </p>
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
            setFocus(null) // no zombie focus timer after wiping the list
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

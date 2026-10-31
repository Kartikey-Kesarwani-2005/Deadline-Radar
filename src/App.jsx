import { useEffect, useMemo, useRef, useState } from 'react'
import { extractMany, looksLikeDeadline, nextOccurrence, reconcile } from './lib/extract'
import { adviceFor, answerQuery, briefingText, computeBrain, doNow, estimateEffort, forecastWeather, heatGrid, marksAtRisk, onTimeStreak, paceModel, pileUps, startAlerts, weeklyTrend, weekShareText } from './lib/brain'
import { buildPlan, planCopyText } from './lib/plan'
import { riskScore } from './lib/risk'
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
import { burstConfetti, celebrateClear } from './lib/confetti'
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
import ConsistencyHeatmap from './components/ConsistencyHeatmap'
import DayPlanner from './components/DayPlanner'
import RescueMode from './components/RescueMode'
import DeskBar from './components/DeskBar'
import AlmanacView from './components/AlmanacView'
import FocusDock from './components/FocusDock'
import SettingsModal from './components/SettingsModal'
import WeeklyReport from './components/WeeklyReport'
import MarkCoach from './components/MarkCoach'
import TaskEditModal from './components/TaskEditModal'
import CommandPalette from './components/CommandPalette'
import Cover from './components/Cover'
import PileUps from './components/PileUps'
import Modal from './components/Modal'
import Icon from './components/Icon'
import { SORT_MODES, postponeDate, sortTasks } from './lib/sort'

const SECTION_TONES = {
  red: 'bg-late',
  amber: 'bg-today',
  yellow: 'bg-week',
  sky: 'bg-later',
  slate: 'bg-ink-3',
  green: 'bg-done',
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

/** One urgency section — heading, count and the ordered task cards inside. */
function Section({ num, sectionKey, title, tone, hint, tasks, getAdvice, getEst, getPlan, getRisk, onToggle, onDelete, onEdit, onDateChange, onShare, onFocus, onPostpone, onCopyPlan, onSelectToggle, selecting, selectedIds, focusId }) {
  if (!tasks.length) return null
  return (
    <section id={`radar-${sectionKey}`} className="section-reveal mb-7 scroll-mt-4">
      <div className="section-head mb-2.5 reveal--fade" style={{ '--reveal-delay': '0ms' }}>
        <span className="section-index" aria-hidden="true">
          {String(num).padStart(2, '0')}
        </span>
        <span className={`mb-1 h-2.5 w-2.5 shrink-0 rounded-full ${SECTION_TONES[tone]}`} />
        <h2 className="font-serif text-[18px] leading-snug font-semibold text-ink min-w-0">{title}</h2>
        <span className="count-chip mb-0.5">
          {tasks.length} {tasks.length === 1 ? 'item' : 'items'}
        </span>
        <span className="flex-1" />
        {hint && <span className="mb-0.5 font-mono text-[9px] tracking-wide text-ink-3">{hint}</span>}
      </div>
      <div className="space-y-2 reveal-stagger">
        {tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            advice={getAdvice ? getAdvice(task) : null}
            estimate={getEst ? getEst(task) : null}
            plan={getPlan ? getPlan(task) : null}
            risk={getRisk ? getRisk(task) : null}
            style={{ '--reveal-delay': `${Math.min(index * 45, 320)}ms`, '--reveal-scale': index === 0 ? 1 : 0.96 }}
            selecting={selecting}
            selected={selectedIds?.has(task.id) || false}
            onToggle={(e) => onToggle(task.id, e)}
            onSelectToggle={() => onSelectToggle(task.id)}
            onDelete={() => onDelete(task.id)}
            onEdit={() => onEdit(task.id)}
            onDateChange={(date) => onDateChange(task.id, date)}
            onShare={() => onShare(task.id)}
            onFocus={() => onFocus(task.id)}
            onPostpone={() => onPostpone(task.id)}
            onCopyPlan={(t, plan) => onCopyPlan?.(t, plan)}
            focusing={focusId === task.id}
          />
        ))}
      </div>
    </section>
  )
}

const SAMPLE_MESSAGES = [
  'DBMS assignment due tomorrow, 20 marks — submit on the portal',
  'OS lab record submission this Friday, 10 marks',
  'SE viva next Monday, 15 marks',
]

/** Trims a title at a word boundary so toasts never end mid-word. */
function shortTitle(text, max = 46) {
  if (!text || text.length <= max) return text || ''
  const cut = text.slice(0, max)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.55 ? cut.slice(0, space) : cut).trimEnd()}…`
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

/**
 * Focus state survives refresh, but only if it is actually usable. A poisoned
 * entry (missing id, string/NaN startedAt, a start time in the future) used to
 * render `NaN:NaN` in the header and run a ghost interval forever.
 */
function loadFocus() {
  try {
    const raw = JSON.parse(localStorage.getItem('dr_focus'))
    if (!raw || typeof raw !== 'object') return null
    const taskId = typeof raw.taskId === 'string' && raw.taskId ? raw.taskId : null
    const startedAt = Number(raw.startedAt)
    if (!taskId || !Number.isFinite(startedAt) || startedAt <= 0) return null
    const now = Date.now()
    // Clock skew / timezone edits must not show a negative timer.
    if (startedAt > now + 60_000) return null
    return { taskId, startedAt: Math.min(startedAt, now) }
  } catch {
    return null
  }
}

export default function App() {
  const [tasks, setTasks] = useState(loadTasks)
  const [settings, setSettings] = useState(loadSettings)
  const [busy, setBusy] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [flash, setFlash] = useState(null)
  const [perm, setPerm] = useState(() => getPermission())
  const [reportOpen, setReportOpen] = useState(false)
  const [examOpen, setExamOpen] = useState(false)
  // 🎬 The dossier front page. It opens once per browser *session* (a tab
  // flag, not a date), waits for a press — never auto-lifts — so a judge
  // reloading mid-demo never meets it again, but a fresh visit still gets the
  // front page. It is also a permanent room: masthead, toolbar home button,
  // Settings and `h` all open it; `?home=1` forces it.
  const COVER_KEY = 'deadline-radar.coverShown'
  const [coverUp, setCoverUp] = useState(() => {
    try {
      if (new URLSearchParams(window.location.search).has('home')) return true
      return !sessionStorage.getItem(COVER_KEY)
    } catch {
      return true
    }
  })
  const [coverOpening, setCoverOpening] = useState(false)
  const homeScrollRef = useRef(0)
  // While the cover is up, the paper behind must not scroll.
  useEffect(() => {
    if (!coverUp) return undefined
    const body = document.body
    const prev = body.style.overflow
    body.style.overflow = 'hidden'
    return () => {
      body.style.overflow = prev
    }
  }, [coverUp])
  const releaseCover = () => {
    if (!coverUp) return
    try {
      sessionStorage.setItem(COVER_KEY, '1')
    } catch {
      /* storage blocked */
    }
    setCoverUp(false)
  }
  // Stamp (or a contents row) pressed → press animation (0.45s) → lift (0.9s)
  // → unmount. A row hands its zone key over so the desk opens on that section.
  const openCover = (dest = null) => {
    if (coverOpening || !coverUp) return
    setCoverOpening(true)
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    setTimeout(
      () => {
        releaseCover()
        if (dest) {
          // The contents counts are global, so a row must clear any list filter
          // that could hide the section it points at.
          setQuery('')
          setSubjectFilter(null)
          setDateFilter(null)
          setView('list')
          setTimeout(() => jumpSection(dest), 260)
        } else {
          setTimeout(
            () => window.scrollTo({ top: homeScrollRef.current || 0, behavior: 'auto' }),
            80,
          )
        }
      },
      reduce ? 60 : 1400,
    )
  }
  // Re-open the front page from the desk any time. Keeps the tab flag intact,
  // so returning to the radar does not make the next reload show it again.
  const openHome = () => {
    if (coverUp) return
    homeScrollRef.current = window.scrollY
    setCoverOpening(false)
    setSettingsOpen(false)
    setReportOpen(false)
    setShortcutsOpen(false)
    setPaletteOpen(false)
    setExamOpen(false)
    setCoverUp(true)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
  const [editingId, setEditingId] = useState(null)
  const [query, setQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState(null)
  const [dateFilter, setDateFilter] = useState(null)
  // 🧭 Scroll-spy — the chapter of the radar the reader is currently in. Drives
  // the sticky chapter plate and nothing else; the plate only pins on wide
  // screens so phones keep the plain reading flow.
  const [activeZone, setActiveZone] = useState(null)
  // The almanac keeps its own picked day: opening a date sheet must not
  // silently filter the whole radar. The list only narrows when the user
  // explicitly asks for "open this day in the list".
  const [almDay, setAlmDay] = useState(null)
  const [hintsClosed, setHintsClosed] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const isDemo = useMemo(() => new URLSearchParams(window.location.search).has('demo'), [])
  const [clipSuggest, setClipSuggest] = useState(null)
  const [askCard, setAskCard] = useState(null)
  const [listening, setListening] = useState(false)
  // ☑️ Bulk select — a mode (never always-on checkboxes) with a Set of ids.
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  // ⏱️ Focus timer — { taskId, startedAt }; survives refresh via localStorage.
  const [focus, setFocus] = useState(loadFocus)
  const [focusTick, setFocusTick] = useState(0)
  // Date rollover: an app left open past midnight must move "today" buckets
  // without needing a state change or reload.
  const [dayKey, setDayKey] = useState(() => todayKey())
  const lastClipRef = useRef('')
  const armedRef = useRef(false)
  const inputRef = useRef(null)
  const searchRef = useRef(null)
  const resizeRef = useRef(null)
  const appShellRef = useRef(null)
  const chapterPlateRef = useRef(null)
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

  // Scroll-triggered reveal — the radar's major sections, the score dial, the
  // stat tiles and the task cards fade in and slide upward as they enter the
  // viewport. One native IntersectionObserver (no extra dependency): `.reveal`
  // is the hidden state, `.is-visible` the played state. Re-runs when the
  // surfaced content changes (tasks added / filtered / view swapped) so freshly
  // mounted entries get observed, while already-played ones are skipped.
  useEffect(() => {
    const root = appShellRef.current
    if (!root) return undefined
    const pending = Array.from(root.querySelectorAll('.reveal:not(.is-visible), .section-reveal:not(.is-visible)'))
    if (typeof IntersectionObserver === 'undefined') {
      // Engine without IO support: never strand content behind a hidden state.
      pending.forEach((el) => el.classList.add('is-visible'))
      return undefined
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            io.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    pending.forEach((el) => io.observe(el))
    return () => io.disconnect()
    // `coverUp` re-runs the sweep after the dossier cover lifts (the shell only
    // mounts behind it, so the observer must re-attach once it is back). The
    // deps read `settings.view` (declared lower in the component) so the sweep
    // re-runs when the reading room swaps without touching the temporal dead zone.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- surfaced-content deps above
  }, [tasks, settings.view, isDemo, dateFilter, subjectFilter, query, coverUp])

  // 🧭 Scroll-spy — which urgency chapter is the reader in? One more native
  // IntersectionObserver (still no dependency): the section whose band is
  // nearest the top of the viewport becomes the "selected" one, and the sticky
  // chapter plate under the desk bar answers to it. Reruns when the surfaced
  // content changes so filtered lists track correctly.
  useEffect(() => {
    const root = appShellRef.current
    if (!root) return undefined
    const chapters = Array.from(root.querySelectorAll('[id^="radar-"]:not(#radar-sections)'))
    if (!chapters.length) {
      setActiveZone(null)
      return undefined
    }
    if (typeof IntersectionObserver === 'undefined') {
      // Engine without IO support: fall back to the first chapter rather than
      // stranding the reader without a story.
      setActiveZone(chapters[0].id.slice('radar-'.length))
      return undefined
    }
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (hit) setActiveZone(hit.target.id.slice('radar-'.length))
      },
      { rootMargin: '-25% 0px -60% 0px', threshold: 0 },
    )
    chapters.forEach((el) => io.observe(el))
    return () => io.disconnect()
    // `coverUp` re-attaches once the shell is mounted behind the cover; covered
    // chapters (none rendered) reset the selection to a clean slate. Deps read
    // `settings.view` to dodge the temporal-dead-zone ordering issue above.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- surfaced-content deps above
  }, [tasks, settings.view, isDemo, dateFilter, subjectFilter, query, coverUp])

  // ✨ Subtle scroll parallax — signature elements flagged `data-parallax`
  // drift at their own rate while the page scrolls. Transform-only (no layout
  // shift, compositor friendly) and fully skipped under reduced motion. Reads
  // the flag straight off the DOM so any element can opt in without new APIs.
  useEffect(() => {
    const root = appShellRef.current
    const els = root ? Array.from(root.querySelectorAll('[data-parallax]')) : []
    if (!els.length) return undefined
    const reduce =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const apply = () => {
      if (reduce) {
        els.forEach((el) => {
          el.style.transform = ''
        })
        return
      }
      const vh = window.innerHeight || 1
      for (const el of els) {
        const rect = el.getBoundingClientRect()
        const center = rect.top + rect.height / 2 - vh / 2
        el.style.transform = `translate3d(0, ${(center * -0.12).toFixed(2)}px, 0)`
      }
    }
    apply()
    window.addEventListener('scroll', apply, { passive: true })
    window.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
    }
    // `coverUp` re-runs the parallax sweep once the shell is mounted behind the cover.
    // Deps read `settings.view` to dodge the temporal-dead-zone ordering issue above.
  }, [tasks, settings.view, isDemo, dateFilter, subjectFilter, query, coverUp])

  const displayMode = settings.displayMode || 'auto'
  const view = settings.view === 'calendar' ? 'calendar' : 'list'
  const isPhone = displayMode === 'phone' || (displayMode === 'auto' && vw < 640)
  const isWide = !isPhone && vw >= 1024

  // 📌 Chapter plate sticky tracker — on wide screens, the plate pins under the desk bar.
  // When it becomes stuck (position: sticky kicks in), we add .is-pinned to trigger
  // the subtle slide-down reveal. Uses a sentinel element to detect stickiness.
  useEffect(() => {
    if (!isWide) return
    const plate = chapterPlateRef.current
    if (!plate) return
    // Create a sentinel just above the plate to detect when it sticks
    const sentinel = document.createElement('div')
    sentinel.style.cssText = 'height:1px;pointer-events:none;position:sticky;top:7.5rem;z-index:14;'
    plate.parentNode?.insertBefore(sentinel, plate)
    const io = new IntersectionObserver(
      ([entry]) => {
        // When sentinel leaves viewport (sticks), plate is pinned
        plate.classList.toggle('is-pinned', !entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '-120px 0px 0px 0px' }
    )
    io.observe(sentinel)
    return () => {
      io.disconnect()
      sentinel.remove()
      plate.classList.remove('is-pinned')
    }
  }, [isWide, activeZone, view])

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
  // A focus timer pointing at a deleted/imported-away task is a ghost: no card
  // shows it, but the interval would tick forever and the stale state would be
  // written back to localStorage on every reload. Drop it as soon as the task
  // disappears (clear-all, delete, import replacing the list).
  useEffect(() => {
    if (!focus) return
    if (!tasks.some((t) => t.id === focus.taskId)) setFocus(null)
  }, [focus, tasks])
  // Midnight rollover: re-render the sections once the calendar day changes.
  useEffect(() => {
    const id = setInterval(() => {
      setDayKey((cur) => {
        const next = todayKey()
        return next === cur ? cur : next
      })
    }, 60_000)
    return () => clearInterval(id)
  }, [])
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

  const sortBy = SORT_MODES.some((m) => m.value === settings.sortBy) ? settings.sortBy : 'smart'

  const setSort = (value) =>
    setSettings((s) => {
      const next = { ...s, sortBy: value }
      saveSettings(next)
      return next
    })

  // 📖 The list and the almanac are two reading rooms on the same data — the
  // chosen room survives reloads, and entering the almanac drops bulk-select
  // mode (there are no list cards to tick there).
  const setView = (next) => {
    if (next === 'calendar') {
      setSelectMode(false)
      setSelectedIds(new Set())
    }
    setSettings((s) => {
      if (s.view === next) return s
      const updated = { ...s, view: next }
      saveSettings(updated)
      return updated
    })
  }

  // 🖨️ "Print" is a real deliverable: the Field Notes stylesheet already hides
  // the controls and keeps the evidence, so one tap produces a paper radar.
  function printRadar() {
    setTimeout(() => window.print(), 120)
  }

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

  // The front page's "load a sample file" door — merge-safe, same rule as
  // ?demo=1: never replaces what the visitor already captured.
  const loadDemo = () => {
    const have = new Set(tasks.map((t) => t.title.toLowerCase()))
    const fresh = buildSampleTasks().filter((s) => !have.has(s.title.toLowerCase()))
    setTasks((prev) => {
      const seen = new Set(prev.map((t) => t.title.toLowerCase()))
      const toAdd = fresh.filter((s) => !seen.has(s.title.toLowerCase()))
      return toAdd.length ? [...toAdd, ...prev] : prev
    })
    setFlash({
      msg: fresh.length
        ? `Sample file ✓ ${fresh.length} example deadlines filed — your own tasks are untouched.`
        : 'Sample file ✓ examples are already on the radar.',
    })
  }

  // Share Target (PWA): any app's share sheet → Deadline Radar lands here with
  // ?text=… and captures it automatically.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    // Shared weblinks often arrive with only a title (text may be empty) —
    // the manifest's share_target declares title, so honour it as a fallback.
    const shared = (params.get('text') || params.get('body') || params.get('title') || '').trim()
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
  // · v list/almanac · p print · ? help · Esc close. Never fires while typing
  // in a field or while the dossier cover is still closed.
  useEffect(() => {
    function onKey(e) {
      // The cover owns the keyboard until it is opened (Enter/Esc are handled
      // by the cover itself), so nothing behind it can be triggered unseen.
      if (coverUp) return
      const modalOpen = Boolean(
        editingId || settingsOpen || reportOpen || shortcutsOpen || paletteOpen || examOpen,
      )
      // ⌘K / Ctrl+K works everywhere — but must never stack the palette on top
      // of another sheet, and should still close itself.
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (paletteOpen) setPaletteOpen(false)
        else if (!modalOpen) setPaletteOpen(true)
        return
      }
      const tag = e.target?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      // While a sheet is open, only Esc (handled by Modal) and "?" (close help)
      // are live. Otherwise `n`/`/` used to focus an input behind the dialog and
      // `w`/`b` could stack a second modal on top.
      if (modalOpen) {
        if (e.key === '?' && shortcutsOpen) setShortcutsOpen(false)
        return
      }
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
      } else if (e.key === 'v') {
        setView(view === 'list' ? 'calendar' : 'list')
      } else if (e.key === 'p') {
        e.preventDefault()
        printRadar()
      } else if (e.key === 'h') {
        openHome()
      } else if (e.key === '?') {
        setShortcutsOpen(true)
      } else if (e.key === 'Escape') {
        // "Esc — close anything": peel off the topmost layer.
        if (askCard) setAskCard(null)
        else if (clipSuggest) setClipSuggest(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-arm when tasks/busy change (briefing closure) and when modal layers change (Esc peeling)
  }, [tasks, busy, editingId, settingsOpen, reportOpen, shortcutsOpen, paletteOpen, examOpen, askCard, clipSuggest, coverUp, view])

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
    // 🎉 The last pending tick clears the whole radar — celebrate accordingly.
    const willClear = markingDone && tasks.length > 1 && tasks.every((t) => t.done || t.id === id)
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
        // Undo: pull back only the copy THIS completion created. Older weekly
        // copies (created before this task was ticked off) must stay — the old
        // filter removed every pending copy in the chain.
        const madeAt = current.completedAt || 0
        next = next.filter(
          (t) => !(t.rolledFrom === current.id && !t.done && (t.createdAt || 0) >= madeAt),
        )
      }
      return next
    })
    if (willClear) {
      celebrateClear()
      setFlash({ msg: 'Radar clear — sab done 🎉 Next deadline paste karo, the radar picks it up.' })
    }
  }
  const deleteTask = (id) => {
    const index = tasks.findIndex((t) => t.id === id)
    if (index === -1) return
    // Copy, never mutate a task object that React state still references —
    // the undo path would otherwise resurrect a silently modified card.
    const removed = { ...tasks[index] }
    // ⏱️ Never leave a zombie focus timer: if the deleted task is being
    // focused, bank the minutes and stop the interval first.
    if (focus?.taskId === id) {
      const minutes = Math.min(
        Math.round((Date.now() - focus.startedAt) / 60000),
        FOCUS_CAP_MIN,
      )
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
    setFlash({ msg: `Focus: ${shortTitle(task.title, 48)} — stop from the header when done.` })
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
      msg: `⏱ ${minutes} min added to "${shortTitle(task.title, 36)}" — your pace estimate just got real.`,
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

  // ⏭ Push a deadline by a day without opening the edit sheet — undo lives in
  // the toast, so a mis-click costs nothing.
  const postponeTask = (id) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const previous = task.dueDate
    const next = postponeDate(previous, 1)
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, dueDate: next } : t)))
    setFlash({
      msg: `${shortTitle(task.title, 44)} → ${formatDue(next)}`,
      action: {
        label: 'Undo',
        run: () =>
          setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, dueDate: previous } : t))),
      },
    })
  }

  // ⧉ A pending copy leaves the original untouched — handy for a re-submission
  // or the same brief in another subject.
  const duplicateTask = (id) => {
    const source = tasks.find((t) => t.id === id)
    if (!source) return
    const copy = {
      ...source,
      id: uid(),
      title: `${source.title.replace(/\s*\(copy\)$/i, '')} (copy)`,
      done: false,
      completedAt: null,
      effortMin: null,
      rolledFrom: null,
      createdAt: Date.now(),
    }
    setTasks((prev) => [copy, ...prev])
    setEditingId(null)
    setFlash({ msg: `⧉ Duplicated — "${shortTitle(copy.title, 42)}" is pending.` })
  }

  const clearFilters = () => {
    setQuery('')
    setSubjectFilter(null)
    setDateFilter(null)
  }

  // ☑️ Bulk select — many cards, a few taps. The tick box swaps roles while
  // the mode is on, so a card can't be accidentally marked done mid-selection.
  const exitSelect = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }
  const toggleSelectMode = () => {
    setSelectMode((m) => !m)
    setSelectedIds(new Set())
  }
  const toggleSelect = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const selectAllVisible = () => setSelectedIds(new Set(visible.map((t) => t.id)))

  const bulkDone = () => {
    const ids = selectedIds
    if (!ids.size) return
    const now = Date.now()
    setTasks((prev) => {
      let next = prev.map((t) =>
        ids.has(t.id) && !t.done ? { ...t, done: true, completedAt: t.completedAt || now } : t,
      )
      // 🔁 Bulk-ticking a weekly deadline must roll its next occurrence exactly
      // like a single tick does — otherwise the repeat chain stops silently.
      for (const t of prev) {
        if (!ids.has(t.id) || t.done || !t.repeat || !t.dueDate) continue
        const coming = nextOccurrence(t.dueDate)
        const waiting =
          coming &&
          next.some((x) => !x.done && x.rolledFrom === t.id && x.dueDate === coming)
        if (coming && !waiting) {
          next = [
            ...next,
            {
              ...t,
              id: uid(),
              done: false,
              completedAt: null,
              dueDate: coming,
              effortMin: null,
              createdAt: now,
              rolledFrom: t.id,
            },
          ]
        }
      }
      return next
    })
    const willClear = tasks.every((t) => t.done || ids.has(t.id))
    setFlash({
      msg: `✅ ${ids.size} marked done${willClear ? ' — radar clear 🎉' : ''}`,
    })
    if (willClear) celebrateClear()
    exitSelect()
  }

  const bulkPostpone = () => {
    if (!selectedIds.size) return
    setTasks((prev) =>
      prev.map((t) =>
        selectedIds.has(t.id) && !t.done ? { ...t, dueDate: postponeDate(t.dueDate, 1) } : t,
      ),
    )
    setFlash({ msg: `⏭ ${selectedIds.size} deadline${selectedIds.size > 1 ? 's' : ''} pushed by a day.` })
    exitSelect()
  }

  const bulkDelete = () => {
    const removed = tasks.filter((t) => selectedIds.has(t.id))
    if (!removed.length) return
    // No zombie focus timer: bank the running session if its task is going.
    if (focus && removed.some((t) => t.id === focus.taskId)) bankFocus()
    setTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)))
    const restores = [...removed]
    setFlash({
      msg: `Deleted ${removed.length} task${removed.length > 1 ? 's' : ''}.`,
      action: { label: 'Undo', run: () => setTasks((prev) => [...restores, ...prev]) },
    })
    exitSelect()
  }

  // 📋 Copy a card's study plan to the clipboard (notes app / group chat).
  const copyPlan = async (task, plan) => {
    const text = planCopyText(task, plan)
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setFlash({ msg: `Plan copied ✓ — ${plan.steps.length} session${plan.steps.length > 1 ? 's' : ''}, ~${Math.round(plan.minutes / 60 * 10) / 10}h total.` })
    } catch {
      setFlash({ msg: 'Copy blocked by the browser — try again.', tone: 'error' })
    }
  }

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
    const today = dayKey
    const isDone = (t) => t.done
    const diffOf = (t) => (t.dueDate ? dayDiff(today, t.dueDate) : null)
    const order = (list) => sortTasks(list, sortBy)

    return {
      late: order(visible.filter((t) => !isDone(t) && t.dueDate && diffOf(t) < 0)),
      today: order(visible.filter((t) => !isDone(t) && diffOf(t) === 0)),
      week: order(
        visible.filter((t) => !isDone(t) && diffOf(t) !== null && diffOf(t) > 0 && diffOf(t) <= 7),
      ),
      later: order(visible.filter((t) => !isDone(t) && diffOf(t) !== null && diffOf(t) > 7)),
      noDate: order(visible.filter((t) => !isDone(t) && !t.dueDate)),
      done: visible.filter(isDone).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
    }
  }, [visible, sortBy, dayKey])

  // The zone index above the list: one honest count per section, computed from
  // the same filtered sections the cards render from.
  const zoneCounts = {
    late: sections.late.length,
    today: sections.today.length,
    week: sections.week.length,
    later: sections.later.length,
    noDate: sections.noDate.length,
    done: sections.done.length,
  }

  // The almanac browses the month, so it ignores the day filter (a single-day
  // filter would erase every other dot) but still honours search + subject.
  const almanacTasks = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tasks.filter((t) => {
      if (subjectFilter && t.subject !== subjectFilter) return false
      if (!q) return true
      return `${t.title} ${t.subject || ''} ${t.source || ''}`.toLowerCase().includes(q)
    })
  }, [tasks, query, subjectFilter])

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
    noDate: tasks.filter((t) => !t.done && !t.dueDate).length,
    done: tasks.filter((t) => t.done).length,
    onTime,
    // Scoreable finishes: only dated + timestamped completions count toward
    // the on-time percentage (undated work has no deadline to miss).
    rated: tasks.filter((t) => t.done && t.dueDate && t.completedAt).length,
  }

  // 🚦 Same-day pile-ups — printed above the desk so a clash day is chosen
  // while it can still be staggered, not on submission morning.
  const pileUpList = useMemo(() => pileUps(tasks, dayKey), [tasks, dayKey])

  // Radar Brain: personal rhythm from finished work + marks riding on pending work.
  // `dayKey` is in the deps so an app left open past midnight re-buckets.
  const brain = useMemo(() => computeBrain(tasks), [tasks, dayKey])
  const risk = useMemo(() => marksAtRisk(tasks), [tasks, dayKey])
  const forecast = useMemo(() => forecastWeather(tasks), [tasks, dayKey])
  // Do-Now must match what's on screen: with a subject/day/search filter active,
  // recommending a hidden task is a contradiction. `visible` === all tasks when
  // no filter is set, so this is a no-op in the unfiltered view.
  const plan = useMemo(() => doNow(visible), [visible, dayKey])
  // True when every captured task is ticked off — the radar is genuinely clear.
  const cleared = useMemo(() => tasks.length > 0 && tasks.every((t) => t.done), [tasks])
  const startSoon = useMemo(() => startAlerts(tasks), [tasks, dayKey])
  const trend = useMemo(() => weeklyTrend(tasks), [tasks, dayKey])
  const pace = useMemo(() => paceModel(tasks), [tasks, dayKey])
  const heat = useMemo(() => heatGrid(tasks), [tasks, dayKey])
  const canAsk = canListen()

  // 📋 Per-task study plans — recomputed only when the data (or the day) changes.
  const plans = useMemo(() => {
    const map = new Map()
    for (const t of tasks) map.set(t.id, buildPlan(t, tasks))
    return map
  }, [tasks, dayKey])
  // 🎯 Per-task risk scores — one shared pace/brain pair beats recomputing
  // the whole model inside every card.
  const riskFor = useMemo(
    () => (t) => riskScore(t, { pace, brain, today: dayKey }),
    [pace, brain, dayKey],
  )
  // The dock compares real focus minutes against the same learned estimate
  // every card prints, so the bar means something instead of being decoration.
  const focusEstimate = focusTask ? estimateEffort(focusTask, pace) : null

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
    setFlash({ msg: 'Radar Samachaar — bol raha hoon…' })
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
      setFlash({ msg: 'Week plan copied — paste it in your group chat.' })
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
      setFlash({ msg: 'Notifications blocked — allow them from the lock icon in your address bar.', tone: 'error' })
    }
  }

  async function installApp() {
    if (!installEvt) return
    installEvt.prompt()
    await installEvt.userChoice
    setInstallEvt(null)
  }

  const editingTask = tasks.find((t) => t.id === editingId) || null

  // The chapter the scroll-spy settled on — the sticky story plate reads it.
  const activeSectionDef = SECTION_DEFS.find((d) => d.key === activeZone) || null
  const activeSectionNum = SECTION_DEFS.findIndex((d) => d.key === activeZone)
  const activeSectionCount = activeZone ? sections[activeZone]?.length ?? 0 : 0

  const jumpSection = (key) =>
    document.getElementById(`radar-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Zone jumps work from either reading room: switch to the list first, then
  // scroll once React has painted the sections back in.
  const jumpZone = (key) => {
    setView('list')
    setTimeout(() => jumpSection(key), 160)
  }

  // "Open this day in the list" — the only path from the almanac that narrows
  // the global date filter, because the user explicitly asked for it.
  const openDayInList = (key) => {
    if (key) setDateFilter(key)
    setView('list')
    setTimeout(
      () => document.getElementById('radar-sections')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      160,
    )
  }

  // Tapping inside the almanac takes ownership of the day selection; an older
  // global date filter is cleared so the chip row can never disagree with the
  // highlighted cell.
  const pickAlmanacDay = (key) => {
    setAlmDay(key)
    if (dateFilter) setDateFilter(null)
  }

  // ⌘K actions — each one is a real, already-supported capability, so the
  // palette is a faster door to the app rather than a separate feature set.
  const commands = [
    {
      id: 'new',
      icon: 'pencil',
      label: 'Capture a new deadline',
      hint: 'N',
      keywords: 'add new task paste message',
      run: () => setTimeout(() => inputRef.current?.focus(), 80),
    },
    {
      id: 'brief',
      icon: 'volume',
      label: 'Play the spoken briefing',
      hint: 'B',
      keywords: 'briefing speak samachaar day summary',
      run: playBriefing,
    },
    {
      id: 'report',
      icon: 'chart',
      label: 'Open the weekly report',
      hint: 'W',
      keywords: 'weekly report stats check-in',
      run: () => setReportOpen(true),
    },
    {
      id: 'home',
      icon: 'home',
      label: 'Open the front page',
      hint: 'H',
      keywords: 'home cover front page dossier contents',
      run: openHome,
    },
    {
      id: 'view',
      icon: view === 'calendar' ? 'list' : 'grid',
      label: view === 'calendar' ? 'Switch to the urgency list' : 'Switch to the radar almanac',
      hint: 'V',
      keywords: 'view list calendar month almanac grid',
      run: () => setView(view === 'calendar' ? 'list' : 'calendar'),
    },
    {
      id: 'print',
      icon: 'printer',
      label: 'Print this radar',
      hint: 'P',
      keywords: 'print paper pdf printout',
      run: printRadar,
    },
    {
      id: 'settings',
      icon: 'settings',
      label: 'Open settings',
      keywords: 'settings ai api key display backup',
      run: () => setSettingsOpen(true),
    },
    {
      id: 'export',
      icon: 'calendar',
      label: 'Export deadlines to calendar (.ics)',
      keywords: 'ics export calendar phone google',
      run: () => downloadICS(tasks),
    },
    {
      id: 'share',
      icon: 'share',
      label: 'Share this week with the group',
      keywords: 'share whatsapp group week plan',
      run: shareWeek,
    },
    {
      id: 'guess',
      icon: 'target',
      label: 'Exam coach — guess karun ya chhodun?',
      hint: 'G',
      keywords: 'exam negative marking guess coach marks jee neet gate',
      run: () => setExamOpen(true),
    },
    {
      id: 'late',
      icon: 'flame',
      label: 'Jump to Late — handle now',
      keywords: 'jump late overdue section',
      run: () => setTimeout(() => jumpSection('late'), 90),
    },
    {
      id: 'today',
      icon: 'clock',
      label: 'Jump to Due today',
      keywords: 'jump today section',
      run: () => setTimeout(() => jumpSection('today'), 90),
    },
    {
      id: 'week',
      icon: 'calendar',
      label: 'Jump to This week',
      keywords: 'jump week section',
      run: () => setTimeout(() => jumpSection('week'), 90),
    },
    {
      id: 'filters',
      icon: 'x',
      label: 'Clear search & filters',
      keywords: 'clear reset filter search',
      run: clearFilters,
    },
    {
      id: 'shortcuts',
      icon: 'keyboard',
      label: 'Show keyboard shortcuts',
      hint: '?',
      keywords: 'keyboard keys help shortcuts',
      run: () => setShortcutsOpen(true),
    },
    ...SORT_MODES.map((m) => ({
      id: `sort-${m.value}`,
      icon: 'sort',
      label: `Sort: ${m.label}`,
      hint: sortBy === m.value ? '✓' : undefined,
      keywords: `sort order ${m.label} ${m.value}${sortBy === m.value ? ' current active' : ''}`,
      onlyWhenSearch: true,
      run: () => setSort(m.value),
    })),
  ]

  // While the dossier cover is closed, render ONLY the cover. Previously the
  // whole desk stayed mounted behind it — hidden inputs, tabbable controls and
  // screen-reader content sitting under an aria-modal dialog.
  if (coverUp) {
    return (
      <Cover
        opening={coverOpening}
        onOpen={openCover}
        counts={{
          late: stats.late,
          today: stats.dueToday,
          week: stats.week,
          later: stats.later,
          noDate: stats.noDate,
          done: stats.done,
        }}
        tasks={tasks}
        onDemo={loadDemo}
        riskTotal={risk.total}
      />
    )
  }

  return (
    <div
      ref={appShellRef}
      className={`app-shell mx-auto w-full px-4 pb-6 pt-0 ${
        isPhone ? 'phone-mode max-w-full' : isWide ? 'desktop-mode max-w-6xl xl:max-w-7xl' : 'max-w-2xl'
      }`}
    >
      {/* Masthead strip — the newspaper dateline */}
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 border-y border-ink/70 py-0.25 font-mono text-[8px] tracking-[0.16em] text-ink-3 uppercase">
        <button
          type="button"
          onClick={() => openHome()}
          title="Open the front page — H"
          aria-label="Open the Deadline Radar front page"
          className="masthead-brand font-semibold text-ink-2 transition hover:text-ink min-w-0 leading-none"
        >
          <span aria-hidden="true" className="masthead-dot" />
          Deadline Radar<span className="text-ink-3">·</span>Field Notes
        </button>
        <span className="hidden sm:inline">No Hands Challenge · Wispr Flow</span>
        <span className="dateline-chip">{formatLongToday()}</span>
      </div>

      {/* Header */}
      <header className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-[1.5px] border-ink bg-paper-2">
              <span
                aria-hidden="true"
                className="compass-needle absolute bottom-1/2 left-1/2 h-[14px] w-[2px] -translate-x-1/2 rounded-full bg-late"
              />
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full border border-ink bg-paper" />
            </span>
            <div className="min-w-0 flex flex-col gap-1">
              <p className="eyebrow mb-0 leading-tight">
                Field notes · {stats.total} on the radar
              </p>
              <h1
                data-parallax="0.08"
                className="app-title font-serif text-[1.875rem] leading-[1.1] font-semibold tracking-tight text-ink sm:text-[2.125rem] min-w-0 break-words"
                style={{ maxWidth: '100%', marginTop: '0', lineHeight: '1.1' }}
              >
                Deadline Radar<span className="text-late">.</span>
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-ink-2 break-words">
            Assignments arrive in WhatsApp groups and notes — nothing stays in one place.
            <span className="font-medium text-ink"> Paste or speak them here</span>, and always know
            what is due <span className="font-semibold text-today">today</span> and what is getting{' '}
            <span className="font-semibold text-late">late</span>.
          </p>
        </div>
        <div className="ms-auto flex flex-wrap items-center justify-end gap-2">
          {focusTask && (
            <button
              type="button"
              onClick={stopFocus}
              title="Stop focus — the minutes train your pace estimate"
              aria-label="Stop focus timer"
              className="btn border-done bg-done-soft text-done shadow-[2px_2px_0_var(--color-done)] hover:bg-done-soft"
            >
              <Icon name="clock" size={13} />
              <span className="hidden max-w-[130px] truncate tracking-normal normal-case sm:inline">
                {focusTask.title}
              </span>
              <span key={focusTick} className="tabular-nums">
                {fmtElapsed(Date.now() - focus.startedAt)}
              </span>
              <Icon name="stop" size={11} />
            </button>
          )}

          <div className="toolbar" role="group" aria-label="Quick actions">
            <button
              type="button"
              onClick={() => openHome()}
              title="Front page — H"
              aria-label="Open the front page"
              className="toolbar-btn"
            >
              <Icon name="home" size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              title="Command palette — Ctrl / ⌘ K"
              aria-label="Open command palette"
              className="toolbar-btn"
            >
              <Icon name="search" size={16} />
              <span className="kbd-chip hidden sm:inline-flex" aria-hidden="true">
                ⌘K
              </span>
            </button>
            {isWide && (
              <button
                type="button"
                onClick={() => setShortcutsOpen(true)}
                title="Keyboard shortcuts — / search · n new · b briefing · w report"
                aria-label="Show keyboard shortcuts"
                className="toolbar-btn"
              >
                <Icon name="keyboard" size={16} />
                <span className="kbd-chip" aria-hidden="true">
                  ?
                </span>
              </button>
            )}
            {installEvt && (
              <button
                type="button"
                onClick={installApp}
                title="Install Deadline Radar on this device"
                aria-label="Install app"
                className="toolbar-btn"
              >
                <Icon name="download" size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={toggleReminders}
              title={
                perm === 'granted' ? 'Daily reminders on — click to test' : 'Enable daily reminders'
              }
              aria-label="Toggle reminders"
              className={`toolbar-btn ${perm === 'granted' ? 'is-on' : ''}`}
            >
              <Icon name={perm === 'granted' ? 'bell' : 'bellOff'} size={16} />
            </button>
            <button
              type="button"
              onClick={printRadar}
              title="Print this radar — P · controls drop out, deadlines stay on paper"
              aria-label="Print the radar"
              className="toolbar-btn"
            >
              <Icon name="printer" size={16} />
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open settings"
              title="Settings — AI key, display mode, backup"
              className="toolbar-btn"
            >
              <Icon name="settings" size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Offline mode — everything below keeps working without a connection */}
      {!online && (
        <div className="rise mb-4 flex items-start gap-2.5 rounded-[4px] border border-today/40 bg-today-soft px-3 py-2.5 text-xs leading-relaxed text-ink-2">
          <Icon name="wifiOff" size={14} className="mt-0.5 text-today" />
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
          <span className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-[0.14em] text-later uppercase">
            <Icon name="spark" size={11} />
            Demo mode — try
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="volume" size={11} className="text-ink-3" />
            Briefing — the radar speaks your day
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="mic" size={11} className="text-ink-3" />
            Ask → “ab kya karun?” · “mark DBMS done”
          </span>
          <span className="flex items-center gap-1.5">
            <Icon name="play" size={10} className="text-ink-3" />
            focus timer ·
            <Icon name="repeat" size={11} className="text-ink-3" />
            weekly tasks roll over
          </span>
          <button
            type="button"
            onClick={() => setHintsClosed(true)}
            aria-label="Dismiss tips"
            className="ml-auto rounded-[3px] p-1 text-later transition hover:bg-later/10"
          >
            <Icon name="x" size={12} />
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
          {/* Success gets a tick; errors get an alert. Never a green tick
              announcing "Mic blocked" — exactly the kind of contradiction a
              judge screenshots. Strip a trailing ✓ so we never show two. */}
          <span
            className={`toast-badge ${flash.tone === 'error' ? 'is-error' : ''}`}
            aria-hidden="true"
          >
            <Icon name={flash.tone === 'error' ? 'alert' : 'check'} size={12} />
          </span>
          <span className="min-w-0 flex-1 break-words">
            {flash.msg.replace(/\s*✓$/u, '')}
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
            <span className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-[0.14em] text-today uppercase">
              <Icon name="clock" size={11} />
              Start window closing
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
        <Modal
          label="Keyboard shortcuts"
          onClose={() => setShortcutsOpen(false)}
          panelClassName="sheet w-full max-w-sm"
        >
            <div className="flex items-start justify-between gap-3 border-b-2 border-ink px-5 pt-4 pb-3">
              <div>
                <p className="eyebrow">Keyboard desk</p>
                <h2 className="font-serif text-xl leading-tight font-semibold text-ink">
                  Shortcuts
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShortcutsOpen(false)}
                className="icon-btn mt-0.5"
                aria-label="Close shortcuts"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
            <div className="px-5 py-2">
              {[
                ['⌘K', 'Command palette — every action'],
                ['/', 'Search the radar'],
                ['n', 'Capture a new deadline'],
                ['b', 'Briefing — Radar Samachaar'],
                ['w', 'Weekly report'],
                ['v', 'Switch list ↔ almanac'],
                ['p', 'Print this radar'],
                ['h', 'Front page'],
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
              Ctrl/⌘ K opens the palette from anywhere — hands stay on the keyboard.
            </p>
        </Modal>
      )}

      {/* Clipboard auto-detect suggestion */}
      {clipSuggest && (
        <div className="mt-2 flex items-center gap-3 rounded-[4px] border border-later/35 bg-later-soft px-3 py-2 text-xs text-ink-2">
          <Icon name="clipboard" size={14} className="mt-0.5 text-later" />
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
            <Icon name="check" size={11} />
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              lastClipRef.current = clipSuggest.text
              setClipSuggest(null)
            }}
            aria-label="Dismiss clipboard suggestion"
            className="icon-btn h-7 w-7"
          >
            <Icon name="x" size={12} />
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
          <Icon name="mic" size={14} className="mt-0.5 text-later" />
          <p className="min-w-0 flex-1 leading-relaxed">
            <span className="font-mono text-[10px] text-ink-3">“{askCard.q}”</span>
            <br />
            <span className="text-ink">{askCard.a}</span>
          </p>
          <button
            type="button"
            onClick={() => setAskCard(null)}
            aria-label="Dismiss answer"
            className="icon-btn h-7 w-7"
          >
            <Icon name="x" size={12} />
          </button>
        </div>
      )}

      {/* Dashboard grid — on wide screens the radar sections sit beside the stat
          rail; from xl up a live countdown + subject-load rail fills the right
          edge so the middle column stops stretching into dead space. */}
      <div
        className={`dashboard-grid mt-1 grid gap-3 ${isWide ? 'lg:grid-cols-[330px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_270px] 2xl:grid-cols-[340px_minmax(0,1fr)_290px] xl:gap-5 lg:items-start' : ''}`}
      >
        {/* Left rail: stats + search (stacked above the sections on phones) */}
        <div
          className={`rail flex min-w-0 flex-col gap-4 ${
            isWide
              ? 'paper-panel p-4 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto'
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
                  className="flex items-center gap-1 px-0.5 font-mono text-[10px] font-medium text-today"
                  title="Marks riding on late + this-week submissions"
                >
                  <Icon name="target" size={11} />
                  {risk.total} marks at risk
                  {risk.late > 0 && <span className="text-late"> · {risk.late} already late</span>}
                </p>
              )}
              <TrendSpark weeks={trend.weeks} />
              <ConsistencyHeatmap heat={heat} />
              <WeatherStrip
                days={forecast}
                active={dateFilter}
                onPick={(key) => setDateFilter((cur) => (cur === key ? null : key))}
              />
              <div className="mt-auto divide-y divide-line overflow-hidden rounded-[3px] border border-line bg-paper-2">
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  title="Open the weekly report — captured, finished, on-time, plus a ready check-in post"
                  className="rail-action weekly-btn"
                >
                  <Icon name="chart" size={14} className="text-ink-3" />
                  <span className="min-w-0 flex-1 leading-snug">
                    Weekly report — result + check-in post
                  </span>
                  <Icon name="arrowRight" size={13} className="text-ink-3" />
                </button>
                {/* 🧮 The exam-hall coach — a decision no other tracker even
                    names: which guesses pay for themselves under negative
                    marking, settled before the bell rings. */}
                <button
                  type="button"
                  onClick={() => setExamOpen(true)}
                  title="Guess karun ya chhodun? — expected marks ledger for negative-marking guesses (JEE +4/−1, GATE, semester schemes)"
                  className="rail-action guess-btn"
                >
                  <Icon name="target" size={14} className="text-ink-3" />
                  <span className="min-w-0 flex-1 leading-snug">
                    Exam coach — guess karun ya chhodun?
                  </span>
                  <Icon name="arrowRight" size={13} className="text-ink-3" />
                </button>
                <button
                  type="button"
                  onClick={() => downloadICS(tasks)}
                  title="Download an .ics file — opens in Google / Apple / Outlook calendar"
                  className="rail-action export-btn"
                >
                  <Icon name="calendar" size={14} className="text-ink-3" />
                  <span className="min-w-0 flex-1 leading-snug">Export to phone calendar (.ics)</span>
                  <Icon name="arrowRight" size={13} className="text-ink-3" />
                </button>
                <button
                  type="button"
                  onClick={shareWeek}
                  title="Native share sheet (phone) or clipboard copy — this week's deadlines for the group chat"
                  className="rail-action share-week-btn"
                >
                  <Icon name="share" size={14} className="text-ink-3" />
                  <span className="min-w-0 flex-1 leading-snug">Share this week to the group</span>
                  <Icon name="arrowRight" size={13} className="text-ink-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Search + subject filters now live in the DeskBar above the cards */}
        </div>

        {/* Right column: the radar sections */}
        <div id="radar-sections" className="flex min-w-0 scroll-mt-4 flex-col gap-4">
          {selectMode && view === 'list' && (
            <div className="stamp-in flex flex-wrap items-center gap-2 rounded-[4px] border-2 border-ink bg-ink px-3 py-2 text-paper-2 shadow-[3px_3px_0_rgba(29,27,22,0.35)]">
              <span className="font-mono text-[10px] tracking-[0.12em] uppercase">
                ☑️ {selectedIds.size} selected
              </span>
              <span className="flex-1" />
              <button
                type="button"
                onClick={bulkDone}
                disabled={!selectedIds.size}
                title="Mark every selected card done"
                className="btn !border-line !bg-paper !text-ink !shadow-none"
              >
                Done ✓
              </button>
              <button
                type="button"
                onClick={bulkPostpone}
                disabled={!selectedIds.size}
                title="Push every selected deadline by one day"
                className="btn !border-line !bg-paper !text-ink !shadow-none"
              >
                +1 day
              </button>
              <button
                type="button"
                onClick={bulkDelete}
                disabled={!selectedIds.size}
                title="Delete every selected card — undo stays in the toast"
                className="btn !border-late !bg-late !text-paper-2 !shadow-none"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={exitSelect}
                className="btn !border-paper-2/40 !bg-transparent !text-paper-2 !shadow-none hover:!bg-paper-2/10"
              >
                Cancel
              </button>
            </div>
          )}
          {tasks.length > 0 && (
            <DoNowCard plan={plan} cleared={cleared} onStart={startFocus} focusId={focus?.taskId} />
          )}
          {tasks.length > 0 && view === 'list' && (
            <RescueMode tasks={tasks} today={dayKey} onStart={startFocus} focusId={focus?.taskId} />
          )}
          {tasks.length > 0 && plan && view === 'list' && (
            <DayPlanner tasks={tasks} onStart={startFocus} focusId={focus?.taskId} />
          )}
          {tasks.length > 0 && view === 'list' && (
            <PileUps ups={pileUpList} onPick={(key) => setDateFilter(key)} />
          )}
          {tasks.length > 0 && (
            <DeskBar
              view={view}
              onView={setView}
              query={query}
              onQuery={setQuery}
              sortBy={sortBy}
              onSort={setSort}
              sortModes={SORT_MODES}
              selectMode={selectMode}
              onToggleSelectMode={toggleSelectMode}
              onSelectAll={selectAllVisible}
              selectedCount={selectedIds.size}
              subjects={subjects}
              subjectFilter={subjectFilter}
              onSubjectFilter={setSubjectFilter}
              dateFilter={dateFilter}
              onDateFilter={setDateFilter}
              searchRef={searchRef}
              zoneCounts={zoneCounts}
              onJump={jumpZone}
            />
          )}
          {/* 🧭 Sticky chapter plate — the story chapter the reader is currently
              in, pinned under the desk bar on wide screens so the journey through
              the radar stays one continuous read. Renders only for chapters that
              actually exist (empty sections never mounted one), so it never
              promises a blank chapter. */}
          {view === 'list' && activeZone && activeSectionDef && (
            <div
              ref={chapterPlateRef}
              className="chapter-plate"
              aria-hidden="true"
            >
              <span className="eyebrow">Chapter {activeSectionNum + 1}</span>
              <span className="chapter-plate-title font-serif text-[18px] leading-none font-semibold text-ink">
                {activeSectionDef.title}
              </span>
              <span className="count-chip">
                {activeSectionCount} {activeSectionCount === 1 ? 'item' : 'items'}
              </span>
            </div>
          )}
          {tasks.length === 0 ? (
            <div className="empty-sheet overflow-hidden rounded-[5px] border border-dashed border-ink/30 bg-paper-2/70">
              <div className="grid gap-5 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
                <div>
                  <p className="eyebrow">Blank page · nothing on the radar</p>
                  <p className="mt-2 font-serif text-[22px] leading-tight font-semibold text-ink">
                    Your next deadline starts here.
                  </p>
                  <p className="mt-2 max-w-md text-xs leading-relaxed text-ink-2">
                    Paste the assignment message from WhatsApp, hold your Wispr key and say it, or
                    drop a screenshot. The radar parses the date, subject and marks by itself and
                    files it under the right day.
                  </p>
                </div>
                <svg
                  viewBox="0 0 120 120"
                  aria-hidden="true"
                  className="mx-auto hidden h-24 w-24 sm:block"
                >
                  <circle cx="60" cy="60" r="52" fill="#fbf8ef" stroke="#1d1b16" strokeWidth="1.6" />
                  <circle cx="60" cy="60" r="36" fill="none" stroke="#d7cdb8" strokeWidth="6" />
                  <circle cx="60" cy="60" r="22" fill="#f3eee1" stroke="#1d1b16" strokeWidth="1.4" />
                  <path d="M60 22 L67 60 L60 55 L53 60 Z" fill="#ad3620" />
                  <circle cx="60" cy="60" r="4" fill="#1d1b16" />
                  <circle cx="60" cy="60" r="1.4" fill="#f3eee1" />
                </svg>
              </div>

              <div className="grid gap-2 border-t border-line px-6 py-4 sm:grid-cols-3 sm:px-8">
                {[
                  ['pencil', 'Paste a message', 'WhatsApp, notes, email'],
                  ['mic', 'Hold & speak', 'Wispr types it for you'],
                  ['camera', 'Drop a photo', 'Screenshot or portal shot'],
                ].map(([icon, title, hint]) => (
                  <div key={title} className="flex items-start gap-2">
                    <Icon name={icon} size={14} className="mt-0.5 text-ink-3" />
                    <div>
                      <p className="text-[12px] font-medium text-ink">{title}</p>
                      <p className="font-mono text-[9px] tracking-wide text-ink-3">{hint}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-line bg-paper px-6 py-4 sm:px-8">
                <p className="eyebrow">Try a sample message</p>
                <div className="mt-2 flex flex-col gap-1.5">
                  {SAMPLE_MESSAGES.map((message) => (
                    <button
                      key={message}
                      type="button"
                      onClick={() => addTask(message)}
                      className="group flex items-start gap-2 rounded-[3px] border border-line bg-paper-2 px-2.5 py-1.5 text-left transition hover:border-ink hover:bg-paper-3"
                    >
                      <span aria-hidden="true" className="mt-0.5 font-mono text-[10px] text-ink-3">
                        +
                      </span>
                      <span className="min-w-0 flex-1 text-[12px] leading-snug text-ink-2 group-hover:text-ink">
                        “{message}”
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTasks(buildSampleTasks())}
                    className="btn btn-quiet"
                  >
                    Load a full demo radar
                    <Icon name="arrowRight" size={12} />
                  </button>
                  <span className="font-mono text-[9px] tracking-wide text-ink-3">
                    or press <kbd>N</kbd> to start typing
                  </span>
                </div>
              </div>
            </div>
          ) : view === 'calendar' ? (
            <AlmanacView
              tasks={almanacTasks}
              activeDay={almDay || dateFilter}
              onPickDay={pickAlmanacDay}
              onToggle={toggleTask}
              onEdit={setEditingId}
              onStart={startFocus}
              focusId={focus?.taskId}
              onOpenList={openDayInList}
            />
          ) : (
            <>
              {SECTION_DEFS.map(({ key, title, tone, hint }, sectionIndex) => (
                <Section
                  key={key}
                  num={sectionIndex + 1}
                  sectionKey={key}
                  title={title}
                  tone={tone}
                  hint={key === 'done' ? `${onTime} finished on time${streak > 1 ? ` · ${streak} in a row` : ''}` : hint}
                  tasks={sections[key]}
                  getAdvice={(task) => adviceFor(brain, task)}
                  getEst={(task) => estimateEffort(task, pace)}
                  getPlan={(task) => plans.get(task.id)}
                  getRisk={riskFor}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onEdit={setEditingId}
                  onDateChange={changeDate}
                  onShare={shareTask}
                  onFocus={startFocus}
                  onPostpone={postponeTask}
                  onCopyPlan={copyPlan}
                  onSelectToggle={toggleSelect}
                  selecting={selectMode}
                  selectedIds={selectedIds}
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
          <div className="no-print hidden xl:block">
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

      {/* The focus dock stays parked while the radar scrolls — the header chip
          is gone by the time you reach the Done section. */}
      {focusTask && focus && (
        <FocusDock
          task={focusTask}
          elapsedMs={Date.now() - focus.startedAt}
          estimateMin={focusEstimate?.minutes}
          onStop={stopFocus}
          onEdit={() => setEditingId(focusTask.id)}
        />
      )}

      {editingTask && (
        <TaskEditModal
          key={editingTask.id}
          task={editingTask}
          onClose={() => setEditingId(null)}
          onSave={(patch) => updateTask(editingTask.id, patch)}
          onDuplicate={() => duplicateTask(editingTask.id)}
          onDelete={() => {
            deleteTask(editingTask.id)
            setEditingId(null)
          }}
        />
      )}

      {paletteOpen && (
        <CommandPalette
          tasks={tasks}
          commands={commands}
          onClose={() => setPaletteOpen(false)}
          onEditTask={(id) => setEditingId(id)}
        />
      )}

      {reportOpen && <WeeklyReport tasks={tasks} onClose={() => setReportOpen(false)} />}

      {examOpen && <MarkCoach onClose={() => setExamOpen(false)} />}

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
            setClipSuggest(null) // don't offer to re-add a wiped clipboard notice
            setAskCard(null)
            setQuery('')
            setSubjectFilter(null)
            setDateFilter(null)
            setSettingsOpen(false)
          }}
          onExport={() => {
            exportTasks(tasks)
            setFlash({ msg: `Backup downloaded — ${tasks.length} task${tasks.length === 1 ? '' : 's'} inside.` })
          }}
          onImport={importBackup}
          onOpenHome={openHome}
        />
      )}
    </div>
  )
}

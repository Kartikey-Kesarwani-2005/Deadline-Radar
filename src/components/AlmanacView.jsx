import { useEffect, useMemo, useState } from 'react'
import {
  WEEKDAY_LABELS,
  almanacGrid,
  dayItems,
  defaultDay,
  monthCursorOf,
  monthSummary,
  shiftMonth,
  undatedPending,
} from '../lib/almanac'
import { parseDateKey, todayKey } from '../lib/dates'
import { smartSort } from '../lib/sort'
import { subjectInk } from '../lib/subjects'
import Icon from './Icon'

/**
 * 🗓️ Radar Almanac — the month view.
 *
 * The urgency list answers "what next". This answers the question a list never
 * can: "which week is about to hurt?" A printed month planner where every day
 * carries its marks, subject inks and late stamp, and tapping a day opens its
 * submissions underneath without leaving the calendar. Deliberately the same
 * paper, ink and rubric as the rest of the desk.
 */
export default function AlmanacView({
  tasks,
  activeDay,
  onPickDay,
  onToggle,
  onEdit,
  onStart,
  focusId,
  onOpenList,
}) {
  const today = todayKey()
  const [cursor, setCursor] = useState(() => monthCursorOf(activeDay || today))

  // A day filter picked elsewhere (weather strip, pile-up lane) should bring
  // its own month into view instead of silently selecting a cell off-screen.
  // Only react when the prop changes — navigating the month must not bounce
  // straight back to the filtered day.
  useEffect(() => {
    if (!activeDay) return
    const d = parseDateKey(activeDay)
    if (!d) return
    setCursor((cur) =>
      d.getFullYear() === cur.year && d.getMonth() === cur.month ? cur : monthCursorOf(activeDay),
    )
  }, [activeDay])

  const grid = useMemo(
    () => almanacGrid(cursor.year, cursor.month, tasks, today),
    [cursor.year, cursor.month, tasks, today],
  )
  const summary = monthSummary(grid.totals)

  // Which day the detail sheet is showing. A picked day wins; otherwise the
  // almanac opens on today (or the first busy day) — never an empty void.
  const selected = useMemo(() => {
    if (activeDay && parseDateKey(activeDay)) {
      const d = parseDateKey(activeDay)
      if (d.getFullYear() === cursor.year && d.getMonth() === cursor.month) return activeDay
    }
    return defaultDay(grid, tasks)
  }, [activeDay, cursor.year, cursor.month, grid, tasks])

  const items = useMemo(() => dayItems(tasks, selected), [tasks, selected])
  // smartSort is a two-argument comparator — sort a copy of the list with it,
  // never call it on the array itself (that passes the array as `a` and
  // undefined as `b`, which threw "reading 'priority'" into the ErrorBoundary).
  const pending = useMemo(() => [...items.pending].sort(smartSort), [items.pending])
  const done = useMemo(
    () => [...items.done].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
    [items.done],
  )
  const undated = useMemo(() => [...undatedPending(tasks)].sort(smartSort), [tasks])
  const selectedMarks = pending.reduce((a, t) => a + (Number(t.marks) || 0), 0)

  const monthSubjects = useMemo(() => {
    const seen = new Map()
    for (const cell of grid.weeks.flat()) {
      if (!cell.inMonth) continue
      for (const s of cell.subjects) {
        const key = s.toLowerCase()
        if (!seen.has(key)) seen.set(key, { label: s, ink: subjectInk(s) })
      }
    }
    return [...seen.values()]
  }, [grid])

  function go(delta) {
    const next = shiftMonth(cursor.year, cursor.month, delta)
    // A day filter from the old month must not silently filter the list.
    const picked = parseDateKey(activeDay)
    if (picked && (picked.getMonth() !== next.month || picked.getFullYear() !== next.year)) {
      onPickDay(null)
    }
    setCursor(next)
  }

  function goToday() {
    setCursor(monthCursorOf(today))
    onPickDay(today)
  }

  function pick(key) {
    onPickDay(activeDay === key ? null : key)
  }

  const selectedDate = parseDateKey(selected)
  const selectedLabel = selectedDate
    ? selectedDate.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      })
    : 'No day picked'
  const isTodaySelected = selected === today

  return (
    <div className="paper-panel alm-panel rise overflow-hidden rounded-[5px]">
      {/* Month masthead */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/60 px-3.5 pt-3 pb-3">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-1.5">
            <Icon name="grid" size={11} />
            Radar almanac · month view
          </p>
          <h2 className="mt-1 font-serif text-[22px] leading-none font-semibold text-ink">
            {grid.label}
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => go(-1)}
            className="icon-btn h-8 w-8"
            aria-label="Previous month"
            title="Previous month"
          >
            <Icon name="chevronLeft" size={14} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="btn !px-2.5 !py-1 !text-[9.5px]"
            title="Jump to today's month and select today"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="icon-btn h-8 w-8"
            aria-label="Next month"
            title="Next month"
          >
            <Icon name="chevronRight" size={14} />
          </button>
        </div>
      </div>

      {/* Honest month summary + the subject ink key */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-dotted border-line bg-paper px-3.5 py-2">
        <p className="font-mono text-[10px] tracking-wide text-ink-2">
          <span className="font-semibold text-ink">{grid.totals.pending}</span> pending
          {grid.totals.marks > 0 && (
            <>
              {' · '}
              <span className="font-semibold text-today">{grid.totals.marks}</span> marks
            </>
          )}
          {grid.totals.done > 0 && (
            <>
              {' · '}
              <span className="font-semibold text-done">{grid.totals.done}</span> finished
            </>
          )}
        </p>
        <span className="flex-1" />
        {monthSubjects.length > 0 && (
          <span className="flex flex-wrap items-center gap-2">
            {monthSubjects.slice(0, 6).map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-1 font-mono text-[9px] text-ink-3"
                title={s.label}
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: s.ink }}
                />
                {s.label}
              </span>
            ))}
            {monthSubjects.length > 6 && (
              <span className="font-mono text-[9px] text-ink-3">
                +{monthSubjects.length - 6}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Weekday rubric */}
      <div className="alm-head px-2 pt-2" aria-hidden="true">
        {WEEKDAY_LABELS.map((w) => (
          <span
            key={w}
            className={`text-center font-mono text-[8.5px] font-semibold tracking-[0.12em] uppercase ${
              w === 'Sun' ? 'text-late/70' : 'text-ink-3'
            }`}
          >
            {w}
          </span>
        ))}
      </div>

      {/* The grid */}
      <div className="alm-grid px-2 pt-1 pb-2" role="grid" aria-label={`${grid.label} deadlines`}>
        {grid.weeks.map((week, wi) => (
          <div key={wi} className="alm-week" role="row">
            {week.map((cell) => {
              const isSelected = selected === cell.key
              const title = `${cell.key} — ${
                cell.pending
                  ? `${cell.pending} pending${cell.marks ? `, ${cell.marks} marks` : ''}`
                  : cell.done
                    ? `${cell.done} finished`
                    : 'nothing due'
              }`
              return (
                <button
                  key={cell.key}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  aria-label={`${title}. ${isSelected ? 'Selected' : 'Open this day'}`}
                  onClick={() => pick(cell.key)}
                  title={`${title}${isSelected ? ' · selected' : ' · tap to open'}`}
                  className={[
                    'alm-cell group',
                    cell.inMonth ? '' : 'alm-out',
                    cell.isToday ? 'alm-today' : '',
                    cell.late ? 'alm-late' : '',
                    isSelected ? 'alm-selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="alm-top">
                    <span className="alm-day">{cell.day}</span>
                    {cell.marks > 0 && <span className="alm-marks">{cell.marks}</span>}
                    {cell.pending > 0 && cell.marks === 0 && (
                      <span className="alm-marks is-plain">{cell.pending}</span>
                    )}
                  </span>
                  <span className="alm-dots" aria-hidden="true">
                    {cell.subjects.map((s, i) => (
                      <span
                        key={`${s}-${i}`}
                        className="alm-dot"
                        style={{ background: subjectInk(s) }}
                      />
                    ))}
                    {cell.inMonth && !cell.pending && cell.done > 0 && (
                      <Icon name="check" size={9} strokeWidth={2.4} className="text-done" />
                    )}
                  </span>
                  {cell.isToday && <span className="alm-today-tag">today</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Selected-day sheet — the list under the calendar, same page */}
      <div className="border-t-2 border-ink/70 bg-paper px-3.5 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="font-serif text-[15px] leading-tight font-semibold text-ink">
            {selectedLabel}
            {isTodaySelected && (
              <span className="ml-1.5 align-middle font-mono text-[8px] tracking-[0.12em] text-today uppercase">
                today
              </span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9.5px] tracking-wide text-ink-3">
              {pending.length} pending{pending.length ? ` · ${selectedMarks} marks` : ''}
            </span>
            <button
              type="button"
              onClick={() => onOpenList(selected)}
              title="Open this day in the urgency list"
              className="flex items-center gap-1 font-mono text-[9px] tracking-[0.1em] text-later uppercase transition hover:text-ink"
            >
              <Icon name="list" size={10} />
              List
            </button>
          </div>
        </div>

        {pending.length === 0 && done.length === 0 ? (
          <p className="mt-2 rounded-[3px] border border-dashed border-line bg-paper-2/60 px-2.5 py-2 text-[11.5px] text-ink-3">
            Khaali din — nothing due. A good day to get ahead. ☀️
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {[...pending, ...done].map((t) => {
              const ink = subjectInk(t.subject)
              const running = focusId === t.id
              return (
                <li
                  key={t.id}
                  className={`alm-row ${t.done ? 'is-done' : ''}`}
                >
                  <button
                    type="button"
                    onClick={(e) => onToggle(t.id, e)}
                    aria-label={t.done ? `Mark ${t.title} not done` : `Mark ${t.title} done`}
                    className={`task-check ${t.done ? 'is-done' : ''}`}
                  >
                    <Icon name="check" size={10} strokeWidth={2.6} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(t.id)}
                    title="Open the entry card"
                    className="min-w-0 flex-1 text-left"
                  >
                    <span
                      className={`block text-[12px] leading-snug break-words ${
                        t.done ? 'text-ink-3 line-through' : 'font-medium text-ink'
                      }`}
                    >
                      {t.title}
                    </span>
                  </button>
                  {t.subject && (
                    <span
                      className="tag hidden bg-paper-2 sm:inline-flex"
                      style={ink ? { color: ink, borderColor: `${ink}66` } : undefined}
                    >
                      {t.subject}
                    </span>
                  )}
                  {t.marks != null && (
                    <span className="shrink-0 font-mono text-[9.5px] tabular-nums text-ink-3">
                      {t.marks}m
                    </span>
                  )}
                  {!t.done && (
                    <button
                      type="button"
                      onClick={() => onStart(t.id)}
                      disabled={running}
                      aria-label={`${running ? 'Stop' : 'Start'} focus on ${t.title}`}
                      title={running ? 'Focus running — stop from the dock' : 'Start focus'}
                      className={`task-action is-focus shrink-0 ${running ? 'bg-done-soft' : ''}`}
                    >
                      <Icon name={running ? 'stop' : 'play'} size={11} />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {undated.length > 0 && (
          <div className="mt-2.5 border-t border-dotted border-line pt-2">
            <p className="font-mono text-[9px] tracking-[0.12em] text-ink-3 uppercase">
              No date yet · give these a day
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {undated.slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onEdit(t.id)}
                  title="Open the entry card and pick a date"
                  className="flex max-w-full items-center gap-1.5 rounded-[3px] border border-dashed border-line bg-paper-2 px-1.5 py-1 text-left text-[10.5px] text-ink-2 transition hover:border-ink hover:text-ink"
                >
                  <Icon name="calendar" size={10} className="shrink-0 text-ink-3" />
                  <span className="truncate">{t.title}</span>
                </button>
              ))}
              {undated.length > 6 && (
                <span className="self-center font-mono text-[9px] text-ink-3">
                  +{undated.length - 6}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <p className="border-t border-line bg-paper-2 px-3.5 py-1.5 font-mono text-[8.5px] tracking-[0.1em] text-ink-3 uppercase">
        {summary.line} · tap any day · marks on the corner are still pending
      </p>
    </div>
  )
}

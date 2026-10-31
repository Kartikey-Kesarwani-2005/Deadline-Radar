import { useEffect, useMemo, useState } from 'react'
import { addDays, countdownTo, formatDue, toDateKey, todayKey } from '../lib/dates'
import { onTimeStreak, subjectLoad } from '../lib/brain'
import { subjectInk } from '../lib/subjects'
import Icon from './Icon'

/**
 * 🛰 Live rail (wide screens only) — the "mission control" column:
 *   1. a seconds-precision countdown to the NEXT deadline,
 *   2. a 🔥 on-time streak + last-7-days finish strip, and
 *   3. a per-subject load meter (pending marks, heaviest bar first).
 * The countdown owns the only 1s tick; the rest is memoized on `tasks`.
 */
export default function LiveRail({ tasks, onPickSubject, activeSubject }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const pending = useMemo(() => tasks.filter((t) => !t.done && t.dueDate), [tasks])
  const next = useMemo(
    () => pending.reduce((best, t) => (!best || t.dueDate < best.dueDate ? t : best), null),
    [pending],
  )
  const load = useMemo(() => subjectLoad(tasks), [tasks])
  const streak = useMemo(() => onTimeStreak(tasks), [tasks])
  // Last 7 days (oldest → today): did any task get finished that day?
  const week = useMemo(() => {
    const doneKeys = new Set(
      tasks.filter((t) => t.done && t.completedAt).map((t) => toDateKey(new Date(t.completedAt))),
    )
    return Array.from({ length: 7 }, (_, i) => {
      const key = addDays(todayKey(), -(6 - i))
      return { key, done: doneKeys.has(key) }
    })
  }, [tasks])

  const cd = next ? countdownTo(next.dueDate, now) : null
  const maxMarks = Math.max(1, ...load.map((s) => s.marks || s.count))

  return (
    <aside className="flex flex-col gap-4">
      {/* ⏳ Next deadline, ticking live */}
      <div className="paper-panel p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="eyebrow flex items-center gap-1.5">
            <Icon name="clock" size={11} />
            Next deadline
          </p>
          <span className="live-tag">
            <span className="live-dot" aria-hidden="true" />
            live
          </span>
        </div>
        {next ? (
          <>
            <p
              className="mt-2 font-serif text-[15px] leading-snug font-semibold break-words text-ink"
              title={next.title}
            >
              {next.title}
            </p>
            {cd && (
              <div className="mt-2.5">
                <p
                  className={`font-mono leading-none font-semibold tabular-nums ${
                    cd.late
                      ? 'text-[24px] text-late'
                      : cd.d === 0 && cd.h < 6
                        ? 'text-[26px] text-today'
                        : 'text-[26px] text-ink'
                  }`}
                >
                  {cd.late
                    ? cd.d > 0
                      ? `${cd.d}d ${cd.h}h`
                      : `${cd.h}h ${cd.m}m`
                    : `${String(cd.d).padStart(2, '0')}:${String(cd.h).padStart(2, '0')}:${String(cd.m).padStart(2, '0')}:${String(cd.s).padStart(2, '0')}`}
                </p>
                {/* Label the 01:02:14:33 blocks so nobody has to guess which digit is days */}
                <p
                  className="mt-1.5 font-mono text-[8px] tracking-[0.14em] text-ink-3 uppercase"
                  aria-hidden="true"
                >
                  {cd.late ? 'past the deadline' : 'days : hrs : min : sec'}
                </p>
              </div>
            )}
            <p className="mt-2.5 flex items-center gap-1.5 border-t border-dotted border-line pt-2 font-mono text-[10px] text-ink-3">
              <Icon name="calendar" size={11} />
              {next.subject ? `${next.subject} · ` : ''}
              {formatDue(next.dueDate)}
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-ink-3">
            Nothing pending with a date. Add a deadline and the countdown starts itself.
          </p>
        )}
      </div>

      {/* 🔥 Momentum — on-time streak + a last-7-days finish strip */}
      <div className="paper-panel p-4">
        <p className="eyebrow flex items-center gap-1.5">
          <Icon name="flame" size={11} />
          Momentum
        </p>
        {streak > 0 ? (
          <p className="mt-2 flex items-baseline gap-2">
            <span className="font-serif text-3xl leading-none font-semibold text-done">{streak}</span>
            <span className="text-[12px] text-ink-2">on-time in a row</span>
          </p>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-ink-3">
            Tick a task done before its deadline to light the streak.
          </p>
        )}
        <div className="mt-3 flex items-center gap-1" aria-hidden="true">
          {week.map((d) => (
            <span
              key={d.key}
              title={d.done ? `Finished something on ${d.key}` : `Nothing finished on ${d.key}`}
              className={`h-2 flex-1 rounded-[1px] ${
                d.done ? 'bg-done' : 'border border-line bg-paper'
              }`}
            />
          ))}
        </div>
        <p className="mt-1.5 font-mono text-[9px] text-ink-3">
          last 7 days · filled = finished something
        </p>
      </div>

      {/* 📊 Load by subject — pending marks, heaviest first */}
      {load.length > 0 && (
        <div className="paper-panel p-4">
          <p className="eyebrow flex items-center gap-1.5">
            <Icon name="chart" size={11} />
            Load by subject
          </p>
          <ul className="mt-3 space-y-2.5">
            {load.slice(0, 6).map((s) => {
              const pct = Math.round(((s.marks || s.count) / maxMarks) * 100)
              const on = activeSubject === s.label
              const ink = subjectInk(s.label) || 'var(--color-later)'
              return (
                <li key={s.label}>
                  <button
                    type="button"
                    onClick={() => onPickSubject(s.label)}
                    title={`Filter the radar to ${s.label} — ${s.marks} marks across ${s.count} task${s.count === 1 ? '' : 's'}`}
                    className="group block w-full text-left"
                  >
                    <div className="flex items-baseline justify-between gap-2 text-[10px]">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: ink }}
                        />
                        <span
                          className={`truncate font-medium ${on ? 'text-done' : 'text-ink-2'}`}
                        >
                          {s.label}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-[9px] tabular-nums text-ink-3">
                        {s.marks > 0 ? `${s.marks}m` : `${s.count} task${s.count === 1 ? '' : 's'}`}
                      </span>
                    </div>
                    <div className="mt-1 h-[5px] w-full overflow-hidden rounded-[1px] border border-line bg-paper">
                      <div
                        className="h-full transition-all duration-500 group-hover:opacity-100"
                        style={{
                          width: `${Math.max(4, pct)}%`,
                          background: on ? 'var(--color-done)' : ink,
                          opacity: on ? 1 : 0.82,
                        }}
                      />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
          {load.length > 6 && (
            <p className="mt-2.5 border-t border-dotted border-line pt-2 font-mono text-[9px] text-ink-3">
              Top 6 by marks · +{load.length - 6} more
            </p>
          )}
        </div>
      )}
    </aside>
  )
}

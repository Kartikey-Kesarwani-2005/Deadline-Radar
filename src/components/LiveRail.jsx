import { useEffect, useMemo, useState } from 'react'
import { addDays, countdownTo, formatDue, toDateKey, todayKey } from '../lib/dates'
import { onTimeStreak, subjectLoad } from '../lib/brain'

/**
 * 🛰 Live rail (wide screens only) — the "mission control" strip that fills the
 * right edge of a big monitor with things that actually move:
 *   1. a seconds-precision countdown to the NEXT deadline,
 *   2. a 🔥 on-time streak + last-7-days finish strip, and
 *   3. a per-subject load meter (pending marks, heaviest bar first).
 * Everything else already lives in the left rail, so nothing here duplicates it.
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
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
          ⏳ Next deadline
        </p>
        {next ? (
          <>
            <p
              className="mt-2 text-sm leading-snug font-semibold break-words text-slate-100"
              title={next.title}
            >
              {next.title}
            </p>
            {cd && (
              <p
                className={`mt-2 font-mono text-3xl leading-none font-bold tabular-nums ${
                  cd.late
                    ? 'text-red-400'
                    : cd.d === 0 && cd.h < 6
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                }`}
              >
                {cd.late
                  ? `${cd.d}d ${cd.h}h over`
                  : `${String(cd.d).padStart(2, '0')}:${String(cd.h).padStart(2, '0')}:${String(cd.m).padStart(2, '0')}:${String(cd.s).padStart(2, '0')}`}
              </p>
            )}
            {/* Label the 01:02:14:33 blocks so nobody has to guess which digit is days */}
            {cd && !cd.late && (
              <p className="mt-0.5 font-mono text-[10px] tracking-widest text-slate-500" aria-hidden="true">
                days : hrs : min : sec
              </p>
            )}
            <p className="mt-1.5 text-[11px] text-slate-500">
              {next.subject ? `${next.subject} · ` : ''}📅 {formatDue(next.dueDate)}
            </p>
          </>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Nothing pending with a date. Add a deadline and the countdown starts itself.
          </p>
        )}
      </div>

      {/* 🔥 Momentum — on-time streak + a last-7-days finish strip */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">🔥 Momentum</p>
        {streak > 0 ? (
          <p className="mt-2 text-sm text-slate-300">
            <span className="text-2xl font-bold text-emerald-300">{streak}</span> on-time in a row
          </p>
        ) : (
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Tick a task done before its deadline to light the streak.
          </p>
        )}
        <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
          {week.map((d) => (
            <span
              key={d.key}
              title={d.done ? `Finished something on ${d.key}` : `Nothing finished on ${d.key}`}
              className={`h-2.5 flex-1 rounded-full ${d.done ? 'bg-emerald-400/90' : 'bg-white/[0.08]'}`}
            />
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500">last 7 days · filled = finished something</p>
      </div>

      {/* 📊 Load by subject — pending marks, heaviest first */}
      {load.length > 0 && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
            📊 Load by subject
          </p>
          <ul className="mt-2.5 space-y-2.5">
            {load.slice(0, 6).map((s) => {
              const pct = Math.round(((s.marks || s.count) / maxMarks) * 100)
              const on = activeSubject === s.label
              return (
                <li key={s.label}>
                  <button
                    type="button"
                    onClick={() => onPickSubject(s.label)}
                    title={`Filter the radar to ${s.label} — ${s.marks} marks across ${s.count} task${s.count === 1 ? '' : 's'}`}
                    className="group block w-full text-left"
                  >
                    <div className="flex items-baseline justify-between gap-2 text-[11px]">
                      <span
                        className={`truncate font-medium ${on ? 'text-emerald-300' : 'text-slate-300'}`}
                      >
                        {s.label}
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-500">
                        {s.marks > 0 ? `${s.marks} marks` : `${s.count} task${s.count === 1 ? '' : 's'}`}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          on
                            ? 'bg-emerald-400'
                            : 'bg-gradient-to-r from-sky-500/70 to-violet-500/70 group-hover:from-sky-400 group-hover:to-violet-400'
                        }`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </aside>
  )
}

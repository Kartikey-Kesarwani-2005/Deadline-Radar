import { useEffect, useState } from 'react'
import { countdownTo, formatDue } from '../lib/dates'
import { subjectLoad } from '../lib/brain'

/**
 * 🛰 Live rail (wide screens only) — the "mission control" strip that fills the
 * right edge of a big monitor with things that actually move:
 *   1. a seconds-precision countdown to the NEXT deadline (the nearest pending,
 *      dated task), and
 *   2. a per-subject load meter (pending marks, heaviest bar first).
 * Everything else already lives in the left rail, so nothing here duplicates it.
 */
export default function LiveRail({ tasks, onPickSubject, activeSubject }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const pending = tasks.filter((t) => !t.done && t.dueDate)
  const next = pending.reduce(
    (best, t) => (!best || t.dueDate < best.dueDate ? t : best),
    null,
  )
  const cd = next ? countdownTo(next.dueDate, now) : null
  const load = subjectLoad(tasks)
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

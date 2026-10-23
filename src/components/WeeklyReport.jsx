import { useState } from 'react'
import { dayDiff, toDateKey, todayKey } from '../lib/dates'
import { marksAtRisk, onTimeStreak, paceRows, subjectLoad, weeklyTrend } from '../lib/brain'

const WEEK = 7 * 24 * 60 * 60 * 1000

function Row({ label, value, className = 'text-slate-100' }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/5 py-2 last:border-0">
      <span className="text-[13px] text-slate-400">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${className}`}>{value}</span>
    </div>
  )
}

export default function WeeklyReport({ tasks, onClose }) {
  const [copied, setCopied] = useState(false)
  const [copyErr, setCopyErr] = useState(false)

  const captured = tasks.filter((t) => t.createdAt && t.createdAt >= Date.now() - WEEK).length
  const finished = tasks.filter((t) => t.completedAt && t.completedAt >= Date.now() - WEEK)
  const onTime = finished.filter(
    (t) => t.dueDate && toDateKey(new Date(t.completedAt)) <= t.dueDate,
  ).length
  const pending = tasks.filter((t) => !t.done && t.dueDate).length
  const late = tasks.filter((t) => !t.done && t.dueDate && dayDiff(todayKey(), t.dueDate) < 0)
    .length
  const doneEver = tasks.filter((t) => t.done).length
  const risk = marksAtRisk(tasks)
  const pace = paceRows(tasks)
  const trend = weeklyTrend(tasks)
  const streak = onTimeStreak(tasks)
  const load = subjectLoad(tasks)
  const delta = (now, before) =>
    now > before ? 'text-emerald-300' : now < before ? 'text-red-400' : 'text-slate-100'

  const reportText = [
    'Deadline Radar — weekly check-in 📡',
    `📥 Captured this week: ${captured}`,
    `✅ Finished this week: ${finished.length} · on time: ${onTime}`,
    `📌 Pending with a deadline: ${pending}${late ? ` · late: ${late}` : ''}`,
    `🎯 Marks at risk: ${risk.total}${risk.late ? ` (${risk.late} already late)` : ''}`,
    `🏁 Total finished so far: ${doneEver}`,
    `🏆 On-time streak: ${streak} in a row`,
    `📈 Trend: finished ${trend.lastWeek.finished}→${trend.thisWeek.finished} · on time ${trend.lastWeek.onTime}→${trend.thisWeek.onTime} · focused ${(trend.thisWeek.focusMin / 60).toFixed(1)}h`,
    pace.length
      ? `🧠 Weakest subject: ${pace[0].label} (${pace[0].onTimeRate}% on time)`
      : null,
    '',
    'Built hands-free with Wispr Flow · #NoHandsChallenge',
  ]
    .filter(Boolean)
    .join('\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(reportText)
      setCopied(true)
      setCopyErr(false)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard can be blocked (permissions / non-secure context) — tell the
      // user instead of silently snapping the button back.
      setCopied(false)
      setCopyErr(true)
      setTimeout(() => setCopyErr(false), 3500)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Weekly report"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1424] p-5 shadow-2xl sm:max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">📊 Weekly report</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mb-2 text-[11px] uppercase tracking-widest text-slate-600">Last 7 days</p>
        <Row label="Captured" value={captured} />
        <Row label="Finished" value={finished.length} className="text-emerald-300" />
        <Row label="… of those finished on time" value={onTime} className="text-teal-300" />
        <Row
          label="🏆 On-time streak"
          value={streak > 0 ? `${streak} in a row` : 'start it today'}
          className={streak > 1 ? 'text-orange-300' : streak === 1 ? 'text-emerald-300' : 'text-slate-500'}
        />

        <p className="mt-4 mb-2 text-[11px] uppercase tracking-widest text-slate-600">
          📈 Trend vs last week
        </p>
        <Row
          label="Finished — last → this"
          value={`${trend.lastWeek.finished} → ${trend.thisWeek.finished}`}
          className={delta(trend.thisWeek.finished, trend.lastWeek.finished)}
        />
        <Row
          label="On time — last → this"
          value={`${trend.lastWeek.onTime} → ${trend.thisWeek.onTime}`}
          className={delta(trend.thisWeek.onTime, trend.lastWeek.onTime)}
        />
        <Row
          label="⏱ Focused (timer sessions)"
          value={`${(trend.thisWeek.focusMin / 60).toFixed(1)}h`}
          className="text-sky-300"
        />

        <p className="mt-4 mb-2 text-[11px] uppercase tracking-widest text-slate-600">Overall</p>
        <Row label="Pending with a deadline" value={pending} className="text-amber-300" />
        <Row label="Late right now" value={late} className="text-red-400" />
        <Row label="🎯 Marks at risk (late + this week)" value={risk.total} className="text-amber-300" />
        <Row label="Total finished" value={doneEver} className="text-emerald-300" />

        {load.length > 0 && (
          <>
            <p className="mt-4 mb-2 text-[11px] uppercase tracking-widest text-slate-600">
              📊 Pending load by subject (marks)
            </p>
            <div className="space-y-1.5">
              {load.map((s) => {
                const max = Math.max(1, load[0].marks)
                const pct = Math.max(4, Math.round((s.marks / max) * 100))
                return (
                  <div key={s.label} className="flex items-center gap-2 text-[11px]">
                    <span className="w-24 shrink-0 truncate text-slate-400" title={s.label}>
                      {s.label}
                    </span>
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-500/70 to-violet-500/70"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right font-medium tabular-nums text-slate-300">
                      {s.marks}m · {s.count}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-1.5 text-[10px] text-slate-600">
              Marks still pending per subject — heaviest first.
            </p>
          </>
        )}

        {pace.length > 0 && (
          <>
            <p className="mt-4 mb-2 text-[11px] uppercase tracking-widest text-slate-600">
              🧠 Per-subject pace (worst first)
            </p>
            <div className="overflow-hidden rounded-lg border border-white/5">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-white/[0.02] text-slate-500">
                    <th className="px-2.5 py-1.5 text-left font-medium">Subject</th>
                    <th className="px-2.5 py-1.5 text-right font-medium">On time</th>
                    <th className="px-2.5 py-1.5 text-right font-medium">Buffer</th>
                    <th className="px-2.5 py-1.5 text-right font-medium">min/mark</th>
                  </tr>
                </thead>
                <tbody>
                  {pace.map((r) => (
                    <tr key={r.key} className="border-t border-white/5">
                      <td className="px-2.5 py-1.5 text-left font-medium text-slate-200">{r.label}</td>
                      <td
                        className={`px-2.5 py-1.5 text-right font-semibold tabular-nums ${
                          r.onTimeRate >= 80
                            ? 'text-emerald-300'
                            : r.onTimeRate >= 50
                              ? 'text-amber-300'
                              : 'text-red-400'
                        }`}
                      >
                        {r.onTimeRate}%
                      </td>
                      <td
                        className={`px-2.5 py-1.5 text-right tabular-nums ${
                          r.avgBuffer >= 0 ? 'text-teal-300' : 'text-red-400'
                        }`}
                      >
                        {r.avgBuffer >= 0 ? '+' : ''}
                        {r.avgBuffer.toFixed(1)}d
                      </td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums text-slate-400">
                        {r.minPerMark != null ? r.minPerMark : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-slate-600">
              Buffer = days early (+) or late (−) you usually finish. min/mark is learned from your
              focus-timer sessions.
            </p>
          </>
        )}

        <button
          type="button"
          onClick={copy}
          className={`mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            copyErr
              ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/40'
              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
          }`}
        >
          {copied
            ? '✓ Copied — paste it in your check-in post'
            : copyErr
              ? '⚠️ Clipboard blocked — select the text above and copy manually'
              : 'Copy check-in text for your post'}
        </button>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-slate-600">
          Paste in your weekly post with <span className="text-slate-500">#NoHandsChallenge</span>{' '}
          and tag <span className="text-slate-500">WeMakeDevs</span> +{' '}
          <span className="text-slate-500">Wispr Flow</span>
        </p>
      </div>
    </div>
  )
}

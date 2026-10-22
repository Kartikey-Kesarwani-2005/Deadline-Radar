import { useState } from 'react'
import { dayDiff, toDateKey, todayKey } from '../lib/dates'

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

  const captured = tasks.filter((t) => t.createdAt && t.createdAt >= Date.now() - WEEK).length
  const finished = tasks.filter((t) => t.completedAt && t.completedAt >= Date.now() - WEEK)
  const onTime = finished.filter(
    (t) => t.dueDate && toDateKey(new Date(t.completedAt)) <= t.dueDate,
  ).length
  const pending = tasks.filter((t) => !t.done && t.dueDate).length
  const late = tasks.filter((t) => !t.done && t.dueDate && dayDiff(todayKey(), t.dueDate) < 0)
    .length
  const doneEver = tasks.filter((t) => t.done).length

  const reportText = [
    'Deadline Radar — weekly check-in 📡',
    `📥 Captured this week: ${captured}`,
    `✅ Finished this week: ${finished.length} · on time: ${onTime}`,
    `📌 Pending with a deadline: ${pending}${late ? ` · late: ${late}` : ''}`,
    `🏁 Total finished so far: ${doneEver}`,
    '',
    'Built hands-free with Wispr Flow · #NoHandsChallenge',
  ].join('\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(reportText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1424] p-5 shadow-2xl"
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

        <p className="mt-4 mb-2 text-[11px] uppercase tracking-widest text-slate-600">Overall</p>
        <Row label="Pending with a deadline" value={pending} className="text-amber-300" />
        <Row label="Late right now" value={late} className="text-red-400" />
        <Row label="Total finished" value={doneEver} className="text-emerald-300" />

        <button
          type="button"
          onClick={copy}
          className="mt-4 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
        >
          {copied ? '✓ Copied — paste it in your check-in post' : 'Copy check-in text for your post'}
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

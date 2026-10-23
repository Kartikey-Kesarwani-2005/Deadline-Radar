import { useEffect, useState } from 'react'
import { countdownTo, dayDiff, dueTone, formatDue, todayKey } from '../lib/dates'
import { fmtHours } from '../lib/brain'

const chipBase =
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium'

/**
 * ⏳ Live countdown chip — its own 30s tick so only this chip re-renders, not
 * the whole app. Shows time left to end-of-day ("2d 14h") on pending dated
 * cards; turns red once the deadline is over.
 */
function CountdownChip({ dueDate, done }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])
  if (done || !dueDate) return null
  const cd = countdownTo(dueDate, now)
  if (!cd) return null
  return (
    <span
      title={
        cd.late
          ? 'Past the deadline — handle it now'
          : 'Live time left until end of the deadline day'
      }
      className={`${chipBase} tabular-nums ${
        cd.late
          ? 'border-red-500/40 bg-red-500/15 text-red-300'
          : cd.d === 0 && cd.h < 6
            ? 'border-amber-400/40 bg-amber-400/15 text-amber-300'
            : 'border-teal-500/25 bg-teal-500/10 text-teal-300/90'
      }`}
    >
      ⏳ {cd.label}
    </span>
  )
}

export default function TaskCard({
  task,
  style,
  advice,
  estimate,
  onToggle,
  onDelete,
  onEdit,
  onDateChange,
  onShare,
  onFocus,
  focusing = false,
}) {
  const diff = task.dueDate ? dayDiff(todayKey(), task.dueDate) : null
  const isLate = !task.done && diff !== null && diff < 0

  return (
    <div
      title={task.source}
      style={style}
      className={`rise group relative flex items-start gap-3 rounded-xl border p-3 transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 ${
        task.done
          ? 'border-emerald-500/20 bg-emerald-500/[0.05]'
          : isLate
            ? 'border-red-500/30 bg-red-500/[0.06]'
            : diff === 0
              ? 'border-amber-500/25 bg-amber-500/[0.05]'
              : 'border-white/10 bg-white/[0.03] hover:border-white/20'
      }`}
    >
      {/* urgency rail — a left-edge tell for scanning: red = late, amber = today */}
      {!task.done && (isLate || diff === 0) && (
        <span
          aria-hidden="true"
          className={`absolute inset-y-3 left-0 w-[3px] rounded-full ${
            isLate ? 'bg-red-400/80' : 'bg-amber-400/80'
          }`}
        />
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] transition ${
          task.done
            ? 'border-emerald-400 bg-emerald-400 text-slate-950'
            : 'border-slate-500 text-transparent hover:border-emerald-400 hover:text-emerald-400'
        }`}
      >
        ✓
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-snug break-words ${
            task.done ? 'text-slate-500 line-through' : 'text-slate-100'
          }`}
        >
          {task.title}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {task.subject && (
            <span className={`${chipBase} border-sky-500/30 bg-sky-500/10 text-sky-300`}>
              {task.subject}
            </span>
          )}
          {task.marks != null && (
            <span className={`${chipBase} border-violet-500/30 bg-violet-500/10 text-violet-300`}>
              {task.marks} marks
            </span>
          )}
          {task.repeat === 'weekly' && (
            <span
              title="Repeats weekly — ticking it off rolls the next occurrence onto the radar automatically"
              className={`${chipBase} border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300`}
            >
              🔁 weekly
            </span>
          )}
          {estimate && !task.done && (
            <span
              title={
                estimate.learned
                  ? 'Learned from your own focus-timer sessions'
                  : 'Estimate until you track it with the focus timer'
              }
              className={`${chipBase} border-teal-500/30 bg-teal-500/10 text-teal-300`}
            >
              ⏱ ≈{fmtHours(estimate.minutes)}
              {estimate.learned ? ' 🧠' : ''}
            </span>
          )}
          <span className={`${chipBase} ${dueTone(task)}`}>📅 {formatDue(task.dueDate)}</span>
          <CountdownChip dueDate={task.dueDate} done={task.done} />
          {task.priority === 'high' && !task.done && (
            <span className={`${chipBase} border-red-500/40 bg-red-500/15 font-bold text-red-300`}>
              HIGH
            </span>
          )}
          {advice && (
            <span
              title="From your own submission history"
              className={`${chipBase} ${
                advice.tone === 'warn'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              }`}
            >
              🧠 {advice.text}
            </span>
          )}
          {task.link && (
            <a
              href={task.link}
              target="_blank"
              rel="noreferrer noopener"
              title={`Open submission portal — ${task.link}`}
              onClick={(e) => e.stopPropagation()}
              className={`${chipBase} border-indigo-500/30 bg-indigo-500/10 text-indigo-300 transition hover:border-indigo-400/60 hover:text-indigo-200`}
            >
              🔗 Portal
            </a>
          )}

          <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <input
              type="date"
              value={task.dueDate || ''}
              onChange={(e) => onDateChange(e.target.value || null)}
              aria-label="Change due date"
              className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[11px] text-slate-400 focus:border-emerald-500/50 focus:outline-none"
            />
          </label>
        </div>
      </div>

      {!task.done && (
        <button
          type="button"
          onClick={onFocus}
          aria-label={focusing ? 'Stop focus timer' : 'Start focus timer'}
          title={
            focusing
              ? 'Focus running — click to stop and save the minutes'
              : 'Start a focus timer — the radar learns your real pace'
          }
          className={`mt-0.5 shrink-0 rounded p-1 transition ${
            focusing
              ? 'task-actions bg-emerald-500/15 text-emerald-300 opacity-100'
              : 'task-actions text-slate-700 opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-emerald-300 focus:opacity-100'
          }`}
        >
          {focusing ? '⏹' : '▶️'}
        </button>
      )}

      <button
        type="button"
        onClick={onShare}
        aria-label="Copy share text"
        title="Copy for WhatsApp / group"
        className="mt-0.5 shrink-0 rounded p-1 text-slate-700 task-actions opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-slate-300 focus:opacity-100"
      >
        📤
      </button>

      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit task"
        className="mt-0.5 shrink-0 rounded p-1 text-slate-700 task-actions opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-slate-300 focus:opacity-100"
      >
        ✏️
      </button>

      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete task"
        className="mt-0.5 shrink-0 rounded p-1 text-slate-700 task-actions opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 focus:opacity-100"
      >
        ✕
      </button>
    </div>
  )
}

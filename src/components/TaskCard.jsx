import { dayDiff, dueTone, formatDue, todayKey } from '../lib/dates'

const chipBase =
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium'

export default function TaskCard({ task, onToggle, onDelete, onEdit, onDateChange, onShare }) {
  const diff = task.dueDate ? dayDiff(todayKey(), task.dueDate) : null
  const isLate = !task.done && diff !== null && diff < 0

  return (
    <div
      title={task.source}
      className={`group flex items-start gap-3 rounded-xl border p-3 transition ${
        task.done
          ? 'border-emerald-500/20 bg-emerald-500/[0.05]'
          : isLate
            ? 'border-red-500/30 bg-red-500/[0.06]'
            : 'border-white/10 bg-white/[0.03] hover:border-white/20'
      }`}
    >
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
          <span className={`${chipBase} ${dueTone(task)}`}>📅 {formatDue(task.dueDate)}</span>
          {task.priority === 'high' && !task.done && (
            <span className={`${chipBase} border-red-500/40 bg-red-500/15 font-bold text-red-300`}>
              HIGH
            </span>
          )}

          <label className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-600">
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

      <button
        type="button"
        onClick={onShare}
        aria-label="Copy share text"
        title="Copy for WhatsApp / group"
        className="mt-0.5 shrink-0 rounded p-1 text-slate-700 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-slate-300 focus:opacity-100"
      >
        📤
      </button>

      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit task"
        className="mt-0.5 shrink-0 rounded p-1 text-slate-700 opacity-0 transition group-hover:opacity-100 hover:bg-white/10 hover:text-slate-300 focus:opacity-100"
      >
        ✏️
      </button>

      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete task"
        className="mt-0.5 shrink-0 rounded p-1 text-slate-700 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 focus:opacity-100"
      >
        ✕
      </button>
    </div>
  )
}

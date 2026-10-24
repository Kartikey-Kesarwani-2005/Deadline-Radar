import { useEffect, useState } from 'react'
import { countdownTo, dayDiff, dueTone, formatDue, todayKey } from '../lib/dates'
import { fmtHours } from '../lib/brain'

/**
 * ⏳ Live countdown tag — its own 30s tick so only this tag re-renders.
 * Shows time left to end-of-day ("2d 14h") on pending dated cards.
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
      className={`tag tabular-nums ${
        cd.late
          ? 'border-late/40 bg-late-soft text-late'
          : cd.d === 0 && cd.h < 6
            ? 'border-today/45 bg-today-soft text-today'
            : 'border-line bg-paper text-ink-2'
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
  onPostpone,
  focusing = false,
}) {
  const diff = task.dueDate ? dayDiff(todayKey(), task.dueDate) : null
  const isLate = !task.done && diff !== null && diff < 0

  return (
    <div
      title={task.source}
      style={style}
      className={`rise group relative flex items-start gap-2.5 rounded-[4px] border px-3 py-2.5 pl-3.5 transition hover:-translate-y-0.5 hover:shadow-[2px_2px_0_rgba(29,27,22,0.85)] ${
        task.done
          ? 'border-done/25 bg-done-soft/45'
          : isLate
            ? 'border-late/35 bg-paper-2 hover:border-late/60'
            : diff === 0
              ? 'border-today/40 bg-paper-2 hover:border-today/60'
              : 'border-line bg-paper-2 hover:border-ink/45'
      }`}
    >
      {/* urgency rail — a left-edge tell for scanning: red = late, ochre = today */}
      {!task.done && (isLate || diff === 0) && (
        <span
          aria-hidden="true"
          className={`absolute inset-y-2 left-0 w-[3px] rounded-r-full ${
            isLate ? 'bg-late' : 'bg-today'
          }`}
        />
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px] border-[1.5px] text-[11px] transition ${
          task.done
            ? 'border-done bg-done text-paper-2'
            : 'border-ink/60 bg-paper text-transparent hover:border-done hover:text-done'
        }`}
      >
        ✓
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`text-[13.5px] leading-snug break-words ${
            task.done ? 'text-ink-3 line-through' : 'font-medium text-ink'
          }`}
        >
          {task.title}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {task.subject && (
            <span className="tag border-later/30 bg-later-soft text-later">{task.subject}</span>
          )}
          {task.marks != null && (
            <span className="tag border-week/35 bg-week-soft text-week">{task.marks} marks</span>
          )}
          {task.repeat === 'weekly' && (
            <span
              title="Repeats weekly — ticking it off rolls the next occurrence onto the radar automatically"
              className="tag border-ink/25 bg-paper text-ink-2"
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
              className="tag border-done/30 bg-done-soft text-done"
            >
              ⏱ ≈{fmtHours(estimate.minutes)}
              {estimate.learned ? ' 🧠' : ''}
            </span>
          )}
          <span className={`tag ${dueTone(task)}`}>📅 {formatDue(task.dueDate)}</span>
          <CountdownChip dueDate={task.dueDate} done={task.done} />
          {task.priority === 'high' && !task.done && (
            <span className="tag border-late bg-late font-semibold tracking-[0.08em] text-paper-2 uppercase">
              High
            </span>
          )}
          {advice && (
            <span
              title="From your own submission history"
              className={`tag ${
                advice.tone === 'warn'
                  ? 'border-today/40 bg-today-soft text-today'
                  : 'border-done/30 bg-done-soft text-done'
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
              className="tag border-later/35 bg-later-soft text-later transition hover:border-later hover:text-ink"
            >
              🔗 Portal
            </a>
          )}

          <label className="flex items-center gap-1.5 font-mono text-[9px] text-ink-3 uppercase">
            <input
              type="date"
              value={task.dueDate || ''}
              onChange={(e) => onDateChange(e.target.value || null)}
              aria-label={`Change due date for ${task.title}`}
              className="rounded-[3px] border border-line bg-paper px-1 py-0.5 font-mono text-[10px] text-ink-2 focus:border-ink focus:outline-none"
            />
          </label>
        </div>
      </div>

      {!task.done && (
        <button
          type="button"
          onClick={onFocus}
          aria-label={`${focusing ? 'Stop' : 'Start'} focus timer for ${task.title}`}
          title={
            focusing
              ? 'Focus running — click to stop and save the minutes'
              : 'Start a focus timer — the radar learns your real pace'
          }
          className={`task-actions mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-[11px] transition ${
            focusing
              ? 'bg-done-soft text-done opacity-100 ring-1 ring-done/40'
              : 'text-ink-3 opacity-0 group-hover:opacity-100 hover:bg-paper-3 hover:text-done focus:opacity-100'
          }`}
        >
          {focusing ? '⏹' : '▶'}
        </button>
      )}

      {!task.done && (
        <button
          type="button"
          onClick={onPostpone}
          aria-label={`Postpone ${task.title} by one day`}
          title="Push the deadline by one day — undo lives in the toast"
          className="task-actions mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-[11px] text-ink-3 opacity-0 transition group-hover:opacity-100 hover:bg-paper-3 hover:text-today focus:opacity-100"
        >
          ⏭
        </button>
      )}

      <button
        type="button"
        onClick={onShare}
        aria-label={`Copy share text for ${task.title}`}
        title="Copy for WhatsApp / group"
        className="task-actions mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-[11px] text-ink-3 opacity-0 transition group-hover:opacity-100 hover:bg-paper-3 hover:text-ink focus:opacity-100"
      >
        📤
      </button>

      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${task.title}`}
        className="task-actions mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-[11px] text-ink-3 opacity-0 transition group-hover:opacity-100 hover:bg-paper-3 hover:text-ink focus:opacity-100"
      >
        ✏️
      </button>

      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${task.title}`}
        className="task-actions mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-[11px] text-ink-3 opacity-0 transition group-hover:opacity-100 hover:bg-late-soft hover:text-late focus:opacity-100"
      >
        ✕
      </button>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { countdownTo, dayDiff, dueTone, formatDue, todayKey } from '../lib/dates'
import { fmtHours } from '../lib/brain'
import { googleCalendarUrl } from '../lib/calendar'
import { subjectInk, subjectStyle } from '../lib/subjects'
import PlanPanel from './PlanPanel'
import Icon from './Icon'

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
            : 'border-line bg-paper text-ink-3'
      }`}
    >
      <Icon name="clock" size={11} /> {cd.label}
    </span>
  )
}

/**
 * 🎯 Risk dial — a hand-inked 0–100 urgency ring. One glance says how badly
 * a deadline can bite; hover names exactly why (days, marks, pace, history).
 */
function RiskDial({ risk }) {
  if (!risk) return null
  const C = 2 * Math.PI * 10
  const off = C * (1 - risk.score / 100)
  const ink =
    risk.level === 'critical'
      ? 'var(--color-late)'
      : risk.level === 'high'
        ? 'var(--color-today)'
        : risk.level === 'watch'
          ? 'var(--color-week)'
          : 'var(--color-later)'
  return (
    <span
      title={`Risk score ${risk.score}/100 — ${risk.reasons.join(' · ')}`}
      className="relative inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center"
    >
      <svg viewBox="0 0 24 24" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-line)" strokeWidth="2.6" />
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke={ink}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={off}
        />
      </svg>
      <span
        role="img"
        aria-label={`Risk score ${risk.score} out of 100`}
        className="absolute flex h-full w-full items-center justify-center font-mono text-[8.5px] font-semibold tabular-nums"
        style={{ color: ink }}
      >
        {risk.score}
      </span>
    </span>
  )
}

export default function TaskCard({
  task,
  style,
  advice,
  estimate,
  plan,
  risk,
  onToggle,
  onSelectToggle,
  selecting = false,
  selected = false,
  onDelete,
  onEdit,
  onDateChange,
  onShare,
  onFocus,
  onPostpone,
  onCopyPlan,
  focusing = false,
}) {
  const diff = task.dueDate ? dayDiff(todayKey(), task.dueDate) : null
  const isLate = !task.done && diff !== null && diff < 0
  const [showPlan, setShowPlan] = useState(false)
  const gcal = !task.done ? googleCalendarUrl(task) : null

  return (
    <div
      title={task.source}
      style={style}
      className={`task-card group reveal ${
        selected
          ? 'border-ink shadow-[2px_2px_0_rgba(29,27,22,0.35)]'
          : task.done
            ? 'is-done border-done/25 bg-done-soft/40'
            : isLate
              ? 'border-late/35 hover:border-late/60'
              : diff === 0
                ? 'border-today/40 hover:border-today/60'
                : 'hover:border-ink/45'
      }`}
    >
      {/* urgency rail — a left-edge tell for scanning: red = late, ochre = today */}
      {!task.done && !selected && (isLate || diff === 0) && (
        <span
          aria-hidden="true"
          className={`absolute inset-y-2 left-0 w-[3px] rounded-r-full ${
            isLate ? 'bg-late' : 'bg-today'
          }`}
        />
      )}
      {/* subject rail — the same ink as the almanac dots and load meters, used
          only when urgency is not already shouting from the same edge */}
      {!task.done && !selected && task.subject && !isLate && diff !== 0 && (
        <span
          aria-hidden="true"
          title={`Subject ink: ${task.subject}`}
          className="absolute inset-y-3 left-0 w-[3px] rounded-r-full opacity-80"
          style={{ background: subjectInk(task.subject) }}
        />
      )}

      <button
        type="button"
        onClick={selecting ? onSelectToggle : onToggle}
        aria-label={
          selecting
            ? `${
                selected ? 'Deselect' : 'Select'
              } ${task.title} for bulk action`
            : task.done
              ? 'Mark as not done'
              : 'Mark as done'
        }
        aria-pressed={selecting ? selected : undefined}
        title={
          selecting
            ? selected
              ? 'Deselect — bulk actions live in the bar above the list'
              : 'Select for a bulk action (done, postpone, delete)'
            : task.done
              ? 'Tick back'
              : 'Tick done'
        }
        className={`task-check ${(task.done || (selecting && selected)) ? 'is-done' : ''}`}
      >
        <Icon
          name={selecting && !selected && !task.done ? 'square' : 'check'}
          size={11}
          strokeWidth={2.6}
        />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`text-[13.5px] leading-[1.45] break-words ${
            task.done ? 'text-ink-3 line-through' : 'font-medium text-ink'
          }`}
        >
          {task.title}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {!task.done && <RiskDial risk={risk} />}
          {task.subject && (
            <span className="tag bg-paper" style={subjectStyle(task.subject, { soft: true })}>
              {task.subject}
            </span>
          )}
          {task.marks != null && (
            <span className="tag border-line bg-paper text-ink-2">{task.marks} marks</span>
          )}
          {task.repeat === 'weekly' && (
            <span
              title="Repeats weekly — ticking it off rolls the next occurrence onto the radar automatically"
              className="tag border-line bg-paper text-ink-2"
            >
              <Icon name="repeat" size={11} /> weekly
            </span>
          )}
          {estimate && !task.done && (
            <span
              title={
                estimate.learned
                  ? 'Learned from your own focus-timer sessions'
                  : 'Estimate until you track it with the focus timer'
              }
              className="tag border-line bg-paper text-ink-2"
            >
              ≈{fmtHours(estimate.minutes)}
              {estimate.learned && (
                <Icon name="spark" size={10} className="text-done" title="Learned from your sessions" />
              )}
            </span>
          )}
          <span className={`tag ${dueTone(task)}`}>
            <Icon name="calendar" size={11} /> {formatDue(task.dueDate)}
          </span>
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
              <Icon name="spark" size={11} /> {advice.text}
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
              <Icon name="external" size={11} /> Portal
            </a>
          )}
          {gcal && (
            <a
              href={gcal}
              target="_blank"
              rel="noreferrer noopener"
              title="Add this deadline to Google Calendar — prefilled all-day event"
              onClick={(e) => e.stopPropagation()}
              className="tag border-later/35 bg-paper text-later transition hover:border-later hover:text-ink"
            >
              <Icon name="calendarPlus" size={11} /> GCal
            </a>
          )}

          {!task.done && (
            <label className="flex items-center font-mono text-[9px] text-ink-3 uppercase">
              <input
                type="date"
                value={task.dueDate || ''}
                onChange={(e) => onDateChange(e.target.value || null)}
                aria-label={`Change due date for ${task.title}`}
                className="task-date"
              />
            </label>
          )}
        </div>

        {/* 📋 Study plan drawer — opened from the plan action button below */}
        {!task.done && showPlan && (
          <PlanPanel
            plan={plan}
            task={task}
            onCopy={() => onCopyPlan?.(task, plan)}
          />
        )}
      </div>

      <div className="task-actions">
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
            className={`task-action is-focus ${focusing ? 'bg-done-soft ring-1 ring-done/40' : ''}`}
          >
            <Icon name={focusing ? 'stop' : 'play'} size={13} />
          </button>
        )}

        {!task.done && (
          <button
            type="button"
            onClick={() => setShowPlan((v) => !v)}
            aria-expanded={showPlan}
            aria-label={`${
              showPlan ? 'Hide' : 'Show'
            } study plan for ${task.title}`}
            title="Plan banao — break this deadline into day-by-day study sessions"
            className={`task-action ${showPlan ? 'bg-later-soft text-later' : ''}`}
          >
            <Icon name="list" size={13} />
          </button>
        )}

        {!task.done && (
          <button
            type="button"
            onClick={onPostpone}
            aria-label={`Postpone ${task.title} by one day`}
            title="Push the deadline by one day — undo lives in the toast"
            className="task-action"
          >
            <Icon name="skip" size={13} />
          </button>
        )}

        <button
          type="button"
          onClick={onShare}
          aria-label={`Copy share text for ${task.title}`}
          title="Copy for WhatsApp / group"
          className="task-action"
        >
          <Icon name="share" size={13} />
        </button>

        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${task.title}`}
          className="task-action"
        >
          <Icon name="pencil" size={13} />
        </button>

        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${task.title}`}
          className="task-action is-danger"
        >
          <Icon name="x" size={13} />
        </button>
      </div>
    </div>
  )
}

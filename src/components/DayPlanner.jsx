import { useState } from 'react'
import { daySchedule, formatClock, timetableCopyText } from '../lib/plan'
import { dayDiff, todayKey } from '../lib/dates'
import Icon from './Icon'

/**
 * 🕐 Aaj ka timetable — the day-sheet. It answers the question no other
 * tracker asks hour by hour: "aaj, kis time, kya karun?" Blocks are ranked by
 * the do-now engine (late first, then marks-per-hour), the ▶ button starts a
 * real focus session on that block, and anything that cannot honestly fit
 * today reads as overflow — never a faked timetable.
 */
export default function DayPlanner({ tasks, onStart, focusId, onCopy }) {
  const schedule = daySchedule(tasks)
  const [copied, setCopied] = useState(false)

  if (!schedule) {
    return (
      <div className="rise rounded-[5px] border border-done/35 bg-done-soft/60 px-3.5 py-2.5 text-center text-xs text-ink-2">
        <p className="font-mono text-[9px] tracking-[0.18em] text-done uppercase">
          <Icon name="clock" size={11} /> Aaj ka timetable
        </p>
        <p className="mt-1">Kuch dated pending nahi — timetable clear. 🌤️</p>
      </div>
    )
  }
  if (!schedule.blocks.length) {
    return (
      <div className="rise rounded-[5px] border border-late/35 bg-late-soft/60 px-3.5 py-2.5 text-xs text-ink-2">
        <p className="font-mono text-[9px] tracking-[0.18em] text-late uppercase">
          <Icon name="clock" size={11} /> Aaj ka timetable — day khatam
        </p>
        <p className="mt-1">
          Aaj 10 pm tak fit nahi hua. {schedule.overflow[0]?.title
            ? `Sabse pehle: ${schedule.overflow[0].title.slice(0, 46)}`
            : 'Kal ka pehla block ready hai.'}
        </p>
      </div>
    )
  }

  const hours = (schedule.totalMin / 60).toFixed(1)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(timetableCopyText(schedule))
      setCopied(true)
      onCopy?.(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      onCopy?.(false)
    }
  }

  return (
    <div className="paper-card rounded-[5px] px-3.5 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-[0.18em] text-ink-2 uppercase">
          <Icon name="volume" size={11} className="text-later" />
          Aaj ka timetable
        </p>
        <p className="font-mono text-[9px] tracking-wide text-ink-3">
          {schedule.blocks.length} block{schedule.blocks.length > 1 ? 's' : ''} · ~{hours}h ·
          {formatClock(schedule.startMin)} → {formatClock(schedule.endMin)}
        </p>
      </div>

      <ol className="mt-2 space-y-1">
        {schedule.blocks.map((b, i) => {
          const running = focusId === b.task.id
          // Tone mirrors the card's urgency rail: red late, ochre today, olive week.
          const diff = dayDiff(todayKey(), b.task.dueDate)
          const tone = !diff || diff < 0 ? 'bg-late' : diff === 0 ? 'bg-today' : 'bg-week'
          return (
            <li
              key={b.task.id}
              className="flex items-baseline gap-2.5 rounded-[3px] border border-line bg-paper-2/70 px-2 py-1.5"
            >
              <span
                aria-hidden="true"
                className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${tone}`}
              />
              <span className="shrink-0 font-mono text-[10px] font-medium tabular-nums text-ink">
                {formatClock(b.startMin)}–{formatClock(b.endMin)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-ink-2" title={b.task.title}>
                {b.task.title}
              </span>
              <span className="shrink-0 font-mono text-[9.5px] tabular-nums text-ink-3">
                ~{b.minutes}m
              </span>
              <button
                type="button"
                onClick={() => onStart(b.task.id)}
                disabled={running}
                aria-label={`${running ? 'Focus running on' : 'Start focus on'} ${b.task.title}`}
                title={
                  running
                    ? 'Focus already running — stop it from the header'
                    : `Start a focus timer on "${b.task.title}" — the timetable's minutes become real`
                }
                className={`task-action is-focus shrink-0 ${running ? 'bg-done-soft' : ''}`}
              >
                <Icon name={running ? 'stop' : 'play'} size={12} />
              </button>
              <span aria-hidden="true" className="hidden font-mono text-[9px] text-ink-3 sm:inline">
                {i + 1}
              </span>
            </li>
          )
        })}
      </ol>

      {schedule.overflow.length > 0 && (
        <p className="mt-1.5 font-mono text-[9.5px] tracking-wide text-ink-3">
          + {schedule.overflow.length} pending aaj fit nahi hua — sabse pehle:{' '}
          {schedule.overflow[0].title.slice(0, 40)}
          {schedule.overflow[0].title.length > 40 ? '…' : ''}
        </p>
      )}

      <button
        type="button"
        onClick={copy}
        title="Copy the timetable for your notes or the group"
        className="mt-2 flex items-center gap-1 font-mono text-[9px] tracking-[0.1em] text-later uppercase transition hover:text-ink"
      >
        <Icon name={copied ? 'check' : 'copy'} size={10} />
        {copied ? 'Copied ✓' : 'Copy timetable'}
      </button>
    </div>
  )
}

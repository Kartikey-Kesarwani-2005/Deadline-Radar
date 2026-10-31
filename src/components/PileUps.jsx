import Icon from './Icon'
import { dayDiff, parseDateKey, todayKey } from '../lib/dates'

/**
 * 🚦 Pile-up watch — "ek din, teen submission" warning. The clash detector no
 * other radar runs: when two or more dated tasks land on the same upcoming
 * day, the desk prints a lane chip for it — tap to open the radar filtered to
 * that exact day and start the early leg. Honest: only real pending clashes.
 */
export default function PileUps({ ups, onPick }) {
  if (!ups?.length) return null
  return (
    <div className="rise rounded-[5px] border border-today/40 bg-today-soft/50 px-3.5 py-2.5">
      <p className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-[0.18em] text-today uppercase">
        <Icon name="alert" size={11} />
        Pile-up watch
        <span className="font-normal tracking-wide text-ink-3 normal-case">
          — ek din par zyada lagen hain
        </span>
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {ups.map((u) => {
          // Compact, honest chip label: "Today · Fri 31 Oct" — never a live
          // "in 3 days" string that reads like a countdown on a clash lane.
          const diff = dayDiff(todayKey(), u.date)
          const d = parseDateKey(u.date)
          const label = `${
            diff === 0 ? 'Today ·' : d?.toLocaleDateString('en-IN', { weekday: 'short' })
          } ${d?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
          return (
            <button
              key={u.date}
              type="button"
              onClick={() => onPick(u.date)}
              title={`Open the radar filtered to ${label} — ${u.titles.join(', ')}`}
              className="flex items-baseline gap-1.5 rounded-[3px] border border-ink/70 bg-paper px-2 py-1 text-left font-mono text-[10px] leading-tight tabular-nums transition hover:-translate-y-[1px] hover:shadow-[2px_2px_0_rgba(29,27,22,0.25)]"
            >
              <span aria-hidden="true" className="text-today">
                ⚠
              </span>
              <span className="font-semibold text-ink">{label}</span>
              <span className="text-ink-2">
                {u.count} task{u.count > 1 ? 's' : ''} · {u.marks}m
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

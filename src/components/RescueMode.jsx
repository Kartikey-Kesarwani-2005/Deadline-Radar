import { useMemo, useState } from 'react'
import { buildRescuePlan, rescueDueLabel, RESCUE_LEVELS, RESCUE_POLICY } from '../lib/rescue'
import { fmtHours } from '../lib/brain'
import Icon from './Icon'

const TIER_TEXT = {
  late: 'text-late',
  today: 'text-today',
  week: 'text-week',
  later: 'text-later',
}

const TIER_DOT = {
  late: 'bg-late',
  today: 'bg-today',
  week: 'bg-week',
  later: 'bg-later',
}

/** The same four inks as CSS custom properties — each rescue row wears its
 *  tier's colour on the left edge, so the triage order reads at a glance. */
const TIER_INK = {
  late: 'var(--color-late)',
  today: 'var(--color-today)',
  week: 'var(--color-week)',
  later: 'var(--color-later)',
}

const TIER_KEYS = [
  { tone: 'late', label: 'Late — rescue first' },
  { tone: 'today', label: 'Today/tomorrow — must-do' },
  { tone: 'week', label: 'This week' },
  { tone: 'later', label: 'Later — head start' },
]

/**
 * 🚨 Deadline Rescue Mode — a finite, honest triage window.
 * The student picks 30, 60 or 120 minutes; the module reuses the radar's
 * existing due-date + effort ranking and commits only what actually fits.
 * Anything that cannot fit is named as overflow instead of hidden.
 * 
 * Progressive reveal: each rescue step draws in sequence, so the plan
 * reads like a briefing being written in real time.
 */
export default function RescueMode({ tasks = [], today, onStart, focusId }) {
  const [budget, setBudget] = useState(60)
  const plan = useMemo(() => buildRescuePlan(tasks, budget, today), [tasks, budget, today])

  if (!plan) return null

  const selected = RESCUE_LEVELS.find((level) => level.minutes === budget) || RESCUE_LEVELS[1]
  const pct = plan.budget ? Math.round((plan.used / plan.budget) * 100) : 0
  const overflowLabel = `${plan.deferredCount} item${plan.deferredCount === 1 ? '' : 's'}`

  return (
    <section
      className="rescue-card paper-card overflow-hidden reveal section-reveal"
      aria-label="Deadline Rescue Mode"
    >
      <div
        data-parallax="0.04"
        className="rescue-head flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-4 py-3"
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.2em] text-today-soft uppercase">
            <Icon name="alert" size={12} />
            Deadline Rescue Mode
          </p>
          <h2 className="rescue-title mt-1 font-serif text-[21px] leading-tight font-semibold text-paper-2">
            Pick a window. Save the deadlines that bite first.
          </h2>
          <p className="mt-1 max-w-2xl text-[11.5px] leading-snug text-paper-2/65">
            Real triage: the radar commits only what honestly fits, and names the overflow instead of
            hiding it.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="rescue-stamp">Triage</span>
          {plan.items.length > 0 && onStart && (
            <button
              type="button"
              onClick={() => onStart(plan.items[0].task.id)}
              disabled={focusId === plan.items[0].task.id}
              title={
                focusId === plan.items[0].task.id
                  ? 'Focus already running on the first rescue task'
                  : `Start a focus timer on the first task of this ${selected.label} window — "${plan.items[0].task.title}"`
              }
              className="rescue-cta"
            >
              <Icon name={focusId === plan.items[0].task.id ? 'stop' : 'play'} size={12} />
              {focusId === plan.items[0].task.id ? 'Running' : 'Start rescue'}
            </button>
          )}
        </div>
      </div>

      <div className="px-3.5 py-3">
        <div className="flex flex-wrap items-center gap-1.5 reveal--fade" style={{ '--reveal-delay': '0ms' }}>
          <span className="font-mono text-[9px] tracking-[0.14em] text-ink-3 uppercase">
            Rescue window
          </span>
          <div role="group" aria-label="Rescue study time" className="flex flex-wrap gap-1">
            {RESCUE_LEVELS.map((level) => {
              const active = level.minutes === budget
              return (
                <button
                  key={level.minutes}
                  type="button"
                  onClick={() => setBudget(level.minutes)}
                  aria-pressed={active}
                  title={`${level.minutes} minute rescue window — ${level.hint}`}
                  className={`rescue-level ${active ? 'is-on' : ''}`}
                >
                  {level.label}
                </button>
              )
            })}
          </div>
          <span className="ml-auto font-mono text-[9px] text-ink-3">
            {plan.pendingCount} pending · ~{fmtHours(plan.requiredMinutes)} of work
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 reveal--fade" style={{ '--reveal-delay': '60ms' }}>
          <p className="font-mono text-[9.5px] tracking-wide text-ink-2">
            {plan.items.length} task{plan.items.length === 1 ? '' : 's'} ·{' '}
            <span className="font-semibold text-ink">{fmtHours(plan.used)} committed</span>
            <span className="text-ink-3"> of {selected.label}</span>
          </p>
          <p className="font-mono text-[9px] text-ink-3">
            {plan.remaining > 0 ? `${plan.remaining}m spare` : 'window full'}
          </p>
        </div>
        <div
          className={`rescue-meter mt-1.5 reveal--lift ${pct >= 100 ? 'is-full' : ''}`}
          style={{ '--reveal-delay': '120ms' }}
          role="progressbar"
          aria-label="Rescue window used"
          aria-valuemin={0}
          aria-valuemax={plan.budget}
          aria-valuenow={plan.used}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        <div
          className="mt-1 flex items-baseline justify-between font-mono text-[8px] tracking-[0.1em] text-ink-3 uppercase reveal--fade"
          style={{ '--reveal-delay': '160ms' }}
          aria-hidden="true"
        >
          <span>0m</span>
          <span>{selected.label} committed · {pct}% used</span>
        </div>

        <ol className="rescue-steps mt-2.5 space-y-1.5" role="list" aria-label="Rescue plan steps">
          {plan.items.map((item, index) => {
            const running = focusId === item.task.id
            const tone = item.tier.tone
            const delay = index * 80
            return (
              <li
                key={item.task.id}
                className={`rescue-step rescue-row rounded-[3px] border border-line bg-paper px-2.5 py-2 ${
                  running ? 'is-running' : ''
                }`}
                style={{ '--reveal-delay': `${delay}ms`, '--tier': TIER_INK[tone] || 'var(--color-line)' }}
              >
                <div className="flex items-start gap-2">
                  <span aria-hidden="true" className="rescue-rank mt-0.5 shrink-0">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span
                        aria-hidden="true"
                        className={`h-2 w-2 shrink-0 rounded-full ${TIER_DOT[tone] || 'bg-ink-3'}`}
                      />
                      <span
                        className={`font-mono text-[8.5px] tracking-[0.12em] uppercase ${TIER_TEXT[tone] || 'text-ink-3'}`}
                      >
                        {item.tier.label}
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate text-[13px] leading-snug font-medium text-ink"
                        title={item.task.title}
                      >
                        {item.task.title}
                      </span>
                      <span className="shrink-0 font-mono text-[9px] tabular-nums text-ink-3">
                        {item.startMin}–{item.endMin}m
                      </span>
                    </div>
                    <p className="mt-0.5 font-mono text-[9px] text-ink-3">
                      {rescueDueLabel(item, today)} · ~{fmtHours(item.minutes)} needed
                      {item.partial && (
                        <span className="text-late"> · first {fmtHours(item.allocated)} only</span>
                      )}
                    </p>
                    <p className="mt-1 text-[10.5px] leading-snug text-ink-2">
                      {item.reasons.slice(0, 3).join(' · ')}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rescue-allocation">{item.allocated}m</span>
                    <button
                      type="button"
                      onClick={() => onStart(item.task.id)}
                      disabled={running || !onStart}
                      aria-label={`${running ? 'Focus running on' : 'Start focus on'} ${item.task.title}`}
                      title={
                        running
                          ? 'Focus already running — stop it from the header'
                          : `Start a focus timer on "${item.task.title}"`
                      }
                      className={`task-action is-focus shrink-0 ${running ? 'bg-done-soft ring-1 ring-done/40' : ''}`}
                    >
                      <Icon name={running ? 'stop' : 'play'} size={12} />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ol>

        {(plan.overloaded ? (
          <div
            className={`mt-2 rounded-[3px] border px-2.5 py-2 reveal--slide ${plan.urgentOverloaded ? 'border-late/40 bg-late-soft/70' : 'border-today/40 bg-today-soft/70'}`}
            style={{ '--reveal-delay': `${plan.items.length * 80 + 120}ms` }}
          >
            <p
              className={`flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-[0.12em] uppercase ${plan.urgentOverloaded ? 'text-late' : 'text-today'}`}
            >
              <Icon name="alert" size={11} />
              Workload exceeds this window
            </p>
            <p className="mt-1 text-[10.5px] leading-relaxed text-ink-2">
              {plan.urgentOverloaded
                ? `~${fmtHours(plan.urgentMinutes)} is late or due within 2 days, but this ${selected.label} window only commits ${fmtHours(plan.used)}. The highest-risk work is saved first; ${overflowLabel} must move to the next block.`
                : `~${fmtHours(plan.requiredMinutes)} is still pending, and this window commits ${fmtHours(plan.used)}. ${overflowLabel} rolls to the next rescue block.`}
            </p>
          </div>
        ) : (
          <p className="mt-2 flex items-center gap-1.5 font-mono text-[9px] text-done reveal--fade" style={{ '--reveal-delay': `${plan.items.length * 80 + 120}ms` }}>
            <Icon name="check" size={11} />
            Everything pending fits this window{plan.remaining > 0 ? ` — ${plan.remaining}m spare` : ''}. Start at the top.
          </p>
        ))}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-line pt-2 reveal--fade" style={{ '--reveal-delay': `${plan.items.length * 80 + 180}ms` }}>
          {TIER_KEYS.map((tier) => (
            <span
              key={tier.tone}
              className="inline-flex items-center gap-1 font-mono text-[8px] tracking-[0.08em] text-ink-3"
            >
              <span
                aria-hidden="true"
                className={`h-1.5 w-1.5 rounded-full ${TIER_DOT[tier.tone]}`}
              />
              {tier.label}
            </span>
          ))}
        </div>
        <p className="mt-1.5 font-mono text-[8.5px] leading-relaxed text-ink-3 reveal--fade" style={{ '--reveal-delay': `${plan.items.length * 80 + 240}ms` }}>{RESCUE_POLICY}</p>
      </div>
    </section>
  )
}

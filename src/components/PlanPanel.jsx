import { formatStepDate } from '../lib/plan'
import { fmtHours } from '../lib/brain'
import Icon from './Icon'

/**
 * 📋 Study plan panel — the "Plan banao" drawer inside a task card.
 * Renders the computed session checklist (what + when + how long) with a
 * one-tap copy for the group chat. Stateless: the plan is recomputed from
 * live data, so moving the deadline reshapes the plan for free.
 */
export default function PlanPanel({ plan, task, onCopy }) {
  if (!plan) return null
  return (
    <div className="rise mt-2 rounded-[3px] border border-line bg-paper px-2.5 py-2">
      <p className="flex flex-wrap items-baseline gap-x-2 font-mono text-[9px] tracking-[0.14em] text-ink-3 uppercase">
        <Icon name="list" size={11} className="text-later" />
        Plan banao — {fmtHours(plan.minutes)} total
        {plan.learned ? (
          <span className="normal-case text-done">· pace from your focus sessions</span>
        ) : (
          <span>· estimate until you track it</span>
        )}
        {plan.sprint && (
          <span className="normal-case font-semibold text-late">
            · no days left — single sprint
          </span>
        )}
      </p>
      <ol className="mt-1.5 space-y-1">
        {plan.steps.map((s, i) => (
          <li key={s.label + i} className="flex items-baseline gap-2 text-[11.5px] leading-snug">
            <span
              aria-hidden="true"
              className="mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-line bg-paper-2 font-mono text-[8px] font-semibold text-ink-3"
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 text-ink-2">{s.label}</span>
            <span className="shrink-0 font-mono text-[9.5px] tabular-nums text-ink-3">
              {formatStepDate(s.date)}
              {s.minutes > 0 && ` · ~${fmtHours(s.minutes)}`}
            </span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={onCopy}
        title="Copy this plan for your notes or the group chat"
        className="mt-2 flex items-center gap-1 font-mono text-[9px] tracking-[0.1em] text-later uppercase transition hover:text-ink"
      >
        <Icon name="copy" size={10} />
        Copy plan
      </button>
    </div>
  )
}

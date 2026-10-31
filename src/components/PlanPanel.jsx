import { formatStepDate } from '../lib/plan'
import { fmtHours } from '../lib/brain'
import Icon from './Icon'

/**
 * 📋 Study plan panel — the "Plan banao" drawer inside a task card.
 * Renders the computed session checklist (what + when + how long) with a
 * one-tap copy for the group chat. Stateless: the plan is recomputed from
 * live data, so moving the deadline reshapes the plan for free.
 *
 * Printed like a tear-off schedule: a labelled header strip, sessions hung on
 * a dotted rail (day label + duration right-aligned in mono), and a copy
 * action that answers with its own confirmation.
 */
export default function PlanPanel({ plan, task, onCopy }) {
  if (!plan) return null
  const steps = plan.steps || []
  return (
    <div className="rise plan-panel mt-2 overflow-hidden rounded-[4px] border border-line bg-paper">
      <div className="plan-head flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-dashed border-line bg-paper-2/70 px-2.5 py-1.5">
        <span className="flex items-center gap-1.5 font-mono text-[9px] font-semibold tracking-[0.14em] text-ink-2 uppercase">
          <Icon name="list" size={11} className="text-later" />
          Plan banao
        </span>
        <span className="font-mono text-[9.5px] font-semibold text-ink">
          {fmtHours(plan.minutes)} · {steps.length} session{steps.length === 1 ? '' : 's'}
        </span>
        {plan.sprint ? (
          <span className="tag border-late/45 bg-late-soft text-late">no days left — sprint</span>
        ) : (
          <span
            className="tag border-done/35 bg-done-soft text-done"
            title={
              plan.learned
                ? 'Split using minutes-per-mark learned from your focus sessions'
                : 'Split using the default estimate until you track it with the focus timer'
            }
          >
            <Icon name="spark" size={10} />
            {plan.learned ? 'pace from your sessions' : 'estimate'}
          </span>
        )}
      </div>

      <ol className="plan-rail px-2.5 py-1.5">
        {steps.map((s, i) => (
          <li key={s.label + i} className="plan-step">
            <span
              aria-hidden="true"
              className="plan-num"
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 text-[11.5px] leading-snug text-ink-2">{s.label}</span>
            <span className="shrink-0 font-mono text-[9.5px] tabular-nums text-ink-3">
              {formatStepDate(s.date)}
              {s.minutes > 0 && <span className="text-ink-2"> · ~{fmtHours(s.minutes)}</span>}
            </span>
          </li>
        ))}
        {steps.length === 0 && (
          <li className="plan-step font-mono text-[10px] text-ink-3">
            Nothing left to split — this one is ready to submit.
          </li>
        )}
      </ol>

      <div className="flex items-center justify-between gap-2 border-t border-dashed border-line px-2.5 py-1.5">
        <span className="min-w-0 truncate font-mono text-[9px] text-ink-3">
          {task?.dueDate ? `Deadline ${formatStepDate(task.dueDate)}` : 'No deadline set'}
        </span>
        <button
          type="button"
          onClick={onCopy}
          title="Copy this plan for your notes or the group chat"
          className="plan-copy"
        >
          <Icon name="copy" size={10} />
          Copy plan
        </button>
      </div>
    </div>
  )
}

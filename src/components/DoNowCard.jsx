import { doNowReason, fmtHours } from '../lib/brain'
import Icon from './Icon'

/**
 * 🎯 "Ab kya karun?" — the decision card, printed like a pinned note.
 * It names the ONE task to start right now, with two runners-up.
 */
export default function DoNowCard({ plan, cleared, onStart, focusId }) {
  if (!plan) {
    if (!cleared) return null
    return (
      <div className="rise rounded-[5px] border border-done/40 bg-done-soft p-4 text-center">
        <p className="flex items-center justify-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-done uppercase">
          <Icon name="target" size={12} />
          Ab kya karun?
        </p>
        <p className="mt-2 font-serif text-lg font-semibold text-ink">Nothing left — radar clear 🎉</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-2">
          Every task is done. Paste or speak the next deadline and the radar picks it back up.
        </p>
      </div>
    )
  }
  const { pick, next } = plan
  const t = pick.task
  const running = focusId === t.id

  return (
    <div className="donow relative rounded-[5px] border border-ink bg-paper-2 p-4 shadow-[4px_4px_0_var(--color-ink)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.2em] text-late uppercase">
            <Icon name="target" size={12} />
            Ab kya karun?
          </p>
          <p className="mt-1 font-mono text-[9px] tracking-[0.14em] text-ink-3 uppercase">
            The one thing · start now
          </p>
        </div>
        <span className="stamp shrink-0">Do this first</span>
      </div>

      <p className="highlight mt-3 font-serif text-[22px] leading-[1.2] font-semibold break-words text-ink">
        {t.title}
      </p>

      <p className="mt-2 font-mono text-[10px] tracking-wide text-ink-2">
        ≈ {fmtHours(pick.minutes)} · {Math.round(pick.roi)} marks/hr
        {pick.learned ? (
          <span className="text-done"> · pace from your focus sessions</span>
        ) : (
          <span className="text-ink-3"> · estimate until you track it</span>
        )}
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-late italic">{doNowReason(pick)}</p>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onStart(t.id)}
          disabled={running}
          title={
            running
              ? 'Focus running — click the header timer to stop'
              : 'Start a focus timer — the radar learns your real pace'
          }
          className="btn btn-accent"
        >
          {running ? (
            <>
              <Icon name="stop" size={11} /> Running
            </>
          ) : (
            <>
              <Icon name="play" size={11} /> Start focus
            </>
          )}
        </button>
        {t.marks != null && <span className="tag border-line bg-paper text-ink-2">{t.marks} marks</span>}
        {t.subject && <span className="tag border-line bg-paper text-ink-2">{t.subject}</span>}
      </div>

      {next.length > 0 && (
        <ul className="mt-3 border-t border-dashed border-line pt-2.5">
          {next.map((n) => (
            <li
              key={n.task.id}
              className="flex items-baseline gap-2 border-b border-dotted border-line py-1.5 text-[11px] last:border-0"
            >
              <span aria-hidden="true" className="text-ink-3">
                <Icon name="arrowRight" size={11} />
              </span>
              <span className="min-w-0 flex-1 truncate text-ink-2">{n.task.title}</span>
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-ink-3">
                ≈{fmtHours(n.minutes)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

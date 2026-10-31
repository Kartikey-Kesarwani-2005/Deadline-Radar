import Icon from './Icon'

/** 3725s → 1:02:05; 95s → 1:35. */
function clock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`
}

/**
 * ⏱️ The focus dock — a small, always-visible desk instrument for the session
 * running right now. The header chip scrolls away with the masthead; this dock
 * stays parked in the corner so a long scroll never hides the live timer or
 * the stop button. The bar compares real minutes against the radar's own
 * estimate, so the number on screen means something.
 */
export default function FocusDock({ task, elapsedMs, estimateMin, onStop, onEdit }) {
  if (!task) return null
  const estimate = Math.max(1, Number(estimateMin) || 25)
  const elapsedMin = elapsedMs / 60_000
  const pct = Math.min(100, Math.max(3, Math.round((elapsedMin / estimate) * 100)))
  const over = elapsedMin > estimate
  const delta = Math.round(Math.abs(estimate - elapsedMin))
  return (
    <aside className="focus-dock no-print" aria-label={`Focus timer running for ${task.title}`}>
      <div className="flex items-center gap-2">
        <span className="focus-dock-pulse" aria-hidden="true" />
        <span className="eyebrow min-w-0 flex-1 truncate">On the desk · focus</span>
        <span className="font-mono text-[13px] leading-none font-semibold tabular-nums text-ink">
          {clock(elapsedMs)}
        </span>
        <button
          type="button"
          onClick={onStop}
          aria-label={`Stop focus on ${task.title} and save the minutes`}
          title="Stop focus — the minutes train your pace estimate"
          className="focus-dock-stop"
        >
          <Icon name="stop" size={11} />
          Stop
        </button>
      </div>

      <button
        type="button"
        onClick={onEdit}
        title="Open this entry"
        className="mt-1.5 block w-full truncate text-left font-serif text-[13px] leading-snug font-semibold text-ink hover:underline hover:decoration-ink/30 hover:underline-offset-2"
      >
        {task.title}
      </button>

      <div
        className="focus-dock-bar mt-2"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`${Math.round(elapsedMin)} of about ${estimate} estimated minutes`}
      >
        <span className={over ? 'is-over' : ''} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[8.5px] tracking-[0.08em] text-ink-3 uppercase">
        <span>
          {over ? `${delta}m over the ≈${estimate}m estimate` : `≈${delta}m left of ${estimate}m`}
        </span>
        <span>{task.marks ? `${task.marks} marks` : 'untracked marks'}</span>
      </div>
    </aside>
  )
}

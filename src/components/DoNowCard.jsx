import { doNowReason, fmtHours } from '../lib/brain'

/**
 * 🎯 "Ab kya karun?" — the decision card. Instead of another list, the radar
 * names the ONE task to start right now (marks-per-hour ROI + latest-start),
 * with two runners-up. Start button wires the focus timer, which feeds the
 * effort model real minutes.
 */
export default function DoNowCard({ plan, onStart, focusId }) {
  if (!plan) return null
  const { pick, next } = plan
  const t = pick.task
  const running = focusId === t.id

  return (
    <div className="donow rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] to-transparent p-3.5">
      <p className="text-[11px] font-bold tracking-widest text-emerald-300 uppercase">
        🎯 Ab kya karun?
      </p>
      <div className="mt-1.5 flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug font-semibold break-words text-slate-100">{t.title}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            ≈ {fmtHours(pick.minutes)} · {Math.round(pick.roi)} marks/hr
            {pick.learned ? (
              <span className="text-emerald-300"> · pace from your own focus sessions</span>
            ) : (
              <span className="text-slate-500"> · estimate until you track it</span>
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-amber-300/90">{doNowReason(pick)}</p>
        </div>
        <button
          type="button"
          onClick={() => onStart(t.id)}
          disabled={running}
          title={
            running
              ? 'Focus running — click the header timer to stop'
              : 'Start a focus timer — the radar learns your real pace'
          }
          className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-70"
        >
          {running ? '▶️ Running' : '▶️ Start'}
        </button>
      </div>
      {next.length > 0 && (
        <ul className="mt-2.5 space-y-1 border-t border-white/10 pt-2">
          {next.map((n) => (
            <li key={n.task.id} className="flex items-baseline gap-1.5 text-[11px] text-slate-400">
              <span className="shrink-0 text-slate-600">→</span>
              <span className="min-w-0 truncate">{n.task.title}</span>
              <span className="shrink-0 tabular-nums text-slate-500">≈{fmtHours(n.minutes)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

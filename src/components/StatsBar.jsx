function Pill({ label, value, className, wrapClass = '' }) {
  return (
    <div
      className={`flex min-w-0 items-baseline justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 ${wrapClass}`}
    >
      <span className="truncate text-[11px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`text-lg font-bold tabular-nums ${className}`}>{value}</span>
    </div>
  )
}

/** 2×2 stat pills + a wide focus pill — the on-time % lives in the dial's center. */
export default function StatsBar({ total, dueToday, late, done, focusH }) {
  return (
    <div className="stats-pills grid grid-cols-2 gap-2">
      <Pill label="Captured" value={total} className="text-slate-100" />
      <Pill label="Due today" value={dueToday} className="text-amber-300" />
      <Pill
        label="Late"
        value={late}
        className={late > 0 ? 'text-red-400 animate-pulse' : 'text-red-400'}
      />
      <Pill label="Done" value={done} className="text-emerald-300" />
      <Pill
        label="⏱ Focused this week"
        value={`${focusH}h`}
        className="text-sky-300"
        wrapClass="col-span-2 border-sky-400/20 bg-sky-500/[0.05]"
      />
    </div>
  )
}

function Pill({ label, value, className }) {
  return (
    <div className="flex min-w-[118px] flex-1 items-baseline justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="text-[11px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`text-lg font-bold tabular-nums ${className}`}>{value}</span>
    </div>
  )
}

export default function StatsBar({ total, dueToday, late, done, onTime }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Pill label="Captured" value={total} className="text-slate-100" />
      <Pill label="Due today" value={dueToday} className="text-amber-300" />
      <Pill label="Late" value={late} className="text-red-400" />
      <Pill label="Done" value={done} className="text-emerald-300" />
      <Pill label="On time" value={onTime} className="text-teal-300" />
    </div>
  )
}

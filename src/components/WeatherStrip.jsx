/**
 * 🌦️ Deadline Weather — the 7-day load forecast, told like a weather report.
 * Tap a day to filter the radar to that day's submissions.
 */

export default function WeatherStrip({ days, active, onPick }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
        🌦️ 7-day forecast
      </p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => onPick(d.key)}
            title={
              d.count
                ? `${d.count} submission${d.count > 1 ? 's' : ''}, ${d.marks} marks — tap to filter`
                : 'Clear day — tap to filter'
            }
            className={`flex flex-col items-center rounded-lg border px-0.5 py-1.5 transition ${
              active === d.key
                ? 'border-emerald-500/60 bg-emerald-500/10'
                : d.level === 'storm'
                  ? 'border-red-500/30 bg-red-500/[0.06] hover:border-red-400/50'
                  : d.level === 'heavy'
                    ? 'border-amber-500/30 bg-amber-500/[0.06] hover:border-amber-400/50'
                    : 'border-white/10 bg-white/[0.03] hover:border-white/25'
            }`}
          >
            <span className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase">
              {d.isToday ? 'Tdy' : d.label}
            </span>
            <span className="my-0.5 text-base leading-none">{d.icon}</span>
            <span
              className={`text-[10px] font-bold tabular-nums ${
                d.marks
                  ? d.level === 'storm'
                    ? 'text-red-300'
                    : d.level === 'heavy'
                      ? 'text-amber-300'
                      : 'text-sky-300'
                  : 'text-slate-600'
              }`}
            >
              {d.count ? `${d.marks}` : '—'}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-1 text-[10px] leading-tight text-slate-600">
        Marks due each day · tap a day to filter
      </p>
    </div>
  )
}

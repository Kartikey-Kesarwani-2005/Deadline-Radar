/**
 * 📈 Six-week finish arc — the "real result" made visible.
 * Every bar is one week: green = finished on time, amber = finished late.
 * A flat-lining radar (nothing finished) stays silent instead of nagging.
 */

export default function TrendSpark({ weeks }) {
  if (!Array.isArray(weeks) || !weeks.length) return null

  const totals = weeks.reduce(
    (a, w) => ({ finished: a.finished + w.finished, onTime: a.onTime + w.onTime }),
    { finished: 0, onTime: 0 },
  )
  if (!totals.finished) return null

  const max = Math.max(1, ...weeks.map((w) => w.finished))
  const H = 40

  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
        📈 Last 6 weeks
      </p>
      <div
        role="img"
        aria-label={`${totals.onTime} of ${totals.finished} tasks finished on time over the last six weeks`}
        className="flex items-end gap-1"
        style={{ height: H }}
      >
        {weeks.map((w, i) => {
          const h = w.finished ? Math.max(7, Math.round((w.finished / max) * H)) : 2
          const onTimeH = w.finished ? Math.round((h * w.onTime) / w.finished) : 0
          return (
            <div
              key={i}
              title={w.finished ? `${w.finished} finished · ${w.onTime} on time` : 'clear week'}
              className={`relative flex-1 overflow-hidden rounded-[3px] ${
                w.finished ? 'bg-amber-400/35' : 'bg-white/[0.07]'
              }`}
              style={{ height: h }}
            >
              {onTimeH > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 rounded-t-[3px] bg-emerald-400/90"
                  style={{ height: onTimeH }}
                />
              )}
            </div>
          )
        })}
      </div>
      <p className="mt-1 text-[11px] text-slate-500">
        <span className="font-semibold text-emerald-300">{totals.onTime}</span> of{' '}
        {totals.finished} finished on time
      </p>
    </div>
  )
}

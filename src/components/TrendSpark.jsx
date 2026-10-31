import Icon from './Icon'

/**
 * 📈 Six-week finish arc — an ink bar chart on paper.
 * Green cap = finished on time, ochre body = finished late.
 * Bars grow from the baseline as the chart scrolls into view (staggered by
 * week), then sit still; every bar keeps a hover title with its real numbers.
 */

export default function TrendSpark({ weeks }) {
  if (!Array.isArray(weeks) || !weeks.length) return null

  const totals = weeks.reduce(
    (a, w) => ({ finished: a.finished + w.finished, onTime: a.onTime + w.onTime }),
    { finished: 0, onTime: 0 },
  )
  if (!totals.finished) return null

  const max = Math.max(1, ...weeks.map((w) => w.finished))
  const H = 42

  return (
    <div className="reveal" style={{ '--reveal-delay': '300ms' }}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <p className="eyebrow flex items-center gap-1.5">
          <Icon name="chart" size={11} />
          Last 6 weeks
        </p>
        <p className="font-mono text-[9px] text-ink-3">weekly</p>
      </div>
      <div
        role="img"
        aria-label={`${totals.onTime} of ${totals.finished} tasks finished on time over the last six weeks`}
        className="trend-bars flex items-end gap-1.5 border-b border-ink/60 pb-0"
        style={{ height: H }}
      >
        {weeks.map((w, i) => {
          const h = w.finished ? Math.max(7, Math.round((w.finished / max) * H)) : 2
          const onTimeH = w.finished ? Math.round((h * w.onTime) / w.finished) : 0
          return (
            <div
              key={i}
              title={w.finished ? `${w.finished} finished · ${w.onTime} on time` : 'clear week'}
              className={`trend-bar relative flex-1 overflow-hidden rounded-t-[2px] ${
                w.finished ? 'bg-today/55' : 'bg-line/60'
              }`}
              style={{ height: h, '--bar-delay': `${i * 60}ms` }}
            >
              {onTimeH > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 bg-done"
                  style={{ height: onTimeH }}
                />
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[9px] text-ink-3">
        <span className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-[1px] bg-done" />
            on time
          </span>
          <span className="flex items-center gap-1">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-[1px] bg-today/70" />
            late
          </span>
        </span>
        <span>
          <span className="font-semibold text-done">{totals.onTime}</span> of {totals.finished} on
          time
        </span>
      </div>
    </div>
  )
}

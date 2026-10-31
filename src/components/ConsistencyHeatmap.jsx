import Icon from './Icon'

/**
 * 🔥 12-week consistency heatmap — one small square per day, ink density =
 * tasks finished that day, amber ring = that day's finishes ran late.
 * GitHub planted the idea; the radar plants it on graph paper.
 */
export default function ConsistencyHeatmap({ heat }) {
  if (!heat || !heat.totalDone) return null

  // Chunk into 7-day columns, oldest → newest.
  const cols = []
  for (let i = 0; i < heat.cells.length; i += 7) cols.push(heat.cells.slice(i, i + 7))

  const tone = (c) => {
    if (!c.count) return 'bg-line/40'
    if (c.count >= 6) return 'bg-done'
    if (c.count >= 3) return 'bg-done/75'
    return 'bg-done/45'
  }

  const label = (c) =>
    !c.count
      ? 'no finish'
      : `${c.count} finished · ${c.onTime} on time${c.late ? ` · ${c.late} late` : ''}`
  const dayLabel = (c) =>
    new Date(`${c.key}T00:00:00`).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })

  return (
    <div className="reveal" style={{ '--reveal-delay': '380ms' }}>
      <div className="mb-1.5 flex items-baseline justify-between">
        <p className="eyebrow flex items-center gap-1.5">
          <Icon name="flame" size={11} />
          Last 12 weeks
        </p>
        <p className="font-mono text-[9px] text-ink-3">
          {heat.current > 0 ? `${heat.current}d streak` : 'keep it going'}
        </p>
      </div>
      <div
        role="img"
        aria-label={`${heat.totalDone} tasks finished in the last 12 weeks — best streak ${heat.longest} days`}
        className="heat-grid flex gap-[3px] border-b border-ink/60 pb-1.5"
      >
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((c) => (
              <span
                key={c.key}
                title={`${dayLabel(c)} — ${label(c)}`}
                aria-hidden="true"
                className={`heat-cell h-[9px] w-[9px] rounded-[1.5px] ${tone(c)} ${
                  c.late ? 'ring-1 ring-today/70' : ''
                }`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[10px] text-ink-3">
        <span className="flex items-center gap-1.5">
          <span className="font-semibold text-done">{heat.totalDone}</span> finished ·{' '}
          {heat.longest}d best streak
        </span>
        <span className="flex items-center gap-1" aria-hidden="true">
          less
          <span className="heat-cell h-[9px] w-[9px] rounded-[1.5px] bg-line/40" />
          <span className="heat-cell h-[9px] w-[9px] rounded-[1.5px] bg-done/45" />
          <span className="heat-cell h-[9px] w-[9px] rounded-[1.5px] bg-done/75" />
          <span className="heat-cell h-[9px] w-[9px] rounded-[1.5px] bg-done" />
          more
        </span>
      </div>
    </div>
  )
}

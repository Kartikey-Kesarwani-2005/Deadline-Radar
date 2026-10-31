/**
 * The signature widget, redrawn as a paper compass:
 * concentric ink arcs for Late / Due today / This week / Later, a rotating
 * needle, and the on-time % in the centre. Clicking a ring jumps to its zone.
 */

const ZONES = [
  { k: 'late', label: 'Late', color: '#b83a20' },
  { k: 'today', label: 'Due today', color: '#a06b0c' },
  { k: 'week', label: 'This week', color: '#68792b' },
  { k: 'later', label: 'Later', color: '#2f5687' },
]
const RADII = [88, 74, 59, 46]

const TICKS = Array.from({ length: 60 }, (_, i) => {
  const a = (i / 60) * Math.PI * 2 - Math.PI / 2
  const long = i % 5 === 0
  const r1 = long ? 94 : 98.5
  const r2 = 104.5
  return {
    x1: 110 + Math.cos(a) * r1,
    y1: 110 + Math.sin(a) * r1,
    x2: 110 + Math.cos(a) * r2,
    y2: 110 + Math.sin(a) * r2,
    long,
  }
})

export default function RadarDial({ late, today, week, later, onTime, rated = 0 }) {
  const counts = { late, today, week, later }
  const pct = rated > 0 ? Math.round((onTime / rated) * 100) : null
  const ringDeg = (c) => (c > 0 ? (Math.min(c, 8) / 8) * 360 : 0)

  function jump(zoneKey) {
    document
      .getElementById(`radar-${zoneKey}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      role="group"
      aria-label={`Deadline compass: ${late} late, ${today} due today, ${week} this week, ${later} later. ${pct ?? 0} percent finished on time.`}
      className="reveal radar-dial flicker relative h-[176px] w-[176px] shrink-0 self-center overflow-hidden rounded-full border-[1.5px] border-ink bg-paper-2 shadow-[3px_3px_0_rgba(29,27,22,0.18)]"
      data-parallax="0.06"
    >
      <svg viewBox="0 0 220 220" className="absolute inset-0 h-full w-full">
        {TICKS.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke="rgba(29,27,22,0.38)"
            strokeWidth={t.long ? 1.4 : 0.7}
            strokeLinecap="round"
          />
        ))}

        {ZONES.map((z, i) => {
          const c = counts[z.k]
          const deg = ringDeg(c)
          return (
            <g
              key={z.k}
              className="dial-zone"
              onClick={() => deg && jump(z.k)}
              tabIndex={deg ? 0 : -1}
              role={deg ? 'button' : undefined}
              aria-label={deg ? `${z.label}: ${c}. Jump to ${z.label}.` : undefined}
              onKeyDown={(e) => {
                if (!deg) return
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  jump(z.k)
                }
              }}
              style={{ cursor: deg ? 'pointer' : 'default' }}
            >
              <title>{`${z.label}: ${c}${deg ? ' — click or press Enter to jump there' : ''}`}</title>
              <circle
                className="dial-track"
                cx={110}
                cy={110}
                r={RADII[i]}
                fill="none"
                stroke="#e9e1cf"
                strokeWidth={9}
              />
              {/* Invisible fat hit-ring — the visible ring is 9px wide, but a
                  pointer should not have to be that precise. The band is kept
                  to ~13px (the gap between neighbouring radii) so zones never
                  swallow each other's clicks or reach the centre dial. */}
              <circle
                cx={110}
                cy={110}
                r={RADII[i]}
                fill="none"
                stroke="rgba(29,27,22,0)"
                strokeWidth={13}
                style={{ pointerEvents: 'all' }}
              />
              {deg > 0 && (
                <circle
                  className="dial-ring"
                  cx={110}
                  cy={110}
                  r={RADII[i]}
                  fill="none"
                  stroke={z.color}
                  strokeWidth={9}
                  strokeLinecap="round"
                  pathLength={360}
                  strokeDasharray={`${deg} 360`}
                  transform="rotate(-90 110 110)"
                  opacity={0.95}
                />
              )}
            </g>
          )
        })}

        {/* centre dial */}
        <circle cx={110} cy={110} r={38} fill="#f3eee1" stroke="#1d1b16" strokeWidth={1.4} />
        <circle
          cx={110}
          cy={110}
          r={31}
          fill="none"
          stroke="#2b674a"
          strokeWidth={3.5}
          strokeLinecap="round"
          pathLength={360}
          strokeDasharray={`${pct ?? 0} 360`}
          transform="rotate(-90 110 110)"
        />
      </svg>

      {/* Rotating needle sits above the rings but stops short of the centre so
          it never crosses the on-time % text. */}
      <span aria-hidden="true" className="compass-rotor pointer-events-none absolute inset-0">
        <span className="absolute top-[6%] left-1/2 h-[25%] w-[2px] -translate-x-1/2 rounded-full bg-late/60" />
      </span>

      {/* hub on top of the dial — small ink dot the needle pivots on */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink bg-paper-2"
      />

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-[20px] leading-[1.1] font-semibold tabular-nums text-ink">
          {pct === null ? '—' : `${pct}%`}
        </span>
        <span className="mt-1 font-mono text-[7px] font-semibold tracking-[0.12em] text-done uppercase leading-[1.2]">
          on time
        </span>
      </div>
    </div>
  )
}

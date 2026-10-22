/**
 * The signature widget: concentric radar rings — one per urgency zone —
 * with a rotating sweep and the on-time percentage as a center ring.
 * Clicking a ring jumps to that section of the dashboard.
 */

const ZONES = [
  { k: 'late', label: 'Late', color: '#f87171' },
  { k: 'today', label: 'Due today', color: '#fcd34d' },
  { k: 'week', label: 'This week', color: '#facc15' },
  { k: 'later', label: 'Later', color: '#38bdf8' },
]
const RADII = [92, 76, 60, 46]

export default function RadarDial({ late, today, week, later, onTime, done }) {
  const counts = { late, today, week, later }
  const pct = done > 0 ? Math.round((onTime / done) * 100) : null
  const ringDeg = (c) => (c > 0 ? (Math.min(c, 8) / 8) * 360 : 0)

  function jump(zoneKey) {
    document
      .getElementById(`radar-${zoneKey}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      role="img"
      aria-label={`Deadline radar: ${late} late, ${today} due today, ${week} this week, ${later} later. ${pct ?? 0} percent finished on time.`}
      className="rise radar-dial relative h-[168px] w-[168px] shrink-0 self-center overflow-hidden rounded-full bg-[#0a1122] shadow-[0_0_55px_-14px_rgba(16,185,129,0.45)] ring-1 ring-white/15"
    >
      <span aria-hidden="true" className="radar-sweep" />

      <svg viewBox="0 0 220 220" className="absolute inset-0 h-full w-full">
        {/* instrument grid — outer bezel + crosshair */}
        <circle cx="110" cy="110" r="103" fill="none" stroke="rgba(148,163,184,0.07)" strokeWidth="1" />
        <line x1="110" y1="8" x2="110" y2="212" stroke="rgba(148,163,184,0.06)" strokeWidth="1" />
        <line x1="8" y1="110" x2="212" y2="110" stroke="rgba(148,163,184,0.06)" strokeWidth="1" />
        {ZONES.map((z, i) => {
          const c = counts[z.k]
          const deg = ringDeg(c)
          return (
            <g
              key={z.k}
              onClick={() => deg && jump(z.k)}
              style={{ cursor: deg ? 'pointer' : 'default' }}
            >
              <title>{`${z.label}: ${c}${deg ? ' — click to jump there' : ''}`}</title>
              <circle
                cx={110}
                cy={110}
                r={RADII[i]}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={11}
              />
              {deg > 0 && (
                <circle
                  cx={110}
                  cy={110}
                  r={RADII[i]}
                  fill="none"
                  stroke={z.color}
                  strokeWidth={11}
                  strokeLinecap="round"
                  pathLength={360}
                  strokeDasharray={`${deg} 360`}
                  transform="rotate(-90 110 110)"
                  opacity={0.92}
                />
              )}
            </g>
          )
        })}

        {/* center: on-time progress ring */}
        <circle
          cx={110}
          cy={110}
          r={34}
          fill="rgba(7,11,22,0.78)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={6}
        />
        <circle
          cx={110}
          cy={110}
          r={34}
          fill="none"
          stroke="#34d399"
          strokeWidth={6}
          strokeLinecap="round"
          pathLength={360}
          strokeDasharray={`${pct ?? 0} 360`}
          transform="rotate(-90 110 110)"
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold tabular-nums text-slate-50">
          {pct === null ? '—' : `${pct}%`}
        </span>
        <span className="text-[8px] font-bold tracking-[0.18em] text-emerald-400/80 uppercase">
          on time
        </span>
      </div>
    </div>
  )
}

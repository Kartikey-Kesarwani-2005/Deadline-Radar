import Icon from './Icon'

/**
 * 🌦️ Deadline Weather — the 7-day load forecast, printed like a ticket strip.
 * Tap a day to filter the radar to that day's submissions.
 */

const LEVEL_TONE = {
  free: 'border-line bg-paper-2 text-ink-3',
  light: 'border-later/35 bg-later-soft text-later',
  heavy: 'border-today/40 bg-today-soft text-today',
  storm: 'border-late/40 bg-late-soft text-late',
}

const LEVEL_ICON = {
  free: 'sun',
  light: 'cloudSun',
  heavy: 'rain',
  storm: 'storm',
}

export default function WeatherStrip({ days, active, onPick }) {
  return (
    <div>
      <p className="eyebrow mb-1.5 flex items-center gap-1.5">
        <Icon name="cloudSun" size={11} />
        7-day forecast
      </p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const on = active === d.key
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onPick(d.key)}
              aria-pressed={on}
              aria-label={`${d.isToday ? 'Today' : d.label}: ${d.count ? `${d.count} submission${d.count > 1 ? 's' : ''}, ${d.marks} marks` : 'clear day'}${on ? ' — filtered' : ' — tap to filter'}`}
              title={
                d.count
                  ? `${d.count} submission${d.count > 1 ? 's' : ''}, ${d.marks} marks — tap to filter`
                  : 'Clear day — tap to filter'
              }
              className={`weather-day flex flex-col items-center rounded-[3px] border px-0.5 py-1.5 transition ${
                on
                  ? 'border-ink bg-ink text-paper shadow-[1px_1px_0_rgba(29,27,22,0.3)]'
                  : d.isToday
                    ? 'border-ink/70 bg-paper-2 ring-1 ring-ink/20'
                    : LEVEL_TONE[d.level] || LEVEL_TONE.free
              }`}
            >
              <span
                className={`font-mono text-[8px] font-semibold tracking-[0.1em] uppercase ${
                  on ? 'text-paper' : d.isToday ? 'text-ink' : 'text-ink-3'
                }`}
              >
                {d.isToday ? 'Today' : d.label}
              </span>
              <Icon
                name={LEVEL_ICON[d.level] || LEVEL_ICON.free}
                size={13}
                strokeWidth={1.5}
                className="my-1"
              />
              <span
                className={`font-mono text-[10px] font-medium tabular-nums ${on ? 'text-paper' : ''}`}
              >
                {d.count ? d.marks : '—'}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-1 font-mono text-[9px] leading-tight tracking-wide text-ink-3">
        Marks due each day · tap to filter
      </p>
    </div>
  )
}

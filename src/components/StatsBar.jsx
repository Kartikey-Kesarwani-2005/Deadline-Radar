import Icon from './Icon'

/**
 * Ledger-style stat tiles — four small paper cards plus a focus strip.
 * The on-time % lives in the compass centre, not here.
 *
 * Every tile carries the scroll reveal (`.reveal` + `--reveal-delay`) so the
 * statics fade in and slide up with a stagger as the radar scrolls into view,
 * sequenced after the score dial above them.
 */

function Tile({ label, value, tone = 'text-ink', note, icon, wide = false, style }) {
  return (
    <div
      style={style}
      className={`stat-tile reveal rounded-[4px] border border-line bg-paper-2 px-2.5 py-2 ${
        wide ? 'col-span-2 flex items-baseline justify-between gap-3' : ''
      }`}
    >
      <span className="flex items-center gap-1 font-mono text-[9px] tracking-[0.14em] text-ink-3 uppercase">
        {icon && <Icon name={icon} size={10} className="text-ink-3" />}
        {note && <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${note}`} />}
        {label}
      </span>
      <span
        className={`block font-serif text-[26px] leading-none font-semibold tabular-nums ${tone} ${
          wide ? 'mt-0' : 'mt-1.5'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

export default function StatsBar({ total, dueToday, late, done, focusH }) {
  const tiles = [
    { id: 'captured', label: 'Captured', value: total, tone: 'text-ink' },
    { id: 'due-today', label: 'Due today', value: dueToday, tone: 'text-today' },
    {
      id: 'late',
      label: 'Late',
      value: late,
      tone: 'text-late',
      note: late > 0 ? 'bg-late animate-pulse' : undefined,
    },
    { id: 'done', label: 'Done', value: done, tone: 'text-done' },
    {
      id: 'focus',
      label: 'Focused this week',
      value: `${focusH}h`,
      tone: 'text-later',
      icon: 'clock',
      wide: true,
    },
  ]

  return (
    <div className="stats-pills grid grid-cols-2 gap-2">
      {tiles.map((tile, i) => (
        <Tile
          key={tile.id}
          label={tile.label}
          value={tile.value}
          tone={tile.tone}
          note={tile.note}
          icon={tile.icon}
          wide={tile.wide}
          style={{ '--reveal-delay': `${i * 90}ms` }}
        />
      ))}
    </div>
  )
}

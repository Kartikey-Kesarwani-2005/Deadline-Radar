import Icon from './Icon'

/**
 * Ledger-style stat tiles — four small paper cards plus a focus strip.
 * The on-time % lives in the compass centre, not here.
 */

function Tile({ label, value, tone = 'text-ink', note, icon, wide = false }) {
  return (
    <div
      className={`stat-tile rounded-[4px] border border-line bg-paper-2 px-2.5 py-2 ${
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
  return (
    <div className="stats-pills grid grid-cols-2 gap-2">
      <Tile label="Captured" value={total} />
      <Tile label="Due today" value={dueToday} tone="text-today" />
      <Tile
        label="Late"
        value={late}
        tone="text-late"
        note={late > 0 ? 'bg-late animate-pulse' : undefined}
      />
      <Tile label="Done" value={done} tone="text-done" />
      <Tile icon="clock" label="Focused this week" value={`${focusH}h`} tone="text-later" wide />
    </div>
  )
}

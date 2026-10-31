import Icon from './Icon'

/**
 * Ledger-style stat tiles — four paper cards plus a focus strip.
 * The on-time % lives in the compass centre, not here.
 *
 * Every tile carries the scroll reveal (`.reveal` + `--reveal-delay`) so the
 * statics fade in and slide up with a stagger as the radar scrolls into view,
 * sequenced after the score dial above them.
 *
 * One shared card anatomy keeps the set consistent: a printed label with an
 * optional live dot, a serif number that re-pops whenever it changes, and a
 * one-line hint that says what the number means. Tiles that need attention
 * (`alert`) get an inked top rule plus a wash of their own status colour —
 * emphasis without breaking the paper palette.
 */

function Tile({ label, value, tone = 'text-ink', hint, note, icon, alert = false, style }) {
  return (
    <div
      style={style}
      className={`stat-tile reveal rounded-[4px] border px-3 py-2.5 ${
        alert ? 'is-alert border-late/35 bg-late-soft/45' : 'border-line bg-paper-2'
      }`}
    >
      <span className="stat-label">
        {icon && <Icon name={icon} size={10} />}
        {note && (
          <span aria-hidden="true" className={`stat-dot ${note}`} />
        )}
        {label}
      </span>
      {/* `key` remounts the number so its pop animation replays on change —
          a quiet confirmation that the radar actually re-counted. */}
      <span key={String(value)} className={`stat-value ${tone}`}>
        {value}
      </span>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  )
}

export default function StatsBar({ total, dueToday, late, done, focusH }) {
  const tiles = [
    {
      id: 'captured',
      label: 'Captured',
      value: total,
      tone: 'text-ink',
      hint: 'on the radar',
    },
    {
      id: 'due-today',
      label: 'Due today',
      value: dueToday,
      tone: 'text-today',
      hint: 'finish by tonight',
      alert: dueToday > 0,
    },
    {
      id: 'late',
      label: 'Late',
      value: late,
      tone: 'text-late',
      note: late > 0 ? 'is-live bg-late' : undefined,
      hint: late > 0 ? 'handle now' : 'clear',
      alert: late > 0,
    },
    {
      id: 'done',
      label: 'Done',
      value: done,
      tone: 'text-done',
      hint: 'ticked off',
    },
  ]

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="stats-pills grid grid-cols-2 gap-2">
        {tiles.map((tile, i) => (
          <Tile
            key={tile.id}
            label={tile.label}
            value={tile.value}
            tone={tile.tone}
            hint={tile.hint}
            note={tile.note}
            alert={tile.alert}
            style={{ '--reveal-delay': `${i * 90}ms` }}
          />
        ))}
      </div>

      {/* Focus ledger — a full-width strip rather than a fifth tile, so the
          2×2 count grid above stays one clean, comparable block. */}
      <div
        className="stat-focus reveal flex items-center justify-between gap-3 rounded-[4px] border border-later/30 bg-later-soft/55 px-3 py-2"
        style={{ '--reveal-delay': '360ms' }}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Icon name="clock" size={11} className="shrink-0 text-later" />
          <span className="stat-label !mb-0">Focused this week</span>
        </span>
        <span className="shrink-0 font-serif text-[17px] leading-none font-semibold tabular-nums text-later">
          {focusH}h
        </span>
      </div>
    </div>
  )
}

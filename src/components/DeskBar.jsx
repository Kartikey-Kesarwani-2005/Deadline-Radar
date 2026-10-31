import Icon from './Icon'

function chipCls(active) {
  return `rounded-[3px] border px-2 py-1 font-mono text-[10px] tracking-[0.06em] uppercase transition ${
    active
      ? 'border-ink bg-ink text-paper'
      : 'border-line bg-paper-2 text-ink-2 hover:border-ink hover:text-ink'
  }`
}

/** The six reading zones — the same order as the radar sections below. */
const ZONES = [
  { key: 'late', label: 'Late', dot: 'bg-late' },
  { key: 'today', label: 'Today', dot: 'bg-today' },
  { key: 'week', label: 'Week', dot: 'bg-week' },
  { key: 'later', label: 'Later', dot: 'bg-later' },
  { key: 'noDate', label: 'No date', dot: 'bg-ink-3' },
  { key: 'done', label: 'Done', dot: 'bg-done' },
]

function ViewToggle({ view, onView }) {
  return (
    <div className="view-toggle" role="group" aria-label="Radar view">
      <button
        type="button"
        onClick={() => onView('list')}
        aria-pressed={view === 'list'}
        title="Urgency list — every deadline grouped by how soon it bites"
        className={view === 'list' ? 'is-active' : ''}
      >
        <Icon name="list" size={12} />
        List
      </button>
      <button
        type="button"
        onClick={() => onView('calendar')}
        aria-pressed={view === 'calendar'}
        title="Radar almanac — the month as a printed planner"
        className={view === 'calendar' ? 'is-active' : ''}
      >
        <Icon name="grid" size={12} />
        Almanac
      </button>
    </div>
  )
}

/**
 * 🗄️ The desk bar — every control the radar list needs, exactly where the
 * list lives: view switch, search, order, bulk select, zone jumps and the
 * subject/day filter chips on one sticky paper strip above the sections.
 * Previously these lived in the far-left stat rail, a full screen away from
 * the cards they act on. Sticks to the top while the radar scrolls, so
 * ⌘K-less sorting and filtering never force a trip back up.
 */
export default function DeskBar({
  view = 'list',
  onView,
  query,
  onQuery,
  sortBy,
  onSort,
  sortModes,
  selectMode,
  onToggleSelectMode,
  onSelectAll,
  selectedCount,
  subjects,
  subjectFilter,
  onSubjectFilter,
  dateFilter,
  onDateFilter,
  searchRef,
  zoneCounts,
  onJump,
}) {
  const isList = view === 'list'
  return (
    <div className="desk-bar paper-panel sticky top-4 z-20 rounded-[5px] p-2.5 shadow-[3px_3px_0_rgba(29,27,22,0.18)]">
      <div className="flex flex-wrap items-center gap-2">
        <ViewToggle view={view} onView={onView} />
        <div className="search-wrap min-w-[42%] flex-1">
          <Icon name="search" size={14} className="search-icon" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={isList ? 'Search tasks…' : 'Search the month…'}
            aria-label="Search tasks"
            className="field search-input"
          />
          <span className="search-key kbd-chip" aria-hidden="true">
            /
          </span>
        </div>
        {isList && (
          <label htmlFor="sort-tasks" className="sort-row !min-h-0 flex-1 min-w-0">
            <span className="eyebrow shrink-0">Order</span>
            <select
              id="sort-tasks"
              value={sortBy}
              onChange={(e) => onSort(e.target.value)}
              title="How tasks are ordered inside each section"
              className="sort-select"
            >
              {sortModes.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {isList ? (
          <>
            <button
              type="button"
              onClick={onToggleSelectMode}
              aria-pressed={selectMode}
              title="Select multiple cards, then run one bulk action — done, postpone or delete"
              className={chipCls(selectMode)}
            >
              {selectMode ? 'Cancel select' : 'Bulk select'}
            </button>
            {selectMode && (
              <button
                type="button"
                onClick={onSelectAll}
                title="Select every visible card"
                className={chipCls(true)}
              >
                All{selectedCount ? ` (${selectedCount})` : ''}
              </button>
            )}
          </>
        ) : (
          <span className="hidden font-mono text-[9px] tracking-[0.1em] text-ink-3 uppercase sm:inline">
            Month view · tap a day
          </span>
        )}
      </div>

      {/* 🧭 Zone jumps — the section index, with honest live counts. Works from
          either view: in the almanac it first opens the list, then scrolls. */}
      {zoneCounts && (
        <div className="zone-nav mt-2 border-t border-dotted border-line pt-2 flex flex-wrap gap-1">
          <span className="eyebrow shrink-0">Zones</span>
          {ZONES.map(({ key, label, dot }) => {
            const count = zoneCounts[key] || 0
            return (
              <button
                key={key}
                type="button"
                onClick={() => onJump?.(key)}
                disabled={!count}
                aria-label={`Jump to ${label} — ${count} ${count === 1 ? 'task' : 'tasks'}`}
                title={
                  count
                    ? `Jump to ${label} — ${count} ${count === 1 ? 'task' : 'tasks'}`
                    : `Nothing in ${label}`
                }
                className={`zone-chip ${count ? '' : 'is-empty'}`}
              >
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {label}
                <span className="zone-count tabular-nums">{count}</span>
              </button>
            )
          })}
          <span className="flex-1" />
          <span className="hidden font-mono text-[9px] tracking-[0.08em] text-ink-3 uppercase sm:inline">
            tap to jump
          </span>
        </div>
      )}

      {(subjects.length > 0 || dateFilter) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {subjects.length > 0 && (
            <button
              type="button"
              onClick={() => onSubjectFilter(null)}
              className={chipCls(!subjectFilter)}
            >
              All subjects
            </button>
          )}
          {subjects.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSubjectFilter(subjectFilter === s ? null : s)}
              className={chipCls(subjectFilter === s)}
            >
              {s}
            </button>
          ))}
          {dateFilter && (
            <button
              type="button"
              onClick={() => onDateFilter(null)}
              className={chipCls(true)}
              title="Clear the day filter"
            >
              <Icon name="calendar" size={11} />
              {new Date(`${dateFilter}T00:00:00`).toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
              <Icon name="x" size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export { chipCls }

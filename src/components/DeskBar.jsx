import Icon from './Icon'

function chipCls(active) {
  return `rounded-[3px] border px-2 py-1 font-mono text-[10px] tracking-[0.06em] uppercase transition ${
    active
      ? 'border-ink bg-ink text-paper'
      : 'border-line bg-paper-2 text-ink-2 hover:border-ink hover:text-ink'
  }`
}

/**
 * 🗄️ The desk bar — every control the radar list needs, exactly where the
 * list lives: search, order, bulk select and the subject/day filter chips on
 * one sticky paper strip above the sections. Previously these lived in the
 * far-left stat rail, a full screen away from the cards they act on.
 * Sticks to the top while the radar scrolls, so ⌘K-less sorting and filtering
 * never force a trip back up.
 */
export default function DeskBar({
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
}) {
  return (
    <div className="paper-panel sticky top-2 z-20 rounded-[5px] p-2.5 shadow-[3px_3px_0_rgba(29,27,22,0.18)]">
      <div className="flex flex-wrap items-center gap-2">
        <div className="search-wrap min-w-[46%] flex-1">
          <Icon name="search" size={14} className="search-icon" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks"
            className="field search-input"
          />
          <span className="search-key kbd-chip" aria-hidden="true">
            /
          </span>
        </div>
        <label htmlFor="sort-tasks" className="sort-row !min-h-0 flex-1 whitespace-nowrap">
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
      </div>

      {(subjects.length > 0 || dateFilter) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {subjects.length > 0 && (
            <button
              type="button"
              onClick={() => onSubjectFilter(null)}
              className={chipCls(!subjectFilter)}
            >
              All
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

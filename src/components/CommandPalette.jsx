import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal'
import Icon from './Icon'
import { formatDue } from '../lib/dates'
import { smartSort } from '../lib/sort'

/**
 * ⌘K — one box for every action and every task.
 * Type to search; ↑↓ to move; ↵ to open. Tasks open their edit sheet, commands
 * run immediately. Fields stay in the paper style so it feels native.
 */
export default function CommandPalette({ tasks, commands, onClose, onEditTask }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef(null)

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const commandHits = commands
      .filter((c) =>
        !needle ? !c.onlyWhenSearch : `${c.label} ${c.keywords || ''}`.toLowerCase().includes(needle),
      )
      .map((c) => ({ ...c, type: 'command' }))

    const pending = tasks
      .filter((t) => !t.done)
      .filter((t) => !needle || `${t.title} ${t.subject || ''}`.toLowerCase().includes(needle))
      .sort(smartSort)
      .slice(0, needle ? 8 : 5)
      .map((t) => ({
        id: `task-${t.id}`,
        type: 'task',
        task: t,
        icon: 'square',
        label: t.title,
        meta: [
          t.subject,
          t.dueDate ? formatDue(t.dueDate) : 'no date yet',
          t.marks ? `${t.marks} marks` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      }))

    const out = []
    const taskGroup = pending.length ? { heading: 'Your radar', items: pending } : null
    const commandGroup = commandHits.length ? { heading: 'Commands', items: commandHits } : null
    // No query yet → the user's own deadlines are the headline; commands sit
    // below. Once they type, an action word ("report", "settings") jumps up.
    if (needle) {
      if (commandGroup) out.push(commandGroup)
      if (taskGroup) out.push(taskGroup)
    } else {
      if (taskGroup) out.push(taskGroup)
      if (commandGroup) out.push(commandGroup)
    }
    return out
  }, [q, commands, tasks])

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])

  // Keep the highlight in range as the answer list shrinks.
  useEffect(() => {
    setActive((i) => (i >= flat.length ? Math.max(0, flat.length - 1) : i))
  }, [flat.length])

  useEffect(() => {
    document.getElementById(`cmd-option-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function run(item) {
    if (!item) return
    onClose()
    if (item.type === 'task') onEditTask(item.task.id)
    else item.run?.()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      run(flat[active])
    }
  }

  let index = -1

  return (
    <Modal
      label="Command palette"
      onClose={onClose}
      align="top"
      panelClassName="sheet w-full max-w-xl overflow-hidden"
    >
      <div className="flex items-center gap-2.5 border-b border-ink/75 px-3.5 py-2.5">
        <Icon name="search" size={15} className="text-ink-3" />
        <input
          data-autofocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded="true"
          aria-controls="cmd-list"
          aria-activedescendant={flat.length ? `cmd-option-${active}` : undefined}
          aria-label="Search tasks or run a command"
          placeholder="Search tasks, or type a command…"
          className="min-w-0 flex-1 bg-transparent font-serif text-[16px] text-ink caret-late placeholder:font-sans placeholder:text-[13px] placeholder:text-ink-3 focus:outline-none"
        />
        <span className="kbd-chip" aria-hidden="true">
          esc
        </span>
      </div>

      <div
        id="cmd-list"
        role="listbox"
        aria-label="Palette results"
        className="max-h-[54dvh] overflow-y-auto px-1.5 py-1.5"
      >
        {flat.length === 0 && (
          <div className="px-3 py-7 text-center">
            <p className="font-serif text-base font-semibold text-ink">No matches</p>
            <p className="mt-1 text-xs text-ink-3">
              Try a subject, a task title, or “weekly”, “settings”, “sort”.
            </p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.heading} role="group" aria-label={group.heading}>
            <p className="flex items-baseline justify-between gap-2 px-2 pt-2.5 pb-1">
              <span className="eyebrow">{group.heading}</span>
              <span className="font-mono text-[9px] tabular-nums text-ink-3">
                {group.items.length}
              </span>
            </p>
            {group.items.map((item) => {
              index += 1
              const i = index
              const on = i === active
              return (
                <div
                  key={item.id}
                  id={`cmd-option-${i}`}
                  role="option"
                  aria-selected={on}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => {
                    // mousedown so the input never loses focus mid-click
                    e.preventDefault()
                    run(item)
                  }}
                  className={`cmd-row ${on ? 'is-on' : ''}`}
                >
                  <span className="cmd-icon" aria-hidden="true">
                    <Icon name={item.icon} size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] leading-snug">{item.label}</span>
                    {item.meta && (
                      <span
                        className={`block truncate font-mono text-[9px] tracking-wide ${
                          on ? 'text-paper/70' : 'text-ink-3'
                        }`}
                      >
                        {item.meta}
                      </span>
                    )}
                  </span>
                  {item.hint && (
                    <span className={`kbd-chip ${on ? 'is-on' : ''}`} aria-hidden="true">
                      {item.hint}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper px-3.5 py-2 font-mono text-[9px] tracking-[0.1em] text-ink-3 uppercase">
        <span className="flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <span className="kbd-chip">↑</span>
            <span className="kbd-chip">↓</span>
            move
          </span>
          <span className="flex items-center gap-1">
            <span className="kbd-chip">↵</span>
            open
          </span>
          <span className="flex items-center gap-1">
            <span className="kbd-chip">esc</span>
            close
          </span>
        </span>
        <span>
          {flat.length} result{flat.length === 1 ? '' : 's'}
        </span>
      </div>
    </Modal>
  )
}

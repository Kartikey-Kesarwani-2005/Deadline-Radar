import { useState } from 'react'
import Modal from './Modal'
import Icon from './Icon'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] font-medium tracking-[0.14em] text-ink-2 uppercase">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

export default function TaskEditModal({ task, onSave, onClose, onDelete, onDuplicate }) {
  // Defensive: if task is somehow undefined/null, close the modal
  if (!task) {
    onClose?.()
    return null
  }
  const [draft, setDraft] = useState({
    title: task.title,
    subject: task.subject || '',
    dueDate: task.dueDate || '',
    marks: task.marks ?? '',
    priority: task.priority || 'normal',
    link: task.link || '',
    repeat: task.repeat === 'weekly' ? 'weekly' : null,
  })

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  // Mirror the parser's strictness: only real URLs survive. A bare domain gets
  // https:// prefixed; anything else (e.g. "abc") is dropped so the card never
  // renders a broken <a href>.
  function normalizeLink(raw) {
    const v = String(raw || '').trim()
    if (!v) return null
    if (/^https?:\/\//i.test(v)) return v
    if (/^[^\s/]+\.[a-z]{2,}(\/.*)?$/i.test(v)) return `https://${v}`
    return null
  }

  function save() {
    const marks = draft.marks === '' ? null : Number(draft.marks)
    onSave({
      title: draft.title.trim() || task.title,
      subject: draft.subject.trim() || null,
      dueDate: draft.dueDate || null,
      marks: Number.isFinite(marks) && marks >= 0 ? marks : null,
      priority: draft.priority,
      link: normalizeLink(draft.link),
      repeat: draft.repeat === 'weekly' ? 'weekly' : null,
    })
  }

  return (
    <Modal
      label="Edit task"
      onClose={onClose}
      panelClassName="sheet max-h-[90dvh] w-full max-w-md overflow-y-auto"
    >
        <div className="flex items-start justify-between gap-3 border-b-2 border-ink px-5 pt-4 pb-3">
          <div>
            <p className="eyebrow">Entry card</p>
            <h2 className="font-serif text-2xl leading-tight font-semibold text-ink">Edit task</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn mt-1"
            aria-label="Close edit dialog"
          >
            <Icon name="x" size={14} />
          </button>
        </div>

        <div className="space-y-3.5 p-5">
          <Field label="Task">
            <textarea
              rows={2}
              data-autofocus
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              className="field resize-none !text-[14px]"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Subject">
              <input
                value={draft.subject}
                placeholder="DBMS"
                onChange={(e) => set({ subject: e.target.value })}
                className="field"
              />
            </Field>
            <Field label="Marks">
              <input
                type="number"
                min="0"
                value={draft.marks}
                placeholder="20"
                onChange={(e) => set({ marks: e.target.value })}
                className="field"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Due date">
              <input
                type="date"
                value={draft.dueDate}
                onChange={(e) => set({ dueDate: e.target.value })}
                className="field"
              />
            </Field>
            <Field label="Priority">
              <div className="flex gap-1.5">
                {['normal', 'high'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set({ priority: p })}
                    className={`flex-1 rounded-[4px] border px-2 py-2 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase transition ${
                      draft.priority === p
                        ? p === 'high'
                          ? 'border-late bg-late-soft text-late'
                          : 'border-ink bg-ink text-paper'
                        : 'border-line bg-paper text-ink-3 hover:border-ink hover:text-ink'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <Field label="Submission link (optional)">
            <input
              type="url"
              value={draft.link}
              placeholder="https://moodle.example.com/mod/quiz/…"
              onChange={(e) => set({ link: e.target.value })}
              className="field"
            />
          </Field>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-[4px] border border-line bg-paper p-3 text-sm text-ink transition hover:border-ink/50">
            <input
              type="checkbox"
              checked={draft.repeat === 'weekly'}
              onChange={(e) => set({ repeat: e.target.checked ? 'weekly' : null })}
              className="mt-0.5 h-4 w-4 shrink-0 accent-done"
            />
            <span>
              <span className="flex items-center gap-1.5">
                <Icon name="repeat" size={12} />
                Repeat every week
              </span>
              <span className="block text-[11px] leading-snug text-ink-3">
                Ticking it off rolls the next occurrence onto the radar automatically
              </span>
              {draft.repeat === 'weekly' && !draft.dueDate && (
                <span className="mt-1 block text-[11px] leading-snug font-medium text-today">
                  Pick a due date first — its weekday is the anchor for the next repeat.
                </span>
              )}
            </span>
          </label>

          {task.source && (
            <div>
              <span className="font-mono text-[10px] font-medium tracking-[0.14em] text-ink-2 uppercase">
                Original captured text
              </span>
              <p className="mt-1.5 max-h-24 overflow-y-auto rounded-[3px] border border-line bg-paper p-2.5 text-[11px] leading-relaxed break-words text-ink-3">
                {task.source}
              </p>
            </div>
          )}
        </div>

        <div className="edit-footer flex flex-wrap items-center justify-between gap-2 border-t border-line bg-paper px-5 py-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onDelete}
              className="btn border-late text-late shadow-[2px_2px_0_var(--color-late)] hover:bg-late-soft"
            >
              Delete
            </button>
            {onDuplicate && (
              <button
                type="button"
                onClick={onDuplicate}
                title="Create a pending copy — useful for a re-submission or next week's round"
                className="btn btn-quiet"
              >
                <Icon name="copy" size={12} />
                Duplicate
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onClose} className="btn btn-quiet">
              Cancel
            </button>
            <button type="button" onClick={save} className="btn btn-primary">
              Save task
            </button>
          </div>
        </div>
    </Modal>
  )
}

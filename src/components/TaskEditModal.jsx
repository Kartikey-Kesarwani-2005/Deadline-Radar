import { useEffect, useState } from 'react'

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

export default function TaskEditModal({ task, onSave, onClose, onDelete }) {
  const [draft, setDraft] = useState({
    title: task.title,
    subject: task.subject || '',
    dueDate: task.dueDate || '',
    marks: task.marks ?? '',
    priority: task.priority || 'normal',
    link: task.link || '',
    repeat: task.repeat === 'weekly' ? 'weekly' : null,
  })

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Edit task"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[5px] border border-ink bg-paper-2 shadow-[6px_6px_0_rgba(29,27,22,0.22)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b-2 border-ink px-5 pt-4 pb-3">
          <div>
            <p className="eyebrow">Entry card</p>
            <h2 className="font-serif text-2xl leading-tight font-semibold text-ink">✏️ Edit task</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn mt-1"
            aria-label="Close edit dialog"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3.5 p-5">
          <Field label="Task">
            <textarea
              rows={2}
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
              🔁 Repeat every week
              <span className="block text-[11px] leading-snug text-ink-3">
                Ticking it off rolls the next occurrence onto the radar automatically
              </span>
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

        <div className="flex items-center justify-between gap-2 border-t border-line bg-paper px-5 py-3">
          <button
            type="button"
            onClick={onDelete}
            className="btn border-late text-late shadow-[2px_2px_0_var(--color-late)] hover:bg-late-soft"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn btn-quiet">
              Cancel
            </button>
            <button type="button" onClick={save} className="btn btn-primary">
              Save task
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

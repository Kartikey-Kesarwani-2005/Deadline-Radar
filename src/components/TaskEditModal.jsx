import { useEffect, useState } from 'react'

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/60 focus:outline-none'

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
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
  })

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  function save() {
    const marks = draft.marks === '' ? null : Number(draft.marks)
    onSave({
      title: draft.title.trim() || task.title,
      subject: draft.subject.trim() || null,
      dueDate: draft.dueDate || null,
      marks: Number.isFinite(marks) ? marks : null,
      priority: draft.priority,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1424] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">✏️ Edit task</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3.5">
          <Field label="Task">
            <textarea
              rows={2}
              value={draft.title}
              onChange={(e) => set({ title: e.target.value })}
              className={`${inputCls} resize-none`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Subject">
              <input
                value={draft.subject}
                placeholder="DBMS"
                onChange={(e) => set({ subject: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Marks">
              <input
                type="number"
                min="0"
                value={draft.marks}
                placeholder="20"
                onChange={(e) => set({ marks: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Due date">
              <input
                type="date"
                value={draft.dueDate}
                onChange={(e) => set({ dueDate: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Priority">
              <div className="flex gap-1.5">
                {['normal', 'high'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set({ priority: p })}
                    className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold capitalize transition ${
                      draft.priority === p
                        ? p === 'high'
                          ? 'border-red-500/50 bg-red-500/15 text-red-300'
                          : 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                        : 'border-white/10 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {task.source && (
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Original captured text
              </span>
              <p className="mt-1.5 max-h-24 overflow-y-auto rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-[11px] leading-relaxed break-words text-slate-500">
                {task.source}
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

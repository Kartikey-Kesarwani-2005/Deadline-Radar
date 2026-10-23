import { useState } from 'react'

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{hint}</p>}
    </label>
  )
}

const inputCls =
  'w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-500/60 focus:outline-none'

// Free-tier keys have distinctive prefixes — sniff the provider so pasting a
// Groq key auto-fills the right base URL + model. Without this, a user who
// pastes a gsk_… key but forgets the "Groq (free)" chip sends it to OpenAI and
// gets a confusing 401. The whole point: it "just works" the moment you paste.
const PROVIDERS = [
  { test: /^gsk_/i, name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'qwen/qwen3.8-27b' },
  {
    test: /^AIza/i,
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: 'gemini-2.5-flash',
  },
]

function guessProvider(key) {
  const k = String(key || '').trim()
  return PROVIDERS.find((p) => p.test.test(k)) || null
}

export default function SettingsModal({ settings, onSave, onClose, onClearAll, onExport, onImport }) {
  const [draft, setDraft] = useState(settings)
  const [confirmClear, setConfirmClear] = useState(false)
  const [detected, setDetected] = useState(null)

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  // Type/paste a key → snap base URL + model to that provider if they don't
  // already match. Never clobbers a manually-set endpoint (only fires when the
  // current baseUrl isn't already this provider's).
  function onKeyChange(raw) {
    set({ apiKey: raw })
    const p = guessProvider(raw)
    if (!p) {
      setDetected(null)
      return
    }
    setDraft((d) => {
      const alreadyGroqish = d.baseUrl === p.baseUrl
      if (!alreadyGroqish) setDetected(p.name)
      return alreadyGroqish ? d : { ...d, baseUrl: p.baseUrl, model: p.model }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1424] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-white/10 hover:text-slate-200"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div>
              <p className="text-sm font-semibold text-slate-200">Smart extract with AI</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                OFF still works — a built-in parser handles dates, marks and subjects offline.
                Turn ON for messier messages. Paste a Groq or Gemini key and the rest fills in
                automatically.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.aiEnabled}
              onClick={() => set({ aiEnabled: !draft.aiEnabled })}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                draft.aiEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                  draft.aiEnabled ? 'left-[22px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {draft.aiEnabled && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-500">Quick fill:</span>
                <button
                  type="button"
                  onClick={() =>
                    set({ baseUrl: 'https://api.groq.com/openai/v1', model: 'qwen/qwen3.8-27b' })
                  }
                  className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-slate-400 transition hover:border-emerald-500/40 hover:text-emerald-300"
                >
                  Groq (free)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    set({
                      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
                      model: 'gemini-2.5-flash',
                    })
                  }
                  className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-slate-400 transition hover:border-emerald-500/40 hover:text-emerald-300"
                >
                  Gemini (free)
                </button>
              </div>
              <Field label="API key" hint="Stored only in this browser's localStorage. Never shared anywhere else.">
                <input
                  type="password"
                  value={draft.apiKey}
                  onChange={(e) => onKeyChange(e.target.value)}
                  placeholder="sk-… / gsk_… / AIza…"
                  className={inputCls}
                />
                {detected && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                    <span aria-hidden="true">✓</span>
                    {detected} detected — base URL &amp; model set automatically
                  </p>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Base URL">
                  <input
                    value={draft.baseUrl}
                    onChange={(e) => set({ baseUrl: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field label="Model">
                  <input
                    value={draft.model}
                    onChange={(e) => set({ model: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>
            </>
          )}

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-200">🧲 Clipboard auto-detect</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                  Copy an assignment message (WhatsApp, notes…), switch back to this tab — we
                  check the clipboard and offer a one-tap capture. The text never leaves your
                  browser. Allow clipboard access once when asked.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.clipDetect}
                onClick={() => set({ clipDetect: !draft.clipDetect })}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  draft.clipDetect ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    draft.clipDetect ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm font-semibold text-slate-200">🖥️ Display mode</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              Auto picks the layout from your screen size. Phone mode: compact, big tap targets,
              card buttons always visible. Desktop: a wider radar dashboard.
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[
                ['auto', '✨ Auto'],
                ['desktop', '🖥️ Desktop'],
                ['phone', '📱 Phone'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set({ displayMode: value })}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                    (draft.displayMode || 'auto') === value
                      ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                      : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-sm font-semibold text-slate-200">Backup &amp; restore</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              Your tasks live only in this browser. Export a JSON backup before clearing site data
              or moving to another device.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onExport}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
              >
                ⬇ Export tasks (.json)
              </button>
              <label className="cursor-pointer rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-white/30 hover:text-slate-100">
                ⬆ Import backup
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) onImport(file)
                    e.target.value = ''
                  }}
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3">
            <p className="text-sm font-semibold text-red-300">Danger zone</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Deletes every captured task on this device.</p>
            <button
              type="button"
              onClick={() => (confirmClear ? onClearAll() : setConfirmClear(true))}
              onBlur={() => setConfirmClear(false)}
              className="mt-2 rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10"
            >
              {confirmClear ? 'Sure? Click again to delete all' : 'Clear all tasks'}
            </button>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

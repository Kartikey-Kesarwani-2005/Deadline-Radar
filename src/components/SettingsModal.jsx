import { useState } from 'react'
import Modal from './Modal'

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] font-medium tracking-[0.14em] text-ink-2 uppercase">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] leading-relaxed text-ink-3">{hint}</p>}
    </label>
  )
}

function Toggle({ on, onClick, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
        on ? 'border-ink bg-done' : 'border-line bg-paper-3'
      }`}
    >
      <span
        className={`absolute top-[2px] h-[18px] w-[18px] rounded-full border border-ink bg-paper-2 shadow-sm transition-all ${
          on ? 'left-[22px]' : 'left-[2px]'
        }`}
      />
    </button>
  )
}

const Card = ({ children }) => (
  <div className="rounded-[4px] border border-line bg-paper p-3">{children}</div>
)

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
    <Modal
      label="Settings"
      onClose={onClose}
      panelClassName="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[5px] border border-ink bg-paper-2 shadow-[6px_6px_0_rgba(29,27,22,0.22)]"
    >
        <div className="flex items-start justify-between gap-3 border-b-2 border-ink px-5 pt-4 pb-3">
          <div>
            <p className="eyebrow">Control panel</p>
            <h2 className="font-serif text-2xl leading-tight font-semibold text-ink">Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn mt-1"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 p-5">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-serif text-sm font-semibold text-ink">Smart extract with AI</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
                  OFF still works — a built-in parser handles dates, marks and subjects offline. Turn
                  ON for messier messages. Paste a Groq or Gemini key and the rest fills in
                  automatically.
                </p>
              </div>
              <Toggle
                on={draft.aiEnabled}
                onClick={() => set({ aiEnabled: !draft.aiEnabled })}
                label="Smart extract with AI"
              />
            </div>

            {draft.aiEnabled && (
              <div className="mt-3 space-y-3 border-t border-dashed border-line pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[9px] tracking-[0.1em] text-ink-3 uppercase">
                    Quick fill
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      set({ baseUrl: 'https://api.groq.com/openai/v1', model: 'qwen/qwen3.8-27b' })
                    }
                    className="tag border-ink/25 bg-paper-2 text-ink-2 transition hover:border-ink hover:text-ink"
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
                    className="tag border-ink/25 bg-paper-2 text-ink-2 transition hover:border-ink hover:text-ink"
                  >
                    Gemini (free)
                  </button>
                </div>

                <Field
                  label="API key"
                  hint="Stored only in this browser's localStorage. Never shared anywhere else."
                >
                  <input
                    type="password"
                    value={draft.apiKey}
                    onChange={(e) => onKeyChange(e.target.value)}
                    placeholder="sk-… / gsk_… / AIza…"
                    className="field"
                  />
                  {detected && (
                    <p className="mt-1.5 flex items-center gap-1 font-mono text-[10px] text-done">
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
                      className="field"
                    />
                  </Field>
                  <Field label="Model">
                    <input
                      value={draft.model}
                      onChange={(e) => set({ model: e.target.value })}
                      className="field"
                    />
                  </Field>
                </div>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-serif text-sm font-semibold text-ink">🧲 Clipboard auto-detect</p>
                <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
                  Copy an assignment message (WhatsApp, notes…), switch back to this tab — we check
                  the clipboard and offer a one-tap capture. The text never leaves your browser.
                  Allow clipboard access once when asked.
                </p>
              </div>
              <Toggle
                on={draft.clipDetect}
                onClick={() => set({ clipDetect: !draft.clipDetect })}
                label="Clipboard auto-detect"
              />
            </div>
          </Card>

          <Card>
            <p className="font-serif text-sm font-semibold text-ink">🖥️ Display mode</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
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
                  className={
                    (draft.displayMode || 'auto') === value
                      ? 'btn btn-primary !px-2 !text-[10px]'
                      : 'btn btn-quiet !px-2 !text-[10px]'
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <p className="font-serif text-sm font-semibold text-ink">Backup &amp; restore</p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-3">
              Your tasks live only in this browser. Export a JSON backup before clearing site data or
              moving to another device.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={onExport} className="btn btn-quiet">
                ⬇ Export tasks (.json)
              </button>
              <label className="btn btn-quiet cursor-pointer">
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
          </Card>

          <div className="rounded-[4px] border border-late/35 bg-late-soft/60 p-3">
            <p className="font-serif text-sm font-semibold text-late">Danger zone</p>
            <p className="mt-1 text-[11px] text-ink-2">Deletes every captured task on this device.</p>
            <button
              type="button"
              onClick={() => (confirmClear ? onClearAll() : setConfirmClear(true))}
              onBlur={() => setConfirmClear(false)}
              className="btn mt-2 border-late text-late shadow-[2px_2px_0_var(--color-late)] hover:bg-late-soft"
            >
              {confirmClear ? 'Sure? Click again to delete all' : 'Clear all tasks'}
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line bg-paper px-5 py-3">
          <button type="button" onClick={onClose} className="btn btn-quiet">
            Cancel
          </button>
          <button type="button" onClick={() => onSave(draft)} className="btn btn-primary">
            Save settings
          </button>
        </div>
    </Modal>
  )
}

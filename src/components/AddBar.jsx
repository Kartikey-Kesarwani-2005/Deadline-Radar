import { useState } from 'react'

export default function AddBar({ onAdd, busy, inputRef }) {
  const [text, setText] = useState('')

  async function submit() {
    const value = text.trim()
    if (!value || busy) return
    setText('')
    await onAdd(value)
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-[0_10px_40px_-16px_rgba(16,185,129,0.5)] backdrop-blur">
      <textarea
        rows={2}
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder="Paste an assignment message… or hold your Wispr key, speak, and hit Enter"
        aria-label="Add a deadline"
        className="w-full resize-none bg-transparent px-2 py-1.5 text-[15px] leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-1">
        <span className="text-xs text-slate-500">
          🎙️ Hold your Wispr key and speak — the text lands right here
        </span>
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || busy}
          className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? 'Reading…' : 'Add to radar →'}
        </button>
      </div>
    </div>
  )
}

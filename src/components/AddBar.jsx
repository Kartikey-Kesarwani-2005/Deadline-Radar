import { useState } from 'react'
import Icon from './Icon'

export default function AddBar({ onAdd, busy, inputRef, onImage, onAsk, onBrief, listening, canAsk }) {
  const [text, setText] = useState('')

  async function submit() {
    const value = text.trim()
    if (!value || busy) return
    // Clear only after capture succeeds — a failed parse (addTask → null)
    // keeps the pasted text so the user can retry instead of re-pasting.
    const result = await onAdd(value)
    if (result === null) return
    setText('')
  }

  return (
    <div className="addbar-shell rise relative overflow-hidden rounded-[5px] border border-ink bg-paper-2 shadow-[3px_3px_0_var(--color-line-strong)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper px-3.5 py-1.5">
        <span className="eyebrow flex items-center gap-1.5">
          <Icon name="pencil" size={11} />
          New entry
        </span>
        <span className="font-mono text-[9px] tracking-[0.1em] text-ink-3 uppercase">
          Enter files it · Shift+Enter = new line
        </span>
      </div>

      <div className="relative px-4 py-2">
        {/* the red margin line of a notebook page */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-2 w-px bg-late/45" />
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
          className="ruled w-full resize-none bg-transparent px-2 py-1.5 font-serif text-[16px] text-ink caret-late placeholder:font-sans placeholder:text-[13px] placeholder:text-ink-3 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper px-3 py-2">
        <span className="wispr-hint inline-flex items-center gap-2 font-mono text-[9px] tracking-[0.08em] text-ink-3 uppercase">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-late opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-late" />
          </span>
          Hold Wispr · speak · the text lands here
        </span>
        <div className="add-row flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={onBrief}
            title="Radar Samachaar — hear your day spoken out loud"
            className="btn btn-quiet"
          >
            <Icon name="volume" size={12} />
            Briefing
          </button>
          {canAsk && (
            <button
              type="button"
              onClick={onAsk}
              disabled={busy || listening}
              title="Ask the radar — say “aaj kya hai”, “kitne marks risk me”, or just order it: “mark DBMS done”, “delete OS lab”, “add viva Friday”"
              className={`btn ${listening ? 'btn-accent animate-pulse' : 'btn-quiet'}`}
            >
              <Icon name="mic" size={12} />
              {listening ? 'Sun raha hoon…' : 'Ask'}
            </button>
          )}
          <label
            title="Extract a task from a screenshot or photo"
            className="btn btn-quiet cursor-pointer"
          >
            <Icon name="camera" size={12} />
            Photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) onImage(file)
              }}
            />
          </label>
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() || busy}
            className="add-submit btn btn-primary"
          >
            {busy ? (
              'Reading…'
            ) : (
              <>
                File it
                <Icon name="arrowRight" size={12} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

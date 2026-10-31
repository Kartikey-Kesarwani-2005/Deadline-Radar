import { useState } from 'react'
import Modal from './Modal'
import Icon from './Icon'
import { guessCoach, MARKING_PRESETS } from '../lib/marking'

/**
 * 🧮 The exam-hall ledger. "Guess karun ya chhodun?" — the question negative
 * marking asks and no other tracker answers. Pakka-sahi marks bank separately,
 * each guess gets an expected value from an honest accuracy slider, and the
 * verdict prints like a marking-scheme line. Nothing sent anywhere — it runs
 * on the paper, in the browser.
 */
export default function MarkCoach({ onClose }) {
  const [presetIdx, setPresetIdx] = useState(0)
  const preset = MARKING_PRESETS[presetIdx]
  const [attempted, setAttempted] = useState(60)
  const [sure, setSure] = useState(35)
  const [accuracyPct, setAccuracyPct] = useState(35)

  const r = guessCoach({
    attempted,
    sure,
    accuracyPct,
    award: preset.award,
    penalty: preset.penalty,
  })

  const clamp = (n, max = 999) => Math.max(0, Math.min(max, Number.isFinite(Number(n)) ? Math.floor(Number(n)) : 0))
  const guessTone =
    r.verdict === 'guess' ? 'text-done' : r.verdict === 'flip' ? 'text-today' : 'text-late'

  return (
    <Modal
      label="Negative-marking coach"
      onClose={onClose}
      panelClassName="sheet max-h-[90dvh] w-full max-w-md overflow-y-auto"
    >
      <div className="flex items-start justify-between gap-3 border-b-2 border-ink px-5 pt-4 pb-3">
        <div>
          <p className="eyebrow">Exam coach · live ledger</p>
          <h2 className="font-serif text-2xl leading-tight font-semibold text-ink">
            Guess karun ya chhodun?
          </h2>
        </div>
        <button type="button" onClick={onClose} className="icon-btn mt-1" aria-label="Close coach">
          <Icon name="x" size={14} />
        </button>
      </div>

      <div className="px-5 pt-4 pb-5">
        <label className="block">
          <span className="font-mono text-[10px] font-medium tracking-[0.14em] text-ink-2 uppercase">
            Marking scheme
          </span>
          <select
            value={presetIdx}
            onChange={(e) => setPresetIdx(Number(e.target.value))}
            className="field mt-1.5 w-full"
            aria-label="Marking scheme"
          >
            {MARKING_PRESETS.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Attempted questions" value={attempted} onChange={(v) => setAttempted(clamp(v))} />
          <Field
            label="Pakka sahi lag rahe"
            value={sure}
            onChange={(v) => setSure(clamp(v, attempted || 999))}
            hint={sure > attempted ? 'Attempted se zyada nahi ho sakta' : null}
          />
        </div>

        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] font-medium tracking-[0.14em] text-ink-2 uppercase">
              Guess ki accuracy
            </span>
            <span className="font-mono text-[13px] font-semibold tabular-nums text-ink">
              {accuracyPct}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={accuracyPct}
            onChange={(e) => setAccuracyPct(Number(e.target.value))}
            className="mt-1.5 w-full accent-[var(--color-ink)]"
            aria-label="Guess accuracy percent"
          />
          <p className="font-mono text-[9.5px] leading-relaxed text-ink-3">
            Safety guesses usually land 30–50% — 4 options me eliminate karke 2 bache = ~50%.
          </p>
        </div>

        {/* The ledger — nothing clever, just the marking scheme doing its work. */}
        <div className="mt-4 rounded-[4px] border border-line bg-paper-2 px-4 py-3">
          <p className="eyebrow mb-1.5">Expected marks</p>
          <div className="space-y-1 font-mono text-[11.5px] tabular-nums text-ink-2">
            <LedgerRow label={`${sure} pakka sahi × +${preset.award}`} value={`+${r.sureMarks}`} />
            <LedgerRow
              label={`${r.guesses} guesses @ ${accuracyPct}%`}
              value={`${r.guesses * r.evPerGuess >= 0 ? '+' : ''}${Math.round(r.guesses * r.evPerGuess * 10) / 10}`}
            />
            <div className="my-1.5 border-t border-dashed border-line" />
            <LedgerRow
              label="With guesses"
              value={`${r.expected >= 0 ? '' : '−'}${Math.abs(r.expected)}`}
              strong
            />
            <LedgerRow label="If you leave guesses blank" value={r.skipTotal} muted />
          </div>
        </div>

        <div className={`mt-3 flex items-start gap-2.5 rounded-[4px] border border-dashed border-line bg-paper px-4 py-3`}>
          <Icon
            name={r.verdict === 'guess' ? 'check' : r.verdict === 'skip' ? 'x' : 'alert'}
            size={13}
            strokeWidth={2}
            className={`mt-[3px] shrink-0 ${guessTone}`}
          />
          <p className="text-[12.5px] leading-relaxed text-ink-2">
            <b className={`font-semibold ${guessTone}`}>
              {r.verdict === 'guess' ? 'Guess rakho.' : r.verdict === 'flip' ? 'Sweet spot pe ho.' : 'Chhod do.'}
            </b>{' '}
            {r.advice} <span className="whitespace-nowrap">(break-even: {r.breakPct}%)</span>
          </p>
        </div>

        <p className="mt-3 font-mono text-[9px] leading-relaxed tracking-wide text-ink-3">
          Break-even accuracy = penalty ÷ (award + penalty) — us accuracy se kam har guess ghata
          hai. Exam se pehle gharon me practice ke saath apni accuracy likho; hall me yahi page
          kholna hai.
        </p>
      </div>
    </Modal>
  )
}

function Field({ label, value, onChange, hint }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] font-medium tracking-[0.14em] text-ink-2 uppercase">
        {label}
      </span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field mt-1.5 w-full tabular-nums"
        inputMode="numeric"
        aria-label={label}
      />
      {hint && <p className="mt-1 text-[10.5px] text-late">{hint}</p>}
    </label>
  )
}

function LedgerRow({ label, value, strong = false, muted = false }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 ${strong ? 'text-[13px] font-bold text-ink' : ''} ${muted ? 'text-ink-3' : ''}`}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="leader" />
      <span>{value}</span>
    </div>
  )
}

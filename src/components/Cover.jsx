import Icon from './Icon'

/**
 * 🎬 The opening page — once per browser, the radar presents itself the way
 * a well-made file does: stamped masthead, the promise, then the paper flips
 * away to reveal the working desk. 1.7s, click to skip, then never again —
 * the wow earns its welcome without ever becoming a gate.
 */
export default function Cover({ onSkip }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Open the radar"
      onClick={onSkip}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && onSkip()}
      id="cover-page"
    >
      <div className="cover-inner text-center">
        <p className="cover-eyebrow">FIELD NOTES · EST. 2026 · NO-HANDS CHALLENGE</p>
        <h1 className="cover-title font-serif">
          Deadline <span className="cover-title-accent">Radar</span>
        </h1>
        <p className="cover-rule" aria-hidden="true" />
        <p className="cover-promise">
          Paste. Speak. Never miss a submission.
        </p>
        <div className="cover-stamp-wrap">
          <span className="cover-stamp">
            <Icon name="bell" size={13} strokeWidth={1.6} />
            FILE OPENED
          </span>
        </div>
        <p className="cover-hint font-mono">tap to open ↓</p>
      </div>
    </div>
  )
}

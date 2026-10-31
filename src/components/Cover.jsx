import { useEffect, useMemo, useRef } from 'react'
import { addDays, formatDue, formatLongToday, parseDateKey, todayKey } from '../lib/dates'
import { subjectInk, subjectStyle } from '../lib/subjects'
import Icon from './Icon'

/**
 * 🎬 The dossier cover — the radar's front page, not a splash screen.
 *
 * A real file cover: stamped masthead, the next deadline, a live table of
 * contents that reads the radar behind it, and the week ahead as a printed
 * strip. Every contents row is a door — press "Late" and the sheet lifts
 * straight onto that section. The OPEN stamp lifts it onto the top.
 *
 * It opens once per browser on first visit, and comes back any time from the
 * masthead, the toolbar home button, Settings, or the `h` key. `?home=1` is a
 * permanent, shareable door to this page.
 */
export default function Cover({ tasks = [], counts = {}, riskTotal = 0, opening, onOpen, onDemo }) {
  const boxRef = useRef(null)
  const stampRef = useRef(null)
  useEffect(() => {
    // Keyboard judges land straight on the stamp — Enter opens the file.
    const raf = requestAnimationFrame(() => {
      ;(boxRef.current?.querySelector('[data-autofocus]') || boxRef.current)?.focus?.()
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  const rows = [
    { key: 'late', label: 'Late', sub: 'handle now', n: Number(counts.late) || 0, dot: 'var(--color-late)' },
    { key: 'today', label: 'Due today', sub: 'before midnight', n: Number(counts.today) || 0, dot: 'var(--color-today)' },
    { key: 'week', label: 'This week', sub: 'next seven days', n: Number(counts.week) || 0, dot: 'var(--color-week)' },
    { key: 'later', label: 'Later', sub: 'beyond the week', n: Number(counts.later) || 0, dot: 'var(--color-later)' },
    { key: 'noDate', label: 'No date', sub: 'give these a day', n: Number(counts.noDate) || 0, dot: 'var(--color-ink-3)' },
    { key: 'done', label: 'Done', sub: 'evidence filed', n: Number(counts.done) || 0, dot: 'var(--color-done)' },
  ]
  const fileTotal = rows.reduce((a, r) => a + r.n, 0)
  const pendingTotal = fileTotal - (Number(counts.done) || 0)

  // The week ahead + the single next thing on the desk. Pure, derived from the
  // same tasks the radar renders — the cover never invents content.
  const { week, next } = useMemo(() => {
    const today = todayKey()
    const pending = tasks.filter((t) => !t.done && t.dueDate && parseDateKey(t.dueDate))
    const sorted = [...pending].sort(
      (a, b) => a.dueDate.localeCompare(b.dueDate) || (b.marks || 0) - (a.marks || 0),
    )
    const days = Array.from({ length: 7 }, (_, i) => {
      const key = addDays(today, i)
      const d = parseDateKey(key)
      const due = pending.filter((t) => t.dueDate === key)
      return {
        key,
        name: d ? d.toLocaleDateString('en-IN', { weekday: 'short' }) : '',
        day: d ? d.getDate() : '',
        count: due.length,
        marks: due.reduce((a, t) => a + (Number(t.marks) || 0), 0),
        isToday: key === today,
      }
    })
    return { week: days, next: sorted[0] || null }
  }, [tasks])

  // Loading a sample file removes the button that was focused — hand focus
  // back to the stamp so Enter still opens the file.
  useEffect(() => {
    if (!opening && fileTotal > 0) stampRef.current?.focus()
  }, [fileTotal, opening])

  return (
    <div
      id="cover-page"
      ref={boxRef}
      className={opening ? 'is-opening' : ''}
      role="dialog"
      aria-modal="true"
      aria-label="Deadline Radar — front page: open the file"
      onKeyDown={(e) => {
        if (opening) return
        // Escape always opens. Enter is handled by the focused button itself,
        // so a focused contents row opens ITS section instead of the top.
        if (e.key === 'Escape' || (e.key === 'Enter' && e.target === e.currentTarget)) {
          e.preventDefault()
          onOpen()
          return
        }
        // 1–6 are the printed contents index: press a number, open that door.
        if (/^[1-6]$/.test(e.key)) {
          const r = rows[Number(e.key) - 1]
          if (r && r.n > 0) {
            e.preventDefault()
            onOpen(r.key)
          }
        }
      }}
      tabIndex={-1}
    >
      <div className="cover-inner">
        <div className="cover-topline">
          <span className="cover-file-no">Field Notes · Dossier 026</span>
          <span className="cover-topline-date">{formatLongToday()}</span>
          <span className="cover-file-tag">No Hands Challenge</span>
        </div>

        <div className="cover-grid">
          {/* Left leaf — masthead + the one action that matters */}
          <div className="cover-lead">
            <p className="cover-eyebrow">Built with Wispr Flow · voice first</p>
            <h1 className="cover-title">
              Deadline <span className="cover-title-accent">Radar</span>
            </h1>
            <div className="cover-rule" aria-hidden="true" />
            <p className="cover-blurb">
              Every deadline that arrives as a WhatsApp forward, a screenshot or a voice note —
              filed, dated and answered. <b>Paste, speak, or photograph it.</b>
            </p>

            <div className="cover-chips" aria-label="What is inside">
              <span>🎙 Voice-first</span>
              <span>🧠 Learns your pace</span>
              <span>🖨 Print-ready</span>
            </div>

            <div className="cover-stamp-wrap">
              <button
                type="button"
                ref={stampRef}
                onClick={() => onOpen()}
                disabled={opening}
                data-autofocus
                className="cover-stamp"
                aria-label={fileTotal > 0 ? 'Open the file — enter the radar' : 'Start the radar'}
              >
                <Icon name={fileTotal > 0 ? 'external' : 'pencil'} size={14} strokeWidth={1.6} />
                {fileTotal > 0 ? 'Open the file' : 'Start the radar'}
              </button>
            </div>

            <p className="cover-foot">
              Paste. Speak. Never miss a submission.
              <span className="cover-hint">
                click the stamp · Enter · Esc · 1–6 jump · h returns here
              </span>
            </p>
          </div>

          {/* Right leaf — the live contents, the next entry, the week ahead */}
          <div className="cover-side">
            {next ? (
              <div className="cover-next">
                <span className="cover-next-label">Next on the desk</span>
                <p className="cover-next-title">{next.title}</p>
                <div className="cover-next-meta">
                  {next.subject && (
                    <span className="cover-next-subject" style={subjectStyle(next.subject, { soft: true })}>
                      {next.subject}
                    </span>
                  )}
                  <span>{formatDue(next.dueDate)}</span>
                  {next.marks != null && <span>{next.marks} marks</span>}
                </div>
              </div>
            ) : (
              <div className="cover-next is-empty">
                <span className="cover-next-label">Khaali file</span>
                <p className="cover-next-copy">
                  Nothing filed yet. Paste a deadline, hold your Wispr key, or open a sample file
                  to look around first.
                </p>
                {onDemo && (
                  <button type="button" onClick={onDemo} disabled={opening} className="cover-demo">
                    Load a sample file
                    <Icon name="arrowRight" size={11} />
                  </button>
                )}
              </div>
            )}

            <div className="cover-toc" role="navigation" aria-label="Table of contents">
              <span className="cover-toc-title">
                {fileTotal > 0 ? 'Table of contents' : 'The file is empty'}
              </span>
              {rows.map((r, i) => {
                const content = (
                  <>
                    <span className="toc-index" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span aria-hidden="true" className="toc-dot" style={{ background: r.dot }} />
                    <span className="min-w-0 flex-1">
                      <span className="toc-label">{r.label}</span>
                      <span className="toc-sub">{r.sub}</span>
                    </span>
                    <span className="toc-count">{r.n}</span>
                    {r.n > 0 && <Icon name="arrowRight" size={11} className="toc-arrow" />}
                  </>
                )
                return r.n > 0 ? (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => onOpen(r.key)}
                    disabled={opening}
                    aria-keyshortcuts={String(i + 1)}
                    title={`Open ${r.label} — ${r.n} ${r.n === 1 ? 'entry' : 'entries'} · ${i + 1}`}
                    className="toc-row is-link"
                  >
                    {content}
                  </button>
                ) : (
                  <div
                    key={r.key}
                    aria-disabled="true"
                    title={`Nothing in ${r.label}`}
                    className="toc-row is-empty"
                  >
                    {content}
                  </div>
                )
              })}
              {pendingTotal > 0 && (
                <p className="toc-note">
                  🎯 {riskTotal} marks riding on {pendingTotal} pending{' '}
                  {pendingTotal === 1 ? 'entry' : 'entries'}
                </p>
              )}
            </div>

            <div className="cover-week" aria-label="The next seven days">
              <span className="cover-week-title">The week ahead</span>
              <div className="cover-week-grid">
                {week.map((d) => (
                  <div
                    key={d.key}
                    title={`${d.name} ${d.day} — ${
                      d.count
                        ? `${d.count} pending${d.marks ? `, ${d.marks} marks` : ''}`
                        : 'nothing due'
                    }`}
                    className={`cover-day ${d.isToday ? 'is-today' : ''} ${
                      d.count ? 'has-work' : ''
                    }`}
                  >
                    <span className="cover-day-name">{d.name}</span>
                    <span className="cover-day-num">{d.day}</span>
                    <span className={`cover-day-mark ${d.count ? '' : 'is-empty'}`}>
                      {d.marks ? `${d.marks}m` : d.count || '·'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

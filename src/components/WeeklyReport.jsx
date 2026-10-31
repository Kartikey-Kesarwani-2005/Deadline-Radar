import { useState } from 'react'
import Modal from './Modal'
import Icon from './Icon'
import { dayDiff, toDateKey, todayKey } from '../lib/dates'
import { marksAtRisk, onTimeStreak, paceRows, reportGrade, subjectLoad, weeklyTrend } from '../lib/brain'
import { gradeCardBlob, shareOrSaveGradeCard } from '../lib/cardImage'
import { subjectInk } from '../lib/subjects'

const WEEK = 7 * 24 * 60 * 60 * 1000

/** Stamp ink colour for a grade — green when the week earns it, red when not. */
function gradeTone(grade, score) {
  if (grade === null) return 'text-ink-3'
  if (score >= 70) return 'border-done text-done'
  if (score >= 45) return 'border-today text-today'
  return 'border-late text-late'
}

function Row({ label, value, className = 'text-ink' }) {
  return (
    <div className="report-row flex items-baseline gap-2 border-b border-dotted border-line py-1.5 last:border-0">
      <span className="text-[12px] leading-snug text-ink-2">{label}</span>
      <span aria-hidden="true" className="leader" />
      <span className={`font-serif text-[17px] leading-none font-semibold tabular-nums ${className}`}>
        {value}
      </span>
    </div>
  )
}

const SectionLabel = ({ children }) => (
  <p className="eyebrow mt-4 mb-1 border-b border-ink/25 pb-1">{children}</p>
)

/**
 * One report figure, printed with the same anatomy as the dashboard's stat
 * tiles (label / serif number / hint) so the two read as one instrument set.
 * Mounted inside a dialog, so it enters on the `.rise` animation rather than
 * the scroll observer.
 */
function ReportStat({ label, value, tone = 'text-ink', hint, alert = false, delay = 0 }) {
  return (
    <div
      className={`stat-tile rise rounded-[4px] border px-3 py-2.5 ${
        alert ? 'is-alert border-late/35 bg-late-soft/45' : 'border-line bg-paper-2'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${tone}`}>{value}</span>
      <span className="stat-hint">{hint}</span>
    </div>
  )
}

export default function WeeklyReport({ tasks, onClose }) {
  const [copied, setCopied] = useState(false)
  const [copyErr, setCopyErr] = useState(false)
  const [photoState, setPhotoState] = useState('idle') // idle | busy | done | error

  const captured = tasks.filter((t) => t.createdAt && t.createdAt >= Date.now() - WEEK).length
  const finished = tasks.filter((t) => t.completedAt && t.completedAt >= Date.now() - WEEK)
  const onTime = finished.filter(
    (t) => t.dueDate && toDateKey(new Date(t.completedAt)) <= t.dueDate,
  ).length
  const pending = tasks.filter((t) => !t.done && t.dueDate).length
  const late = tasks.filter((t) => !t.done && t.dueDate && dayDiff(todayKey(), t.dueDate) < 0)
    .length
  const doneEver = tasks.filter((t) => t.done).length
  const risk = marksAtRisk(tasks)
  const pace = paceRows(tasks)
  const trend = weeklyTrend(tasks)
  const streak = onTimeStreak(tasks)
  const load = subjectLoad(tasks)
  const grade = reportGrade(tasks)
  const delta = (now, before) =>
    now > before ? 'text-done' : now < before ? 'text-late' : 'text-ink'

  const reportText = [
    'Deadline Radar — weekly check-in 📡',
    grade.grade
      ? `🏅 Grade: ${grade.grade} (${grade.score}/100) — ${grade.note}`
      : `🏅 Grade: not yet — ${grade.note}`,
    `📥 Captured this week: ${captured}`,
    `✅ Finished this week: ${finished.length} · on time: ${onTime}`,
    `📌 Pending with a deadline: ${pending}${late ? ` · late: ${late}` : ''}`,
    `🎯 Marks at risk: ${risk.total}${risk.late ? ` (${risk.late} already late)` : ''}`,
    `🏁 Total finished so far: ${doneEver}`,
    `🏆 On-time streak: ${streak} in a row`,
    `📈 Trend: finished ${trend.lastWeek.finished}→${trend.thisWeek.finished} · on time ${trend.lastWeek.onTime}→${trend.thisWeek.onTime} · focused ${(trend.thisWeek.focusMin / 60).toFixed(1)}h`,
    pace.length
      ? `🧠 Weakest subject: ${pace[0].label} (${pace[0].onTimeRate}% on time)`
      : null,
    '',
    'Built hands-free with Wispr Flow · #NoHandsChallenge',
  ]
    .filter(Boolean)
    .join('\n')

  async function copy() {
    try {
      await navigator.clipboard.writeText(reportText)
      setCopied(true)
      setCopyErr(false)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard can be blocked (permissions / non-secure context) — tell the
      // user instead of silently snapping the button back.
      setCopied(false)
      setCopyErr(true)
      setTimeout(() => setCopyErr(false), 3500)
    }
  }

  // 📸 The report as an actual photo — the artefact people share in group
  // chats, authored here instead of a blurry screenshot.
  async function photo() {
    if (photoState === 'busy') return
    setPhotoState('busy')
    try {
      const stampTone = grade.grade
        ? grade.score >= 70
          ? '#68792b'
          : grade.score >= 45
            ? '#a06b0c'
            : '#b83a20'
        : null
      const blob = await gradeCardBlob({
        grade: grade.grade,
        score: grade.score,
        tone: stampTone,
        note: grade.grade ? grade.note : null,
        weekLabel: `week of the last 7 days · ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`,
        rows: [
          { label: 'Finished this week', value: `${finished.length}` },
          { label: 'Of those, on time', value: `${onTime}` },
          { label: 'On-time streak', value: `${streak > 0 ? `${streak} in a row` : '—'}` },
          { label: 'Marks at risk', value: `${risk.total}` },
          { label: 'Total finished', value: `${doneEver}` },
        ],
      })
      await shareOrSaveGradeCard(blob)
      setPhotoState('done')
      setTimeout(() => setPhotoState('idle'), 2600)
    } catch {
      setPhotoState('error')
      setTimeout(() => setPhotoState('idle'), 3200)
    }
  }

  return (
    <Modal
      label="Weekly report"
      onClose={onClose}
      panelClassName="sheet max-h-[90dvh] w-full max-w-md overflow-y-auto sm:max-w-lg"
    >
        <div className="flex items-start justify-between gap-3 border-b-2 border-ink px-5 pt-4 pb-3">
          <div>
            <p className="eyebrow">Weekly edition · last 7 days</p>
            <h2 className="font-serif text-2xl leading-tight font-semibold text-ink">Weekly report</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-btn mt-1" aria-label="Close report">
            <Icon name="x" size={14} />
          </button>
        </div>

        {/* 🏅 The grade stamp — rubber-stamped like the rest of Field Notes.
            Under 3 rated finishes the report refuses to print a grade. */}
        {grade.grade ? (
          <div className="mx-5 mt-4 flex items-center gap-3.5 rounded-[4px] border border-dashed border-line bg-paper px-3.5 py-3">
            <span
              aria-label={`Weekly grade ${grade.grade}, ${grade.score} out of 100`}
              role="img"
              className={`inline-flex -rotate-2 shrink-0 items-center gap-2 rounded-[3px] border-2 ${gradeTone(
                grade.grade,
                grade.score,
              )} border-dashed px-3 py-1.5`}
              style={{ backgroundImage: 'var(--paper-grain)' }}
            >
              <span className="font-serif text-[26px] leading-none font-bold tracking-tight">
                {grade.grade}
              </span>
              <span className="font-mono text-[10px] font-semibold tracking-[0.08em] tabular-nums">
                {grade.score}
                <span className="opacity-60">/100</span>
              </span>
            </span>
            <p className="text-[12px] leading-relaxed text-ink-2">
              This week's grade — <b className="font-semibold text-ink">on-time rate carries 70%,
              the streak and a clean slate add up</b>, and the week-over-week trend nudges it.{' '}
              <span className="italic">{grade.note}</span>
            </p>
          </div>
        ) : (
          <p className="mx-5 mt-4 rounded-[4px] border border-dashed border-line bg-paper px-3.5 py-2.5 text-[12px] text-ink-3">
            🏅 Grade: none printed yet — {grade.note}
          </p>
        )}

        {/* Headline figures first — the four numbers a check-in post actually
            quotes, set in the same tile anatomy as the dashboard stats. */}
        <div className="mt-3 grid grid-cols-2 gap-2 px-5 sm:grid-cols-4">
          <ReportStat
            label="Captured"
            value={captured}
            hint="this week"
            delay={40}
          />
          <ReportStat
            label="Finished"
            value={finished.length}
            tone="text-done"
            hint={`${onTime} on time`}
            delay={90}
          />
          <ReportStat
            label="Streak"
            value={streak > 0 ? streak : '—'}
            tone={streak > 1 ? 'text-today' : streak === 1 ? 'text-done' : 'text-ink-3'}
            hint={streak > 0 ? 'on time in a row' : 'start it today'}
            delay={140}
          />
          <ReportStat
            label="At risk"
            value={risk.total}
            tone={risk.total > 0 ? 'text-late' : 'text-done'}
            hint={risk.late > 0 ? `${risk.late} already late` : 'marks pending'}
            alert={risk.total > 0}
            delay={190}
          />
        </div>

        <div className="px-5 pt-4 pb-5">
          <Row label="Captured" value={captured} />
          <Row label="Finished" value={finished.length} className="text-done" />
          <Row label="… of those finished on time" value={onTime} className="text-done" />
          <Row
            label="On-time streak"
            value={streak > 0 ? `${streak} in a row` : 'start it today'}
            className={streak > 1 ? 'text-today' : streak === 1 ? 'text-done' : 'text-ink-3'}
          />

          <SectionLabel>Trend vs last week</SectionLabel>
          <Row
            label="Finished — last → this"
            value={`${trend.lastWeek.finished} → ${trend.thisWeek.finished}`}
            className={delta(trend.thisWeek.finished, trend.lastWeek.finished)}
          />
          <Row
            label="On time — last → this"
            value={`${trend.lastWeek.onTime} → ${trend.thisWeek.onTime}`}
            className={delta(trend.thisWeek.onTime, trend.lastWeek.onTime)}
          />
          <Row
            label="⏱ Focused (timer sessions)"
            value={`${(trend.thisWeek.focusMin / 60).toFixed(1)}h`}
            className="text-later"
          />

          <SectionLabel>Overall</SectionLabel>
          <Row label="Pending with a deadline" value={pending} className="text-today" />
          <Row label="Late right now" value={late} className="text-late" />
          <Row label="Marks at risk (late + this week)" value={risk.total} className="text-today" />
          <Row label="Total finished" value={doneEver} className="text-done" />

          {load.length > 0 && (
            <>
              <SectionLabel>Pending load by subject (marks)</SectionLabel>
              <div className="space-y-2">
                {load.map((s) => {
                  const max = Math.max(1, load[0].marks)
                  const pct = Math.max(4, Math.round((s.marks / max) * 100))
                  const ink = subjectInk(s.label) || 'var(--color-later)'
                  return (
                    <div key={s.label} className="flex items-center gap-2 text-[11px]">
                      <span className="w-24 shrink-0 truncate text-ink-2" title={s.label}>
                        <span className="flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: ink }}
                          />
                          <span className="truncate">{s.label}</span>
                        </span>
                      </span>
                      <div className="h-[6px] min-w-0 flex-1 overflow-hidden rounded-[1px] border border-line bg-paper">
                        <div
                          className="h-full"
                          style={{ width: `${pct}%`, background: ink, opacity: 0.85 }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right font-mono text-[10px] tabular-nums text-ink-2">
                        {s.marks}m · {s.count}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-1.5 font-mono text-[9px] text-ink-3">
                Marks still pending per subject — heaviest first.
              </p>
            </>
          )}

          {pace.length > 0 && (
            <>
              <SectionLabel>Per-subject pace (worst first)</SectionLabel>
              <div className="overflow-hidden rounded-[3px] border border-line">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-paper text-ink-3">
                      <th className="px-2.5 py-1.5 text-left font-mono text-[9px] font-medium tracking-[0.08em] uppercase">
                        Subject
                      </th>
                      <th className="px-2.5 py-1.5 text-right font-mono text-[9px] font-medium tracking-[0.08em] uppercase">
                        On time
                      </th>
                      <th className="px-2.5 py-1.5 text-right font-mono text-[9px] font-medium tracking-[0.08em] uppercase">
                        Buffer
                      </th>
                      <th className="px-2.5 py-1.5 text-right font-mono text-[9px] font-medium tracking-[0.08em] uppercase">
                        min/mark
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pace.map((r) => (
                      <tr key={r.key} className="border-t border-line transition-colors hover:bg-paper-3/70">
                        <td className="px-2.5 py-1.5 text-left font-medium text-ink">{r.label}</td>
                        <td
                          className={`px-2.5 py-1.5 text-right font-semibold tabular-nums ${
                            r.onTimeRate >= 80
                              ? 'text-done'
                              : r.onTimeRate >= 50
                                ? 'text-today'
                                : 'text-late'
                          }`}
                        >
                          {r.onTimeRate}%
                        </td>
                        <td
                          className={`px-2.5 py-1.5 text-right tabular-nums ${
                            r.avgBuffer >= 0 ? 'text-done' : 'text-late'
                          }`}
                        >
                          {r.avgBuffer >= 0 ? '+' : ''}
                          {r.avgBuffer.toFixed(1)}d
                        </td>
                        <td className="px-2.5 py-1.5 text-right font-mono text-[10px] tabular-nums text-ink-3">
                          {r.minPerMark != null ? r.minPerMark : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1.5 font-mono text-[9px] leading-relaxed text-ink-3">
                Buffer = days early (+) or late (−) you usually finish. min/mark is learned from
                your focus-timer sessions.
              </p>
            </>
          )}

          {/* When the clipboard is blocked, show the text so "select and copy"
              is actually possible. */}
          {copyErr && (
            <pre className="mt-3 max-h-40 overflow-auto rounded-[3px] border border-late/35 bg-late-soft/50 p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap text-ink-2 select-text">
              {reportText}
            </pre>
          )}

          <div className="mt-3 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={copy}
              className={`btn w-full ${
                copyErr ? 'border-today text-today shadow-[2px_2px_0_var(--color-today)]' : 'btn-primary'
              }`}
            >
              {copied ? (
                <>
                  <Icon name="check" size={12} />
                  Copied — paste it in your check-in post
                </>
              ) : copyErr ? (
                <>
                  <Icon name="alert" size={12} />
                  Clipboard blocked — select the text above
                </>
              ) : (
                'Copy check-in text for your post'
              )}
            </button>
            <button
              type="button"
              onClick={photo}
              disabled={photoState === 'busy'}
              title="Draw the graded card as a crisp PNG — share it to the group or save it"
              className="btn w-full"
            >
              {photoState === 'done' ? (
                <>
                  <Icon name="check" size={12} />
                  Grade card shared / saved
                </>
              ) : photoState === 'error' ? (
                <>
                  <Icon name="alert" size={12} />
                  Photo ban nahi paya
                </>
              ) : (
                <>
                  <Icon name="download" size={12} />
                  📸 Grade card as a photo (PNG)
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-center font-mono text-[9px] leading-relaxed tracking-wide text-ink-3">
            Paste in your weekly post with #NoHandsChallenge · tag WeMakeDevs + Wispr Flow
          </p>
        </div>
    </Modal>
  )
}

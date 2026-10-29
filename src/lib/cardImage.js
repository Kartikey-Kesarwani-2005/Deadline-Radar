/**
 * 📸 The grade card as a photo — canvas print of the weekly report's stamp,
 * framed like a page torn from the same Field Notes. Students actually share
 * screenshots; here the radar authors the artefact itself: crisp @2x paper,
 * the rubber-stamped grade, the honest numbers, and the app's credit line.
 * Client-only; on any failure the caller degrades to the text copy.
 */

const PAPER = '#f3eee1'
const INK = '#1d1b16'
const FAINT = 'rgba(29, 27, 22, 0.55)'
const LINE = '#d9d2bd'
const SERIF = 'Georgia, "Times New Roman", serif'
const MONO = '"IBM Plex Mono", Consolas, monospace'

/**
 * @param {object} s - the stats snapshot (same values the weekly report shows)
 * @returns {Promise<Blob>}
 */
export function gradeCardBlob(s) {
  const scale = 2
  const W = 900
  const H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = H * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  // Paper + torn edge hint
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, W, H)

  // Corner registration marks — like a printed proof sheet
  ctx.strokeStyle = INK
  ctx.lineWidth = 1.5
  const M = 46
  for (const [x, y] of [
    [M, M],
    [W - M, M],
    [M, H - M],
    [W - M, H - M],
  ]) {
    ctx.beginPath()
    ctx.moveTo(x - 10, y)
    ctx.lineTo(x + 10, y)
    ctx.moveTo(x, y - 10)
    ctx.lineTo(x, y + 10)
    ctx.stroke()
  }

  // Masthead
  ctx.fillStyle = INK
  ctx.textAlign = 'center'
  ctx.font = `600 13px ${MONO}`
  ctx.letterSpacing = '6px' // ignored by old canvases, harmless
  ctx.fillText('DEADLINE RADAR · FIELD NOTES', W / 2, 116)
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.moveTo(M + 26, 138)
  ctx.lineTo(W - M - 26, 138)
  ctx.stroke()

  // Title
  ctx.font = `700 44px ${SERIF}`
  ctx.fillText('Weekly Report', W / 2, 208)
  ctx.font = `11px ${MONO}`
  ctx.fillStyle = FAINT
  ctx.fillText(s.weekLabel || 'last 7 days', W / 2, 236)

  // Grade stamp — dashed box, slight rotation, big serif letter
  const has = Boolean(s.grade)
  ctx.save()
  ctx.translate(W / 2, 420)
  ctx.rotate(-0.045)
  const bw = 300
  const bh = 190
  ctx.strokeStyle = has ? s.tone : FAINT
  ctx.lineWidth = 4
  ctx.setLineDash([12, 8])
  ctx.strokeRect(-bw / 2, -bh / 2, bw, bh)
  ctx.setLineDash([])
  ctx.fillStyle = has ? s.tone : FAINT
  if (has) {
    ctx.font = `700 110px ${SERIF}`
    ctx.textBaseline = 'middle'
    ctx.fillText(s.grade, -38, 6)
    ctx.font = `600 20px ${MONO}`
    ctx.fillText(`${s.score}/100`, 78, -18)
    ctx.fillStyle = FAINT
    ctx.font = `11px ${MONO}`
    ctx.fillText('ON TIME · STREAK · TREND', 78, 12)
    ctx.textBaseline = 'alphabetic'
  } else {
    ctx.font = `600 22px ${MONO}`
    ctx.fillText('NO GRADE YET', 0, -6)
    ctx.font = `13px ${MONO}`
    ctx.fillText('3 finishes → the stamp prints', 0, 24)
  }
  ctx.restore()

  // Numbers — the ledger rows
  const rows = s.rows || []
  let y = 560
  ctx.textAlign = 'left'
  for (const r of rows) {
    ctx.fillStyle = FAINT
    ctx.font = `400 15px ${MONO}`
    ctx.fillText(r.label.toUpperCase(), M + 26, y)
    ctx.textAlign = 'right'
    ctx.fillStyle = INK
    ctx.font = `700 22px ${SERIF}`
    ctx.fillText(r.value, W - M - 26, y + 1)
    ctx.textAlign = 'left'
    ctx.strokeStyle = LINE
    ctx.lineWidth = 1
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    ctx.moveTo(M + 26, y + 16)
    ctx.lineTo(W - M - 26, y + 16)
    ctx.stroke()
    ctx.setLineDash([])
    y += 46
  }

  // The one-line verdict
  if (s.note) {
    ctx.fillStyle = INK
    ctx.font = `italic 17px ${SERIF}`
    const words = String(s.note).split(' ')
    const lines = []
    let line = ''
    for (const w of words) {
      const t = line ? `${line} ${w}` : w
      if (ctx.measureText(t).width > W - 2 * M - 52) {
        lines.push(line)
        line = w
      } else line = t
    }
    lines.push(line)
    for (const ln of lines.slice(0, 3)) {
      ctx.textAlign = 'center'
      ctx.fillText(ln, W / 2, y + 6)
      y += 28
    }
  }

  // Footer
  ctx.textAlign = 'center'
  ctx.fillStyle = FAINT
  ctx.font = `11px ${MONO}`
  ctx.fillText('— via Deadline Radar · Wispr Flow · #NoHandsChallenge —', W / 2, H - 72)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas export failed'))), 'image/png')
  })
}

/** Share the PNG natively where possible, else save it as a download. */
export async function shareOrSaveGradeCard(blob) {
  const name = `deadline-radar-weekly-grade.png`
  try {
    if (navigator.canShare?.({ files: [new File([blob], name, { type: 'image/png' })] })) {
      await navigator.share({
        files: [new File([blob], name, { type: 'image/png' })],
        title: 'Deadline Radar — weekly grade',
      })
      return 'shared'
    }
  } catch {
    /* user cancelled — treat as handled */
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
  return 'saved'
}

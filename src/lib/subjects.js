/**
 * 🖋️ Subject inks — one deterministic fountain-pen colour per subject.
 *
 * The radar already inks urgency (rust = late, ochre = today, olive = week,
 * blue = later). Subjects needed their own family: deep, readable on warm
 * paper, and deliberately different from the urgency palette so a coloured
 * dot never reads as "late". The same subject always gets the same ink, so
 * scanning a month grid, the card tags, the subject load meters and the
 * weekly report becomes one continuous visual language.
 */

const INKS = [
  { name: 'indigo', ink: '#3d4a8a' },
  { name: 'teal', ink: '#1f6f6b' },
  { name: 'plum', ink: '#6d3a63' },
  { name: 'moss', ink: '#435c2a' },
  { name: 'berry', ink: '#8a3b53' },
  { name: 'sienna', ink: '#7a4620' },
  { name: 'cobalt', ink: '#2f5687' },
  { name: 'bronze', ink: '#6b5310' },
]

/** Stable 32-bit string hash — the same subject always inks the same colour. */
function hash(text) {
  const s = String(text || '')
    .trim()
    .toLowerCase()
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** The subject's ink, or null when there is no subject. */
export function subjectInk(subject) {
  const key = String(subject || '').trim()
  if (!key) return null
  return INKS[hash(key) % INKS.length].ink
}

/** Inline style for a coloured subject chip (text + border). */
export function subjectStyle(subject, { soft = false } = {}) {
  const ink = subjectInk(subject)
  if (!ink) return undefined
  return {
    color: ink,
    borderColor: `${ink}66`,
    background: soft ? `${ink}0f` : 'transparent',
  }
}

/** All subject inks used by a list of tasks, in first-seen order. */
export function subjectKeys(tasks = []) {
  const seen = new Map()
  for (const t of tasks) {
    const label = String(t?.subject || '').trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (!seen.has(key)) seen.set(key, { label, ink: subjectInk(label) })
  }
  return [...seen.values()]
}

export const SUBJECT_INK_NAMES = INKS.map((i) => i.name)

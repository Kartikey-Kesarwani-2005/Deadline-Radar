/**
 * 🎤 Voice commands — orders, not questions.
 * "mark DBMS done" → tick it · "delete OS lab" → remove it ·
 * "add DBMS viva Friday" → capture it. Pure text → intent; the caller runs
 * the action and speaks back. Anything that is NOT a confident order (every
 * question, every vague "mark it done") falls through to Ask-the-radar's
 * normal answers — a wrong tick would destroy trust, so ambiguity clarifies
 * instead of guessing.
 */

// Words that appear in almost every task title — alone they prove nothing.
const GENERIC = new Set([
  'assignment', 'assignments', 'submit', 'submission', 'deadline', 'due', 'record',
  'report', 'complete', 'finish', 'finished', 'portal', 'today', 'tomorrow', 'week',
  'weekly', 'marks', 'mark', 'task', 'tasks', 'please', 'exam', 'test', 'day', 'days',
  'time', 'class', 'group', 'share', 'slide', 'slides', 'ppt', 'form', 'paper', 'topic',
  'work', 'done', 'file', 'upload', 'uploaded', 'january', 'february', 'march', 'april',
  'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
])

const re = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** How loudly does this utterance point at this task? Subject beats title. */
function scoreTask(task, lower) {
  let score = 0
  const subj = (task.subject || '').trim().toLowerCase()
  if (subj) {
    const words = subj.split(/[^a-z0-9]+/).filter(Boolean)
    const initials = words.map((w) => w[0]).join('')
    if (
      new RegExp(`\\b${re(subj)}\\b`).test(lower) ||
      // "OS" for Operating Systems, "SE" for Software Engineering…
      (words.length > 1 && initials.length > 1 && new RegExp(`\\b${re(initials)}\\b`).test(lower)) ||
      words.some((w) => w.length >= 4 && new RegExp(`\\b${re(w)}\\b`).test(lower))
    ) {
      score += 3
    }
  }
  const tokens = new Set(task.title.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))
  for (const w of tokens) {
    if (w.length < (/\d/.test(w) ? 2 : 4)) continue
    if (GENERIC.has(w)) continue
    if (new RegExp(`\\b${re(w)}\\b`).test(lower)) score += w.length >= 7 ? 2 : 1
  }
  return score
}

const QUESTION =
  /^(?:what|when|where|why|how|who|which|is|are|was|were|do|does|did|can|could|should|would|will|shall|kitna|kitne|kya|kaun|kab|kaise|kyun|tell me|show me|give me)\b/

const DONE_VERBS = /^(?:please\s+)?(?:mark|tick|finish|complete|done)\b/
const DONE_STATES =
  /\b(?:done|ho\s+gaya|ho\s+gya|kar\s+diya|kar\s+diye|submit\s+kar\s+diya|submit\s+ho\s+gaya|clear\s+ho\s+gaya|done\s+kar\s+diya)\s*$/
const DELETE_VERBS =
  /\b(?:delete|remove|hata\s*do|hatado)\s*(?:kar\s*(?:do|diya|diye)|kardo|karo|do)?\s*$/

/**
 * text + tasks → intent:
 *   { type: 'add', text }                      — capture this phrase
 *   { type: 'done' | 'delete', task }          — act on this exact task
 *   { type: 'clarify', action, options? }      — order heard, target unclear
 *   null                                       — not an order (→ answer it)
 */
export function parseCommand(text, tasks = []) {
  const raw = String(text || '').trim()
  if (!raw) return null
  const q = raw.toLowerCase()

  // ADD first — "add …" is unambiguous and never a question.
  const addM = raw.match(/^\s*(?:please\s+)?(?:add|capture|make (?:a )?task (?:for|of)?)\s+(.+)$/i)
  if (addM && addM[1].trim()) {
    return { type: 'add', text: addM[1].trim().replace(/[.?!]+$/, '') }
  }

  // Questions belong to answerQuery, never to actions.
  if (QUESTION.test(q) || /\?\s*$/.test(raw)) return null

  const wantsDelete = /^(?:please\s+)?(?:delete|remove|hata\s*do|hatado)\b/.test(q) || DELETE_VERBS.test(q)
  const wantsDone = DONE_VERBS.test(q) || DONE_STATES.test(q)
  if (!wantsDone && !wantsDelete) return null

  const action = wantsDelete ? 'delete' : 'done'
  // "Mark done" only ever targets pending work; a done match means the user
  // is probably thinking of a different (still open) task.
  const pool = action === 'done' ? tasks.filter((t) => !t.done) : tasks
  const scored = pool
    .map((t) => ({ t, score: scoreTask(t, q) }))
    .filter((x) => x.score >= 2)
    .sort(
      (a, b) =>
        b.score - a.score ||
        String(a.t.dueDate || '9999-99-99').localeCompare(String(b.t.dueDate || '9999-99-99')),
    )

  if (!scored.length) return { type: 'clarify', action }
  // A dead heat would be a coin flip — ask instead of ticking the wrong card.
  if (scored.length > 1 && scored[0].score === scored[1].score) {
    return { type: 'clarify', action, options: [scored[0].t.title, scored[1].t.title] }
  }
  return { type: action, task: scored[0].t, text: raw }
}

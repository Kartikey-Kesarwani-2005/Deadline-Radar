/**
 * 🧮 "Guess karun ya chhodun?" — the negative-marking coach.
 * Every Indian exam after class 10 runs on negative marking (JEE +4/−1,
 * NEET +4/−1, GATE +1/−0.33…) and every student faces the same ledger
 * question in the hall: the ones I am sure about I will take — but the
 * guesses? No tracker anywhere answers this. One pure function does:
 * expected marks for guessing vs. leaving them, the break-even accuracy
 * and a verdict. Deterministic, injectable-free, honest.
 */

/**
 * @param {object} i
 * @param {number} i.attempted   total questions marked/seriously attempted
 * @param {number} i.sure        how many of those you are CONFIDENT are right
 * @param {number} i.accuracyPct your honest guess accuracy in % (0–100)
 * @param {number} i.award       marks per correct answer (>0)
 * @param {number} i.penalty     marks docked per wrong answer (>=0)
 * @returns {null | {
 *   guesses: number,        // attempted − sure
 *   sureMarks: number,      // banked marks from confident answers
 *   evPerGuess: number,     // expected (marks) value of ONE guess
 *   expected: number,       // sureMarks + guesses × evPerGuess
 *   skipTotal: number,      // expected if every guess is left blank
 *   breakPct: number,       // accuracy at which a guess flips profitable
 *   verdict: 'guess'|'flip'|'skip',
 *   advice: string,         // one-line, printed like exam-hall advice
 * }}
 */
export function guessCoach(i = {}) {
  const num = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : 0)
  const attempted = num(i.attempted)
  const sure = Math.min(num(i.sure), attempted)
  const award = num(i.award) > 0 ? num(i.award) : 4
  const penalty = Math.max(0, Number.isFinite(Number(i.penalty)) ? Number(i.penalty) : 1)
  const accuracyPct = Math.min(100, Math.max(0, num(i.accuracyPct)))

  const guesses = Math.round(attempted - sure)
  const p = accuracyPct / 100
  const sureMarks = Math.round(sure * award * 100) / 100
  const evPerGuess = Math.round((p * award - (1 - p) * penalty) * 1000) / 1000
  const expected = Math.round((sureMarks + guesses * evPerGuess) * 10) / 10
  const skipTotal = sureMarks
  const breakPct =
    Math.round((penalty / (award + penalty)) * 1000) / 10 // +4/−1 → 20%

  const verdict = evPerGuess > 0 ? 'guess' : evPerGuess === 0 ? 'flip' : 'skip'

  const round = (n) => (Number.isInteger(n) ? n : n.toFixed(1))
  const advice =
    verdict === 'guess'
      ? `Guess rakho — har guess ki expected value ${round(evPerGuess)} marks hai. ${guesses > 0 ? `${guesses} guesses ≈ ${round(guesses * evPerGuess)} extra.` : ''}`
      : verdict === 'flip'
        ? 'Coin-flip hai — thoda confident ho jao, phir khelo warna chhod do.'
        : `Chhod do — har guess tumhe ~${round(Math.abs(evPerGuess))} marks kha raha hai; blank ka zero safe hai.`

  return { guesses, sureMarks, evPerGuess, expected, skipTotal, breakPct, verdict, advice }
}

/** Marking presets for the coach sheet — the schemes students actually face. */
export const MARKING_PRESETS = [
  { label: 'JEE / NEET (+4 / −1)', award: 4, penalty: 1 },
  { label: 'GATE (+1 / −⅓)', award: 1, penalty: 1 / 3 },
  { label: 'Semester (-0.25)', award: 1, penalty: 0.25 },
  { label: 'No negative', award: 1, penalty: 0 },
]

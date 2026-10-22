/**
 * Voice query layer — "ask the radar out loud".
 * Uses the browser's Web Speech API (Chrome/Edge). Mic capture and speech
 * synthesis both degrade silently on unsupported browsers.
 */

export function canListen() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function canSpeak() {
  return 'speechSynthesis' in window
}

/** Speaks a short answer out loud; never throws. */
export function speak(text) {
  try {
    if (!canSpeak()) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const voices = window.speechSynthesis.getVoices?.() || []
    // Prefer an Indian-English voice (best for Hinglish), else any English.
    u.voice =
      voices.find((v) => /en[-_]IN/i.test(v.lang)) ||
      voices.find((v) => /^en/i.test(v.lang)) ||
      null
    u.rate = 1.02
    window.speechSynthesis.speak(u)
  } catch {
    /* speaking is a bonus — never break the flow for it */
  }
}

/** One-shot speech recognition; resolves with the transcript. */
export function listenOnce({ timeout = 7000 } = {}) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!Ctor) return Promise.reject(new Error('unsupported'))
  return new Promise((resolve, reject) => {
    const rec = new Ctor()
    rec.lang = 'en-IN'
    rec.interimResults = false
    rec.maxAlternatives = 1
    let settled = false
    const done = (fn, value) => {
      if (settled) return
      settled = true
      try {
        rec.abort()
      } catch {
        /* already stopped */
      }
      fn(value)
    }
    const timer = setTimeout(() => done(reject, new Error('timeout')), timeout)
    rec.onresult = (e) => {
      clearTimeout(timer)
      done(resolve, e.results[0][0].transcript)
    }
    rec.onerror = (e) => {
      clearTimeout(timer)
      done(reject, new Error(e.error || 'speech-error'))
    }
    rec.onend = () => {
      clearTimeout(timer)
      done(reject, new Error('no-result'))
    }
    try {
      rec.start()
    } catch (err) {
      clearTimeout(timer)
      done(reject, err)
    }
  })
}

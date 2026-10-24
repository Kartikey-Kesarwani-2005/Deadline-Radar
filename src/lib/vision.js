import { parseDateKey, todayKey } from './dates.js'

/**
 * Read a screenshot/photo of a notice, message or syllabus and pull the
 * assignment out of it. Needs any OpenAI-compatible vision model
 * (Groq's qwen/qwen3.8-27b and Gemini both work).
 */

const PROMPT = [
  'You extract assignment/deadline info from a screenshot or photo of a notice, message, syllabus or chat.',
  'Read all visible text carefully, including dates written as "25 Oct", "Friday", "25/10", "tomorrow".',
  `Today is ${todayKey()}.`,
  'Reply with ONLY minified JSON, no prose, exactly this shape:',
  '{"title":string,"subject":string|null,"dueDate":"YYYY-MM-DD"|null,"marks":number|null,"priority":"high"|"normal","link":"https://..."|null}',
  'title = short task name (max 90 chars). dueDate = a real calendar date derived from the image text, or null if none is mentioned. link = the submission/portal URL if one is visible, else null. priority = "high" if due within 1 day or marks >= 15, else "normal".',
].join('\n')

/**
 * Downscale any picked image into a compact JPEG data URL.
 * Keeps request payloads small (phones can hand over 10 MB photos).
 */
export function fileToDataUrl(file, maxDim = 1280, quality = 0.8) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('that file is not an image'))
      return
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('could not read the file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('could not load the image'))
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
          const w = Math.max(1, Math.round(img.width * scale))
          const h = Math.max(1, Math.round(img.height * scale))
          const canvas = document.createElement('canvas')
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', quality))
        } catch (err) {
          reject(err)
        }
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

function stripFences(s) {
  return s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
}

export async function extractFromImage(dataUrl, settings) {
  if (!settings?.apiKey) throw new Error('no API key — add one in Settings')
  const baseUrl = (settings.baseUrl || '').replace(/\/$/, '')
  if (!baseUrl) throw new Error('no base URL — set one in Settings')

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0,
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.json())?.error?.message || ''
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail || `AI request failed (${res.status})`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('empty AI response')

  let parsed
  try {
    parsed = JSON.parse(stripFences(content))
  } catch {
    throw new Error('AI replied with something unrecognisable — try again')
  }
  if (!parsed || typeof parsed.title !== 'string') throw new Error('no task found in that image')

  return {
    title: parsed.title.trim().slice(0, 110) || 'Task from image',
    subject: typeof parsed.subject === 'string' && parsed.subject.trim() ? parsed.subject.trim() : null,
    dueDate:
      typeof parsed.dueDate === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(parsed.dueDate) &&
      parseDateKey(parsed.dueDate)
        ? parsed.dueDate
        : null,
    marks:
      Number.isFinite(Number(parsed.marks)) && Number(parsed.marks) > 0
        ? Number(parsed.marks)
        : null,
    priority: parsed.priority === 'high' ? 'high' : 'normal',
    link:
      typeof parsed.link === 'string' && /^https?:\/\//i.test(parsed.link)
        ? parsed.link.slice(0, 500)
        : null,
  }
}

/**
 * End-to-end smoke test for both AI paths — runs the REAL app code in Node.
 *
 *   AI_KEY=gsk_... node scripts/ai-smoke.mjs [screenshot.png]
 *
 * TEXT: messy Hinglish message -> structured task (offline parser is the fallback,
 *       this exercises the AI path when a key is provided).
 * IMAGE: screenshot/photo -> task, using the same request vision.js sends.
 */
import { readFileSync } from 'node:fs'
import { extractTask } from '../src/lib/extract.js'
import { extractFromImage } from '../src/lib/vision.js'

const settings = {
  aiEnabled: true,
  apiKey: process.env.AI_KEY,
  baseUrl: process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1',
  model: process.env.AI_MODEL || 'qwen/qwen3.8-27b',
}

if (!settings.apiKey) {
  console.error('Set AI_KEY first, e.g. AI_KEY=gsk_... node scripts/ai-smoke.mjs')
  process.exit(1)
}

const messy = 'dbms ka assignment friday tak dena hai, 20 marks, q1 se q5 submit karne hain portal pe'
const textResult = await extractTask(messy, settings)
console.log('TEXT  ->', JSON.stringify(textResult, null, 2))

const image = process.argv[2]
if (image) {
  const dataUrl = 'data:image/png;base64,' + readFileSync(image).toString('base64')
  const imgResult = await extractFromImage(dataUrl, settings)
  console.log('IMAGE ->', JSON.stringify(imgResult, null, 2))
} else {
  console.log('(no image argument — skipped the screenshot test)')
}

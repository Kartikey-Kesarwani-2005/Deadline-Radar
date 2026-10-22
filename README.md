# 📡 Deadline Radar

![Deadline Radar](./public/og-cover.png)

[![Live demo](https://img.shields.io/badge/Live%20demo-GitHub%20Pages-10b981)](https://kartikey-kesarwani-2005.github.io/Deadline-Radar/)
[![Built with Wispr Flow](https://img.shields.io/badge/Built%20with-Wispr%20Flow-10b981)](https://wisprflow.ai/)
[![No Hands Challenge](https://img.shields.io/badge/Challenge-NoHands%20%2726-38bdf8)](https://wemakdevs.com/)
[![Tests](https://img.shields.io/badge/tests-23%2F23%20pass-brightgreen)](./scripts/test-parser.mjs)

> College assignments arrive as random WhatsApp messages, screenshots and voice notes — and
> always risk getting missed. Deadline Radar turns any of them into one clean, date-sorted view:
> **what is due today, this week, and what is getting late.**

Built for the **No Hands: The Wispr Challenge** (WeMakeDevs × Wispr Flow) — Builders track.

## 🖼️ Screenshot

![Deadline Radar dashboard](./public/tour.png)

**Open it with data:** [live demo (samples preloaded)](https://kartikey-kesarwani-2005.github.io/Deadline-Radar/?demo=1)
— `?demo=1` adds the sample deadlines to the radar (merged with your own, deduped, never
replacing anything you captured).

## ✨ Features (MVP)

- **Capture anything** — paste a messy assignment message, or hold your Wispr key and speak it
  straight into the input box. Press <kbd>/</kbd> anywhere to jump back to it.
- **Full editing** — ✏️ on any card fixes title, subject, marks, date and priority; original
  captured text stays visible for reference.
- **Search + subject filter** — find any task instantly; subject chips filter the radar.
- **Screenshot capture** — 📷 button → pick a photo of a notice/syllabus/message → the task is
  read out of the image (needs any OpenAI-compatible vision key: Groq or Gemini free tiers work;
  presets are built into Settings).
- **Auto-extract** — task title, subject, deadline, marks and priority are pulled out of the text.
  - Built-in **offline parser** (dates like `Friday`, `25 Oct`, `25/10`, `tomorrow`, `2026-10-30`,
    weekdays, marks, subjects) — works with **zero setup**.
  - Optional **AI extract** (any OpenAI-compatible API) for messier messages — toggle in ⚙️ Settings.
- **Hinglish dates** — `agle somvar`, `25 tarikh`, `parso`, `kal`, `pichhle somvar` — the offline
  parser understands how students actually speak, not just textbook English.
- **Bulk capture** — paste a whole notice/syllabus (one deadline per line or sentence) → every
  task is extracted in a single go: *"Captured 3 deadlines from one paste ✓"*.
- **Clipboard auto-detect** — copy an assignment message (WhatsApp, notes…), switch back to the
  tab, and the radar itself asks *"📋 looks like a deadline — add it?"* — one tap.
- **Share to the radar (Android PWA)** — install the app, then any app → *Share → Deadline Radar*
  and the shared text is captured automatically (PWA Share Target).
- **Share** — 📤 on any card copies a ready-to-paste line + app link, for the study group chat.
  **📤 Share this week** in the rail sends the whole week's deadlines (late first) via the
  native share sheet on phone, clipboard on desktop.
- **Radar dashboard** — sections ordered by urgency: `Late` → `Due today` → `This week` → `Later`
  → `No date` → `Done`.
- **Radar dial** — the signature widget: concentric rings for Late / Due today / This week / Later
  with a live rotating sweep and the **on-time % ring** in the centre. Tap a ring to jump to that
  zone.
- **Celebration confetti** — ticking a task done bursts colourful confetti right from the click.
- **Premium feel** — cards glide in with a stagger, lift on hover, and the header logo glows;
  every animation respects the OS reduced-motion setting.
- **Desktop & phone modes** — Auto picks by screen size (or force either in ⚙️ Settings):
  phone mode is compact and thumb-friendly; desktop mode gets a wider canvas (up to 1280px),
  a glass side rail that sticks to the viewport while you scroll, and hover-reveal card actions.
- **⌨️ Desktop keyboard shortcuts** — `/` search · `n` new deadline · `b` spoken briefing ·
  `w` weekly report · `?` shortcuts card · `Esc` close. A ⌨️ chip in the header opens the card;
  shortcuts never fire while you're typing in a field.
- **🎯 Marks at risk** — the radar counts *marks*, not just tasks: how many marks are already
  late and how many ride on this week's submissions. Shown in the rail, the weekly report and
  the voice answers.
- **🎯 "Ab kya karun?" (do-now engine)** — lists show what exists; this names the ONE
  task to start right now: marks-per-hour ROI weighted by urgency, so overdue and
  latest-start tasks jump the queue. A **⏱ focus timer** on every card tracks real
  minutes, so each subject's effort estimate comes from YOUR pace, not a guess —
  every pending card shows that **⏱ ≈ estimate** (🧠 = learned from your sessions).
- **🌦️ Deadline Weather** — the week as a weather forecast: ☀️ clear day, ⛅ light,
  🌧️ heavy (10+ marks), ⛈️ storm (3+ submissions or 25+ marks). Tap a day to filter the
  radar to it. Nobody else forecasts deadlines like weather.
- **🧠 Radar Brain (personal prediction)** — from your own finished work it learns per-subject
  rhythm — how often you're on time and how early/late you usually submit — and every card gets
  an honest chip like *"🧠 Usually 2.0d late — start by Wed"*.
- **🎙️ Ask the radar** — press 🎙️ Ask and speak: *"aaj kya hai"*, *"kitne marks risk me"*,
  *"what's late"* — it answers **out loud** (Chrome/Edge).
- **🔊 Radar Samachaar (spoken briefing)** — one tap and the radar *speaks your whole day*:
  what's already late, what's due today and tomorrow, your on-time rate, and the single
  best next move. A voice-first product for a voice-first workflow.
- **⏳ Start-window alerts** — most trackers remind you the night *before it's due*; the radar
  tells you when you must **start** (your learned pace + hours/day that still fit): an amber
  strip on the dashboard, a line in the daily notification, and a mention in the spoken briefing.
- **📈 Trend vs last week** — the weekly report compares finished / on-time counts with last
  week (green ↑ / red ↓) and totals your **⏱ focused hours** from focus-timer sessions — the
  "am I actually improving?" answer, plus a focus-hours pill on the dashboard.
- **Offline banner** — lose the connection and the radar says so: capture, parsing and data
  all keep working on-device; AI extract silently falls back to the offline parser.
- **Stats bar** — Captured / Due today / Late / Done pills next to the dial, plus a wide
  ⏱ focused-this-week pill fed by your timer sessions.
- **Daily reminder** — one browser notification a day when something is late or due today
  (enable it with the 🔔 button in the header).
- **On-time metric** — every tick records when you finished it, so the app shows *"N finished
  on time"* — the real result for your demo video — plus a **🏆 on-time streak** ("N in a row",
  stops at the first late finish), on the dashboard and in the weekly report.
- **Urgency sorting** — each section orders itself: priority → nearest deadline → highest marks.
- **Weekly report** — one tap shows your real result (captured / finished / on time) and copies a
  ready-made check-in text for your #NoHandsChallenge post. It now includes a **🧠 per-subject
  pace table** — on-time %, your usual buffer (days early/late) and learned minutes-per-mark,
  worst subject first: the "which subject is actually eating my marks" answer no tracker gives.
  It also shows the **🏆 on-time streak** and **📊 pending-load bars** (marks still riding on
  each subject, heaviest first).
- **Undo delete** — deleting shows an instant Undo button, nothing is lost by a mis-tap.
- **Live radar sweep** — the header logo scans continuously; the **Late** counter pulses while
  something is overdue. The dashboard feels alive at a glance.
- **Backup & restore** — ⚙️ Settings exports every task as a JSON file and imports it back
  (merge-safe, deduped by id); localStorage-only apps deserve a backup button.
- **Crash-safe** — an error boundary keeps the radar alive; a bad render shows a reload card,
  never a blank white page.
- **PWA-ready** — favicon, web manifest and share preview (OG) tags; installable from the browser.
- **Daily check-in** — open the app, tick things off.
- **Everything in localStorage** — no account, no backend, data never leaves your browser
  (except the optional AI call you configure yourself).

## 🚀 Run it

```bash
npm install
npm run dev      # open http://localhost:5173
```

Build & deploy:

```bash
npm run build    # output in dist/
npm run preview  # test the production build locally
```

**Auto-deploy:** every push to `main` builds and publishes this repo to **GitHub Pages** —
the live demo link is `https://kartikey-kesarwani-2005.github.io/Deadline-Radar/`.

Manual alternatives: Vercel (import repo, framework = **Vite**, build = `npm run build`,
output = `dist`) or Netlify (same settings).

## 🎙️ Wispr Flow workflow (the challenge rule)

1. Hold your Wispr key → speak → text lands in the input box → press **Enter**.
2. Build/debug by voice: describe what to change to your AI coding tool, let it type the code.
3. Keyboard only for shortcuts (save, run, navigate).
4. Every week: **Wispr desktop app → Insights → usage card screenshot** → upload on the
   challenge site + post progress with `#NoHandsChallenge`.

## 🗺️ Roadmap (remaining challenge days)

- [x] Browser notification reminders for "Due today"
- [x] Marks-weighted priority sorting (high marks = top of the list)
- [x] Weekly report card ("saved N submissions from going late")
- [x] Screenshot → deadline (photo/notice extraction)
- [x] Backup & restore (JSON export/import)
- [x] Rich link preview (OG cover image)

## 📦 Submission checklist (by 30 Oct, 11:59 pm IST)

Everything prepped in this repo: **[SUBMISSION.md](./SUBMISSION.md)** (paste-ready write-up)
and **[DEMO-SCRIPT.md](./DEMO-SCRIPT.md)** (timed 2-minute shot list).

- [ ] Deployed link ✅ (GitHub Pages, auto-deploys on push)
- [ ] Demo video (≤ 2 minutes)
- [ ] Wispr usage card screenshot (desktop app → Insights)
- [ ] Few lines: problem, who it's for, how Wispr was used (draft in SUBMISSION.md)

## 🧪 Tests

```bash
npm test       # offline extractor + bulk + backup parser (23 checks)
npm run test:ai # end-to-end AI paths (needs AI_KEY env)
```

# 📡 Deadline Radar

> College assignments arrive as random WhatsApp messages, screenshots and voice notes — and
> always risk getting missed. Deadline Radar turns any of them into one clean, date-sorted view:
> **what is due today, this week, and what is getting late.**

Built for the **No Hands: The Wispr Challenge** (WeMakeDevs × Wispr Flow) — Builders track.

## ✨ Features (MVP)

- **Capture anything** — paste a messy assignment message, or hold your Wispr key and speak it
  straight into the input box. Press <kbd>/</kbd> anywhere to jump back to it.
- **Full editing** — ✏️ on any card fixes title, subject, marks, date and priority; original
  captured text stays visible for reference.
- **Search + subject filter** — find any task instantly; subject chips filter the radar.
- **Auto-extract** — task title, subject, deadline, marks and priority are pulled out of the text.
  - Built-in **offline parser** (dates like `Friday`, `25 Oct`, `25/10`, `tomorrow`, `2026-10-30`,
    weekdays, marks, subjects) — works with **zero setup**.
  - Optional **AI extract** (any OpenAI-compatible API) for messier messages — toggle in ⚙️ Settings.
- **Radar dashboard** — sections ordered by urgency: `Late` → `Due today` → `This week` → `Later`
  → `No date` → `Done`.
- **Stats bar** — Captured / Due today / Late / Done / **On time** counts at a glance.
- **Daily reminder** — one browser notification a day when something is late or due today
  (enable it with the 🔔 button in the header).
- **On-time metric** — every tick records when you finished it, so the app shows *"N finished
  on time"* — the real result for your demo video.
- **Urgency sorting** — each section orders itself: priority → nearest deadline → highest marks.
- **Weekly report** — one tap shows your real result (captured / finished / on time) and copies a
  ready-made check-in text for your #NoHandsChallenge post.
- **Undo delete** — deleting shows an instant Undo button, nothing is lost by a mis-tap.
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
- [ ] Screenshot → deadline (photo/notice extraction)

## 📦 Submission checklist (by 30 Oct, 11:59 pm IST)

- [ ] Deployed link
- [ ] Demo video (≤ 2 minutes)
- [ ] Wispr usage card screenshot (desktop app → Insights)
- [ ] Few lines: problem, who it's for, how Wispr was used

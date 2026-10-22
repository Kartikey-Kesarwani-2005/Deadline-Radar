# 📡 Deadline Radar

> College assignments arrive as random WhatsApp messages, screenshots and voice notes — and
> always risk getting missed. Deadline Radar turns any of them into one clean, date-sorted view:
> **what is due today, this week, and what is getting late.**

Built for the **No Hands: The Wispr Challenge** (WeMakeDevs × Wispr Flow) — Builders track.

## ✨ Features (MVP)

- **Capture anything** — paste a messy assignment message, or hold your Wispr key and speak it
  straight into the input box.
- **Auto-extract** — task title, subject, deadline, marks and priority are pulled out of the text.
  - Built-in **offline parser** (dates like `Friday`, `25 Oct`, `25/10`, `tomorrow`, `2026-10-30`,
    weekdays, marks, subjects) — works with **zero setup**.
  - Optional **AI extract** (any OpenAI-compatible API) for messier messages — toggle in ⚙️ Settings.
- **Radar dashboard** — sections ordered by urgency: `Late` → `Due today` → `This week` → `Later`
  → `No date` → `Done`.
- **Stats bar** — Captured / Due today / Late / Done counts at a glance.
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

Deploy to Vercel: import the repo, framework = **Vite**, build command = `npm run build`,
output directory = `dist`. (Netlify works the same way.)

## 🎙️ Wispr Flow workflow (the challenge rule)

1. Hold your Wispr key → speak → text lands in the input box → press **Enter**.
2. Build/debug by voice: describe what to change to your AI coding tool, let it type the code.
3. Keyboard only for shortcuts (save, run, navigate).
4. Every week: **Wispr desktop app → Insights → usage card screenshot** → upload on the
   challenge site + post progress with `#NoHandsChallenge`.

## 🗺️ Roadmap (remaining challenge days)

- [ ] Screenshot → deadline (photo/notice extraction)
- [ ] Browser notification reminders for "Due today"
- [ ] Weekly report card ("saved N submissions from going late")
- [ ] Marks-weighted priority sorting (high marks = top of the list)

## 📦 Submission checklist (by 30 Oct, 11:59 pm IST)

- [ ] Deployed link
- [ ] Demo video (≤ 2 minutes)
- [ ] Wispr usage card screenshot (desktop app → Insights)
- [ ] Few lines: problem, who it's for, how Wispr was used

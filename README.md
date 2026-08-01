# 💪 IronPath Workout Tracker

A calendar-based workout tracker for lifters. Plan a rotation, log your sets, and keep your history — on your phone, in the gym, with or without signal.

Live at [**https://ironpath.app**](https://ironpath.app) ✨

---

## 🧭 What it is

IronPath is a **local-first progressive web app**. There are no accounts, no server, and no sync: everything you log lives in your browser's `localStorage` on the device you logged it on.

That's a deliberate design choice, not a missing feature. It means the app works identically at full signal and none, nobody else stores your training data, and the whole thing is a static site. The trade is that your history is per-device — which is why **Export Backup** produces a complete, restorable file, and why it's worth keeping one somewhere safe.

---

## ✨ Features

### 🗓️ Planning
- **Auto-scheduling** — a rotation of workout types laid out across the calendar, built from presets, your own templates, or both.
- **Custom workout templates** — pick from the exercise library, name it, and optionally add it to the rotation. Clone a preset as a starting point.
- **Your own exercises** — add anything the built-in library is missing. Main exercises are logged with sets, weight and reps; warm-up entries take reps or a duration and no weight.

### 📝 Logging
- **Set-by-set entry** with weight, reps and rest, pre-filled from the last time you did that exercise.
- **Reference photos** for the exercises that have them, both while building a workout and while doing one.
- **Autosave** every couple of seconds, plus an explicit save.
- **Streaks** over the days you choose to count, so rest days don't punish you.

### 💾 Your data
- **Works offline.** The app shell, its assets and every exercise photo are cached, so a dead signal in a basement gym changes nothing.
- **Backup and restore.** One JSON file holds every workout, template, exercise, history entry and setting. Restoring replaces the lot, after telling you what's in the file.
- **CSV export** for spreadsheets, separately, from the History page.

---

## 🏗️ Architecture

```
client/          React + TypeScript app — this is the whole product
  public/        PWA manifest, service worker, exercise photos
  src/lib/       storage, workout data, streaks, image manifest
  src/pages/     calendar, workout, history
shared/          zod schemas and the types inferred from them
e2e/             Playwright end-to-end tests
```

That really is all of it. **There is no server and no build step beyond `vite build`.** The deployed site is static files on a CDN; nothing runs server-side, and there is nothing to deploy but a folder.

One thing worth stating plainly, because it is easy to get wrong when editing:

**`shared/schema.ts` is not what validates your data.** It holds the shapes — zod schemas for `Exercise`, `ExerciseSet`, `AbsExercise` and `Cardio`, and plain interfaces for `Workout` and `UserPreferences`. The actual validator for a stored workout is `storedWorkoutSchema` in `client/src/lib/storage.ts`, and it is deliberately different: `localStorage` holds JSON, so it coerces date strings back into `Date` objects and is stricter about ids and dates than the bare shape.

Whatever `shared/` imports ships to every visitor, so it imports zod and nothing else. A lint rule and a unit test both hold that line — a Postgres query builder reached phones through this module once already.

---

## 🚀 Getting started

Requires Node 20+.

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run build        # production build into dist/
npm run check        # TypeScript
npm run lint         # ESLint
npm test             # unit tests (Vitest)
npm run test:e2e     # end-to-end tests (Playwright)
```

---

## 🔧 Testing

Unit tests run under **Vitest**; end-to-end tests drive a real browser with **Playwright**, against a production build rather than the dev server, at both desktop and mobile viewports.

Everything — typecheck, unit, end-to-end — runs on **every pull request** via GitHub Actions.

Playwright needs its browser once:

```bash
npx playwright install chromium
```

---

## 🔄 Roadmap

* Editing custom exercises after they're created (currently add and remove)
* "Best" reflecting your actual logged record rather than a template constant
* Stats breakdown by exercise and muscle group
* Code-splitting the client bundle

---

## 💼 Contributing

PRs welcome. Please open an issue before large changes. CI must be green.

---

## 🔒 License

[AGPLv3](LICENSE). Use it, fork it, run it — but if you host a modified version
for other people, publish your changes.

---

## 🚀 About

IronPath is a personal project built for lifters who value clarity, flexibility, and intelligent defaults. Inspired by the best parts of ActiveTrax, reimagined for modern training.

---

## 🔗 Resources

* [Live app](https://ironpath.app)
* [Releases](https://github.com/crflanigan/IronPath/releases)
* [Project documentation](docs/full-project-overview.md)

# 💪 IronPath Workout Tracker

A sleek, full-stack workout tracker app for lifters who want an intuitive calendar-based UI, personalized workout history, and frictionless progress tracking.

Now live at [**https://ironpath.app**](https://ironpath.app) ✨

Built with React, TypeScript, Tailwind CSS, ShadCN, and Express — with a focus on smart scheduling, responsive UI, and local-first data.

---

## ✨ Features

### 🕛 Interactive Workout Calendar

Manage your training using a visual calendar that marks pending, completed, and current-day workouts with clean status indicators.

### 🏋️ Custom Workout Templates

Create your own workout templates (e.g. "Leg Day", "Push/Pull"), complete with exercises, rest times, and optional abs/core finishers.

### 🧬 Preset Cloning

Use built-in templates as a base, then clone and customize them to fit your preferences.

### 🗓️ Smart Auto-Scheduling

Choose which workouts to rotate through your schedule, combining presets and customs. A 14-day rotation makes planning effortless.

### 🌟 Progress & Streak Tracking

Tracks daily completion and calculates streaks with locale-safe date handling.

### 📂 Auto-Save & Offline Storage

Your workouts are saved automatically using localStorage, even offline.

### 📄 Export to JSON or CSV

Export your history for analysis or backup. Locale-safe filenames and formatting included.

### 🏋️ Flexible Set Logging

Pre-fills weight/rest from previous workouts, lets you edit freely, and validates for safe saves.

### 🎉 Completion Celebrations

Finishing a workout triggers one of 10 unique motivational messages and confetti.

### 📼 Instructional Exercise Images

Helps clarify unfamiliar machine names using context-relevant visual guides.

---

## 💡 Tech Stack

* **Frontend:** React + TypeScript + Vite + Tailwind CSS + ShadCN UI
* **Backend:** Node.js + Express
* **State Management:** Local state + custom hooks (`useWorkoutStorage`)
* **Persistence:** localStorage (client-side); future-ready for DB
* **Build:** Vite (client) + esbuild (server)
* **Icons:** Lucide + Heroicons (via ShadCN)
* **Documentation:** [Full Project Overview](docs/full-project-overview.md)

**Frontend:** React + TypeScript + Vite + Tailwind CSS + ShadCN UI
**Backend:** Node.js + Express
**State Management:** Local state + custom hooks (`useWorkoutStorage`)
**Persistence:** localStorage (client-side); future-ready for DB
**Build:** Vite (client) + esbuild (server)
**Icons:** Lucide + Heroicons (via ShadCN)

---

## 📅 Getting Started

### Prerequisites

* Node.js >= 18
* pnpm or npm

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Runs client and server with hot reload.

### Build

```bash
pnpm build
```

---

## 📂 Project Structure

```
src/
├── components/      # Shared UI components
├── hooks/           # Custom React hooks
├── lib/             # Workout data generators and utilities
├── pages/           # Calendar view, History view, etc.
├── schema/          # Workout data models
└── server/          # Express API routes
```

---

## 🔧 Testing

Basic tests are planned (TBD).

---

## 🔄 Roadmap

* Improved data import
* Stats breakdown by exercise/muscle group
* Cross-device sync (coming with DB backend)
* App Store & Play Store builds
* Better mobile UX polish

---

## 💼 Contributing

PRs welcome. Please open an issue before large changes.

---

## 🔒 License

MIT

---

## 🚀 About

IronPath is a personal project to replace the poorly maintained ActiveTrax app.
Built for lifters who want clarity, flexibility, and smart defaults.

---

## 🔗 Resources

* [Live App](https://ironpath.app)
* [Releases](https://github.com/crflanigan/IronPath/releases)
* [Project Documentation](docs/full-project-overview.md)

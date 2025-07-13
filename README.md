# 💪 IronPath Workout Tracker

A sleek, full-stack workout tracker app for lifters who want an intuitive calendar-based UI, personalized workout history, and frictionless progress tracking.

Now live at [**https://ironpath.app**](https://ironpath.app) ✨

Built with React, TypeScript, Tailwind CSS, ShadCN, and Express — with a focus on smart scheduling, responsive UI, and local-first data.

---

## ✨ Features

### 🛠️ Customization & Templates
- 🏋️ **Custom Workout Templates**  
  Create your own templates (e.g. "Leg Day", "Push/Pull"), with full control over exercises and rest.

- 🧬 **Preset Cloning**  
  Clone built-in templates and edit them to match your preferences.

- 🗓️ **Smart Auto-Scheduling**  
  Choose which workouts to auto-rotate into your calendar. Supports both presets and custom plans.

---

### 📈 Tracking & Feedback
- 🌟 **Progress & Streak Tracking**  
  Tracks daily workout completion and calculates streaks using locale-safe date handling.

- 🎉 **Completion Celebrations**  
  Receive one of 10 motivational messages with confetti when you finish a workout.

---

### 💾 Data & Storage
- 🗂 **Auto-Save & Offline Storage**  
  All progress is saved locally using `localStorage`, even without internet.

- 📤 **Export to JSON or CSV**  
  Download your workout history for backup or analysis with locale-safe filenames.

- 🏋️ **Flexible Set Logging**  
  Automatically pre-fills weights/rests from your last workout. Edit freely, with validation to prevent empty values.

---

### 🖼️ Visual Aids
- 📼 **Instructional Exercise Images**  
  Get helpful visuals for exercises — useful for machines you don’t recognize.

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

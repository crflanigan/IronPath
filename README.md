# 💪 IronPath Workout Tracker

A sleek, full-stack workout tracker app designed for lifters who want an intuitive calendar-based UI, personalized workout history, and frictionless progress tracking. Built with React, TypeScript, Tailwind, ShadCN, and Express — with a focus on smart scheduling, responsive UI, and persistent local and server-side data.

## Features

- 🗖️ **Interactive Workout Calendar** – View and manage workouts day-by-day, with colored status icons for pending, completed, and current-day sessions.
- 🏋️‍♂️ **Custom Workout Templates** – Add your own "Back & Legs", "Chest Day", and other templates for fast schedule generation.
- 📈 **Progress & Streak Tracking** – Tracks progress visually and calculates daily completion streaks using locale-safe date handling.
- 🧠 **Auto-Save with Local Persistence** – Your progress is saved automatically, even offline.
- 📤 **Export to JSON or CSV** – Export your workout history with locale-safe filenames for easy backups or analysis.
- ✅ **Flexible Set Logging** – Pre-populates fields with previous workout values, but allows editing in any order. Prevents null or empty inputs from being saved.
- 🎉 **Celebration Messages** – Get a rotating set of 10 unique motivational messages upon workout completion.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + ShadCN UI
- **Backend**: Node.js + Express
- **State Management**: Local state + custom hooks (`useWorkoutStorage`)
- **Build & Bundling**: Vite (client) and esbuild (server)
- **Persistence**: `localStorage` (client-side); ready for expansion to server-side DB
- **Icons**: Lucide

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm or npm

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Client and server both run with hot reloading.

### Build

```bash
pnpm build
```

## Project Structure

```
src/
├── components/      # Shared UI components
├── hooks/           # Custom React hooks
├── lib/             # Workout data generators and utilities
├── pages/           # Calendar view, History view, etc.
├── schema/          # Workout data models
└── server/          # Express API routes
```

## Testing

Tests coming soon (TBD).

## Roadmap

TBD.

## Contributing

PRs are welcome. Please open an issue to discuss major feature changes first.

## License

MIT

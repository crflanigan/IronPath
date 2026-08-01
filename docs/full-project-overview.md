# IronPath Full Project Overview

> Reference notes on repository layout and data flow. The [README](../README.md)
> is the authoritative description of what the app does; this document goes
> deeper on structure and can lag behind it.

## Repository Structure

The project is a React + TypeScript client and a shared schema package. There is
no server and no database: IronPath runs entirely in the browser and stores
everything in localStorage. Below is the top level layout.

```
.
├── README.md
├── attached_assets/             # Design notes and reference files
│   └── design.txt
├── client/                      # Vite + React client application
│   ├── index.html               # Root HTML file, registers service worker
│   ├── public/                  # PWA assets (manifest, icons, sw.js)
│   └── src/                     # All client code
├── components.json              # shadcn/ui generator configuration
├── dist/                        # Production build output
│   ├── assets/                  # Bundled JS/CSS
│   └── index.html               # Built client entry
├── docs/                        # This file
├── e2e/                         # Playwright end-to-end specs
├── eslint.config.js             # ESLint configuration
├── netlify.toml                 # Netlify build settings
├── package.json
├── playwright.config.ts         # E2E config; runs against a production build
├── postcss.config.js
├── shared/                      # Shared schemas and types
├── tailwind.config.ts           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite configuration
├── vitest.config.ts             # Unit test configuration
└── vitest.setup.ts              # Unit test setup
```

### Client Source (`client/src`)

```
client/src
├── App.tsx                      # Application shell with routing
├── components/                  # React component library
│   ├── AutoScheduleModal.tsx
│   ├── CustomWorkoutBuilderModal.tsx
│   ├── ExerciseImageDialog.tsx
│   ├── SettingsDialog.tsx
│   ├── WorkoutTemplateSelectorModal.tsx
│   ├── calendar-grid.tsx
│   ├── exercise-form.tsx
│   ├── theme-provider.tsx
│   ├── workout-card.tsx
│   └── ui/                      # shadcn/ui primitives still in use
├── hooks/                       # Custom React hooks
│   ├── use-theme.tsx
│   ├── use-toast.ts
│   └── use-workout-storage.tsx
├── index.css                    # Global styles and Tailwind layers
├── lib/                         # Utility modules and data generators
│   ├── abs-library.ts
│   ├── exercise-library.ts
│   ├── storage.ts
│   ├── utils.ts
│   ├── workout-data.test.ts
│   └── workout-data.ts
├── main.tsx                     # ReactDOM bootstrap
├── pages/                       # Route components
│   ├── calendar.tsx
│   ├── history.tsx
│   └── workout.tsx
└── types/
    └── canvas-confetti.d.ts     # Type definition for confetti library
```

### Shared Types (`shared`)

`shared/schema.ts` defines the types the client uses. It is plain Zod: runtime
schemas for `Exercise`, `ExerciseSet`, `AbsExercise` and `Cardio`, and interfaces
for `Workout` and `UserPreferences`. It previously described Postgres tables with
Drizzle ORM purely to derive these types; there was never a database.

The *validator* for a stored workout is `storedWorkoutSchema` in
`client/src/lib/storage.ts`, not here — localStorage holds JSON, so it coerces
date strings back into `Date` and is stricter about ids and dates.

## Purpose of Each Folder

- **attached_assets/** – Misc design docs and planning notes.
- **client/** – The entire frontend. Built with React + Vite. Contains public PWA assets and all React code.
- **dist/** – Build output for deployment.
- **shared/** – Zod schemas and the TypeScript types inferred from them, imported by the client.
- **docs/** – Documentation (this file).

## React Components

Below is a summary of the main React components. The primitives under
`components/ui` are generated shadcn components and behave like standard Radix
wrappers (Button, Dialog, etc.). Only the ones the app actually imports are
kept — the 30 unused ones the project was scaffolded with were removed, along
with the packages behind them.

### App.tsx
Sets up theme context, tooltip provider and defines the app header/navigation. Uses Wouter for routing to `/`, `/workout`, and `/history`. Holds the currently opened workout in state.

### calendar-grid.tsx
Renders a monthly calendar with buttons for each day. Uses `generateWorkoutSchedule` from `lib/workout-data` to know what workout type is scheduled. A completed day is washed green and carries a ✅; today is filled in the primary colour. The 🕒 and 📅 glyphs it used to show on every cell are gone. Selecting a day triggers callbacks to the parent.

### workout-card.tsx
Summary card for a single workout, displaying progress percentage, date, and allowing start/view/delete actions. Used in calendar and history pages.

### WorkoutTemplateSelectorModal.tsx
Modal dialog listing built‑in workout templates plus any user created templates. Allows selecting a template, cloning presets, creating new custom templates or editing/deleting existing ones.

### CustomWorkoutBuilderModal.tsx
Form dialog for building custom workout templates. Lets the user pick exercises from `exerciseLibrary` (derived from `workout-data.ts`) and optionally core exercises from `abs-library`. Can create or update a template, with validation to avoid duplicates and limits on exercise count.

### AutoScheduleModal.tsx
Modal for choosing which workouts appear in the automatic rotation. Combines default templates and user templates. Selections are persisted via `localWorkoutStorage.saveAutoScheduleWorkouts`.

### ExerciseImageDialog.tsx
Small dialog that loads an exercise help image based on the machine name. Falls back to a placeholder if not found.

### SettingsDialog.tsx
Backup export and restore, a link to auto-schedule settings, a control to unhide presets, storage usage, and a destructive reset that clears every local storage key. Also displays app version information.

### theme-provider.tsx
Context provider around the `useTheme` hook, exposing the current theme and `toggleTheme` to children.

### exercise-form.tsx
Complex form used inside the workout page for logging sets of an exercise. Handles numeric validation, marking sets complete, auto‑formatting rest time, and showing weight change indicators compared with historical bests. Emits updates back to the parent component.

## Custom Hooks

### use-theme.tsx
Reads and writes the `theme` value from `localStorage` and toggles the `<html>` class for dark mode.

### use-toast.ts
Headless toast implementation used by shadcn’s `<Toaster />`. Manages a small in-memory queue with actions to add, update and dismiss toasts.

### use-workout-storage.tsx
Central data hook for all workout persistence. Loads/saves workouts, user preferences and custom templates from `LocalWorkoutStorage`. Exposes CRUD helpers like `createWorkout`, `updateWorkout`, `deleteWorkout`, `addCustomTemplate`, etc. Handles auto-prefilling new workouts with previous exercise set values.

## Utilities and Data

### utils.ts
Contains small helpers: `cn` (Tailwind class merge), `parseISODate`, and `formatLocalDate`.

### workout-data.ts
Large module defining all built‑in workout templates and helper functions. Includes `defaultWorkoutCycle` (a 14‑day rotation of workout types), `generateWorkoutSchedule(year, month)` to produce the monthly schedule, and `getTodaysWorkoutType()` which computes today’s workout from the rotation. A unit test `workout-data.test.ts` verifies schedule generation.

### exercise-library.ts & abs-library.ts
Generate deduplicated lists of available machine exercises and core exercises based on the predefined workout templates. Used when building custom workouts.

### storage.ts
Implements `LocalWorkoutStorage`, which persists data to `localStorage`. It stores workouts (`ironpath_workouts`), user preferences, exercise history for pre‑filling sets, custom workout templates, and the list of workouts to include in auto-schedule. Provides async-like methods for CRUD operations and exporting/importing all data.

## Pages and Workflow Logic

### Calendar Page (`pages/calendar.tsx`)
Displays a stats overview, the monthly calendar grid, and details for the selected date. Key behaviours:
- Uses `useWorkoutStorage` to load all workouts.
- Selecting a date checks if a workout exists; if not, the user can create one using a template.
- Supports starting today’s workout immediately via `handleStartTodayWorkout` which either loads existing or creates a new workout from the scheduled template.
- Allows creation and editing of custom templates via modals.
- Provides buttons for customizing the auto-schedule list.
- Computes completion streak and statistics for display.

### Workout Page (`pages/workout.tsx`)
The logging interface for a single workout.
- Tracks the active exercise, auto-scrolling to the top when changing workouts.
- Each `ExerciseForm` updates its parent workout state. Auto-save occurs every 2 seconds if enabled and writes via `updateWorkout`.
- `handleCompleteWorkout` validates all fields, marks sets/rests, calculates duration, then saves and shows a celebration message chosen randomly from 10 options. Confetti is triggered with `canvas-confetti`.

### History Page (`pages/history.tsx`)
Aggregates past completed workouts to compute statistics like average duration, completion rate, top weight improvements and counts by workout type. Offers export to JSON or CSV via `useWorkoutStorage` helpers.

### Not Found Page
Simple fallback page when a route is missing.

## Data Flow

1. **Initial Load** – `use-workout-storage` loads workouts, preferences and custom templates from `localStorage` through `LocalWorkoutStorage`. A `STORAGE_VERSION` marker is recorded, but data is **kept** across version changes; breaking changes are expected to ship an explicit migration. Records that fail validation are repaired where possible and otherwise quarantined under `ironpath_quarantined_workouts` rather than dropped.
2. **Workout Creation** – The calendar page uses built‑in or custom templates to create a `Workout` object. When creating a workout, `createWorkout` pulls last used sets from exercise history to prefill weights/reps/rest.
3. **During Workout** – As sets are edited in `ExerciseForm`, the workout page updates local state and (if auto-save is on) calls `updateWorkout` which writes back to localStorage via `LocalWorkoutStorage.updateWorkout`.
4. **Completing a Workout** – When `handleCompleteWorkout` is called, the workout is validated, marked completed and saved. Completed exercises update the exercise history so future sessions can be pre-filled.
5. **Template Rotation** – `generateWorkoutSchedule` (using `getWorkoutCycle`) determines which workout type falls on which calendar date. `AutoScheduleModal` can alter the rotation by letting the user select presets and custom templates. Selected names are stored under `ironpath_auto_schedule_workouts` in localStorage.
6. **Custom Workouts** – Created or edited via `CustomWorkoutBuilderModal`. Stored templates are kept under `ironpath_custom_templates` and included in the schedule if marked for auto scheduling.
7. **Export/Import** – Settings writes a complete JSON backup covering every stored key, and restores from one after confirming what it contains. History additionally offers a CSV export for spreadsheets.

## LocalStorage Keys

- `ironpath_workouts` – Array of stored workouts.
- `ironpath_preferences` – User preference object.
- `ironpath_current_id` – Incrementing workout ID counter.
- `ironpath_exercise_history` – Last set details per machine for pre-filling future workouts.
- `ironpath_custom_templates` – Custom workout templates created by the user.
- `ironpath_auto_schedule_workouts` – Names of workouts included in auto schedule rotation.
- `ironpath_version` – Version string used by `useWorkoutStorage` to wipe old data when structure changes.

## Global Constants & Config

- `STORAGE_VERSION` and `VERSION_KEY` in `use-workout-storage.tsx` ensure breaking changes clear stale data.
- `defaultWorkoutCycle` in `workout-data.ts` defines the 14‑day rotation of workout types.
- `CACHE_VERSION`/`CACHE_NAME` in `public/sw.js` control service worker caching.
- Tailwind CSS variables defined in `index.css` under `:root` and `.dark` provide theming values.

## Typical Workflows

### Creating a Workout for a Date
1. User taps a date in the calendar.
2. If no workout exists, `openTemplateSelector` opens `WorkoutTemplateSelectorModal`.
3. Selecting a preset or custom template calls `createWorkoutForDate` or `createWorkout` with template data.
4. Workout is saved to localStorage and displayed in the calendar.

### Starting Today’s Workout
1. `handleStartTodayWorkout` checks for an existing workout for today.
2. If none exists, determines today’s workout type from the rotation and creates it from the template.
3. Navigates to the Workout page with that workout.

### Editing a Custom Workout Template
1. From the calendar or template selector, choose “Edit workout”.
2. `CustomWorkoutBuilderModal` opens pre-filled with the template data.
3. After changes are saved via `updateCustomTemplate`, any workouts created later from that template will use the updated exercises.

### Completing a Workout
1. User fills out set values in `ExerciseForm`. Auto-save runs periodically.
2. Pressing “Complete Workout” validates all entries.
3. Duration is calculated and the workout marked completed in storage.
4. A celebratory dialog appears with a random success message.

## How the Service Worker Uses localStorage

The service worker (`public/sw.js`) serves navigations **network-first** so a deploy reaches installed apps, and everything else cache-first. It precaches the app shell, the build's hashed bundles and all exercise photos. It does not touch localStorage; all storage logic lives in the client through `LocalWorkoutStorage`.

## Additional Notes

- All UI components under `components/ui` are standard shadcn-generated wrappers around Radix primitives. `components.json` configures the generator, so `npx shadcn add <name>` still works if one is needed again.
- `attached_assets/design.txt` is the original project brief, kept for reference. It describes an early plan, not the current architecture.
- The project runs entirely on the client with localStorage, and this is a
  deliberate architectural decision rather than a stage on the way to a backend.
  There is no sync, no account and no server: the data lives on the device that
  recorded it. See the README for what that means for backups.

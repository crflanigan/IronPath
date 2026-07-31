import { z } from "zod";

/**
 * The shapes IronPath stores, and the types inferred from them.
 *
 * This file used to describe Postgres tables with `drizzle-orm/pg-core` and
 * derive the types from those via `$inferSelect` / `createInsertSchema`. There
 * is no database — IronPath keeps everything in localStorage — so three
 * packages and a `drizzle.config.ts` existed only to produce TypeScript types.
 *
 * The Drizzle definitions were also not faithfully producing the types they
 * appeared to. `createInsertSchema` did not carry the `$type<...>()` refinement
 * through the `jsonb` columns, so `InsertWorkout.exercises` resolved with
 * `equipment: string` and `feel: string` instead of their enums, and set
 * weights and reps as `unknown`. The zod schemas below are the real shapes, so
 * those fields are now checked at the call sites that write workouts.
 *
 * `Workout`, `UserPreferences` and `InsertUserPreferences` are unchanged —
 * verified identical to the Drizzle-derived versions with a mutual-assignability
 * check before the swap.
 */

// Exercise set schema
export const exerciseSetSchema = z.object({
  weight: z.number().optional(),
  reps: z.number().optional(),
  rest: z.string().optional(), // e.g., "1:30"
  completed: z.boolean().default(false)
});

// Exercise schema
export const exerciseSchema = z.object({
  code: z.string().optional(), // Machine code like "S16"
  machine: z.string(),
  equipment: z.enum(["machine", "freeweight", "both"]),
  region: z.string(),
  feel: z.enum(["Light", "Medium", "Hard", "Heavy", "N/A"]),
  sets: z.array(exerciseSetSchema),
  bestWeight: z.number().optional(),
  bestReps: z.number().optional(),
  completed: z.boolean().default(false)
});

// Abs exercise schema
export const absExerciseSchema = z.object({
  name: z.string(),
  reps: z.number().optional(),
  time: z.string().optional(), // For time-based exercises like planks
  completed: z.boolean().default(false)
});

// Cardio schema
export const cardioSchema = z.object({
  type: z.enum(["Treadmill", "Bike", "Elliptical", "Rowing"]),
  duration: z.string().optional(), // e.g., "15:00"
  distance: z.string().optional(), // e.g., "2.5"
  completed: z.boolean().default(false)
});

// Workout types (add all valid workout templates here)
export const workoutTypes = [
  "Chest, Shoulder Focus",
  "Legs",
  "Chest, Tricep Focus",
  "Back, Biceps, and Legs",
  "Chest, Shoulders, and Back",
  "Chest Day",
  "Back & Biceps",
  "Back, Biceps & Legs",
  "Chest & Triceps",
  "Chest & Shoulders",
  "Leg Day",
  "Chest, Shoulders & Legs"
] as const;

/**
 * Workouts and preferences are described as types, not zod schemas.
 *
 * The schemas above are values because storage validates against them. These
 * four are not: the workout validator lives in `client/src/lib/storage.ts` as
 * `storedWorkoutSchema`, and it is deliberately different — localStorage holds
 * JSON, so it coerces date strings back into `Date` and is stricter about ids
 * and dates than a bare shape would be. Declaring a second `workoutSchema`
 * here would put a plausible-looking but unused validator next to the real
 * one, which is how the version and licence numbers drifted.
 */

// A stored workout, as it comes back out of storage.
export interface Workout {
  id: number;
  date: string; // ISO date string
  type: string;
  exercises: Exercise[];
  abs: AbsExercise[];
  cardio: Cardio | null;
  completed: boolean | null;
  duration: number | null; // Workout duration in minutes, measured
  // Set the first time anything in the workout changes, which is when someone
  // actually started training — not when the record was created, since a
  // workout can be scheduled on the calendar hours before it is done.
  startedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// A workout on the way in: no id, and the timestamps storage assigns itself.
export interface InsertWorkout {
  date: string;
  type: string;
  exercises: Exercise[];
  abs: AbsExercise[];
  cardio?: Cardio | null;
  completed?: boolean | null;
  duration?: number | null;
  startedAt?: Date | null;
}

export interface UserPreferences {
  id: number;
  darkMode: boolean | null;
  autoIncrement: boolean | null;
  notifications: boolean | null;
  updatedAt: Date | null;
}

export interface InsertUserPreferences {
  darkMode?: boolean | null;
  autoIncrement?: boolean | null;
  notifications?: boolean | null;
}

// Types
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseSet = z.infer<typeof exerciseSetSchema>;
export type AbsExercise = z.infer<typeof absExerciseSchema>;
export type Cardio = z.infer<typeof cardioSchema>;
export type WorkoutType = typeof workoutTypes[number];

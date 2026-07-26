import { z } from "zod";

/**
 * Runtime schemas and the types inferred from them.
 *
 * Kept free of any Drizzle import on purpose. `schema.ts` describes the same
 * shapes as Postgres tables, which means importing anything from it at runtime
 * drags `drizzle-orm/pg-core` into whatever bundle did the importing — and the
 * client is a browser app with no database. Values live here; the table
 * definitions stay next door and are only ever needed by the server.
 *
 * `schema.ts` re-exports everything below, so existing imports keep working.
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

export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseSet = z.infer<typeof exerciseSetSchema>;
export type AbsExercise = z.infer<typeof absExerciseSchema>;
export type Cardio = z.infer<typeof cardioSchema>;
export type WorkoutType = typeof workoutTypes[number];

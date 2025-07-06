import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Exercise set schema
const exerciseSetSchema = z.object({
  weight: z.number(),
  reps: z.number(),
  rest: z.string(), // e.g., "1:30"
  completed: z.boolean().default(false)
});

// Exercise schema
const exerciseSchema = z.object({
  code: z.string().optional(), // Machine code like "S16"
  machine: z.string(),
  region: z.string(),
  feel: z.enum(["Light", "Medium", "Hard"]),
  sets: z.array(exerciseSetSchema),
  bestWeight: z.number().optional(),
  bestReps: z.number().optional(),
  completed: z.boolean().default(false)
});

// Abs exercise schema
const absExerciseSchema = z.object({
  name: z.string(),
  reps: z.number().optional(),
  time: z.string().optional(), // For time-based exercises like planks
  completed: z.boolean().default(false)
});

// Cardio schema
const cardioSchema = z.object({
  type: z.enum(["Treadmill", "Bike", "Elliptical", "Rowing"]),
  duration: z.string().optional(), // e.g., "15:00"
  distance: z.string().optional(), // e.g., "2.5"
  completed: z.boolean().default(false)
});

// Workout types (add all valid workout templates here)
export const workoutTypes = [
  "Chest, Shoulder Focus",
  "Back and Legs",
  "Chest, Tricep Focus",
  "Back, Biceps, and Legs",
  "Chest, Shoulders, and Back",
  "Chest Day (ActiveTrax)",
  "Back & Biceps (ActiveTrax)",
  "Chest & Triceps (ActiveTrax)",
  "Chest & Shoulders (ActiveTrax)",
  "Leg Day (ActiveTrax)"
] as const;

// Workouts table
export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // ISO date string
  type: text("type").notNull(),
  exercises: jsonb("exercises").notNull().$type<z.infer<typeof exerciseSchema>[]>(),
  abs: jsonb("abs").notNull().$type<z.infer<typeof absExerciseSchema>[]>(),
  cardio: jsonb("cardio").$type<z.infer<typeof cardioSchema>>(),
  completed: boolean("completed").default(false),
  duration: integer("duration"), // Workout duration in minutes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// User preferences table
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  darkMode: boolean("dark_mode").default(false),
  autoIncrement: boolean("auto_increment").default(false),
  notifications: boolean("notifications").default(true),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Insert schemas
export const insertWorkoutSchema = createInsertSchema(workouts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  updatedAt: true
});

// Types
export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type Exercise = z.infer<typeof exerciseSchema>;
export type ExerciseSet = z.infer<typeof exerciseSetSchema>;
export type AbsExercise = z.infer<typeof absExerciseSchema>;
export type Cardio = z.infer<typeof cardioSchema>;
export type WorkoutType = typeof workoutTypes[number];

// Export schemas for validation
export { exerciseSchema, exerciseSetSchema, absExerciseSchema, cardioSchema };

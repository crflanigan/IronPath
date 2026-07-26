import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  exerciseSchema,
  absExerciseSchema,
  cardioSchema,
  exerciseSetSchema,
  workoutTypes
} from "./workout-schemas";

/**
 * Database tables.
 *
 * This module imports `drizzle-orm/pg-core`, so anything that imports a
 * *value* from here pulls the Postgres table builder in with it. The client is
 * a browser app with no database, so it must only ever import types from here
 * — or, for runtime schemas, import from ./workout-schemas directly.
 *
 * Everything in ./workout-schemas is re-exported below so existing imports
 * keep working either way.
 */

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

// Re-exported from ./workout-schemas so existing import sites are unchanged.
export { exerciseSchema, exerciseSetSchema, absExerciseSchema, cardioSchema, workoutTypes };
export type { Exercise, ExerciseSet, AbsExercise, Cardio, WorkoutType } from "./workout-schemas";

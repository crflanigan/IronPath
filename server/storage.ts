import { workouts, userPreferences, type Workout, type InsertWorkout, type UserPreferences, type InsertUserPreferences } from "@shared/schema";

export interface IStorage {
  // Workout operations
  getWorkout(id: number): Promise<Workout | undefined>;
  getWorkoutByDate(date: string): Promise<Workout | undefined>;
  getWorkoutsByDateRange(startDate: string, endDate: string): Promise<Workout[]>;
  createWorkout(workout: InsertWorkout): Promise<Workout>;
  updateWorkout(id: number, workout: Partial<InsertWorkout>): Promise<Workout | undefined>;
  deleteWorkout(id: number): Promise<boolean>;
  
  // User preferences
  getUserPreferences(): Promise<UserPreferences | undefined>;
  updateUserPreferences(preferences: Partial<InsertUserPreferences>): Promise<UserPreferences>;
}

export class MemStorage implements IStorage {
  private workouts: Map<number, Workout>;
  private preferences: UserPreferences | null;
  private currentWorkoutId: number;
  private currentPrefsId: number;

  constructor() {
    this.workouts = new Map();
    this.preferences = null;
    this.currentWorkoutId = 1;
    this.currentPrefsId = 1;
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    return this.workouts.get(id);
  }

  async getWorkoutByDate(date: string): Promise<Workout | undefined> {
    return Array.from(this.workouts.values()).find(workout => workout.date === date);
  }

  async getWorkoutsByDateRange(startDate: string, endDate: string): Promise<Workout[]> {
    return Array.from(this.workouts.values())
      .filter(workout => workout.date >= startDate && workout.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async createWorkout(insertWorkout: InsertWorkout): Promise<Workout> {
    const id = this.currentWorkoutId++;
    const now = new Date();
    const workout = {
      ...insertWorkout,
      id,
      duration: insertWorkout.duration ?? null,
      createdAt: now,
      updatedAt: now,
    } as Workout;
    this.workouts.set(id, workout);
    return workout;
  }

  async updateWorkout(id: number, updates: Partial<InsertWorkout>): Promise<Workout | undefined> {
    const workout = this.workouts.get(id);
    if (!workout) return undefined;

    const updatedWorkout = {
      ...workout,
      ...updates,
      duration: updates.duration ?? workout.duration ?? null,
      updatedAt: new Date(),
    } as Workout;
    this.workouts.set(id, updatedWorkout);
    return updatedWorkout;
  }

  async deleteWorkout(id: number): Promise<boolean> {
    return this.workouts.delete(id);
  }

  async getUserPreferences(): Promise<UserPreferences | undefined> {
    if (!this.preferences) {
      // Create default preferences
      this.preferences = {
        id: this.currentPrefsId++,
        darkMode: false,
        autoIncrement: false,
        notifications: true,
        updatedAt: new Date()
      };
    }
    return this.preferences;
  }

  async updateUserPreferences(updates: Partial<InsertUserPreferences>): Promise<UserPreferences> {
    if (!this.preferences) {
      await this.getUserPreferences();
    }
    
    this.preferences = {
      ...this.preferences!,
      ...updates,
      updatedAt: new Date()
    };
    return this.preferences;
  }
}

export const storage = new MemStorage();

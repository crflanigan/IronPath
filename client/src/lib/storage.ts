import { Workout, InsertWorkout, UserPreferences, Exercise, AbsExercise } from "@shared/schema";

export interface CustomWorkoutTemplate {
  id: number;
  name: string;
  exercises: Exercise[];
  abs?: AbsExercise[];
  includeInAutoSchedule?: boolean;
}

const STORAGE_KEYS = {
  WORKOUTS: 'ironpath_workouts',
  PREFERENCES: 'ironpath_preferences',
  CURRENT_ID: 'ironpath_current_id',
  EXERCISE_HISTORY: 'ironpath_exercise_history',
  CUSTOM_TEMPLATES: 'ironpath_custom_templates',
  AUTO_SCHEDULE_WORKOUTS: 'ironpath_auto_schedule_workouts'
} as const;


interface ExerciseHistoryEntry {
  sets: { weight: number; reps: number; rest?: string }[];
  date: string;
}

export class LocalWorkoutStorage {
  private getCurrentId(): number {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_ID);
    return stored ? parseInt(stored, 10) : 1;
  }

  private setCurrentId(id: number): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_ID, id.toString());
  }

  private getWorkouts(): Workout[] {
    const stored = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
    const parsed = stored ? JSON.parse(stored) : [];
    const workouts = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    return workouts;
  }

  private saveWorkouts(workouts: Workout[]): void {
    localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
  }

  private getExerciseHistory(): Record<string, ExerciseHistoryEntry> {
    const stored = localStorage.getItem(STORAGE_KEYS.EXERCISE_HISTORY);
    const history = stored ? JSON.parse(stored) : {};
    return history;
  }

  private saveExerciseHistory(history: Record<string, ExerciseHistoryEntry>): void {
    localStorage.setItem(STORAGE_KEYS.EXERCISE_HISTORY, JSON.stringify(history));
  }

  private getCustomTemplatesInternal(): CustomWorkoutTemplate[] {
    const stored = localStorage.getItem(STORAGE_KEYS.CUSTOM_TEMPLATES);
    const parsed = stored ? JSON.parse(stored) : [];
    const templates = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    return templates.map((t: CustomWorkoutTemplate) => ({
      includeInAutoSchedule: false,
      abs: [],
      ...t,
    }));
  }

  private saveCustomTemplates(templates: CustomWorkoutTemplate[]): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_TEMPLATES, JSON.stringify(templates));
  }

  getCustomTemplatesSync(): CustomWorkoutTemplate[] {
    try {
      return this.getCustomTemplatesInternal();
    } catch {
      return [];
    }
  }

  getAutoScheduleWorkouts(): string[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUTO_SCHEDULE_WORKOUTS);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  saveAutoScheduleWorkouts(names: string[]): void {
    localStorage.setItem(
      STORAGE_KEYS.AUTO_SCHEDULE_WORKOUTS,
      JSON.stringify(names)
    );
  }

  async getLastExerciseSets(machine: string): Promise<{ weight: number; reps: number; rest?: string }[] | undefined> {
    const history = this.getExerciseHistory();
    return history[machine]?.sets;
  }

  private updateExerciseHistory(exercises: Exercise[], date: string) {
    const history = this.getExerciseHistory();
    for (const e of exercises) {
      // only record history when all sets have numeric values
      if (
        e.sets.some(
          s =>
            s.weight === undefined ||
            s.reps === undefined ||
            (s.rest ?? '').trim() === ''
        )
      ) {
        continue;
      }
      const key = e.machine; // use machine name to avoid duplicate codes
      history[key] = {
        sets: e.sets.map(s => ({ weight: s.weight!, reps: s.reps!, rest: s.rest })),
        date,
      };
    }
    this.saveExerciseHistory(history);
  }


  async getWorkout(id: number): Promise<Workout | undefined> {
    const workouts = this.getWorkouts();
    return workouts.find(w => w.id === id);
  }

  async getWorkoutByDate(date: string): Promise<Workout | undefined> {
    const workouts = this.getWorkouts();
    return workouts.find(w => w.date === date);
  }

  async getWorkoutsByDateRange(startDate: string, endDate: string): Promise<Workout[]> {
    const workouts = this.getWorkouts();
    return workouts
      .filter(w => w.date >= startDate && w.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async createWorkout(workout: InsertWorkout): Promise<Workout> {
    const workouts = this.getWorkouts();
    const id = this.getCurrentId();
    const now = new Date();
    
    const newWorkout = {
      ...workout,
      id,
      duration: workout.duration ?? null,
      createdAt: now,
      updatedAt: now,
    } as Workout;
    
    workouts.push(newWorkout);
    this.saveWorkouts(workouts);
    this.setCurrentId(id + 1);
    
    return newWorkout;
  }

  async updateWorkout(id: number, updates: Partial<InsertWorkout>): Promise<Workout | undefined> {
    const workouts = this.getWorkouts();
    const index = workouts.findIndex(w => w.id === id);
    
    if (index === -1) return undefined;
    
    const updatedWorkout = {
      ...workouts[index],
      ...updates,
      duration: updates.duration ?? workouts[index].duration ?? null,
      updatedAt: new Date(),
    } as Workout;
    
    workouts[index] = updatedWorkout;
    this.saveWorkouts(workouts);
    if (updates.exercises) {
      this.updateExerciseHistory(updatedWorkout.exercises, updatedWorkout.date);
    }

    return updatedWorkout;
  }

  async deleteWorkout(id: number): Promise<boolean> {
    const workouts = this.getWorkouts();
    const filteredWorkouts = workouts.filter(w => w.id !== id);
    
    if (filteredWorkouts.length === workouts.length) return false;
    
    this.saveWorkouts(filteredWorkouts);
    return true;
  }

  async getCustomTemplates(): Promise<CustomWorkoutTemplate[]> {
    return this.getCustomTemplatesInternal();
  }

  async addCustomTemplate(template: Omit<CustomWorkoutTemplate, 'id'>): Promise<CustomWorkoutTemplate> {
    const templates = this.getCustomTemplatesInternal();
    const id = templates.length > 0 ? Math.max(...templates.map(t => t.id)) + 1 : 1;
    const newTemplate: CustomWorkoutTemplate = {
      id,
      includeInAutoSchedule: template.includeInAutoSchedule ?? false,
      abs: template.abs ?? [],
      ...template,
    };
    templates.push(newTemplate);
    this.saveCustomTemplates(templates);
    return newTemplate;
  }

  async deleteCustomTemplate(id: number): Promise<boolean> {
    const templates = this.getCustomTemplatesInternal();
    const filtered = templates.filter(t => t.id !== id);
    if (filtered.length === templates.length) return false;
    this.saveCustomTemplates(filtered);
    return true;
  }

  async updateCustomTemplate(
    id: number,
    updates: Omit<CustomWorkoutTemplate, 'id'>,
  ): Promise<CustomWorkoutTemplate | undefined> {
    const templates = this.getCustomTemplatesInternal();
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) return undefined;
    const updated = {
      ...templates[index],
      ...updates,
      abs: updates.abs ?? templates[index].abs ?? [],
    };
    templates[index] = updated;
    this.saveCustomTemplates(templates);
    return updated;
  }

  async getUserPreferences(): Promise<UserPreferences> {
    const stored = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    const defaultPrefs: UserPreferences = {
      id: 1,
      darkMode: false,
      autoIncrement: false,
      notifications: true,
      updatedAt: new Date()
    };
    
    return stored ? { ...defaultPrefs, ...JSON.parse(stored) } : defaultPrefs;
  }

  async updateUserPreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getUserPreferences();
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date()
    };
    
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
    return updated;
  }

  async exportData(): Promise<{ workouts: Workout[]; preferences: UserPreferences; customTemplates: CustomWorkoutTemplate[] }> {
    return {
      workouts: this.getWorkouts(),
      preferences: await this.getUserPreferences(),
      customTemplates: this.getCustomTemplatesInternal()
    };
  }

  async importData(data: { workouts: Workout[]; preferences: UserPreferences; customTemplates?: CustomWorkoutTemplate[] }): Promise<void> {
    this.saveWorkouts(data.workouts);
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(data.preferences));

    if (data.customTemplates) {
      this.saveCustomTemplates(data.customTemplates);
    }

    // Update current ID to prevent conflicts
    const maxId = Math.max(...data.workouts.map(w => w.id), 0);
    this.setCurrentId(maxId + 1);
  }

  async clearAllData(): Promise<void> {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export const localWorkoutStorage = new LocalWorkoutStorage();

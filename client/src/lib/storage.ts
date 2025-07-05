import { Workout, InsertWorkout, UserPreferences } from "@shared/schema";

const STORAGE_KEYS = {
  WORKOUTS: 'ironpup_workouts',
  PREFERENCES: 'ironpup_preferences',
  CURRENT_ID: 'ironpup_current_id'
} as const;

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
    return stored ? JSON.parse(stored) : [];
  }

  private saveWorkouts(workouts: Workout[]): void {
    localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
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
    
    const newWorkout: Workout = {
      ...workout,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    workouts.push(newWorkout);
    this.saveWorkouts(workouts);
    this.setCurrentId(id + 1);
    
    return newWorkout;
  }

  async updateWorkout(id: number, updates: Partial<InsertWorkout>): Promise<Workout | undefined> {
    const workouts = this.getWorkouts();
    const index = workouts.findIndex(w => w.id === id);
    
    if (index === -1) return undefined;
    
    const updatedWorkout: Workout = {
      ...workouts[index],
      ...updates,
      updatedAt: new Date()
    };
    
    workouts[index] = updatedWorkout;
    this.saveWorkouts(workouts);
    
    return updatedWorkout;
  }

  async deleteWorkout(id: number): Promise<boolean> {
    const workouts = this.getWorkouts();
    const filteredWorkouts = workouts.filter(w => w.id !== id);
    
    if (filteredWorkouts.length === workouts.length) return false;
    
    this.saveWorkouts(filteredWorkouts);
    return true;
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

  async exportData(): Promise<{ workouts: Workout[]; preferences: UserPreferences }> {
    return {
      workouts: this.getWorkouts(),
      preferences: await this.getUserPreferences()
    };
  }

  async importData(data: { workouts: Workout[]; preferences: UserPreferences }): Promise<void> {
    this.saveWorkouts(data.workouts);
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(data.preferences));
    
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

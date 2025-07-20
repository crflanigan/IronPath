import { Workout, InsertWorkout, UserPreferences, Exercise, AbsExercise } from "@shared/schema";
import { toast } from '@/hooks/use-toast';

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
  AUTO_SCHEDULE_WORKOUTS: 'ironpath_auto_schedule_workouts',
  HIDDEN_PRESETS: 'ironpath_hidden_presets',
  PRESET_PROMPTS: 'ironpath_preset_prompts'
} as const;


interface ExerciseHistoryEntry {
  sets: { weight: number; reps: number; rest?: string }[];
  date: string;
}

export class LocalWorkoutStorage {
  private storageLimit = 5 * 1024 * 1024; // 5MB approximate
  private warningThreshold = 0.8;
  private warned = false;
  private memoryStore: Record<string, string> = {};
  private storageFailed = false;

  private safeGetItem(key: string): string | null {
    if (typeof localStorage === 'undefined' || this.storageFailed) {
      return this.memoryStore[key] ?? null;
    }
    try {
      return localStorage.getItem(key);
    } catch (err) {
      console.error('localStorage getItem failed', err);
      this.storageFailed = true;
      return this.memoryStore[key] ?? null;
    }
  }

  private safeSetItem(key: string, value: string): void {
    if (typeof localStorage === 'undefined' || this.storageFailed) {
      this.memoryStore[key] = value;
      return;
    }
    try {
      localStorage.setItem(key, value);
      this.checkQuota();
    } catch (err) {
      console.error('localStorage setItem failed', err);
      this.storageFailed = true;
      this.memoryStore[key] = value;
      this.handleStorageError(err);
    }
  }

  private safeRemoveItem(key: string): void {
    if (typeof localStorage === 'undefined' || this.storageFailed) {
      delete this.memoryStore[key];
      return;
    }
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error('localStorage removeItem failed', err);
      delete this.memoryStore[key];
      this.storageFailed = true;
      this.handleStorageError(err);
    }
  }

  private computeUsage(): number {
    let total = 0;
    const source = this.storageFailed ? this.memoryStore : localStorage;
    const keys = this.storageFailed ? Object.keys(source) : Object.keys(source);
    for (const key of keys) {
      const value = this.storageFailed ? source[key] : (source as Storage).getItem(key) || '';
      total += key.length + (value?.length || 0);
    }
    return total;
  }

  private checkQuota() {
    const usage = this.computeUsage();
    if (usage >= this.storageLimit * this.warningThreshold && !this.warned) {
      toast({
        title: 'Storage nearly full',
        description: 'Old workouts will be removed automatically soon.',
      });
      this.warned = true;
    }
    if (usage > this.storageLimit) {
      this.cleanupOldWorkouts();
    }
  }

  private handleStorageError(err: unknown) {
    const isQuota =
      err instanceof DOMException &&
      (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED');
    if (isQuota) {
      this.cleanupOldWorkouts();
      toast({
        title: 'Storage full',
        description: 'Older workout data was removed to free space.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Storage error',
        description: 'Unable to access browser storage. Working in memory only.',
        variant: 'destructive',
      });
    }
  }

  getStorageUsage() {
    const used = this.computeUsage();
    return { used, limit: this.storageLimit, percent: used / this.storageLimit };
  }

  private cleanupOldWorkouts() {
    const stored = this.safeGetItem(STORAGE_KEYS.WORKOUTS);
    if (!stored) return;
    let workouts: Workout[] = [];
    try {
      workouts = JSON.parse(stored);
    } catch {
      return;
    }
    workouts = workouts.filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
    while (workouts.length && this.computeUsage() > this.storageLimit * this.warningThreshold) {
      workouts.shift();
    }
    this.safeSetItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
  }
  private getCurrentId(): number {
    const stored = this.safeGetItem(STORAGE_KEYS.CURRENT_ID);
    return stored ? parseInt(stored, 10) : 1;
  }

  private setCurrentId(id: number): void {
    this.safeSetItem(STORAGE_KEYS.CURRENT_ID, id.toString());
  }

  private getWorkouts(): Workout[] {
    const stored = this.safeGetItem(STORAGE_KEYS.WORKOUTS);
    let parsed: unknown = [];
    try {
      parsed = stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Failed to parse workouts', err);
      return [];
    }
    const workouts = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    return workouts;
  }

  private saveWorkouts(workouts: Workout[]): void {
    this.safeSetItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
  }

  private getExerciseHistory(): Record<string, ExerciseHistoryEntry> {
    const stored = this.safeGetItem(STORAGE_KEYS.EXERCISE_HISTORY);
    try {
      return stored ? JSON.parse(stored) : {};
    } catch (err) {
      console.error('Failed to parse exercise history', err);
      return {};
    }
  }

  private saveExerciseHistory(history: Record<string, ExerciseHistoryEntry>): void {
    this.safeSetItem(STORAGE_KEYS.EXERCISE_HISTORY, JSON.stringify(history));
  }

  private getCustomTemplatesInternal(): CustomWorkoutTemplate[] {
    const stored = this.safeGetItem(STORAGE_KEYS.CUSTOM_TEMPLATES);
    let parsed: unknown = [];
    try {
      parsed = stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Failed to parse custom templates', err);
      return [];
    }
    const templates = Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    return templates.map((t: CustomWorkoutTemplate) => ({
      includeInAutoSchedule: false,
      abs: [],
      ...t,
    }));
  }

  private saveCustomTemplates(templates: CustomWorkoutTemplate[]): void {
    this.safeSetItem(STORAGE_KEYS.CUSTOM_TEMPLATES, JSON.stringify(templates));
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
      const stored = this.safeGetItem(STORAGE_KEYS.AUTO_SCHEDULE_WORKOUTS);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  getHiddenPresets(): Record<string, boolean> {
    try {
      const stored = this.safeGetItem(STORAGE_KEYS.HIDDEN_PRESETS);
      const parsed = stored ? JSON.parse(stored) : {};
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  saveHiddenPresets(presets: Record<string, boolean>): void {
    this.safeSetItem(STORAGE_KEYS.HIDDEN_PRESETS, JSON.stringify(presets));
  }

  getPresetPromptPrefs(): Record<string, boolean> {
    try {
      const stored = this.safeGetItem(STORAGE_KEYS.PRESET_PROMPTS);
      const parsed = stored ? JSON.parse(stored) : {};
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  savePresetPromptPrefs(prefs: Record<string, boolean>): void {
    this.safeSetItem(STORAGE_KEYS.PRESET_PROMPTS, JSON.stringify(prefs));
  }

  saveAutoScheduleWorkouts(names: string[]): void {
    this.safeSetItem(
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
    const stored = this.safeGetItem(STORAGE_KEYS.PREFERENCES);
    const defaultPrefs: UserPreferences = {
      id: 1,
      darkMode: false,
      autoIncrement: false,
      notifications: true,
      updatedAt: new Date()
    };

    try {
      return stored ? { ...defaultPrefs, ...JSON.parse(stored) } : defaultPrefs;
    } catch (err) {
      console.error('Failed to parse preferences', err);
      return defaultPrefs;
    }
  }

  async updateUserPreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getUserPreferences();
    const updated = {
      ...current,
      ...updates,
      updatedAt: new Date()
    };
    
    this.safeSetItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(updated));
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
    this.safeSetItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(data.preferences));

    if (data.customTemplates) {
      this.saveCustomTemplates(data.customTemplates);
    }

    // Update current ID to prevent conflicts
    const maxId = Math.max(...data.workouts.map(w => w.id), 0);
    this.setCurrentId(maxId + 1);
  }

  async clearAllData(): Promise<void> {
    Object.values(STORAGE_KEYS).forEach(key => {
      this.safeRemoveItem(key);
    });
  }
}

export const localWorkoutStorage = new LocalWorkoutStorage();

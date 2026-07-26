// Types only from @shared/schema — importing a *value* from there would pull
// Drizzle's Postgres table builder into the browser bundle. Runtime schemas
// come from the Drizzle-free module instead.
import type { Workout, InsertWorkout, UserPreferences, Exercise, AbsExercise } from "@shared/schema";
import { exerciseSchema, absExerciseSchema, cardioSchema } from "@shared/workout-schemas";
import { z } from "zod";
import { toast } from '@/hooks/use-toast';
import { presetCycleNames } from '@/lib/workout-cycle';

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
  PRESET_PROMPTS: 'ironpath_preset_prompts',
  STREAK_DAYS: 'ironpath_streak_days',
  QUARANTINE: 'ironpath_quarantined_workouts'
} as const;

/** A stored record that could not be parsed, kept so it is not simply lost. */
export interface QuarantinedWorkout {
  quarantinedAt: string;
  reason: string;
  record: unknown;
}

// Enough to recover from a bad release without letting a pathological store
// grow without bound.
const QUARANTINE_LIMIT = 50;


interface ExerciseHistoryEntry {
  sets: { weight: number; reps: number; rest?: string }[];
  date: string;
}


const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const storedWorkoutSchema = z.object({
  id: z.number().int().positive(),
  date: dateStringSchema,
  type: z.string().min(1),
  exercises: z.array(exerciseSchema),
  abs: z.array(absExerciseSchema),
  cardio: cardioSchema.optional().nullable(),
  completed: z.boolean().nullable().optional(),
  duration: z.number().int().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
});

const storedPreferencesSchema = z.object({
  id: z.number().int().positive().optional(),
  darkMode: z.boolean().optional(),
  autoIncrement: z.boolean().optional(),
  notifications: z.boolean().optional(),
  updatedAt: z.coerce.date().optional(),
});

const customTemplateSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  exercises: z.array(exerciseSchema),
  abs: z.array(absExerciseSchema).optional(),
  includeInAutoSchedule: z.boolean().optional(),
});

export class LocalWorkoutStorage {
  private storageLimit = 5 * 1024 * 1024; // 5MB approximate
  private warningThreshold = 0.8;
  private warned = false;
  private memoryStore: Record<string, string> = {};
  private storageFailed = false;
  private cleaningUp = false;

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
      const removed = this.cleanupOldWorkouts();
      toast({
        title: 'Storage full',
        description:
          removed > 0
            ? 'Older workout data was removed to free space.'
            : 'Browser storage is full, but your workout history is not the cause. Nothing was removed.',
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

  /**
   * Drop the oldest workouts until storage is back under the threshold.
   *
   * Returns how many were removed, so callers can describe what actually
   * happened instead of assuming.
   */
  private cleanupOldWorkouts(): number {
    // This writes through safeSetItem, which re-runs checkQuota, which calls
    // back here. When the overage is not the workout list that loop has no
    // base case: it empties the history, keeps recursing on an empty array,
    // and blows the stack. safeSetItem's own try/catch then swallows the
    // RangeError and flips the store into memory-only mode — so the app looks
    // completely normal and silently stops persisting until the next reload.
    if (this.cleaningUp) return 0;
    this.cleaningUp = true;

    try {
      const stored = this.safeGetItem(STORAGE_KEYS.WORKOUTS);
      if (!stored) return 0;

      let workouts: Workout[] = [];
      try {
        workouts = JSON.parse(stored);
      } catch {
        return 0;
      }
      if (!Array.isArray(workouts)) return 0;

      workouts = workouts.filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
      const originalCount = workouts.length;
      const targetUsage = this.storageLimit * this.warningThreshold;
      const usageElsewhere = this.computeUsage() - stored.length;

      // If everything else on this origin already exceeds the target, no
      // amount of trimming helps. Throwing away someone's training history to
      // achieve nothing is worse than being over budget.
      if (usageElsewhere > targetUsage) {
        console.warn(
          'IronPath: storage is over budget, but workout history is not the cause. Leaving it intact.'
        );
        return 0;
      }

      while (workouts.length > 0) {
        if (usageElsewhere + JSON.stringify(workouts).length <= targetUsage) break;
        workouts.shift();
      }

      const removed = originalCount - workouts.length;
      if (removed > 0) {
        this.safeSetItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
      }
      return removed;
    } finally {
      this.cleaningUp = false;
    }
  }
  private getCurrentId(): number {
    const stored = this.safeGetItem(STORAGE_KEYS.CURRENT_ID);
    return stored ? parseInt(stored, 10) : 1;
  }

  private setCurrentId(id: number): void {
    this.safeSetItem(STORAGE_KEYS.CURRENT_ID, id.toString());
  }

  /**
   * Fill in fields that postdate a stored record, so an older workout is not
   * rejected for lacking something that did not exist when it was written.
   *
   * `equipment` became required on the exercise schema after these records
   * were saved. Nothing reads it back off a stored workout — it drives the
   * builder's filter, which works from the exercise library — so the neutral
   * value keeps the record intact without inventing a fact about it.
   */
  private repairStoredWorkout(candidate: unknown): unknown {
    if (!candidate || typeof candidate !== 'object') return candidate;

    const record = candidate as { exercises?: unknown; abs?: unknown };
    if (!Array.isArray(record.exercises)) return candidate;

    return {
      ...record,
      abs: Array.isArray(record.abs) ? record.abs : [],
      exercises: record.exercises.map(exercise => {
        if (!exercise || typeof exercise !== 'object') return exercise;
        const withEquipment = exercise as { equipment?: unknown };
        if (withEquipment.equipment) return exercise;
        return { ...withEquipment, equipment: 'both' };
      }),
    };
  }

  getQuarantinedWorkouts(): QuarantinedWorkout[] {
    try {
      const stored = this.safeGetItem(STORAGE_KEYS.QUARANTINE);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  /** Append newly-rejected records, ignoring ones already set aside. */
  private quarantineWorkouts(records: QuarantinedWorkout[]): void {
    const existing = this.getQuarantinedWorkouts();
    const seen = new Set(existing.map(entry => JSON.stringify(entry.record)));
    const additions = records.filter(entry => !seen.has(JSON.stringify(entry.record)));

    // Reads happen constantly; only write when something is actually new.
    if (additions.length === 0) return;

    const merged = [...existing, ...additions].slice(-QUARANTINE_LIMIT);
    this.safeSetItem(STORAGE_KEYS.QUARANTINE, JSON.stringify(merged));
  }

  /**
   * Read the stored workouts.
   *
   * Anything that fails validation is set aside rather than dropped. This used
   * to `continue` past a bad record, and since the next write persists
   * whatever this returned, the record was then gone for good — no error, no
   * trace. One required field added to the schema was enough to erase history.
   */
  private getWorkouts(): Workout[] {
    const stored = this.safeGetItem(STORAGE_KEYS.WORKOUTS);
    let parsed: unknown = [];
    try {
      parsed = stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Failed to parse workouts', err);
      return [];
    }

    if (!Array.isArray(parsed)) return [];

    const workouts: Workout[] = [];
    const rejected: QuarantinedWorkout[] = [];

    for (const candidate of parsed) {
      const validated = storedWorkoutSchema.safeParse(this.repairStoredWorkout(candidate));
      if (!validated.success) {
        rejected.push({
          quarantinedAt: new Date().toISOString(),
          reason: validated.error.issues
            .map(issue => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
            .join('; '),
          record: candidate,
        });
        continue;
      }

      const workout = validated.data;
      workouts.push({
        ...workout,
        completed: Boolean(workout.completed),
        duration: workout.duration ?? null,
        cardio: workout.cardio ?? undefined,
        createdAt: workout.createdAt ?? new Date(),
        updatedAt: workout.updatedAt ?? new Date(),
      } as Workout);
    }

    if (rejected.length > 0) {
      this.quarantineWorkouts(rejected);
    }

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

  getStreakDays(): number[] {
    try {
      const stored = this.safeGetItem(STORAGE_KEYS.STREAK_DAYS);
      const parsed = stored ? JSON.parse(stored) : null;
      const defaultDays = [0, 1, 2, 3, 4, 5, 6];
      return Array.isArray(parsed)
        ? parsed.filter(d => typeof d === 'number')
        : defaultDays;
    } catch {
      return [0, 1, 2, 3, 4, 5, 6];
    }
  }

  saveStreakDays(days: number[]): void {
    this.safeSetItem(STORAGE_KEYS.STREAK_DAYS, JSON.stringify(days));
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

  async getAllWorkouts(): Promise<Workout[]> {
    return this.getWorkouts().sort((a, b) => a.date.localeCompare(b.date));
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

  /**
   * Keep the stored auto-schedule rotation in step with a template rename or
   * deletion.
   *
   * The rotation persists workout *names*, so without this a rename silently
   * drops the template from the schedule (the old name no longer resolves) and
   * a deletion leaves behind a name that resolves to nothing — which, if it was
   * the only selection, produced an empty cycle and stamped `type: undefined`
   * across the calendar.
   *
   * Pass `null` as `nextName` for a deletion.
   *
   * Must be called *after* the template list has been written, so that the
   * "is this name still claimed" check sees the new state.
   */
  private syncAutoScheduleName(previousName: string, nextName: string | null): void {
    const selected = this.getAutoScheduleWorkouts();
    if (!selected.includes(previousName)) return;

    // A built-in preset, or another custom template, may still answer to this
    // name. Rewriting the entry would silently deselect that one instead.
    const stillClaimed =
      presetCycleNames.has(previousName) ||
      this.getCustomTemplatesInternal().some(t => t.name === previousName);
    if (stillClaimed) return;

    const updated =
      nextName === null
        ? selected.filter(name => name !== previousName)
        : selected.map(name => (name === previousName ? nextName : name));

    this.saveAutoScheduleWorkouts(updated);
  }

  async deleteCustomTemplate(id: number): Promise<boolean> {
    const templates = this.getCustomTemplatesInternal();
    const removed = templates.find(t => t.id === id);
    const filtered = templates.filter(t => t.id !== id);
    if (filtered.length === templates.length) return false;
    this.saveCustomTemplates(filtered);
    if (removed) {
      this.syncAutoScheduleName(removed.name, null);
    }
    return true;
  }

  async updateCustomTemplate(
    id: number,
    updates: Omit<CustomWorkoutTemplate, 'id'>,
  ): Promise<CustomWorkoutTemplate | undefined> {
    const templates = this.getCustomTemplatesInternal();
    const index = templates.findIndex(t => t.id === id);
    if (index === -1) return undefined;
    const previousName = templates[index].name;
    const updated = {
      ...templates[index],
      ...updates,
      abs: updates.abs ?? templates[index].abs ?? [],
    };
    templates[index] = updated;
    this.saveCustomTemplates(templates);
    if (updated.name !== previousName) {
      this.syncAutoScheduleName(previousName, updated.name);
    }
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

  async exportData(): Promise<{
    workouts: Workout[];
    preferences: UserPreferences;
    customTemplates: CustomWorkoutTemplate[];
    quarantined: QuarantinedWorkout[];
  }> {
    // `getWorkouts()` runs first so anything unparseable is set aside before
    // the quarantine is read — otherwise an export could miss a record that
    // this very call just rejected. Quarantined records ride along so a
    // recovery is possible from the exported file alone.
    const workouts = this.getWorkouts();
    return {
      workouts,
      preferences: await this.getUserPreferences(),
      customTemplates: this.getCustomTemplatesInternal(),
      quarantined: this.getQuarantinedWorkouts()
    };
  }

  async importData(data: { workouts: Workout[]; preferences: UserPreferences; customTemplates?: CustomWorkoutTemplate[] }): Promise<void> {
    const workouts = z.array(storedWorkoutSchema).parse(data.workouts).map((workout) => ({
      ...workout,
      completed: Boolean(workout.completed),
      duration: workout.duration ?? null,
      cardio: workout.cardio ?? undefined,
      createdAt: workout.createdAt ?? new Date(),
      updatedAt: workout.updatedAt ?? new Date(),
    })) as Workout[];

    const preferences = storedPreferencesSchema.parse(data.preferences);
    const normalizedPreferences: UserPreferences = {
      id: preferences.id ?? 1,
      darkMode: preferences.darkMode ?? false,
      autoIncrement: preferences.autoIncrement ?? false,
      notifications: preferences.notifications ?? true,
      updatedAt: preferences.updatedAt ?? new Date(),
    };

    this.saveWorkouts(workouts);
    this.safeSetItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(normalizedPreferences));

    if (data.customTemplates) {
      const templates = z.array(customTemplateSchema).parse(data.customTemplates).map((template) => ({
        ...template,
        abs: template.abs ?? [],
        includeInAutoSchedule: template.includeInAutoSchedule ?? false,
      }));
      this.saveCustomTemplates(templates);
    }

    // Update current ID to prevent conflicts
    const maxId = Math.max(...workouts.map(w => w.id), 0);
    this.setCurrentId(maxId + 1);
  }

  async clearAllData(): Promise<void> {
    Object.values(STORAGE_KEYS).forEach(key => {
      this.safeRemoveItem(key);
    });
  }
}

export const localWorkoutStorage = new LocalWorkoutStorage();

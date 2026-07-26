import { beforeEach, describe, expect, it } from 'vitest';
import { LocalWorkoutStorage } from './storage';
import { backupFilename, describeBackup, readJsonFile } from './backup';
import type { InsertWorkout } from '@shared/schema';

/**
 * A backup is only worth having if restoring it puts the app back the way it
 * was. "Export" previously wrote five CSV columns — no sets, reps, weights or
 * templates — and "Import" refused unconditionally, so there was no way back
 * from a lost phone.
 */

function workout(date: string, weight: number): InsertWorkout {
  return {
    date,
    type: 'Chest Day',
    exercises: [
      {
        machine: 'Seated Chest Press',
        equipment: 'machine',
        region: 'Chest',
        feel: 'Medium',
        sets: [{ weight, reps: 10, rest: '1:00', completed: true }],
        completed: true,
      },
    ],
    abs: [{ name: 'Crunch', reps: 30, completed: true }],
    cardio: { type: 'Treadmill', duration: '15:00', distance: '1', completed: true },
    completed: true,
  } as unknown as InsertWorkout;
}

/** Populate every key a backup is supposed to carry. */
async function populate(storage: LocalWorkoutStorage) {
  const first = await storage.createWorkout(workout('2025-05-01', 135));
  const second = await storage.createWorkout(workout('2025-05-03', 145));
  // Exercise history is written by updateWorkout, which is what autosave
  // calls — creating a workout alone does not record it.
  await storage.updateWorkout(first.id, { exercises: first.exercises });
  await storage.updateWorkout(second.id, { exercises: second.exercises });
  await storage.addCustomTemplate({
    name: 'My Split',
    exercises: [],
    abs: [],
    includeInAutoSchedule: true,
  });
  storage.saveAutoScheduleWorkouts(['Chest Day', 'My Split']);
  storage.saveHiddenPresets({ Legs: true });
  storage.savePresetPromptPrefs({ Legs: true });
  storage.saveStreakDays([1, 3, 5]);
}

beforeEach(() => {
  localStorage.clear();
});

describe('a backup round-trip', () => {
  it('restores workouts with their sets intact', async () => {
    const storage = new LocalWorkoutStorage();
    await populate(storage);
    const backup = await storage.exportData();

    localStorage.clear();
    await storage.importData(backup);

    const restored = await storage.getAllWorkouts();
    expect(restored).toHaveLength(2);
    expect(restored[0].exercises[0].sets[0].weight).toBe(135);
    expect(restored[1].exercises[0].sets[0].weight).toBe(145);
    expect(restored[0].abs[0].name).toBe('Crunch');
    expect(restored[0].cardio?.duration).toBe('15:00');
  });

  it('restores custom templates', async () => {
    const storage = new LocalWorkoutStorage();
    await populate(storage);
    const backup = await storage.exportData();

    localStorage.clear();
    await storage.importData(backup);

    const templates = await storage.getCustomTemplates();
    expect(templates.map(t => t.name)).toContain('My Split');
  });

  it('restores the settings that used to be dropped', async () => {
    const storage = new LocalWorkoutStorage();
    await populate(storage);
    const backup = await storage.exportData();

    localStorage.clear();
    await storage.importData(backup);

    expect(storage.getAutoScheduleWorkouts()).toEqual(['Chest Day', 'My Split']);
    expect(storage.getHiddenPresets()).toEqual({ Legs: true });
    expect(storage.getPresetPromptPrefs()).toEqual({ Legs: true });
    expect(storage.getStreakDays()).toEqual([1, 3, 5]);
  });

  it('restores exercise history, so sets still prefill', async () => {
    const storage = new LocalWorkoutStorage();
    await populate(storage);
    const backup = await storage.exportData();

    localStorage.clear();
    await storage.importData(backup);

    expect(await storage.getLastExerciseSets('Seated Chest Press')).toEqual([
      { weight: 145, reps: 10, rest: '1:00' },
    ]);
  });

  it('carries quarantined records across rather than dropping them', async () => {
    const storage = new LocalWorkoutStorage();
    localStorage.setItem(
      'ironpath_workouts',
      JSON.stringify([{ id: 7, date: 'not-a-date', type: 'X', exercises: [], abs: [] }]),
    );
    const backup = await storage.exportData();
    expect(backup.quarantined).toHaveLength(1);

    localStorage.clear();
    await storage.importData(backup);

    expect(storage.getQuarantinedWorkouts()).toHaveLength(1);
  });

  it('leaves new workouts with non-colliding ids', async () => {
    const storage = new LocalWorkoutStorage();
    await populate(storage);
    const backup = await storage.exportData();

    localStorage.clear();
    await storage.importData(backup);
    const created = await storage.createWorkout(workout('2025-06-01', 100));

    const ids = (await storage.getAllWorkouts()).map(w => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(created.id).toBeGreaterThan(2);
  });
});

describe('a backup written by an older build', () => {
  it('still restores, leaving absent sections alone', async () => {
    const storage = new LocalWorkoutStorage();
    await populate(storage);
    const full = await storage.exportData();

    // Only the three fields the previous export produced.
    const legacyBackup = {
      workouts: full.workouts,
      preferences: full.preferences,
      customTemplates: full.customTemplates,
    };

    localStorage.clear();
    storage.saveStreakDays([0, 6]);
    await storage.importData(legacyBackup);

    expect(await storage.getAllWorkouts()).toHaveLength(2);
    // Not present in the file, so not reset.
    expect(storage.getStreakDays()).toEqual([0, 6]);
  });
});

describe('a file that is not a backup', () => {
  it('is rejected', async () => {
    const storage = new LocalWorkoutStorage();
    await expect(storage.importData({ hello: 'world' })).rejects.toThrow();
  });

  it('leaves existing data untouched', async () => {
    const storage = new LocalWorkoutStorage();
    await populate(storage);

    await expect(
      storage.importData({ workouts: [{ id: 1, date: 'nope' }], preferences: {} }),
    ).rejects.toThrow();

    // Validation happens before any write, so nothing is half-replaced.
    expect(await storage.getAllWorkouts()).toHaveLength(2);
    expect(storage.getStreakDays()).toEqual([1, 3, 5]);
  });
});

describe('backup file helpers', () => {
  it('names the file by date', () => {
    expect(backupFilename(new Date(2026, 6, 25))).toBe('ironpath-backup-2026-07-25.json');
  });

  it('summarises what a backup holds', () => {
    expect(describeBackup({ workouts: [1, 2, 3], customTemplates: [1] })).toContain('3 workouts');
    expect(describeBackup({ workouts: [1, 2, 3], customTemplates: [1] })).toContain(
      '1 custom template',
    );
  });

  it('summarises an empty or unrecognised file without throwing', () => {
    expect(describeBackup(null)).toContain('0 workouts');
    expect(describeBackup({})).toContain('0 workouts');
  });

  it('explains itself when the file is not JSON', async () => {
    const file = new File(['this is not json'], 'notes.txt', { type: 'text/plain' });
    await expect(readJsonFile(file)).rejects.toThrow(/JSON backup file/);
  });

  it('parses a real JSON file', async () => {
    const file = new File(['{"workouts":[]}'], 'backup.json', { type: 'application/json' });
    await expect(readJsonFile(file)).resolves.toEqual({ workouts: [] });
  });
});

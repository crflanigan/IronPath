import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BACKUP_REMINDER_EVERY, LocalWorkoutStorage, StorageWriteError } from './storage';
import { describeAge } from './backup';
import type { InsertWorkout } from '@shared/schema';

/**
 * With no account and no server, the backup file is the whole safety net.
 * These pin the places it had holes: a restore that rejected the app's own
 * older files, a restore that reported success having stored nothing, and a
 * backup nobody was ever prompted to take.
 */

function workout(date: string, completed = true): InsertWorkout {
  return {
    date,
    type: 'Chest Day',
    exercises: [
      {
        machine: 'Seated Chest Press',
        equipment: 'machine',
        region: 'Chest',
        feel: 'Medium',
        sets: [{ weight: 135, reps: 10, rest: '1:00', completed: true }],
        completed: true,
      },
    ],
    abs: [],
    completed,
  } as unknown as InsertWorkout;
}

async function seed(storage: LocalWorkoutStorage, count: number) {
  for (let i = 0; i < count; i++) {
    await storage.createWorkout(workout(`2026-01-${String(i + 1).padStart(2, '0')}`));
  }
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('restoring a backup taken before `equipment` existed', () => {
  it('restores it, the same way the app reads such records off disk', async () => {
    const storage = new LocalWorkoutStorage();
    await seed(storage, 2);
    const backup = JSON.parse(JSON.stringify(await storage.exportData()));
    for (const w of backup.workouts) for (const e of w.exercises) delete e.equipment;

    localStorage.clear();
    const result = await new LocalWorkoutStorage().importData(backup);

    expect(result).toEqual({ restored: 2, setAside: 0 });
    expect(await new LocalWorkoutStorage().getAllWorkouts()).toHaveLength(2);
  });
});

describe('a backup with one unreadable workout', () => {
  it('restores the rest and sets the bad one aside instead of refusing the file', async () => {
    const storage = new LocalWorkoutStorage();
    await seed(storage, 3);
    const backup = JSON.parse(JSON.stringify(await storage.exportData()));
    backup.workouts[1].date = 'not a date';

    localStorage.clear();
    const fresh = new LocalWorkoutStorage();
    const result = await fresh.importData(backup);

    expect(result).toEqual({ restored: 2, setAside: 1 });
    expect(await fresh.getAllWorkouts()).toHaveLength(2);
    expect(fresh.getQuarantinedWorkouts()).toHaveLength(1);
  });
});

describe('a restore the browser refuses to store', () => {
  it('fails loudly and puts the previous data back', async () => {
    const source = new LocalWorkoutStorage();
    await seed(source, 5);
    const backup = JSON.parse(JSON.stringify(await source.exportData()));

    localStorage.clear();
    const device = new LocalWorkoutStorage();
    await seed(device, 2);
    device.saveStreakDays([1, 3]);
    const before = JSON.stringify(Object.entries(localStorage).sort());

    // Fails part-way: the workouts land, then the browser starts refusing.
    const real = Storage.prototype.setItem;
    let writes = 0;
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (++writes === 2) throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      real.call(this, key, value);
    });

    await expect(device.importData(backup)).rejects.toBeInstanceOf(StorageWriteError);
    spy.mockRestore();

    expect(JSON.stringify(Object.entries(localStorage).sort())).toBe(before);
    // And the store is usable again, on disk rather than in memory.
    await device.createWorkout(workout('2026-03-01'));
    expect(await new LocalWorkoutStorage().getAllWorkouts()).toHaveLength(3);
  });

  it('refuses up front when nothing is being persisted at all', async () => {
    const source = new LocalWorkoutStorage();
    await seed(source, 1);
    const backup = JSON.parse(JSON.stringify(await source.exportData()));

    const device = new LocalWorkoutStorage();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('SecurityError', 'SecurityError');
    });
    device.saveStreakDays([1]); // trips the store into memory-only mode

    await expect(device.importData(backup)).rejects.toBeInstanceOf(StorageWriteError);
  });
});

describe('the backup reminder', () => {
  it('stays quiet for a new user', async () => {
    const storage = new LocalWorkoutStorage();
    await seed(storage, BACKUP_REMINDER_EVERY - 1);
    expect(storage.getBackupStatus().shouldRemind).toBe(false);
  });

  it('speaks up once enough workouts exist nowhere else', async () => {
    const storage = new LocalWorkoutStorage();
    await seed(storage, BACKUP_REMINDER_EVERY);
    const status = storage.getBackupStatus();
    expect(status).toMatchObject({ shouldRemind: true, sinceBackup: 10, lastBackupAt: null });
  });

  it('does not count workouts that were never completed', async () => {
    const storage = new LocalWorkoutStorage();
    for (let i = 1; i <= 12; i++) {
      await storage.createWorkout(workout(`2026-02-${String(i).padStart(2, '0')}`, false));
    }
    expect(storage.getBackupStatus()).toMatchObject({ completed: 0, shouldRemind: false });
  });

  it('is satisfied by a backup, until another batch builds up', async () => {
    const storage = new LocalWorkoutStorage();
    await seed(storage, 10);
    storage.recordBackup();
    expect(storage.getBackupStatus()).toMatchObject({ shouldRemind: false, sinceBackup: 0 });

    for (let i = 11; i <= 20; i++) await storage.createWorkout(workout(`2026-01-${i}`));
    expect(storage.getBackupStatus()).toMatchObject({ shouldRemind: true, sinceBackup: 10 });
  });

  it('"Later" buys another batch without pretending a backup happened', async () => {
    const storage = new LocalWorkoutStorage();
    await seed(storage, 10);
    storage.snoozeBackupReminder();
    expect(storage.getBackupStatus()).toMatchObject({
      shouldRemind: false,
      sinceBackup: 10,
      lastBackupAt: null,
    });

    for (let i = 11; i <= 20; i++) await storage.createWorkout(workout(`2026-01-${i}`));
    expect(storage.getBackupStatus()).toMatchObject({ shouldRemind: true, sinceBackup: 20 });
  });

  it('treats a freshly restored device as backed up — the file is the backup', async () => {
    const source = new LocalWorkoutStorage();
    await seed(source, 15);
    const backup = JSON.parse(JSON.stringify(await source.exportData()));

    localStorage.clear();
    const device = new LocalWorkoutStorage();
    await device.importData(backup);
    expect(device.getBackupStatus()).toMatchObject({ shouldRemind: false, sinceBackup: 0 });
  });

  it('is not carried inside the backup file, and is cleared by a reset', async () => {
    const storage = new LocalWorkoutStorage();
    await seed(storage, 3);
    storage.recordBackup();
    expect(JSON.stringify(await storage.exportData())).not.toContain('completedAtBackup');
    await storage.clearAllData();
    expect(localStorage.getItem('ironpath_backup_state')).toBeNull();
  });
});

describe('the crash-screen export', () => {
  it('still produces a restorable file when stored data would not validate', async () => {
    const storage = new LocalWorkoutStorage();
    await seed(storage, 2);
    const raw = JSON.parse(localStorage.getItem('ironpath_workouts')!);
    raw.push({ id: 99, date: 'garbage' });
    localStorage.setItem('ironpath_workouts', JSON.stringify(raw));

    const rescued = storage.exportDataUnvalidated();
    expect((rescued.workouts as unknown[]).length).toBe(3);

    localStorage.clear();
    const device = new LocalWorkoutStorage();
    expect(await device.importData(JSON.parse(JSON.stringify(rescued)))).toEqual({
      restored: 2,
      setAside: 1,
    });
  });
});

describe('describeAge', () => {
  const now = new Date(2026, 10, 14, 9, 0);
  it('reads naturally', () => {
    expect(describeAge(new Date(2026, 10, 14, 1, 0), now)).toBe('today');
    expect(describeAge(new Date(2026, 10, 13, 23, 0), now)).toBe('yesterday');
    expect(describeAge(new Date(2026, 10, 2), now)).toBe('12 days ago');
  });
});

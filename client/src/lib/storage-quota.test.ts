import { beforeEach, describe, expect, it } from 'vitest';
import { LocalWorkoutStorage } from './storage';
import type { InsertWorkout } from '@shared/schema';

/**
 * Running out of storage must not take the app down with it.
 *
 * `checkQuota()` calls `cleanupOldWorkouts()`, which writes through
 * `safeSetItem()`, which calls `checkQuota()` again. When the overage comes
 * from keys other than the workout list, trimming workouts can never bring
 * usage under the threshold, so that loop has no base case. The resulting
 * stack overflow is caught by `safeSetItem`'s own try/catch, which flips the
 * store into memory-only mode — the app carries on looking completely normal
 * and silently stops persisting anything until the next reload.
 */

type TestableStorage = LocalWorkoutStorage & {
  storageLimit: number;
  warningThreshold: number;
  storageFailed: boolean;
};

function makeStorage(limit = 4000): TestableStorage {
  const storage = new LocalWorkoutStorage() as TestableStorage;
  storage.storageLimit = limit;
  storage.warningThreshold = 0.8;
  return storage;
}

function workout(date: string): InsertWorkout {
  return {
    date,
    type: 'Chest Day',
    exercises: [
      {
        machine: 'A Deliberately Long Machine Name To Take Up Room',
        equipment: 'machine',
        region: 'Chest',
        feel: 'Medium',
        sets: [
          { weight: 100, reps: 10, rest: '1:00', completed: true },
          { weight: 105, reps: 10, rest: '1:00', completed: true },
        ],
        completed: true,
      },
    ],
    abs: [],
    completed: true,
  } as unknown as InsertWorkout;
}

/** Something else on the same origin, larger than the entire budget. */
function hogStorage(bytes: number) {
  localStorage.setItem('unrelated_app_blob', 'x'.repeat(bytes));
}

beforeEach(() => {
  localStorage.clear();
});

describe('when the overage is not the workout list', () => {
  it('does not recurse until the stack gives out', async () => {
    const storage = makeStorage();
    hogStorage(8000);

    await storage.createWorkout(workout('2025-01-01'));

    expect(storage.storageFailed).toBe(false);
  });

  it('keeps persisting to disk', async () => {
    const storage = makeStorage();
    hogStorage(8000);

    await storage.createWorkout(workout('2025-01-01'));
    await storage.createWorkout(workout('2025-01-02'));

    const onDisk = JSON.parse(localStorage.getItem('ironpath_workouts') ?? '[]');
    expect(onDisk.some((w: { date: string }) => w.date === '2025-01-02')).toBe(true);
  });

  it('does not delete the history it cannot possibly free', async () => {
    const storage = makeStorage();
    await storage.createWorkout(workout('2025-01-01'));
    await storage.createWorkout(workout('2025-01-02'));

    // Only now does the unrelated data blow the budget. Discarding every
    // workout would not get under it, so nothing should be discarded.
    hogStorage(8000);
    await storage.createWorkout(workout('2025-01-03'));

    const remaining = await storage.getAllWorkouts();
    expect(remaining.length).toBeGreaterThanOrEqual(3);
  });
});

describe('when the workout list is genuinely the problem', () => {
  it('still trims the oldest entries', async () => {
    const storage = makeStorage(2500);

    for (let day = 1; day <= 20; day++) {
      await storage.createWorkout(workout(`2025-03-${String(day).padStart(2, '0')}`));
    }

    const remaining = await storage.getAllWorkouts();
    expect(remaining.length).toBeGreaterThan(0);
    expect(remaining.length).toBeLessThan(20);
    // Trimming takes the oldest first, so the most recent must survive.
    expect(remaining[remaining.length - 1].date).toBe('2025-03-20');
    expect(storage.storageFailed).toBe(false);
  });
});

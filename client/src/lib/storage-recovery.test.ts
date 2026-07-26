import { beforeEach, describe, expect, it } from 'vitest';
import { LocalWorkoutStorage } from './storage';
import type { InsertWorkout } from '@shared/schema';

/**
 * Reading workouts must never destroy them.
 *
 * `getWorkouts()` validates every stored record and returns only what parses.
 * Because the very next write persists that filtered list, anything that
 * failed validation was gone for good — silently. A required field added to
 * the schema, or one corrupted record, was enough.
 *
 * Two behaviours are required: repair what can be repaired, and set aside
 * what cannot, so it is recoverable rather than deleted.
 */

/** A workout written before `equipment` existed on the exercise schema. */
function legacyWorkout(id: number, date: string) {
  return {
    id,
    date,
    type: 'Chest Day',
    exercises: [
      {
        code: 'S24',
        machine: 'Adjustable Cable Crossover',
        region: 'Chest Pecs',
        feel: 'Medium',
        sets: [{ weight: 60, reps: 15, rest: '1:00', completed: true }],
        bestWeight: 90,
        bestReps: 15,
        completed: true,
      },
    ],
    abs: [],
    cardio: { type: 'Treadmill', duration: '15:00', distance: '1', completed: true },
    completed: true,
    duration: 45,
  };
}

/** Structurally broken beyond repair — the date is not a date. */
function corruptWorkout(id: number) {
  return { ...legacyWorkout(id, '2025-02-02'), date: 'sometime last winter' };
}

function seed(records: unknown[]) {
  localStorage.setItem('ironpath_workouts', JSON.stringify(records));
  localStorage.setItem('ironpath_current_id', String(records.length + 1));
}

const anotherWorkout: InsertWorkout = {
  date: '2026-01-01',
  type: 'Legs',
  exercises: [],
  abs: [],
  completed: false,
} as unknown as InsertWorkout;

beforeEach(() => {
  localStorage.clear();
});

describe('records written before a schema change', () => {
  it('are still readable', async () => {
    seed([legacyWorkout(1, '2025-01-05')]);
    const storage = new LocalWorkoutStorage();

    expect(await storage.getAllWorkouts()).toHaveLength(1);
  });

  it('survive an unrelated write', async () => {
    seed([legacyWorkout(1, '2025-01-05')]);
    const storage = new LocalWorkoutStorage();

    await storage.createWorkout(anotherWorkout);

    const raw = JSON.parse(localStorage.getItem('ironpath_workouts')!);
    expect(raw.some((w: { date: string }) => w.date === '2025-01-05')).toBe(true);
  });

  it('have the missing field backfilled rather than being discarded', async () => {
    seed([legacyWorkout(1, '2025-01-05')]);
    const storage = new LocalWorkoutStorage();

    const [workout] = await storage.getAllWorkouts();
    // Nothing reads a stored workout's equipment, so the neutral value is the
    // right repair — the point is to keep the record, not to guess.
    expect(workout.exercises[0].equipment).toBe('both');
    expect(workout.exercises[0].sets[0].weight).toBe(60);
  });
});

describe('records that cannot be repaired', () => {
  it('are kept out of the app', async () => {
    seed([legacyWorkout(1, '2025-01-05'), corruptWorkout(2)]);
    const storage = new LocalWorkoutStorage();

    const all = await storage.getAllWorkouts();
    expect(all).toHaveLength(1);
    expect(all[0].date).toBe('2025-01-05');
  });

  it('are set aside instead of deleted', async () => {
    seed([corruptWorkout(2)]);
    const storage = new LocalWorkoutStorage();

    await storage.getAllWorkouts();

    const quarantined = storage.getQuarantinedWorkouts();
    expect(quarantined).toHaveLength(1);
    expect(quarantined[0].record).toMatchObject({ id: 2 });
    expect(quarantined[0].reason).toBeTruthy();
  });

  it('remain recoverable after later writes', async () => {
    seed([corruptWorkout(2)]);
    const storage = new LocalWorkoutStorage();

    await storage.createWorkout(anotherWorkout);
    await storage.createWorkout({ ...anotherWorkout, date: '2026-01-02' });

    expect(storage.getQuarantinedWorkouts()).toHaveLength(1);
  });

  it('are not duplicated by repeated reads', async () => {
    seed([corruptWorkout(2)]);
    const storage = new LocalWorkoutStorage();

    await storage.getAllWorkouts();
    await storage.getAllWorkouts();
    await storage.getAllWorkouts();

    expect(storage.getQuarantinedWorkouts()).toHaveLength(1);
  });

  it('do not grow without bound', async () => {
    seed(Array.from({ length: 120 }, (_, i) => corruptWorkout(i + 1)));
    const storage = new LocalWorkoutStorage();

    await storage.getAllWorkouts();

    const quarantined = storage.getQuarantinedWorkouts();
    expect(quarantined.length).toBeGreaterThan(0);
    expect(quarantined.length).toBeLessThanOrEqual(50);
  });

  it('are included in an export so they can actually be recovered', async () => {
    seed([corruptWorkout(2)]);
    const storage = new LocalWorkoutStorage();
    await storage.getAllWorkouts();

    const exported = await storage.exportData();

    expect(exported.quarantined).toHaveLength(1);
    expect(exported.quarantined?.[0].record).toMatchObject({ id: 2 });
  });

  it('are cleared by a full reset', async () => {
    seed([corruptWorkout(2)]);
    const storage = new LocalWorkoutStorage();
    await storage.getAllWorkouts();

    await storage.clearAllData();

    expect(storage.getQuarantinedWorkouts()).toEqual([]);
  });
});

describe('healthy data is left alone', () => {
  it('round-trips without quarantining anything', async () => {
    const storage = new LocalWorkoutStorage();
    await storage.createWorkout(anotherWorkout);

    const all = await storage.getAllWorkouts();

    expect(all).toHaveLength(1);
    expect(storage.getQuarantinedWorkouts()).toEqual([]);
  });

  it('does not rewrite an exercise that already declares its equipment', async () => {
    const record = legacyWorkout(1, '2025-01-05');
    seed([
      { ...record, exercises: [{ ...record.exercises[0], equipment: 'freeweight' }] },
    ]);
    const storage = new LocalWorkoutStorage();

    const [workout] = await storage.getAllWorkouts();
    expect(workout.exercises[0].equipment).toBe('freeweight');
  });
});

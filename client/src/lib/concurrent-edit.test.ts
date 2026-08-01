import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { LocalWorkoutStorage, ConcurrentEditError } from './storage';
import type { InsertWorkout, Workout } from '@shared/schema';

/**
 * Two tabs open on the same workout used to silently destroy each other's work.
 *
 * Reported sequence: in tab A set the first weight to 211 and let it autosave.
 * In tab B set the second weight to 222 and let it autosave. A's 211 was gone —
 * and tab A carried on displaying it, so neither screen showed the truth until
 * a reload.
 *
 * Every save writes the whole workout, including the exercises array the tab
 * loaded, so the later write wins wholesale. An installed PWA plus the site
 * open in a browser tab is an ordinary state, not an exotic one.
 */

const exercise = (weights: number[]) => ({
  machine: 'Pec Fly',
  equipment: 'machine' as const,
  region: 'Chest',
  feel: 'Medium' as const,
  sets: weights.map(weight => ({ weight, reps: 10, rest: '1:00', completed: true })),
  completed: false,
});

const workout = (): InsertWorkout => ({
  date: '2026-08-01',
  type: 'Chest Day',
  exercises: [exercise([100, 100])],
  abs: [],
});

/** Both tabs read the same storage; each holds its own copy of the record. */
function openInTwoTabs(storage: LocalWorkoutStorage, id: number) {
  const load = () => storage.getWorkouts().find(w => w.id === id)!;
  return { tabA: load(), tabB: load() };
}

const withWeights = (w: Workout, weights: number[]) => ({
  exercises: [{ ...w.exercises[0], sets: exercise(weights).sets }],
});

describe('the same workout open in two tabs', () => {
  let storage: LocalWorkoutStorage;
  let id: number;

  beforeEach(async () => {
    localStorage.clear();
    storage = new LocalWorkoutStorage();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    id = (await storage.createWorkout(workout()))!.id;
  });

  afterEach(() => vi.restoreAllMocks());

  it('refuses the second write rather than erasing the first', async () => {
    const { tabA, tabB } = openInTwoTabs(storage, id);

    // Tab A logs 211 and it lands.
    await storage.updateWorkout(id, withWeights(tabA, [211, 100]), {
      expectedUpdatedAt: tabA.updatedAt,
    });
    expect(storage.getWorkouts().find(w => w.id === id)!.exercises[0].sets[0].weight).toBe(211);

    // Tab B, still holding the copy it loaded, tries to write its own version.
    await expect(
      storage.updateWorkout(id, withWeights(tabB, [100, 222]), {
        expectedUpdatedAt: tabB.updatedAt,
      }),
    ).rejects.toBeInstanceOf(ConcurrentEditError);

    // The whole point: A's set survived.
    const stored = storage.getWorkouts().find(w => w.id === id)!;
    expect(stored.exercises[0].sets[0].weight).toBe(211);
  });

  it('explains where the change came from', async () => {
    const { tabA, tabB } = openInTwoTabs(storage, id);
    await storage.updateWorkout(id, withWeights(tabA, [211, 100]), {
      expectedUpdatedAt: tabA.updatedAt,
    });

    await expect(
      storage.updateWorkout(id, withWeights(tabB, [100, 222]), {
        expectedUpdatedAt: tabB.updatedAt,
      }),
    ).rejects.toThrow(/another tab or window/i);
  });

  it('lets a tab keep saving its own consecutive edits', async () => {
    let seen = storage.getWorkouts().find(w => w.id === id)!;

    // The check must not fire on a tab's own writes, or autosave would break
    // for everybody after the first keystroke.
    for (const weight of [120, 130, 140]) {
      const saved = await storage.updateWorkout(id, withWeights(seen, [weight, 100]), {
        expectedUpdatedAt: seen.updatedAt,
      });
      expect(saved).toBeDefined();
      seen = saved!;
    }

    expect(storage.getWorkouts().find(w => w.id === id)!.exercises[0].sets[0].weight).toBe(140);
  });

  it('leaves callers that pass no expectation alone', async () => {
    const { tabA, tabB } = openInTwoTabs(storage, id);
    await storage.updateWorkout(id, withWeights(tabA, [211, 100]), {
      expectedUpdatedAt: tabA.updatedAt,
    });

    // Backwards compatible: without an expectation the check is skipped.
    await expect(
      storage.updateWorkout(id, withWeights(tabB, [100, 222])),
    ).resolves.toBeDefined();
  });
});

describe('the timestamp the check depends on', () => {
  let storage: LocalWorkoutStorage;
  let id: number;

  beforeEach(async () => {
    localStorage.clear();
    storage = new LocalWorkoutStorage();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    id = (await storage.createWorkout(workout()))!.id;
  });

  afterEach(() => vi.restoreAllMocks());

  /**
   * `new Date()` has millisecond resolution, so two writes inside the same
   * millisecond carried identical stamps and a real conflict slipped through.
   * This surfaced as the suite above failing roughly half the time.
   */
  it('advances on every write, even when the clock does not', async () => {
    // Freeze the clock rather than replacing the Date constructor — the
    // storage layer parses dates through zod on the way back out, and a
    // wholesale Date mock breaks that instead of testing this.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T10:00:00.000Z'));

    const stamps: number[] = [];
    let seen = storage.getWorkouts().find(w => w.id === id)!;
    for (let i = 0; i < 3; i++) {
      seen = (await storage.updateWorkout(id, withWeights(seen, [100 + i, 100]), {
        expectedUpdatedAt: seen.updatedAt,
      }))!;
      stamps.push(seen.updatedAt!.getTime());
    }

    vi.useRealTimers();

    expect(stamps[1]).toBeGreaterThan(stamps[0]);
    expect(stamps[2]).toBeGreaterThan(stamps[1]);
  });
});

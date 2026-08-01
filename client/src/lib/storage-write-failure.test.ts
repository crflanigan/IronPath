import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { LocalWorkoutStorage, StorageWriteError } from './storage';
import type { InsertWorkout } from '@shared/schema';

/**
 * A failed write used to be reported to the user as a successful save.
 *
 * `safeSetItem` caught the exception, flipped to an in-memory store and
 * returned normally, so `updateWorkout` resolved, the caller's `catch` never
 * fired, and the success path ran: "Auto-saved — Your workout progress has been
 * saved", with nothing whatsoever in localStorage.
 *
 * This is not a hypothetical browser. `setItem` throws in Safari private mode,
 * with "block all cookies" set, and on an exhausted origin quota.
 *
 * Falling back to memory is still the right behaviour — the session keeps
 * working. What was wrong was not saying so.
 */

const workout = (): InsertWorkout => ({
  date: '2026-08-01',
  type: 'Chest Day',
  exercises: [
    {
      machine: 'Pec Fly',
      equipment: 'machine',
      region: 'Chest',
      feel: 'Medium',
      sets: [{ weight: 100, reps: 10, rest: '1:00', completed: true }],
      completed: false,
    },
  ],
  abs: [],
});

describe('a workout edit that cannot be written to this device', () => {
  let storage: LocalWorkoutStorage;

  beforeEach(() => {
    localStorage.clear();
    storage = new LocalWorkoutStorage();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects rather than resolving, so the caller cannot claim it saved', async () => {
    const created = await storage.createWorkout(workout());
    expect(created).toBeDefined();

    // What Safari private mode does.
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('QuotaExceededError', 'QuotaExceededError');
      });

    await expect(
      storage.updateWorkout(created!.id, { completed: true }),
    ).rejects.toBeInstanceOf(StorageWriteError);

    setItem.mockRestore();
  });

  it('says the data is not durable, not something a user cannot act on', async () => {
    const created = await storage.createWorkout(workout());
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    await expect(
      storage.updateWorkout(created!.id, { completed: true }),
    ).rejects.toThrow(/could not be saved to this device/i);
  });

  it('keeps the session working, holding the edit in memory', async () => {
    const created = await storage.createWorkout(workout());
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    await storage.updateWorkout(created!.id, { completed: true }).catch(() => {});

    // The point of the memory fallback: nothing crashes and the value is still
    // readable for the rest of this session.
    const workouts = storage.getWorkouts();
    expect(workouts.find(w => w.id === created!.id)?.completed).toBe(true);
  });

  it('still resolves normally when the write succeeds', async () => {
    const created = await storage.createWorkout(workout());

    await expect(
      storage.updateWorkout(created!.id, { completed: true }),
    ).resolves.toBeDefined();

    const persisted = JSON.parse(localStorage.getItem('ironpath_workouts') || '[]');
    expect(persisted.find((w: { id: number }) => w.id === created!.id).completed).toBe(true);
  });
});

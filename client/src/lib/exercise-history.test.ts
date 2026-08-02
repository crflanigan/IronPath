import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest';
import { LocalWorkoutStorage } from './storage';
import type { InsertWorkout } from '@shared/schema';

/**
 * Exercise history is what pre-fills your next session's weights, and it used
 * to be overwritten by whichever workout was saved most recently — regardless
 * of when that workout happened.
 *
 * Found in a real backup. A user's Seated Leg Press history read 130 dated
 * 2026-07-07, while she had 140 logged and ticked on the 9th, 14th and 21st.
 * The July 7th workout carried `updatedAt: 2026-07-26`: editing it three weeks
 * later rewrote her prefill back to the older numbers, and every session after
 * that started 10lbs light.
 */

const legPress = (weight: number) => ({
  machine: 'Seated Leg Press',
  equipment: 'machine' as const,
  region: 'Legs',
  feel: 'Medium' as const,
  completed: true,
  sets: [
    { weight, reps: 10, rest: '1:00', completed: true },
    { weight, reps: 10, rest: '1:00', completed: true },
  ],
});

const workout = (date: string, weight: number): InsertWorkout => ({
  date,
  type: "Teresa's",
  exercises: [legPress(weight)],
  abs: [],
});

describe('exercise history', () => {
  let storage: LocalWorkoutStorage;

  beforeEach(() => {
    localStorage.clear();
    storage = new LocalWorkoutStorage();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  /** What the next workout would pre-fill with. */
  const prefill = async () =>
    (await storage.getLastExerciseSets('Seated Leg Press'))?.[0]?.weight;

  /** Log a session the way the app does: create the day, then save sets into it. */
  const log = async (date: string, weight: number) => {
    const created = await storage.createWorkout(workout(date, weight));
    await storage.updateWorkout(created!.id, { exercises: [legPress(weight)] });
    return created!;
  };

  it('follows the most recent session, not the most recently saved one', async () => {
    const july7 = await log('2026-07-07', 130);
    await log('2026-07-21', 140);

    expect(await prefill()).toBe(140);

    // Now edit the older session, as happened in the reported data.
    await storage.updateWorkout(july7.id, { exercises: [legPress(130)] });

    expect(
      await prefill(),
      'editing a three-week-old workout must not drag the prefill backwards',
    ).toBe(140);
  });

  it('still moves forward when the newer session is edited', async () => {
    await log('2026-07-07', 130);
    const july21 = await log('2026-07-21', 140);

    await storage.updateWorkout(july21.id, { exercises: [legPress(145)] });

    expect(await prefill()).toBe(145);
  });

  it('records a first session with nothing to compare against', async () => {
    await log('2026-07-07', 130);
    expect(await prefill()).toBe(130);
  });

  it('takes the same date as an update, so correcting today still works', async () => {
    const today = await log('2026-07-07', 130);
    await storage.updateWorkout(today.id, { exercises: [legPress(135)] });

    expect(await prefill(), 'fixing a typo in today\'s session must stick').toBe(135);
  });
});

import { describe, expect, it } from 'vitest';
import { personalBests } from './personal-best';
import type { Workout } from '@shared/schema';

/**
 * `BEST:` used to render a constant from the workout template — specifically
 * the heaviest set in that same template, relabelled as a record. It was
 * identical for every user, and it never moved no matter what anyone lifted.
 *
 * These pin the replacement to the two things that make it worth showing: it
 * comes from logged sets, and it is what you walked in with rather than what
 * you have typed so far today.
 */

const set = (weight?: number, reps?: number) => ({ weight, reps, completed: true });

/** A set as a template hands it to you: numbers filled in, never ticked. */
const prefilled = (weight: number, reps: number) => ({ weight, reps, completed: false });

const workout = (id: number, machine: string, sets: ReturnType<typeof set>[]): Workout =>
  ({
    id,
    date: '2026-08-01',
    type: 'Chest Day',
    exercises: [
      {
        machine,
        equipment: 'machine' as const,
        region: 'Chest',
        feel: 'Medium' as const,
        sets,
        completed: false,
      },
    ],
    abs: [],
    cardio: null,
    completed: null,
    duration: null,
    startedAt: null,
    createdAt: null,
    updatedAt: null,
  }) as Workout;

describe('personalBests', () => {
  it('is empty when nothing has been logged', () => {
    expect(personalBests([]).size).toBe(0);
  });

  it('takes the heaviest set ever logged, not the most recent', () => {
    const best = personalBests([
      workout(1, 'Pec Fly', [set(90, 10)]),
      workout(2, 'Pec Fly', [set(120, 8)]),
      workout(3, 'Pec Fly', [set(100, 10)]), // later, but lighter
    ]);

    expect(best.get('Pec Fly')).toEqual({ weight: 120, reps: 8, date: '2026-08-01' });
  });

  it('breaks ties on weight by reps', () => {
    const best = personalBests([
      workout(1, 'Seated Row', [set(100, 10)]),
      workout(2, 'Seated Row', [set(100, 12)]),
    ]);

    expect(best.get('Seated Row')).toEqual({ weight: 100, reps: 12, date: '2026-08-01' });
  });

  it('ignores sets with no weight or no reps', () => {
    const best = personalBests([
      workout(1, 'Leg Press', [set(undefined, 10), set(200, undefined), set(80, 10)]),
    ]);

    expect(best.get('Leg Press')).toEqual({ weight: 80, reps: 10, date: '2026-08-01' });
  });

  it('leaves out the workout in progress', () => {
    const workouts = [
      workout(1, 'Bar Curl', [set(50, 10)]),
      workout(2, 'Bar Curl', [set(999, 10)]), // today, mid-session
    ];

    // Without this, whatever you have just typed instantly becomes your record
    // and the change indicator can never read anything but zero.
    expect(personalBests(workouts, 2).get('Bar Curl')).toEqual({ weight: 50, reps: 10, date: '2026-08-01' });
    expect(personalBests(workouts).get('Bar Curl')).toEqual({ weight: 999, reps: 10, date: '2026-08-01' });
  });

  it('keeps exercises separate', () => {
    const best = personalBests([
      workout(1, 'Pec Fly', [set(90, 10)]),
      workout(2, 'Leg Press', [set(300, 10)]),
    ]);

    expect(best.get('Pec Fly')).toEqual({ weight: 90, reps: 10, date: '2026-08-01' });
    expect(best.get('Leg Press')).toEqual({ weight: 300, reps: 10, date: '2026-08-01' });
    expect(best.get('Never Done')).toBeUndefined();
  });

  it('reports nothing for an exercise that has only ever been skipped', () => {
    const best = personalBests([workout(1, 'Abductor', [set(undefined, undefined)])]);
    expect(best.get('Abductor')).toBeUndefined();
  });
  it('does not count a template\'s prefilled weights as something you lifted', () => {
    // Presets arrive with weights already in the boxes. Counting those would
    // make the template's own defaults your record as soon as the workout
    // became history — the same invention this replaced, one session later.
    const best = personalBests([
      workout(1, 'Leg Press', [prefilled(450, 15), prefilled(400, 15)]),
    ]);

    expect(best.get('Leg Press')).toBeUndefined();
  });

  it('counts the sets you ticked, ignoring the ones you left untouched', () => {
    const best = personalBests([
      workout(1, 'Leg Press', [set(200, 10), prefilled(450, 15)]),
    ]);

    expect(best.get('Leg Press')).toEqual({ weight: 200, reps: 10, date: '2026-08-01' });
  });
});

describe('resetting a personal best', () => {
  /**
   * People reset for their own reasons — an injury, a year away, or a figure
   * from long ago that is not a useful target any more. None of these is a
   * correction, so nothing here treats a reset as fixing a mistake.
   */
  const dated = (id: number, date: string, weight: number): Workout =>
    ({ ...workout(id, 'Seated Dip', [set(weight, 10)]), date }) as Workout;

  it('stops sessions on or before the reset date counting', () => {
    const best = personalBests(
      [dated(1, '2025-07-29', 140), dated(2, '2026-06-01', 110)],
      undefined,
      [{ machine: 'Seated Dip', resetOn: '2026-01-01' }],
    );

    expect(best.get('Seated Dip')).toEqual({ weight: 110, reps: 10, date: '2026-06-01' });
  });

  it('leaves nothing at all when everything logged predates the reset', () => {
    const best = personalBests([dated(1, '2025-07-29', 140)], undefined, [
      { machine: 'Seated Dip', resetOn: '2026-01-01' },
    ]);

    // The line disappears until the next session, rather than falling back to
    // a lower old figure that is just as stale.
    expect(best.get('Seated Dip')).toBeUndefined();
  });

  it('shows a figure the user named, marked as theirs', () => {
    const best = personalBests([dated(1, '2025-07-29', 140)], undefined, [
      { machine: 'Seated Dip', resetOn: '2026-01-01', manual: { weight: 90, reps: 10 } },
    ]);

    expect(best.get('Seated Dip')).toEqual({ weight: 90, reps: 10, manual: true });
  });

  it('lets a logged session beat the figure the user named', () => {
    const best = personalBests(
      [dated(1, '2025-07-29', 140), dated(2, '2026-06-01', 100)],
      undefined,
      [{ machine: 'Seated Dip', resetOn: '2026-01-01', manual: { weight: 90, reps: 10 } }],
    );

    expect(best.get('Seated Dip')).toEqual({ weight: 100, reps: 10, date: '2026-06-01' });
  });

  it('touches only the exercise it names', () => {
    const best = personalBests(
      [dated(1, '2025-07-29', 140), workout(2, 'Pec Fly', [set(165, 15)])],
      undefined,
      [{ machine: 'Seated Dip', resetOn: '2026-01-01' }],
    );

    expect(best.get('Seated Dip')).toBeUndefined();
    expect(best.get('Pec Fly')).toEqual({ weight: 165, reps: 15, date: '2026-08-01' });
  });
});

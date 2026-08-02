import type { Workout } from '@shared/schema';

/**
 * The heaviest set you have actually logged for an exercise.
 *
 * The `BEST:` line used to read `bestWeight` off the workout template, where it
 * was a hardcoded constant — and not even a new one: it was the heaviest set in
 * that same template, restated as though it were an achievement.
 *
 * Deriving it from logged sets is better, but it is not sufficient on its own.
 * A real backup showed why: someone opened a Chest Day preset once in July
 * 2025, changed a single exercise to their own weight, and ticked the rest
 * through at the template's demo numbers. Every one of those became a permanent
 * personal best — Seated Dip at 140lbs, a weight they had never lifted — with
 * nothing on screen to say where it came from or any way to remove it.
 *
 * Hence the two things this module now carries beyond the number itself: the
 * date it was set, so the claim can be checked at a glance, and support for a
 * reset, so it can be corrected.
 */

export interface PersonalBest {
  weight: number;
  reps: number;
  /** ISO date of the workout it came from, or undefined when set by hand. */
  date?: string;
  /** True when the user set this figure themselves rather than logging it. */
  manual?: boolean;
}

/**
 * A user's decision to start an exercise's record over.
 *
 * Reasons are their own — an injury, a year away, or simply wanting a target
 * that reflects where they are now. Nothing here treats a reset as a
 * correction of something wrong.
 */
export interface PersonalBestReset {
  machine: string;
  /** Sets logged on or before this date stop counting. */
  resetOn: string;
  /** Optionally, the figure to show instead until it is beaten. */
  manual?: { weight: number; reps: number };
}

/**
 * Personal bests for every exercise across the given workouts, keyed by machine.
 *
 * A set counts only once it is marked complete. Requiring the tick is
 * load-bearing: templates arrive with weights already filled in, so counting
 * any set that merely *has* numbers would make the template's own defaults a
 * personal best the moment the workout became history.
 *
 * `excludeWorkoutId` leaves out the session in progress, so today's typing does
 * not become the record it is being compared against.
 *
 * Ties on weight are broken by reps, so 100x12 beats 100x10.
 */
export function personalBests(
  workouts: Workout[],
  excludeWorkoutId?: number,
  resets: PersonalBestReset[] = [],
): Map<string, PersonalBest> {
  const best = new Map<string, PersonalBest>();
  const resetByMachine = new Map(resets.map(r => [r.machine, r]));

  for (const workout of workouts) {
    if (excludeWorkoutId !== undefined && workout.id === excludeWorkoutId) continue;

    for (const exercise of workout.exercises) {
      const reset = resetByMachine.get(exercise.machine);
      // Sets from on or before the reset date no longer count towards it.
      if (reset && workout.date <= reset.resetOn) continue;

      for (const set of exercise.sets) {
        if (!set.completed) continue;
        if (typeof set.weight !== 'number' || typeof set.reps !== 'number') continue;

        const current = best.get(exercise.machine);
        if (
          !current ||
          set.weight > current.weight ||
          (set.weight === current.weight && set.reps > current.reps)
        ) {
          best.set(exercise.machine, {
            weight: set.weight,
            reps: set.reps,
            date: workout.date,
          });
        }
      }
    }
  }

  // A figure the user set by hand stands until something logged beats it.
  for (const reset of resets) {
    if (!reset.manual) continue;
    const logged = best.get(reset.machine);
    if (!logged || reset.manual.weight > logged.weight) {
      best.set(reset.machine, { ...reset.manual, manual: true });
    }
  }

  return best;
}

/**
 * "29 Jul 2025" — short enough to sit inline, and explicit about the year,
 * which is the part that matters when a record has gone stale.
 */
export function formatBestDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

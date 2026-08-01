import type { Workout } from '@shared/schema';

/**
 * The heaviest set you have actually logged for an exercise.
 *
 * The `BEST:` line used to read `bestWeight` off the workout template, where it
 * was a hardcoded constant — and not even a new one: it was the heaviest set in
 * that same template, restated as though it were an achievement. So the app
 * showed every user the same "record" on day one, and kept showing it forever,
 * because a template constant never moves. The weight change indicator was
 * measured against it too, which meant matching the preset's own top set read
 * as a personal record.
 *
 * The prefilled weights in a template are a different thing and stay exactly as
 * they are: they are a sensible starting point, and being able to load a preset
 * and go is the point of presets. What changes is only the claim about what you
 * have lifted.
 */

export interface PersonalBest {
  weight: number;
  reps: number;
}

/**
 * Personal bests for every exercise across the given workouts, keyed by machine.
 *
 * A set counts only once it is marked complete.
 *
 * Requiring the tick is load-bearing, not fussiness. Templates arrive with
 * weights already filled in — that is the point of a preset — so counting any
 * set that merely *has* numbers would make the template's own defaults your
 * personal record the moment the workout became history. That is the same
 * invention this replaced, one session later.
 *
 * `excludeWorkoutId` leaves out the session in progress. Without it, typing a
 * weight would immediately become your record and the change indicator would
 * read zero forever — the number is meant to be what you walked in with.
 *
 * Ties on weight are broken by reps, so 100x12 beats 100x10.
 */
export function personalBests(
  workouts: Workout[],
  excludeWorkoutId?: number,
): Map<string, PersonalBest> {
  const best = new Map<string, PersonalBest>();

  for (const workout of workouts) {
    if (excludeWorkoutId !== undefined && workout.id === excludeWorkoutId) continue;

    for (const exercise of workout.exercises) {
      for (const set of exercise.sets) {
        if (!set.completed) continue;
        if (typeof set.weight !== 'number' || typeof set.reps !== 'number') continue;

        const current = best.get(exercise.machine);
        if (
          !current ||
          set.weight > current.weight ||
          (set.weight === current.weight && set.reps > current.reps)
        ) {
          best.set(exercise.machine, { weight: set.weight, reps: set.reps });
        }
      }
    }
  }

  return best;
}

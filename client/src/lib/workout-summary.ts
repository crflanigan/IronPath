import type { Exercise, Workout } from '@shared/schema';
import type { PersonalBest } from '@/lib/personal-best';

/**
 * What a finished session amounted to.
 *
 * Everything here counts *completed* sets only, for the same reason
 * `personalBests` does: templates arrive with weights already filled in, so a
 * set that merely has numbers is a suggestion, not something that was lifted.
 */

type LoggedSet = { weight: number; reps: number; index: number };

function loggedSets(exercise: Exercise): LoggedSet[] {
  return exercise.sets.flatMap((set, index) =>
    set.completed && typeof set.weight === 'number' && typeof set.reps === 'number'
      ? [{ weight: set.weight, reps: set.reps, index }]
      : [],
  );
}

/** Heavier wins; at the same weight, more reps wins. Matches `personalBests`. */
function beats(a: { weight: number; reps: number }, b: { weight: number; reps: number }): boolean {
  return a.weight > b.weight || (a.weight === b.weight && a.reps > b.reps);
}

/** Total weight moved: weight x reps, summed over every completed set. */
export function workoutVolume(workout: Pick<Workout, 'exercises'>): number {
  return workout.exercises.reduce(
    (total, exercise) =>
      total + loggedSets(exercise).reduce((sum, set) => sum + set.weight * set.reps, 0),
    0,
  );
}

export function completedSetCount(workout: Pick<Workout, 'exercises'>): number {
  return workout.exercises.reduce((n, exercise) => n + loggedSets(exercise).length, 0);
}

/**
 * Which set of this exercise, if any, is a new personal best.
 *
 * Returns the index of the single set that holds the record — the best one
 * logged today, provided it beats what you walked in with — or -1.
 *
 * One set, not every set over the old mark: tick 85 three times against a best
 * of 80 and the record was set once, on the first. And never on an exercise
 * with no earlier best, because a first-ever set beating nothing is not a
 * record, it is a starting point.
 */
export function recordSetIndex(exercise: Exercise, best: PersonalBest | undefined): number {
  if (!best) return -1;
  let top: LoggedSet | null = null;
  for (const set of loggedSets(exercise)) {
    if (!top || beats(set, top)) top = set;
  }
  return top && beats(top, best) ? top.index : -1;
}

export interface NewBest {
  machine: string;
  weight: number;
  reps: number;
  previous: PersonalBest;
}

/** Every personal best set in this workout, in the order the exercises appear. */
export function newPersonalBests(
  workout: Pick<Workout, 'exercises'>,
  bests: Map<string, PersonalBest>,
): NewBest[] {
  const found: NewBest[] = [];
  const seen = new Set<string>();
  for (const exercise of workout.exercises) {
    if (seen.has(exercise.machine)) continue;
    const previous = bests.get(exercise.machine);
    const index = recordSetIndex(exercise, previous);
    if (index === -1 || !previous) continue;
    seen.add(exercise.machine);
    const set = exercise.sets[index];
    found.push({ machine: exercise.machine, weight: set.weight!, reps: set.reps!, previous });
  }
  return found;
}

/**
 * Whether anything in this workout has been ticked yet.
 *
 * A workout record exists from the moment a day is given one, which for a
 * custom workout is the moment it is picked, so "has a record" says nothing
 * about whether anyone has trained.
 */
export function workoutBegun(workout: Pick<Workout, 'exercises' | 'abs' | 'cardio'>): boolean {
  return (
    workout.exercises.some(e => e.completed || e.sets.some(s => s.completed)) ||
    workout.abs.some(a => a.completed) ||
    Boolean(workout.cardio?.completed)
  );
}

/**
 * How far through a workout is, the same on every screen that shows it.
 *
 * `completedItems / totalItems` counts exercises, core moves and the cardio
 * block, which is what the label reads. The bar fills per set instead: in
 * whole exercises it sat still through the first three ticks of a session,
 * as if nothing had registered. The calendar's card used to count exercises
 * only, so after a set or two it still showed an empty bar.
 */
export function workoutProgress(workout: Pick<Workout, 'exercises' | 'abs' | 'cardio'>) {
  const completedAbs = workout.abs.filter(a => a.completed).length;
  // Cardio counts only when the workout has a cardio block, or the total is
  // permanently one higher than anything that can be completed.
  const hasCardio = Boolean(workout.cardio);
  const cardioDone = hasCardio && workout.cardio?.completed ? 1 : 0;

  const totalItems = workout.exercises.length + workout.abs.length + (hasCardio ? 1 : 0);
  const completedItems =
    workout.exercises.filter(e => e.completed).length + completedAbs + cardioDone;

  const sets = workout.exercises.flatMap(e => e.sets);
  const units = sets.length + workout.abs.length + (hasCardio ? 1 : 0);
  const unitsDone = sets.filter(s => s.completed).length + completedAbs + cardioDone;

  return {
    completedItems,
    totalItems,
    barPercentage: units > 0 ? Math.round((unitsDone / units) * 100) : 0,
  };
}

/** Elapsed seconds as "4:07", or "1:04:07" from an hour on. */
export function formatElapsed(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = String(safe % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

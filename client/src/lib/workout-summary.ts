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
 * The last time this same workout was completed, for "more than last time".
 * Same type only — comparing leg day's tonnage with arm day's says nothing.
 */
export function previousOfSameType(workouts: Workout[], current: Workout): Workout | undefined {
  return workouts
    .filter(w => w.completed && w.id !== current.id && w.type === current.type && w.date <= current.date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

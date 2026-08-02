import type { Workout } from '@shared/schema';
import type { PersonalBestReset } from './personal-best';

/**
 * What you have lifted on each machine, session by session.
 *
 * The question this answers is "am I getting stronger", and the honest answer
 * for a normal person is a sentence — "Seated Row, 125 lbs, up 45 since July
 * 2025" — not a chart. The shape is decoration on top of that sentence, which
 * is why everything here produces the sentence's ingredients first and the
 * series second.
 *
 * Two rules are borrowed deliberately from `personalBests`, so the two never
 * disagree on screen:
 *
 *  - only sets marked complete count, because templates arrive pre-filled and
 *    an untouched default is not something you lifted
 *  - a reset hides sessions on or before its date
 *
 * The second matters more here than it looks. A stale record — a template
 * default ticked through once, a year ago — would open the trend with a spike
 * and make every real session afterwards read as decline. Someone resetting
 * that record is telling us to forget it; forgetting it only for the record
 * and not for the trend would be half a fix.
 */

export interface SessionPoint {
  /** ISO date of the session. */
  date: string;
  /** Heaviest completed set that day. */
  weight: number;
  reps: number;
}

export interface LiftProgress {
  machine: string;
  /** Oldest first. One entry per session, never per set. */
  points: SessionPoint[];
  /** Heaviest set in the most recent session. */
  current: number;
  /** Heaviest set in the earliest session still counted. */
  first: number;
  /** `current - first`. Negative is fine and is not framed as failure. */
  change: number;
  firstDate: string;
  lastDate: string;
  sessions: number;
}

function heaviestCompletedSet(
  workout: Workout,
  machine: string,
): { weight: number; reps: number } | undefined {
  let best: { weight: number; reps: number } | undefined;

  for (const exercise of workout.exercises) {
    if (exercise.machine !== machine) continue;
    for (const set of exercise.sets) {
      if (!set.completed) continue;
      if (typeof set.weight !== 'number' || typeof set.reps !== 'number') continue;
      if (!best || set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps)) {
        best = { weight: set.weight, reps: set.reps };
      }
    }
  }

  return best;
}

/**
 * One entry per exercise you have logged, most recently trained first.
 *
 * That ordering is on purpose: the lifts you are currently training are the
 * ones you want to see, and something you last touched a year ago sinking to
 * the bottom is the right outcome rather than a problem to solve.
 */
export function liftProgress(
  workouts: Workout[],
  resets: PersonalBestReset[] = [],
): LiftProgress[] {
  const resetByMachine = new Map(resets.map(r => [r.machine, r]));
  const byMachine = new Map<string, Map<string, SessionPoint>>();

  for (const workout of workouts) {
    const machines = new Set<string>();
    for (const exercise of workout.exercises) machines.add(exercise.machine);

    for (const machine of Array.from(machines)) {
      const reset = resetByMachine.get(machine);
      if (reset && workout.date <= reset.resetOn) continue;

      const best = heaviestCompletedSet(workout, machine);
      if (!best) continue;

      let sessions = byMachine.get(machine);
      if (!sessions) {
        sessions = new Map();
        byMachine.set(machine, sessions);
      }

      // Two workouts can share a date — the heaviest of them is the day's set.
      const existing = sessions.get(workout.date);
      if (!existing || best.weight > existing.weight) {
        sessions.set(workout.date, { date: workout.date, ...best });
      }
    }
  }

  const result: LiftProgress[] = [];
  for (const [machine, sessions] of Array.from(byMachine.entries())) {
    const points = Array.from(sessions.values()).sort((a, b) => a.date.localeCompare(b.date));
    if (points.length === 0) continue;

    const first = points[0];
    const last = points[points.length - 1];
    result.push({
      machine,
      points,
      current: last.weight,
      first: first.weight,
      change: last.weight - first.weight,
      firstDate: first.date,
      lastDate: last.date,
      sessions: points.length,
    });
  }

  return result.sort((a, b) => b.lastDate.localeCompare(a.lastDate) || a.machine.localeCompare(b.machine));
}

/**
 * The sentence, in the app's voice.
 *
 * Neutral about direction on purpose. A number going down is an injury, a
 * deload, or a bad month — not a failure to be pointed at, and this app has
 * already been caught once telling someone they were underperforming against
 * a figure they never set.
 */
export function describeProgress(lift: LiftProgress): string {
  if (lift.sessions < 2) return `${lift.current} lbs · first session`;

  const since = new Date(
    Number(lift.firstDate.slice(0, 4)),
    Number(lift.firstDate.slice(5, 7)) - 1,
    Number(lift.firstDate.slice(8, 10)),
  ).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  if (lift.change === 0) return `${lift.current} lbs · same as ${since}`;
  const direction = lift.change > 0 ? 'up' : 'down';
  return `${lift.current} lbs · ${direction} ${Math.abs(lift.change)} since ${since}`;
}

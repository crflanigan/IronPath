import { describe, expect, it } from 'vitest';
import { liftProgress, describeProgress } from './progression';
import type { Workout } from '@shared/schema';

/**
 * Shaped around a real year of data: Seated Row climbing 80 → 125 across
 * twelve months, which is the story the app could not tell.
 */

const set = (weight?: number, reps = 10, completed = true) => ({ weight, reps, completed });

const workout = (
  id: number,
  date: string,
  machine: string,
  sets: ReturnType<typeof set>[],
): Workout =>
  ({
    id,
    date,
    type: "Teresa's",
    exercises: [
      {
        machine,
        equipment: 'machine' as const,
        region: 'Back',
        feel: 'Medium' as const,
        sets,
        completed: false,
      },
    ],
    abs: [],
    cardio: null,
    completed: true,
    duration: null,
    startedAt: null,
    createdAt: null,
    updatedAt: null,
  }) as Workout;

describe('liftProgress', () => {
  it('is empty when nothing has been logged', () => {
    expect(liftProgress([])).toEqual([]);
  });

  it('gives one point per session, not per set', () => {
    const [row] = liftProgress([
      workout(1, '2025-07-22', 'Seated Row', [set(80), set(80), set(80)]),
      workout(2, '2026-07-21', 'Seated Row', [set(120), set(125), set(125)]),
    ]);

    expect(row.points).toEqual([
      { date: '2025-07-22', weight: 80, reps: 10 },
      { date: '2026-07-21', weight: 125, reps: 10 },
    ]);
    expect(row.sessions).toBe(2);
  });

  it('takes the heaviest completed set of the day', () => {
    const [row] = liftProgress([
      workout(1, '2025-07-22', 'Seated Row', [set(80), set(95), set(85)]),
    ]);
    expect(row.current).toBe(95);
  });

  it('ignores sets that were never ticked', () => {
    // Templates arrive pre-filled; an untouched default is not a lift.
    const [row] = liftProgress([
      workout(1, '2025-07-22', 'Seated Row', [set(80), set(230, 15, false)]),
    ]);
    expect(row.current).toBe(80);
  });

  it('reports the change across the whole span', () => {
    const [row] = liftProgress([
      workout(1, '2025-07-22', 'Seated Row', [set(80)]),
      workout(2, '2026-01-01', 'Seated Row', [set(105)]),
      workout(3, '2026-07-21', 'Seated Row', [set(125)]),
    ]);

    expect(row.first).toBe(80);
    expect(row.current).toBe(125);
    expect(row.change).toBe(45);
    expect(row.firstDate).toBe('2025-07-22');
    expect(row.lastDate).toBe('2026-07-21');
  });

  it('forgets sessions hidden by a reset', () => {
    // The reason this matters: a template default ticked through once, a year
    // ago, would open the trend with a spike and make every real session after
    // it read as decline.
    const rows = liftProgress(
      [
        workout(1, '2025-07-29', 'Seated Dip', [set(140)]),
        workout(2, '2026-06-01', 'Seated Dip', [set(90)]),
        workout(3, '2026-07-01', 'Seated Dip', [set(110)]),
      ],
      [{ machine: 'Seated Dip', resetOn: '2026-01-01' }],
    );

    const dip = rows.find(r => r.machine === 'Seated Dip')!;
    expect(dip.points.map(p => p.weight)).toEqual([90, 110]);
    expect(dip.change, 'up 20, not down 30').toBe(20);
  });

  it('puts the lift you trained most recently first', () => {
    const rows = liftProgress([
      workout(1, '2025-01-01', 'Old Machine', [set(50)]),
      workout(2, '2026-07-21', 'Current Machine', [set(100)]),
    ]);

    expect(rows.map(r => r.machine)).toEqual(['Current Machine', 'Old Machine']);
  });

  it('collapses two workouts sharing a date into one point', () => {
    const [row] = liftProgress([
      workout(1, '2026-07-21', 'Seated Row', [set(100)]),
      workout(2, '2026-07-21', 'Seated Row', [set(120)]),
    ]);

    expect(row.sessions).toBe(1);
    expect(row.current).toBe(120);
  });
});

describe('describeProgress', () => {
  const of = (weights: number[], dates: string[]) =>
    liftProgress(weights.map((w, i) => workout(i, dates[i], 'Seated Row', [set(w)])))[0];

  it('says what it is on a first session, without inventing a trend', () => {
    expect(describeProgress(of([80], ['2026-07-21']))).toBe('80 lbs · first session');
  });

  it('leads with where you are now', () => {
    const text = describeProgress(of([80, 125], ['2025-07-22', '2026-07-21']));
    expect(text).toMatch(/^125 lbs/);
    expect(text).toContain('up 45');
    expect(text).toContain('Jul 2025');
  });

  it('is neutral when a number has gone down', () => {
    // Injuries and deloads are normal. This app has already been caught once
    // telling someone they were underperforming against a figure they never
    // set, and that must not happen here.
    const text = describeProgress(of([125, 100], ['2025-07-22', '2026-07-21']));
    expect(text).toContain('down 25');
    expect(text).not.toMatch(/lost|worse|fail|behind|regress/i);
  });

  it('does not pretend a flat year is progress', () => {
    expect(describeProgress(of([100, 100], ['2025-07-22', '2026-07-21']))).toContain('same as');
  });
});

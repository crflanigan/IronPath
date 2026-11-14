import { describe, expect, it } from 'vitest';
import type { Exercise, Workout } from '@shared/schema';
import {
  completedSetCount,
  newPersonalBests,
  previousOfSameType,
  recordSetIndex,
  workoutVolume,
} from './workout-summary';

const exercise = (machine: string, sets: [number, number, boolean][]): Exercise =>
  ({
    machine,
    equipment: 'machine',
    region: 'Chest',
    feel: 'Medium',
    completed: sets.every(s => s[2]),
    sets: sets.map(([weight, reps, completed]) => ({ weight, reps, rest: '1:00', completed })),
  }) as Exercise;

const workout = (id: number, date: string, type: string, exercises: Exercise[], completed = true) =>
  ({ id, date, type, exercises, abs: [], completed }) as unknown as Workout;

describe('the weight moved in a session', () => {
  it('sums weight x reps over completed sets only', () => {
    const w = workout(1, '2026-01-01', 'Chest', [
      exercise('Press', [[100, 10, true], [100, 8, true], [120, 5, false]]),
      exercise('Fly', [[50, 12, true]]),
    ]);
    expect(workoutVolume(w)).toBe(1000 + 800 + 600);
    expect(completedSetCount(w)).toBe(3);
  });
});

describe('which set is a personal best', () => {
  const best = { weight: 80, reps: 10 };

  it('is the heavier set', () => {
    expect(recordSetIndex(exercise('Press', [[75, 10, true], [85, 6, true]]), best)).toBe(1);
  });

  it('is more reps at the same weight', () => {
    expect(recordSetIndex(exercise('Press', [[80, 12, true]]), best)).toBe(0);
  });

  it('is claimed once, by the first set to reach it', () => {
    expect(
      recordSetIndex(exercise('Press', [[85, 10, true], [85, 10, true], [85, 10, true]]), best),
    ).toBe(0);
  });

  it('is not a set that has numbers but was never ticked', () => {
    expect(recordSetIndex(exercise('Press', [[200, 10, false]]), best)).toBe(-1);
  });

  it('is not merely matching the old best', () => {
    expect(recordSetIndex(exercise('Press', [[80, 10, true]]), best)).toBe(-1);
  });

  it('is never the first time an exercise is logged', () => {
    expect(recordSetIndex(exercise('Press', [[300, 10, true]]), undefined)).toBe(-1);
  });
});

describe('the personal bests in a finished workout', () => {
  it('lists each exercise that beat its previous best, with what it beat', () => {
    const bests = new Map([
      ['Press', { weight: 80, reps: 10, date: '2026-01-01' }],
      ['Fly', { weight: 50, reps: 12, date: '2026-01-01' }],
    ]);
    const w = workout(2, '2026-01-08', 'Chest', [
      exercise('Press', [[85, 10, true]]),
      exercise('Fly', [[50, 12, true]]),
      exercise('Dip', [[40, 10, true]]),
    ]);
    expect(newPersonalBests(w, bests)).toEqual([
      { machine: 'Press', weight: 85, reps: 10, previous: bests.get('Press') },
    ]);
  });
});

describe('the session to compare against', () => {
  it('is the most recent completed workout of the same type', () => {
    const current = workout(9, '2026-02-01', 'Legs', []);
    const list = [
      workout(1, '2026-01-01', 'Legs', []),
      workout(2, '2026-01-15', 'Legs', []),
      workout(3, '2026-01-20', 'Chest', []),
      workout(4, '2026-01-25', 'Legs', [], false),
      current,
    ];
    expect(previousOfSameType(list, current)?.id).toBe(2);
  });
});

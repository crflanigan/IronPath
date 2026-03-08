import { describe, it, expect } from 'vitest'
import { calculateTopDayStreak } from './streak'
import { Workout } from '@shared/schema'

let idCounter = 1

function createWorkout(date: string, completed: boolean): Workout {
  return {
    id: idCounter++,
    date,
    type: 'Chest Day',
    exercises: [],
    abs: [],
    cardio: undefined,
    completed,
    duration: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

describe('streak calculations', () => {
  it('treats same-day duplicate workouts as completed if any entry is completed', () => {
    const workouts = [
      createWorkout('2025-01-01', true),
      createWorkout('2025-01-01', false),
      createWorkout('2025-01-02', true),
      createWorkout('2025-01-03', true),
    ]

    expect(calculateTopDayStreak(workouts, [0, 1, 2, 3, 4, 5, 6])).toBe(3)
  })

  it('counts completed workouts on off-days toward top streak', () => {
    const workouts = [
      createWorkout('2025-01-06', true), // Monday
      createWorkout('2025-01-07', true), // Tuesday
      createWorkout('2025-01-08', true), // Wednesday
    ]

    expect(calculateTopDayStreak(workouts, [1, 3])).toBe(3)
  })
})

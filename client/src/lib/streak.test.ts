import { describe, it, expect } from 'vitest'
import { calculateTopDayStreak } from './streak'
import type { Workout } from '@shared/schema'

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

import { calculateDayStreak } from './streak'
import { formatLocalDate } from './utils'

describe('current streak', () => {
  const daysAgo = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return formatLocalDate(d)
  }
  const everyDay = [0, 1, 2, 3, 4, 5, 6]

  it('is not broken by today before today is over', () => {
    const workouts = [createWorkout(daysAgo(1), true), createWorkout(daysAgo(2), true)]
    expect(calculateDayStreak(workouts, everyDay)).toBe(2)
  })

  it('is still broken by a missed day that has ended', () => {
    const workouts = [createWorkout(daysAgo(2), true), createWorkout(daysAgo(3), true)]
    expect(calculateDayStreak(workouts, everyDay)).toBe(0)
  })

  it('counts today once it is done', () => {
    const workouts = [createWorkout(daysAgo(0), true), createWorkout(daysAgo(1), true)]
    expect(calculateDayStreak(workouts, everyDay)).toBe(2)
  })
})

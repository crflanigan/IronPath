import { beforeEach, describe, expect, it } from 'vitest'
import { LocalWorkoutStorage } from './storage'
import type { InsertWorkout } from '@shared/schema'

function makeWorkout(date: string): InsertWorkout {
  return {
    date,
    type: 'Chest Day',
    exercises: [
      {
        machine: 'Very Long Exercise Name To Increase Serialized Payload Size',
        equipment: 'machine',
        region: 'Chest',
        feel: 'Medium',
        sets: [
          { weight: 100, reps: 10, rest: '1:00', completed: true },
          { weight: 105, reps: 10, rest: '1:00', completed: true },
          { weight: 110, reps: 10, rest: '1:00', completed: true },
        ],
        completed: true,
      },
    ],
    abs: [{ name: 'Crunch', reps: 30, completed: true }],
    completed: true,
  }
}

describe('LocalWorkoutStorage cleanup behavior', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('retains recent workouts when trimming old data after quota pressure', async () => {
    const storage = new LocalWorkoutStorage() as LocalWorkoutStorage & {
      storageLimit: number
      warningThreshold: number
      getWorkouts: () => unknown[]
    }

    storage.storageLimit = 2000
    storage.warningThreshold = 0.8

    for (let day = 1; day <= 25; day++) {
      const date = `2025-01-${String(day).padStart(2, '0')}`
      await storage.createWorkout(makeWorkout(date))
    }

    const workouts = storage.getWorkouts()

    expect(workouts.length).toBeGreaterThan(0)
    expect(workouts.length).toBeLessThan(25)
  })


  it('rejects malformed import payloads instead of writing bad data', async () => {
    const storage = new LocalWorkoutStorage()

    await expect(
      storage.importData({
        workouts: [
          {
            id: 1,
            date: 'not-a-date',
            type: 'Chest Day',
            exercises: [],
            abs: [],
            completed: true,
          },
        ] as any,
        preferences: { darkMode: true } as any,
      })
    ).rejects.toThrow()
  })
})

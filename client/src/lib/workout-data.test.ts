import { describe, it, expect } from 'vitest'
import { generateWorkoutSchedule, defaultWorkoutCycle } from './workout-data'

describe('generateWorkoutSchedule', () => {
  it('assigns a workout for every day in February 2023', () => {
    const year = 2023
    const month = 2
    const schedule = generateWorkoutSchedule(year, month)

    const daysInMonth = new Date(year, month, 0).getDate()
    expect(schedule.length).toBe(daysInMonth)
    expect(schedule[0].date).toBe('2023-02-01')
    expect(schedule[schedule.length - 1].date).toBe('2023-02-28')

    const baseDay = Date.UTC(1970, 0, 1) / 86400000

    for (let i = 0; i < daysInMonth; i++) {
      const expectedIndex =
        Math.floor(Date.UTC(year, month - 1, i + 1) / 86400000) - baseDay
      expect(schedule[i].type).toBe(
        defaultWorkoutCycle[expectedIndex % defaultWorkoutCycle.length]
      )
    }
  })
})

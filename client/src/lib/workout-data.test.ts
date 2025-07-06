import { describe, it, expect } from 'vitest'
import { generateWorkoutSchedule } from './workout-data'

describe('generateWorkoutSchedule', () => {
  it('creates expected schedule for February 2023', () => {
    const year = 2023
    const month = 2
    const schedule = generateWorkoutSchedule(year, month)

    const daysInMonth = new Date(year, month, 0).getDate()
    let expected = 0
    for (let day = 1; day <= daysInMonth; day++) {
      if (day % 3 === 0 && day % 7 !== 0) continue
      expected++
    }

    expect(schedule.length).toBe(expected)
    expect(schedule[0].date).toBe('2023-02-01')
    expect(schedule[schedule.length - 1].date).toBe('2023-02-28')
  })
})

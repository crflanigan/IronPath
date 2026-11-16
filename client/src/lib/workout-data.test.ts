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

import { scheduleForDate, workoutTemplates } from './workout-data'

describe('scheduleForDate with rest days', () => {
  const cycle = ['A', 'B', 'C', 'D', 'E']
  const everyDay = [0, 1, 2, 3, 4, 5, 6]
  const weekdays = [1, 2, 3, 4, 5]

  it('is the calendar-day rotation when every day is a training day', () => {
    // The promise to everyone already using the app: nothing moves.
    const baseDay = Date.UTC(1970, 0, 1) / 86400000
    for (let day = 1; day <= 28; day++) {
      const index = Math.floor(Date.UTC(2026, 10, day) / 86400000) - baseDay
      const got = scheduleForDate(new Date(2026, 10, day), cycle, everyDay)
      expect(got).toEqual({ type: cycle[index % cycle.length], rest: false })
    }
  })

  it('marks the days off as rest and does not spend a workout on them', () => {
    // Friday 13 Nov 2026 through Tuesday 17 Nov 2026.
    const friday = scheduleForDate(new Date(2026, 10, 13), cycle, weekdays)
    const saturday = scheduleForDate(new Date(2026, 10, 14), cycle, weekdays)
    const sunday = scheduleForDate(new Date(2026, 10, 15), cycle, weekdays)
    const monday = scheduleForDate(new Date(2026, 10, 16), cycle, weekdays)

    expect(friday.rest).toBe(false)
    expect(saturday.rest).toBe(true)
    expect(sunday.rest).toBe(true)
    expect(monday.rest).toBe(false)

    // Monday gets the workout straight after Friday's: the weekend used none.
    expect(cycle.indexOf(monday.type)).toBe((cycle.indexOf(friday.type) + 1) % cycle.length)
    // And a rest day offers what the next training day would.
    expect(saturday.type).toBe(monday.type)
    expect(sunday.type).toBe(monday.type)
  })

  it('reaches every workout in the cycle, whatever the days', () => {
    // Indexing by calendar day on a 14-step cycle gave each weekday the same
    // two entries forever, so three days a week saw six of fourteen slots.
    const fourteen = Array.from({ length: 14 }, (_, i) => `W${i}`)
    const seen = new Set<string>()
    for (let i = 0; i < 60; i++) {
      const got = scheduleForDate(new Date(2026, 0, 1 + i), fourteen, [1, 3, 5])
      if (!got.rest) seen.add(got.type)
    }
    expect(seen.size).toBe(14)
  })
})

describe('built-in templates', () => {
  it('never list the same core move twice in one workout', () => {
    for (const [name, template] of Object.entries(workoutTemplates)) {
      const names = template!.abs.map(a => a.name)
      expect(new Set(names).size, name).toBe(names.length)
    }
  })
})

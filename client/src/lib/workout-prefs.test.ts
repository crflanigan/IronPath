import { describe, it, expect } from 'vitest'
import { formatSeconds, restSeconds } from './workout-prefs'

describe('rest time parsing', () => {
  it('reads minutes and seconds', () => {
    expect(restSeconds('1:30')).toBe(90)
    expect(restSeconds('0:45')).toBe(45)
    expect(restSeconds('10:00')).toBe(600)
  })

  it('falls back to a minute for anything unreadable or zero', () => {
    expect(restSeconds(undefined)).toBe(60)
    expect(restSeconds('')).toBe(60)
    expect(restSeconds('soon')).toBe(60)
    expect(restSeconds('0:00')).toBe(60)
  })

  it('formats a countdown, rounding up so it never shows 0:00 early', () => {
    expect(formatSeconds(90)).toBe('1:30')
    expect(formatSeconds(59.2)).toBe('1:00')
    expect(formatSeconds(0.4)).toBe('0:01')
    expect(formatSeconds(-3)).toBe('0:00')
  })
})

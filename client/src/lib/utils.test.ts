import { describe, it, expect } from 'vitest'
import { minutesFromDuration } from './utils'

describe('minutesFromDuration', () => {
  it('parses mm:ss strings', () => {
    expect(minutesFromDuration('20:00')).toBe(20)
    expect(minutesFromDuration('10:30')).toBeCloseTo(10.5)
  })

  it('parses minute-only strings', () => {
    expect(minutesFromDuration('25')).toBe(25)
  })

  it('returns undefined for invalid input', () => {
    expect(minutesFromDuration('abc')).toBeUndefined()
    expect(minutesFromDuration('')).toBeUndefined()
    expect(minutesFromDuration(undefined)).toBeUndefined()
  })
})

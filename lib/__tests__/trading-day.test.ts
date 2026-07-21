/**
 * Characterization tests for lib/trading-day.ts.
 * getTradingDay()/getCalendarDate() read new Date() (not injectable), so we
 * characterize getTradingDayForDate(date, ...), which takes an explicit Date
 * and shares the exact same before/after-start-time logic.
 */
import { getTradingDayForDate } from '../trading-day'

describe('getTradingDayForDate', () => {
  it('after tradingStartTime → same calendar day (UTC)', () => {
    // 2026-03-15 12:00 UTC, start 09:00 → same day
    const d = new Date('2026-03-15T12:00:00Z')
    expect(getTradingDayForDate(d, 'UTC', '09:00')).toBe('2026-03-15')
  })

  it('before tradingStartTime → previous calendar day (UTC)', () => {
    // 2026-03-15 06:00 UTC, start 09:00 → rolls back to 03-14
    const d = new Date('2026-03-15T06:00:00Z')
    expect(getTradingDayForDate(d, 'UTC', '09:00')).toBe('2026-03-14')
  })

  it('exactly at tradingStartTime → same day (boundary is not "before")', () => {
    const d = new Date('2026-03-15T09:00:00Z')
    expect(getTradingDayForDate(d, 'UTC', '09:00')).toBe('2026-03-15')
  })

  it('defaults (UTC, 09:00) apply when omitted', () => {
    const before = new Date('2026-03-15T06:00:00Z')
    const after = new Date('2026-03-15T10:00:00Z')
    expect(getTradingDayForDate(before)).toBe('2026-03-14')
    expect(getTradingDayForDate(after)).toBe('2026-03-15')
  })

  it('respects a non-UTC timezone for the local wall-clock comparison', () => {
    // 2026-03-15T02:00Z is 2026-03-14 21:00 in America/New_York (UTC-4 in DST).
    // Local time 21:00 >= 09:00 start → trading day is the local calendar day 03-14.
    const d = new Date('2026-03-15T02:00:00Z')
    expect(getTradingDayForDate(d, 'America/New_York', '09:00')).toBe('2026-03-14')
  })

  it('non-UTC before local start rolls back one local day', () => {
    // 2026-03-15T12:00Z is 2026-03-15 08:00 in America/New_York; 08:00 < 09:00 → roll back to 03-14.
    const d = new Date('2026-03-15T12:00:00Z')
    expect(getTradingDayForDate(d, 'America/New_York', '09:00')).toBe('2026-03-14')
  })
})

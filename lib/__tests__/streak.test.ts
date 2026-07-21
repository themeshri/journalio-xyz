/**
 * Characterization tests for the shared streak algorithm
 * (lib/streaks.ts:computeStreakFromDates), extracted from the byte-for-byte
 * copies in app/api/dashboard/route.ts and lib/contexts/index.tsx.
 *
 * Uses todayOverride to make the current-streak deterministic.
 */
import { computeStreakFromDates } from '../streaks'

// Helper: build a YYYY-MM-DD `days` before the given anchor (UTC).
function daysBefore(anchor: string, n: number): string {
  const d = new Date(anchor + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

const TODAY = '2026-03-15'

describe('computeStreakFromDates', () => {
  it('empty → 0/0', () => {
    expect(computeStreakFromDates([], TODAY)).toEqual({ current: 0, longest: 0 })
  })

  it('accepts full ISO timestamps (only date part used) and dedupes', () => {
    const r = computeStreakFromDates(
      [`${TODAY}T08:00:00.000Z`, `${TODAY}T20:00:00.000Z`],
      TODAY
    )
    expect(r.current).toBe(1)
    expect(r.longest).toBe(1)
  })

  it('current streak counts consecutive days back from today', () => {
    const dates = [TODAY, daysBefore(TODAY, 1), daysBefore(TODAY, 2)]
    const r = computeStreakFromDates(dates, TODAY)
    expect(r.current).toBe(3)
    expect(r.longest).toBe(3)
  })

  it('anchors on yesterday when today has no entry', () => {
    const dates = [daysBefore(TODAY, 1), daysBefore(TODAY, 2)]
    const r = computeStreakFromDates(dates, TODAY)
    expect(r.current).toBe(2)
  })

  it('current is 0 when most recent entry is older than yesterday', () => {
    const dates = [daysBefore(TODAY, 3), daysBefore(TODAY, 4)]
    const r = computeStreakFromDates(dates, TODAY)
    expect(r.current).toBe(0)
    // longest run of those two consecutive days is still 2
    expect(r.longest).toBe(2)
  })

  it('longest ignores gaps and reflects the best run', () => {
    // run of 3 (older), gap, run of 2 ending yesterday
    const dates = [
      daysBefore(TODAY, 10),
      daysBefore(TODAY, 9),
      daysBefore(TODAY, 8),
      daysBefore(TODAY, 2),
      daysBefore(TODAY, 1),
    ]
    const r = computeStreakFromDates(dates, TODAY)
    expect(r.current).toBe(2) // ends yesterday
    expect(r.longest).toBe(3) // the older 3-day run
  })

  it('longest is never less than current', () => {
    const dates = [TODAY, daysBefore(TODAY, 1)]
    const r = computeStreakFromDates(dates, TODAY)
    expect(r.longest).toBeGreaterThanOrEqual(r.current)
    expect(r.current).toBe(2)
    expect(r.longest).toBe(2)
  })

  it('single day today → 1/1', () => {
    expect(computeStreakFromDates([TODAY], TODAY)).toEqual({ current: 1, longest: 1 })
  })
})

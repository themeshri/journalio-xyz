/**
 * Tests for lib/analytics/rule-stats.ts — streak behaviour across gaps and
 * follow-rate with zero denominators.
 */
import {
  computeRuleStats,
  computeAllRuleStats,
  computeAverageActual,
  computePeriodScore,
  type AdherenceRecord,
} from '../analytics/rule-stats'

const rec = (over: Partial<AdherenceRecord>): AdherenceRecord => ({
  ruleId: 'r1',
  date: '2026-07-23',
  followed: true,
  actual: '',
  source: 'auto',
  ...over,
})

const TODAY = '2026-07-23'

describe('computeRuleStats — streak', () => {
  it('counts consecutive followed days back from today', () => {
    const records = [
      rec({ date: '2026-07-23' }),
      rec({ date: '2026-07-22' }),
      rec({ date: '2026-07-21' }),
    ]
    expect(computeRuleStats('r1', 'manual', records, TODAY).streak).toBe(3)
  })

  it('resets the streak across a gap', () => {
    const records = [
      rec({ date: '2026-07-23' }),
      // 07-22 missing
      rec({ date: '2026-07-21' }),
      rec({ date: '2026-07-20' }),
    ]
    const stats = computeRuleStats('r1', 'manual', records, TODAY)
    expect(stats.streak).toBe(1)
    expect(stats.longestStreak).toBe(2)
  })

  it('does not count days where the rule was broken', () => {
    const records = [
      rec({ date: '2026-07-23', followed: true }),
      rec({ date: '2026-07-22', followed: false }),
      rec({ date: '2026-07-21', followed: true }),
    ]
    expect(computeRuleStats('r1', 'manual', records, TODAY).streak).toBe(1)
  })

  it('keeps a streak alive when today has no record yet', () => {
    const records = [rec({ date: '2026-07-22' }), rec({ date: '2026-07-21' })]
    expect(computeRuleStats('r1', 'manual', records, TODAY).streak).toBe(2)
  })

  it('is 0 when the last followed day is older than yesterday', () => {
    const records = [rec({ date: '2026-07-20' })]
    expect(computeRuleStats('r1', 'manual', records, TODAY).streak).toBe(0)
  })

  it('ignores records belonging to other rules', () => {
    const records = [
      rec({ ruleId: 'r1', date: '2026-07-23' }),
      rec({ ruleId: 'r2', date: '2026-07-22' }),
    ]
    const stats = computeRuleStats('r1', 'manual', records, TODAY)
    expect(stats.daysEvaluated).toBe(1)
    expect(stats.streak).toBe(1)
  })
})

describe('computeRuleStats — follow rate', () => {
  it('is followed ÷ evaluated as a percentage', () => {
    const records = [
      rec({ date: '2026-07-23', followed: true }),
      rec({ date: '2026-07-22', followed: false }),
      rec({ date: '2026-07-21', followed: true }),
      rec({ date: '2026-07-20', followed: false }),
    ]
    const stats = computeRuleStats('r1', 'manual', records, TODAY)
    expect(stats.followRate).toBe(50)
    expect(stats.daysFollowed).toBe(2)
    expect(stats.daysEvaluated).toBe(4)
  })

  it('is 0 (not NaN) with no records', () => {
    const stats = computeRuleStats('r1', 'manual', [], TODAY)
    expect(stats.followRate).toBe(0)
    expect(stats.daysEvaluated).toBe(0)
    expect(Number.isNaN(stats.followRate)).toBe(false)
  })
})

describe('computeAverageActual', () => {
  it('averages times as minutes-since-midnight', () => {
    const records = [rec({ actual: '09:00' }), rec({ actual: '10:00' })]
    expect(computeAverageActual(records, 'time')).toBe('09:30')
  })

  it('averages times across an uneven split', () => {
    const records = [rec({ actual: '09:15' }), rec({ actual: '09:45' }), rec({ actual: '09:30' })]
    expect(computeAverageActual(records, 'time')).toBe('09:30')
  })

  it('averages currency and preserves the negative sign', () => {
    const records = [rec({ actual: '-$100.00' }), rec({ actual: '-$50.00' })]
    expect(computeAverageActual(records, 'currency')).toBe('-$75.00')
  })

  it('averages percentages', () => {
    const records = [rec({ actual: '100%' }), rec({ actual: '50%' })]
    expect(computeAverageActual(records, 'percentage')).toBe('75%')
  })

  it('averages counts to one decimal', () => {
    const records = [rec({ actual: '3' }), rec({ actual: '4' })]
    expect(computeAverageActual(records, 'count')).toBe('3.5')
  })

  it('returns empty for manual rules, which carry no observed value', () => {
    expect(computeAverageActual([rec({ actual: '' })], 'manual')).toBe('')
  })

  it('returns empty when there are no records', () => {
    expect(computeAverageActual([], 'time')).toBe('')
  })

  it('skips malformed values rather than producing NaN', () => {
    const records = [rec({ actual: 'oops' }), rec({ actual: '10:00' })]
    expect(computeAverageActual(records, 'time')).toBe('10:00')
  })
})

describe('computeAllRuleStats', () => {
  it('returns one entry per rule, in order', () => {
    const records = [rec({ ruleId: 'a' }), rec({ ruleId: 'b', followed: false })]
    const stats = computeAllRuleStats(
      [{ id: 'a', type: 'manual' }, { id: 'b', type: 'manual' }],
      records,
      TODAY
    )
    expect(stats.map((s) => s.ruleId)).toEqual(['a', 'b'])
    expect(stats[0].followRate).toBe(100)
    expect(stats[1].followRate).toBe(0)
  })
})

describe('computePeriodScore', () => {
  it('weights by rule-day across all rules', () => {
    const records = [
      rec({ ruleId: 'a', followed: true }),
      rec({ ruleId: 'b', followed: true }),
      rec({ ruleId: 'c', followed: false }),
      rec({ ruleId: 'd', followed: false }),
    ]
    expect(computePeriodScore(records)).toBe(50)
  })

  it('is 0 with no records', () => {
    expect(computePeriodScore([])).toBe(0)
  })
})

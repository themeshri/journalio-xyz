/**
 * Characterization tests for lib/time-filters.ts — capture CURRENT behavior.
 * presetToRange depends on Date.now(); assert structure/relationships rather
 * than absolute epoch values. filterTradesByRange is pure — assert fully.
 */
import { presetToRange, filterTradesByRange, type TimeRange } from '../time-filters'

describe('presetToRange', () => {
  it('all/custom → both null (no bounds)', () => {
    expect(presetToRange('all')).toEqual({ startDate: null, endDate: null })
    expect(presetToRange('custom')).toEqual({ startDate: null, endDate: null })
  })

  it('day presets → startDate set (endDate null), older presets start earlier', () => {
    const now = Math.floor(Date.now() / 1000)
    const r1 = presetToRange('1d')
    const r7 = presetToRange('7d')
    const r30 = presetToRange('30d')
    const r90 = presetToRange('90d')

    expect(r1.endDate).toBeNull()
    expect(r7.endDate).toBeNull()

    // startDate is now - days*86400 (allow a small clock delta between calls)
    expect(Math.abs(r1.startDate! - (now - 1 * 86400))).toBeLessThanOrEqual(2)
    expect(Math.abs(r7.startDate! - (now - 7 * 86400))).toBeLessThanOrEqual(2)
    expect(Math.abs(r30.startDate! - (now - 30 * 86400))).toBeLessThanOrEqual(2)
    expect(Math.abs(r90.startDate! - (now - 90 * 86400))).toBeLessThanOrEqual(2)

    // ordering: longer window starts earlier
    expect(r90.startDate!).toBeLessThan(r30.startDate!)
    expect(r30.startDate!).toBeLessThan(r7.startDate!)
    expect(r7.startDate!).toBeLessThan(r1.startDate!)
  })
})

describe('filterTradesByRange', () => {
  const trades = [
    { startDate: 100 },
    { startDate: 200 },
    { startDate: 300 },
    { startDate: 400 },
  ]

  it('returns all when range has no bounds', () => {
    expect(filterTradesByRange(trades, { startDate: null, endDate: null })).toEqual(trades)
  })

  it('startDate bound is inclusive (>= start kept)', () => {
    const r: TimeRange = { startDate: 200, endDate: null }
    expect(filterTradesByRange(trades, r).map((t) => t.startDate)).toEqual([200, 300, 400])
  })

  it('endDate bound is inclusive (<= end kept)', () => {
    const r: TimeRange = { startDate: null, endDate: 300 }
    expect(filterTradesByRange(trades, r).map((t) => t.startDate)).toEqual([100, 200, 300])
  })

  it('both bounds keep the inclusive window', () => {
    const r: TimeRange = { startDate: 200, endDate: 300 }
    expect(filterTradesByRange(trades, r).map((t) => t.startDate)).toEqual([200, 300])
  })

  it('startDate=0 is falsy → treated as no lower bound (documents current behavior)', () => {
    // NOTE: `if (range.startDate && ...)` means a 0 bound is ignored. Captured, not endorsed.
    const r: TimeRange = { startDate: 0, endDate: 200 }
    expect(filterTradesByRange(trades, r).map((t) => t.startDate)).toEqual([100, 200])
  })
})

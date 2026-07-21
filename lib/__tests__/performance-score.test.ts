/**
 * Tests for the composite performance score (R7). Pins the component scoring
 * and the <5-trade null guard so future tweaks are intentional.
 */
import { computePerformanceScore } from '../performance-score'
import type { FlattenedTrade } from '../tradeCycles'

// Minimal fixture: performance score only reads profitLoss, isComplete, dates.
const t = (profitLoss: number, i = 0): FlattenedTrade =>
  ({ profitLoss, isComplete: true, startDate: i, endDate: i } as FlattenedTrade)

describe('computePerformanceScore', () => {
  it('returns null score below 5 completed trades', () => {
    const r = computePerformanceScore([t(10), t(-5), t(3)])
    expect(r.score).toBeNull()
  })

  it('ignores incomplete trades when counting', () => {
    const incomplete = { profitLoss: 100, isComplete: false, startDate: 0, endDate: 0 } as FlattenedTrade
    const r = computePerformanceScore([t(1), t(2), t(3), incomplete])
    expect(r.score).toBeNull() // only 3 complete
  })

  it('all-winning book scores high (100)', () => {
    const trades = [t(10, 0), t(10, 1), t(10, 2), t(10, 3), t(10, 4)]
    const r = computePerformanceScore(trades)
    // 100% win rate, no losses (pf→3 capped high), zero drawdown → all components maxed
    expect(r.score).toBe(100)
    expect(r.components.winRate).toBe(100)
    expect(r.components.drawdown).toBe(100)
  })

  it('all-losing book scores low (0)', () => {
    const trades = [t(-10, 0), t(-10, 1), t(-10, 2), t(-10, 3), t(-10, 4)]
    const r = computePerformanceScore(trades)
    // 0% win rate, pf 0, drawdown never recovers from a 0 peak → 0
    expect(r.score).toBe(0)
  })

  it('score stays within 0–100 for a mixed book', () => {
    const trades = [t(20, 0), t(-10, 1), t(15, 2), t(-25, 3), t(5, 4), t(-8, 5)]
    const r = computePerformanceScore(trades)
    expect(r.score).not.toBeNull()
    expect(r.score!).toBeGreaterThanOrEqual(0)
    expect(r.score!).toBeLessThanOrEqual(100)
    for (const c of Object.values(r.components)) {
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(100)
    }
  })
})

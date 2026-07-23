/**
 * Tests for lib/analytics/drawdown.ts — flat, monotonic, and recovering
 * equity curves.
 */
import { computeDrawdown } from '../analytics/drawdown'
import type { FlattenedTrade } from '../tradeCycles'

/** Cycles close one day apart so date keys are distinct and ordered. */
function trade(profitLoss: number, dayOffset: number): FlattenedTrade {
  const base = Math.floor(Date.UTC(2026, 6, 1, 12) / 1000)
  return {
    profitLoss,
    isComplete: true,
    startDate: base + dayOffset * 86400,
    endDate: base + dayOffset * 86400,
  } as FlattenedTrade
}

describe('computeDrawdown — empty and degenerate', () => {
  it('returns the initial balance untouched with no trades', () => {
    const r = computeDrawdown([], 1000)
    expect(r.points).toEqual([])
    expect(r.startingBalance).toBe(1000)
    expect(r.endingBalance).toBe(1000)
    expect(r.maxDrawdownPct).toBe(0)
    expect(r.maxDrawdownDate).toBeNull()
  })

  it('ignores open cycles', () => {
    const open = { ...trade(-500, 0), isComplete: false } as FlattenedTrade
    expect(computeDrawdown([open], 1000).points).toEqual([])
  })
})

describe('computeDrawdown — flat curve', () => {
  it('reports zero drawdown when every trade is breakeven', () => {
    const r = computeDrawdown([trade(0, 0), trade(0, 1), trade(0, 2)], 1000)
    expect(r.endingBalance).toBe(1000)
    expect(r.maxDrawdownPct).toBe(0)
    expect(r.points.every((p) => p.drawdownPct === 0)).toBe(true)
  })
})

describe('computeDrawdown — monotonic up', () => {
  it('never goes into drawdown on a rising curve', () => {
    const r = computeDrawdown([trade(100, 0), trade(100, 1), trade(100, 2)], 1000)
    expect(r.endingBalance).toBe(1300)
    expect(r.peakBalance).toBe(1300)
    expect(r.maxDrawdownPct).toBe(0)
    expect(r.points.map((p) => p.balance)).toEqual([1100, 1200, 1300])
  })
})

describe('computeDrawdown — monotonic down', () => {
  it('tracks a deepening drawdown from the starting balance', () => {
    const r = computeDrawdown([trade(-100, 0), trade(-100, 1)], 1000)
    expect(r.endingBalance).toBe(800)
    expect(r.peakBalance).toBe(1000)
    // 200 below a 1000 peak.
    expect(r.maxDrawdownPct).toBe(20)
    expect(r.maxDrawdownUSD).toBe(200)
  })
})

describe('computeDrawdown — recovering curve', () => {
  it('measures drawdown from the running peak, not the start', () => {
    // 1000 -> 2000 (peak) -> 1500 (25% below peak) -> 2200 (new high)
    const r = computeDrawdown([trade(1000, 0), trade(-500, 1), trade(700, 2)], 1000)
    expect(r.peakBalance).toBe(2200)
    expect(r.endingBalance).toBe(2200)
    expect(r.maxDrawdownPct).toBe(25)
    expect(r.maxDrawdownUSD).toBe(500)
  })

  it('resets drawdown to zero at a new high', () => {
    const r = computeDrawdown([trade(1000, 0), trade(-500, 1), trade(700, 2)], 1000)
    expect(r.points[1].drawdownPct).toBe(25)
    expect(r.points[2].drawdownPct).toBe(0)
  })

  it('records the date of the worst drawdown', () => {
    const r = computeDrawdown([trade(1000, 0), trade(-500, 1), trade(700, 2)], 1000)
    expect(r.maxDrawdownDate).toBe('2026-07-02')
  })
})

describe('computeDrawdown — ordering and guards', () => {
  it('sorts by close time regardless of input order', () => {
    const r = computeDrawdown([trade(100, 2), trade(-50, 0), trade(25, 1)], 1000)
    expect(r.points.map((p) => p.balance)).toEqual([950, 975, 1075])
  })

  it('does not divide by zero when the account is wiped past zero', () => {
    const r = computeDrawdown([trade(-2000, 0)], 1000)
    expect(Number.isFinite(r.maxDrawdownPct)).toBe(true)
    expect(r.endingBalance).toBe(-1000)
  })
})

/**
 * Characterization tests for lib/analytics/helpers.ts:computeStats.
 *
 * CRITICAL: this pins the CURRENT zero-loss profit-factor sentinel of 999.99
 * (helpers.ts). A separate inline reimplementation in KPICards/analytics uses
 * Infinity — that divergence is deliberately NOT reconciled here (see plan).
 * If a future refactor changes computeStats' output, THIS test must fail.
 */
import { computeStats } from '../analytics/helpers'
import type { FlattenedTrade } from '../tradeCycles'

// computeStats only reads `.profitLoss`; build minimal fixtures.
const t = (profitLoss: number): FlattenedTrade => ({ profitLoss } as FlattenedTrade)

describe('computeStats', () => {
  it('empty input → all zeros', () => {
    expect(computeStats([])).toEqual({
      totalTrades: 0,
      totalPnL: 0,
      winRate: 0,
      profitFactor: 0,
      avgPnL: 0,
    })
  })

  it('mixed wins/losses → rounded stats', () => {
    // wins: +100, +50 (gross 150); losses: -75 (gross 75) → PF 2
    const s = computeStats([t(100), t(50), t(-75)])
    expect(s.totalTrades).toBe(3)
    expect(s.totalPnL).toBe(75) // 100+50-75
    expect(s.winRate).toBe(67) // round(2/3*100)=67
    expect(s.profitFactor).toBe(2) // 150/75
    expect(s.avgPnL).toBe(25) // round(75/3*100)/100
  })

  it('ZERO-LOSS with profit → profitFactor sentinel is 999.99 (NOT Infinity)', () => {
    const s = computeStats([t(100), t(50)])
    expect(s.profitFactor).toBe(999.99)
    expect(s.winRate).toBe(100)
    expect(s.totalPnL).toBe(150)
  })

  it('all break-even (no wins, no losses) → profitFactor 0', () => {
    const s = computeStats([t(0), t(0)])
    expect(s.profitFactor).toBe(0)
    expect(s.winRate).toBe(0)
    expect(s.totalPnL).toBe(0)
    expect(s.avgPnL).toBe(0)
  })

  it('all losses → profitFactor 0 (grossProfit 0, grossLoss > 0)', () => {
    const s = computeStats([t(-30), t(-20)])
    expect(s.profitFactor).toBe(0)
    expect(s.winRate).toBe(0)
    expect(s.totalPnL).toBe(-50)
  })

  it('rounds to 2 decimals for totalPnL/avgPnL/profitFactor', () => {
    // wins 10.005 → grossProfit; loss -3.331 → checks rounding paths
    const s = computeStats([t(10.005), t(-3.331)])
    // totalPnL = 6.674 → round(*100)/100 = 6.67
    expect(s.totalPnL).toBe(6.67)
    // profitFactor = 10.005/3.331 = 3.0036... → 3
    expect(s.profitFactor).toBe(3)
    // avgPnL = 6.674/2 = 3.337 → 3.34
    expect(s.avgPnL).toBe(3.34)
  })
})

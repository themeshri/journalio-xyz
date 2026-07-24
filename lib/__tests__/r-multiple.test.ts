/**
 * Tests for lib/analytics/r-multiple.ts — null stopLoss and the
 * divide-by-zero guard when risk is non-positive.
 */
import {
  computeRMultiple,
  computeAvgEntryPrice,
  computeAvgRMultiple,
  computeRMultipleDistribution,
} from '../analytics/r-multiple'
import type { FlattenedTrade } from '../tradeCycles'
import type { JournalData } from '@/lib/types/journal'

/** A cycle that bought 1000 tokens for $1000 (avg entry $1.00). */
function trade(over: Partial<FlattenedTrade> = {}): FlattenedTrade {
  return {
    tokenMint: 'mint1',
    tradeNumber: 1,
    walletAddress: 'w1',
    totalBuyAmount: 1000,
    totalBuyValue: 1000,
    profitLoss: 0,
    isComplete: true,
    startDate: 0,
    endDate: 100,
    ...over,
  } as FlattenedTrade
}

const j = (stopLoss: number | null): JournalData => ({ stopLoss } as JournalData)

describe('computeAvgEntryPrice', () => {
  it('is total buy value ÷ total buy amount', () => {
    expect(computeAvgEntryPrice(trade())).toBe(1)
  })

  it('is null when nothing was bought', () => {
    expect(computeAvgEntryPrice(trade({ totalBuyAmount: 0 }))).toBeNull()
  })
})

describe('computeRMultiple', () => {
  it('is +2R when profit is twice the risk', () => {
    // entry $1.00, stop $0.90 → risk $0.10/token * 1000 = $100 at risk.
    expect(computeRMultiple(trade({ profitLoss: 200 }), j(0.9))).toBe(2)
  })

  it('is -1R on a full stop-out', () => {
    expect(computeRMultiple(trade({ profitLoss: -100 }), j(0.9))).toBe(-1)
  })

  it('handles fractional R', () => {
    expect(computeRMultiple(trade({ profitLoss: 50 }), j(0.9))).toBe(0.5)
  })

  it('is null without a journal', () => {
    expect(computeRMultiple(trade({ profitLoss: 100 }), null)).toBeNull()
  })

  it('is null when no stop loss was journalled', () => {
    expect(computeRMultiple(trade({ profitLoss: 100 }), j(null))).toBeNull()
  })

  it('is null when the stop is AT the entry — zero risk, not 0R', () => {
    expect(computeRMultiple(trade({ profitLoss: 100 }), j(1.0))).toBeNull()
  })

  it('is null when the stop is ABOVE the entry (negative risk)', () => {
    expect(computeRMultiple(trade({ profitLoss: 100 }), j(1.5))).toBeNull()
  })

  it('is null for an open cycle', () => {
    expect(computeRMultiple(trade({ profitLoss: 100, isComplete: false }), j(0.9))).toBeNull()
  })

  it('is null when nothing was bought', () => {
    expect(computeRMultiple(trade({ totalBuyAmount: 0 }), j(0.9))).toBeNull()
  })

  it('never returns NaN or Infinity for any guarded input', () => {
    const cases = [j(1.0), j(1.5), j(null), j(NaN)]
    for (const journal of cases) {
      const r = computeRMultiple(trade({ profitLoss: 100 }), journal)
      expect(r === null || Number.isFinite(r)).toBe(true)
    }
  })
})

describe('computeAvgRMultiple', () => {
  const keyFor = (t: FlattenedTrade) => t.tokenMint

  it('averages only trades with a computable R', () => {
    const trades = [
      trade({ tokenMint: 'a', profitLoss: 200 }), // +2R
      trade({ tokenMint: 'b', profitLoss: -100 }), // -1R
      trade({ tokenMint: 'c', profitLoss: 999 }), // no stop → excluded
    ]
    const map = { a: j(0.9), b: j(0.9), c: j(null) }
    expect(computeAvgRMultiple(trades, map, keyFor)).toBe(0.5)
  })

  it('is null when no trade has a computable R', () => {
    expect(computeAvgRMultiple([trade()], { mint1: j(null) }, keyFor)).toBeNull()
  })

  it('is null for an empty trade list', () => {
    expect(computeAvgRMultiple([], {}, keyFor)).toBeNull()
  })
})

describe('computeRMultipleDistribution', () => {
  const keyFor = (t: FlattenedTrade) => t.tokenMint

  it('buckets trades by R and excludes uncomputable ones', () => {
    const trades = [
      trade({ tokenMint: 'a', profitLoss: 200 }), // +2R
      trade({ tokenMint: 'b', profitLoss: -100 }), // -1R
      trade({ tokenMint: 'c', profitLoss: 500 }), // no stop → excluded
    ]
    const map = { a: j(0.9), b: j(0.9), c: j(null) }
    const buckets = computeRMultipleDistribution(trades, map, keyFor)

    expect(buckets.reduce((n, b) => n + b.count, 0)).toBe(2)
    expect(buckets.find((b) => b.min === 2 && b.max === 3)?.count).toBe(1)
    expect(buckets.find((b) => b.min === -1 && b.max === 0)?.count).toBe(1)
  })

  it('always returns the full bucket set, even with no trades', () => {
    const buckets = computeRMultipleDistribution([], {}, keyFor)
    expect(buckets.length).toBeGreaterThan(0)
    expect(buckets.every((b) => b.count === 0)).toBe(true)
  })
})

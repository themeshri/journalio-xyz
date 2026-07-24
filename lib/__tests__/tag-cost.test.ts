/**
 * Tests for computeTagCost in lib/analytics/discipline.ts — the
 * "what is costing me money" aggregation.
 */
import { computeTagCost } from '../analytics/discipline'
import type { FlattenedTrade } from '../tradeCycles'
import type { JournalData } from '@/lib/types/journal'

function trade(over: Partial<FlattenedTrade> = {}): FlattenedTrade {
  return {
    tokenMint: 'mint1',
    tradeNumber: 1,
    walletAddress: 'w1',
    profitLoss: 0,
    isComplete: true,
    startDate: 0,
    endDate: 100,
    ...over,
  } as FlattenedTrade
}

/** journalMap is keyed by `${tokenMint}-${tradeNumber}-${walletAddress}`. */
function key(t: FlattenedTrade) {
  return `${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`
}

const TAGS = {
  t1: { label: 'Chased entry', kind: 'mistake' as const },
  t2: { label: 'Moved stop', kind: 'mistake' as const },
  t3: { label: 'Breakout', kind: 'custom' as const },
}

describe('computeTagCost', () => {
  it('aggregates P&L, occurrences and win rate per tag', () => {
    const a = trade({ tokenMint: 'a', profitLoss: -100 })
    const b = trade({ tokenMint: 'b', profitLoss: -50 })
    const c = trade({ tokenMint: 'c', profitLoss: 60 })

    const journalMap = {
      [key(a)]: { id: 'j1' } as JournalData & { id: string },
      [key(b)]: { id: 'j2' } as JournalData & { id: string },
      [key(c)]: { id: 'j3' } as JournalData & { id: string },
    }
    const tagsByJournalId = { j1: ['t1'], j2: ['t1'], j3: ['t1'] }

    const [result] = computeTagCost([a, b, c], journalMap, tagsByJournalId, TAGS)
    expect(result).toMatchObject({
      tagId: 't1',
      label: 'Chased entry',
      kind: 'mistake',
      occurrences: 3,
      totalPnL: -90,
      avgPnL: -30,
      winRate: 33,
    })
  })

  it('sorts costliest first', () => {
    const a = trade({ tokenMint: 'a', profitLoss: -500 })
    const b = trade({ tokenMint: 'b', profitLoss: -10 })
    const journalMap = {
      [key(a)]: { id: 'j1' } as JournalData & { id: string },
      [key(b)]: { id: 'j2' } as JournalData & { id: string },
    }
    const results = computeTagCost(
      [a, b],
      journalMap,
      { j1: ['t2'], j2: ['t1'] },
      TAGS
    )
    expect(results.map((r) => r.tagId)).toEqual(['t2', 't1'])
  })

  it('attributes one trade to each of its tags', () => {
    const a = trade({ tokenMint: 'a', profitLoss: -100 })
    const journalMap = { [key(a)]: { id: 'j1' } as JournalData & { id: string } }
    const results = computeTagCost([a], journalMap, { j1: ['t1', 't2'] }, TAGS)
    expect(results).toHaveLength(2)
    expect(results.every((r) => r.totalPnL === -100)).toBe(true)
  })

  it('counts a duplicated tag link only once', () => {
    const a = trade({ tokenMint: 'a', profitLoss: -100 })
    const journalMap = { [key(a)]: { id: 'j1' } as JournalData & { id: string } }
    const [result] = computeTagCost([a], journalMap, { j1: ['t1', 't1'] }, TAGS)
    expect(result.occurrences).toBe(1)
    expect(result.totalPnL).toBe(-100)
  })

  it('includes custom tags alongside mistakes, labelled by kind', () => {
    const a = trade({ tokenMint: 'a', profitLoss: 200 })
    const journalMap = { [key(a)]: { id: 'j1' } as JournalData & { id: string } }
    const [result] = computeTagCost([a], journalMap, { j1: ['t3'] }, TAGS)
    expect(result.kind).toBe('custom')
    expect(result.winRate).toBe(100)
  })

  it('skips open cycles', () => {
    const a = trade({ tokenMint: 'a', profitLoss: -100, isComplete: false })
    const journalMap = { [key(a)]: { id: 'j1' } as JournalData & { id: string } }
    expect(computeTagCost([a], journalMap, { j1: ['t1'] }, TAGS)).toEqual([])
  })

  it('skips trades with no journal, and journals with no tags', () => {
    const a = trade({ tokenMint: 'a', profitLoss: -100 })
    const b = trade({ tokenMint: 'b', profitLoss: -100 })
    const journalMap = { [key(b)]: { id: 'j2' } as JournalData & { id: string } }
    expect(computeTagCost([a, b], journalMap, { j2: [] }, TAGS)).toEqual([])
  })

  it('ignores tag ids that no longer exist', () => {
    const a = trade({ tokenMint: 'a', profitLoss: -100 })
    const journalMap = { [key(a)]: { id: 'j1' } as JournalData & { id: string } }
    expect(computeTagCost([a], journalMap, { j1: ['deleted'] }, TAGS)).toEqual([])
  })

  it('returns an empty list for no trades', () => {
    expect(computeTagCost([], {}, {}, TAGS)).toEqual([])
  })
})

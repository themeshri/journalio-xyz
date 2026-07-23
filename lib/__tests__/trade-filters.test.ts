/**
 * Tests for lib/trade-filters.ts.
 *
 * The `applyDateFilter parity` block is a characterization suite: it pins the
 * EXACT behaviour of the original hand-rolled date filter in resolve-trades.ts,
 * which now delegates here. The six /api/analytics/* routes depend on it.
 */
import {
  parseTradeFilters,
  applyTradeFilters,
  isEmptyFilterSet,
} from '../trade-filters'
import { applyDateFilter } from '../server/resolve-trades'
import type { FlattenedTrade } from '../tradeCycles'
import type { JournalData } from '@/lib/types/journal'

function trade(over: Partial<FlattenedTrade> = {}): FlattenedTrade {
  return {
    token: 'BONK',
    tokenMint: 'mint1',
    tradeNumber: 1,
    walletAddress: 'w1',
    profitLoss: 0,
    isComplete: true,
    startDate: 1000,
    endDate: 2000,
    ...over,
  } as FlattenedTrade
}

/** Partial journal — only the fields the filters read. */
function journal(
  over: Partial<JournalData> & { id: string }
): JournalData & { id: string } {
  return over as JournalData & { id: string }
}

const sp = (q: string) => new URLSearchParams(q)

describe('applyDateFilter parity', () => {
  const trades = [
    trade({ tokenMint: 'a', startDate: 100 }),
    trade({ tokenMint: 'b', startDate: 200 }),
    trade({ tokenMint: 'c', startDate: 300 }),
  ]

  it('returns the input untouched when neither bound is set', () => {
    expect(applyDateFilter(trades, sp(''))).toBe(trades)
  })

  it('filters on startDate inclusively', () => {
    const r = applyDateFilter(trades, sp('startDate=200'))
    expect(r.map((t) => t.tokenMint)).toEqual(['b', 'c'])
  })

  it('filters on endDate inclusively', () => {
    const r = applyDateFilter(trades, sp('endDate=200'))
    expect(r.map((t) => t.tokenMint)).toEqual(['a', 'b'])
  })

  it('applies both bounds together', () => {
    expect(applyDateFilter(trades, sp('startDate=200&endDate=200')).map((t) => t.tokenMint)).toEqual(['b'])
  })

  it('compares against cycle OPEN (startDate), not close', () => {
    const t = [trade({ tokenMint: 'x', startDate: 100, endDate: 999 })]
    expect(applyDateFilter(t, sp('endDate=500'))).toHaveLength(1)
  })

  it('ignores other filter keys present in the URL', () => {
    // The analytics routes pass the whole query string; only dates may apply.
    const r = applyDateFilter(trades, sp('outcome=win&lastN=1&search=zzz'))
    expect(r).toHaveLength(3)
  })
})

describe('parseTradeFilters', () => {
  it('parses the full vocabulary', () => {
    const f = parseTradeFilters(
      sp('startDate=1&endDate=2&outcome=win&month=3&day=5&search=bonk&minPl=-10&maxPl=10&lastN=20')
    )
    expect(f).toMatchObject({
      startDate: 1, endDate: 2, outcome: 'win', month: 3,
      dayOfWeek: 5, search: 'bonk', minPl: -10, maxPl: 10, lastN: 20,
    })
  })

  it('drops out-of-range month and day', () => {
    const f = parseTradeFilters(sp('month=12&day=9'))
    expect(f.month).toBeUndefined()
    expect(f.dayOfWeek).toBeUndefined()
  })

  it('keeps month=0 (January) and day=0 (Sunday)', () => {
    const f = parseTradeFilters(sp('month=0&day=0'))
    expect(f.month).toBe(0)
    expect(f.dayOfWeek).toBe(0)
  })

  it('drops an unrecognised outcome', () => {
    expect(parseTradeFilters(sp('outcome=maybe')).outcome).toBeUndefined()
  })

  it('drops non-numeric numeric fields', () => {
    expect(parseTradeFilters(sp('minPl=abc')).minPl).toBeUndefined()
  })

  it('reads a prefixed namespace for the Compare view', () => {
    const q = sp('a.outcome=win&b.outcome=loss')
    expect(parseTradeFilters(q, 'a.').outcome).toBe('win')
    expect(parseTradeFilters(q, 'b.').outcome).toBe('loss')
  })

  it('parses a comma-separated tag list', () => {
    expect(parseTradeFilters(sp('tags=t1,t2')).tagIds).toEqual(['t1', 't2'])
  })

  it('parses reviewed as a tri-state', () => {
    expect(parseTradeFilters(sp('reviewed=true')).reviewed).toBe(true)
    expect(parseTradeFilters(sp('reviewed=false')).reviewed).toBe(false)
    expect(parseTradeFilters(sp('')).reviewed).toBeUndefined()
  })
})

describe('isEmptyFilterSet', () => {
  it('is true for an all-undefined set', () => {
    expect(isEmptyFilterSet(parseTradeFilters(sp('')))).toBe(true)
  })

  it('is false once any key is set', () => {
    expect(isEmptyFilterSet(parseTradeFilters(sp('outcome=win')))).toBe(false)
  })
})

describe('applyTradeFilters — outcome', () => {
  const trades = [
    trade({ tokenMint: 'w', profitLoss: 100 }),
    trade({ tokenMint: 'l', profitLoss: -100 }),
    trade({ tokenMint: 'b', profitLoss: 0 }),
  ]

  it('keeps only winners', () => {
    expect(applyTradeFilters(trades, { outcome: 'win' }).map((t) => t.tokenMint)).toEqual(['w'])
  })

  it('keeps only losers', () => {
    expect(applyTradeFilters(trades, { outcome: 'loss' }).map((t) => t.tokenMint)).toEqual(['l'])
  })

  it('keeps only breakeven', () => {
    expect(applyTradeFilters(trades, { outcome: 'breakeven' }).map((t) => t.tokenMint)).toEqual(['b'])
  })

  it('excludes open cycles, which have no settled outcome', () => {
    const open = [trade({ tokenMint: 'o', profitLoss: 50, isComplete: false })]
    expect(applyTradeFilters(open, { outcome: 'win' })).toEqual([])
  })
})

describe('applyTradeFilters — search and P&L range', () => {
  it('matches token symbol case-insensitively', () => {
    const trades = [trade({ token: 'BONK' }), trade({ token: 'WIF', tokenMint: 'm2' })]
    expect(applyTradeFilters(trades, { search: 'bon' })).toHaveLength(1)
  })

  it('matches the mint address too', () => {
    const trades = [trade({ token: 'BONK', tokenMint: 'AbCdEf' })]
    expect(applyTradeFilters(trades, { search: 'cdE' })).toHaveLength(1)
  })

  it('applies min and max P&L inclusively', () => {
    const trades = [
      trade({ tokenMint: 'a', profitLoss: -50 }),
      trade({ tokenMint: 'b', profitLoss: 0 }),
      trade({ tokenMint: 'c', profitLoss: 50 }),
    ]
    expect(applyTradeFilters(trades, { minPl: -50, maxPl: 0 }).map((t) => t.tokenMint)).toEqual(['a', 'b'])
  })
})

describe('applyTradeFilters — lastN', () => {
  it('takes the N most recent by close time', () => {
    const trades = [
      trade({ tokenMint: 'old', endDate: 100 }),
      trade({ tokenMint: 'new', endDate: 300 }),
      trade({ tokenMint: 'mid', endDate: 200 }),
    ]
    expect(applyTradeFilters(trades, { lastN: 2 }).map((t) => t.tokenMint)).toEqual(['new', 'mid'])
  })

  it('applies AFTER other filters — "last 1 loser", not "loser among last 1"', () => {
    const trades = [
      trade({ tokenMint: 'winNew', profitLoss: 100, endDate: 300 }),
      trade({ tokenMint: 'lossOld', profitLoss: -100, endDate: 100 }),
    ]
    const r = applyTradeFilters(trades, { outcome: 'loss', lastN: 1 })
    expect(r.map((t) => t.tokenMint)).toEqual(['lossOld'])
  })

  it('does not mutate the input array order', () => {
    const trades = [trade({ tokenMint: 'a', endDate: 100 }), trade({ tokenMint: 'b', endDate: 300 })]
    applyTradeFilters(trades, { lastN: 1 })
    expect(trades.map((t) => t.tokenMint)).toEqual(['a', 'b'])
  })
})

describe('applyTradeFilters — journal dimensions', () => {
  const t1 = trade({ tokenMint: 'a' })
  const t2 = trade({ tokenMint: 'b' })
  const keyFor = (t: FlattenedTrade) => t.tokenMint
  const ctx = {
    keyFor,
    journalMap: {
      a: journal({ id: 'j1', strategyId: 's1', tradeRating: 5, reviewed: true }),
      b: journal({ id: 'j2', strategyId: 's2', tradeRating: 2, reviewed: false }),
    },
    tagsByJournalId: { j1: ['t1'], j2: ['t2'] },
  }

  it('filters by strategy', () => {
    expect(applyTradeFilters([t1, t2], { strategyId: 's1' }, ctx).map((t) => t.tokenMint)).toEqual(['a'])
  })

  it('filters by minimum rating', () => {
    expect(applyTradeFilters([t1, t2], { minRating: 4 }, ctx).map((t) => t.tokenMint)).toEqual(['a'])
  })

  it('filters by reviewed state', () => {
    expect(applyTradeFilters([t1, t2], { reviewed: false }, ctx).map((t) => t.tokenMint)).toEqual(['b'])
  })

  it('uses OR semantics across selected tags', () => {
    const r = applyTradeFilters([t1, t2], { tagIds: ['t1', 't2'] }, ctx)
    expect(r).toHaveLength(2)
  })

  it('excludes trades with no journal rather than keeping them', () => {
    // An unanswerable filter must not widen the cohort.
    const orphan = trade({ tokenMint: 'zzz' })
    expect(applyTradeFilters([orphan], { strategyId: 's1' }, ctx)).toEqual([])
  })

  it('excludes everything when a journal filter is set but no context is given', () => {
    expect(applyTradeFilters([t1, t2], { strategyId: 's1' })).toEqual([])
  })

  it('leaves non-journal filters unaffected by a missing context', () => {
    expect(applyTradeFilters([t1, t2], { search: 'bonk' })).toHaveLength(2)
  })
})

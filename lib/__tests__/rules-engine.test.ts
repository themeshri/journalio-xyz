/**
 * Tests for lib/rules-engine.ts — one case per rule type, plus the timezone
 * boundaries that the `time` rule depends on.
 */
import {
  evaluateRule,
  evaluateRules,
  computeDayScore,
  DEFAULT_TYPED_RULES,
  type TypedRule,
  type DayContext,
} from '../rules-engine'
import type { FlattenedTrade } from '../tradeCycles'
import type { JournalData } from '@/lib/types/journal'

/** Minimal FlattenedTrade — only the fields the engine reads. */
function trade(over: Partial<FlattenedTrade> = {}): FlattenedTrade {
  return {
    startDate: 0,
    endDate: 0,
    profitLoss: 0,
    isComplete: true,
    ...over,
  } as FlattenedTrade
}

const rule = (over: Partial<TypedRule>): TypedRule => ({
  id: 'r1',
  text: 'rule',
  type: 'manual',
  condition: '',
  isActive: true,
  sortOrder: 0,
  ...over,
})

const ctx = (over: Partial<DayContext> = {}): DayContext => ({
  date: '2026-07-23',
  trades: [],
  journals: [],
  timezone: 'UTC',
  ...over,
})

/** 2026-07-23 at HH:mm UTC, as a unix-seconds timestamp. */
function tsAt(hh: number, mm: number): number {
  return Math.floor(Date.UTC(2026, 6, 23, hh, mm) / 1000)
}

describe('time rules', () => {
  it('follows when the first trade is at or before the condition', () => {
    const r = evaluateRule(
      rule({ type: 'time', condition: '09:30' }),
      ctx({ trades: [trade({ startDate: tsAt(9, 26) })] })
    )
    expect(r).toMatchObject({ followed: true, actual: '09:26', evaluated: true, source: 'auto' })
  })

  it('breaks when the first trade is after the condition', () => {
    const r = evaluateRule(
      rule({ type: 'time', condition: '09:30' }),
      ctx({ trades: [trade({ startDate: tsAt(9, 45) })] })
    )
    expect(r).toMatchObject({ followed: false, actual: '09:45' })
  })

  it('uses the EARLIEST trade, not the first in array order', () => {
    const r = evaluateRule(
      rule({ type: 'time', condition: '09:30' }),
      ctx({ trades: [trade({ startDate: tsAt(11, 0) }), trade({ startDate: tsAt(9, 15) })] })
    )
    expect(r.actual).toBe('09:15')
    expect(r.followed).toBe(true)
  })

  it('is exactly-at-condition inclusive', () => {
    const r = evaluateRule(
      rule({ type: 'time', condition: '09:30' }),
      ctx({ trades: [trade({ startDate: tsAt(9, 30) })] })
    )
    expect(r.followed).toBe(true)
  })

  it('zero-pads a single-digit hour condition so string compare is correct', () => {
    // "9:30" would sort AFTER "10:00" as a raw string — must pad to "09:30".
    const r = evaluateRule(
      rule({ type: 'time', condition: '9:30' }),
      ctx({ trades: [trade({ startDate: tsAt(10, 0) })] })
    )
    expect(r.followed).toBe(false)
  })

  it('resolves the observed time in the user timezone, not UTC', () => {
    // 23:00 UTC is 08:00 next day in Asia/Tokyo (+09:00).
    const r = evaluateRule(
      rule({ type: 'time', condition: '09:30' }),
      ctx({ trades: [trade({ startDate: tsAt(23, 0) })], timezone: 'Asia/Tokyo' })
    )
    expect(r.actual).toBe('08:00')
    expect(r.followed).toBe(true)
  })

  it('is unevaluable with no trades', () => {
    const r = evaluateRule(rule({ type: 'time', condition: '09:30' }), ctx())
    expect(r.evaluated).toBe(false)
    expect(r.followed).toBe(false)
  })

  it('is unevaluable with a malformed condition', () => {
    const r = evaluateRule(
      rule({ type: 'time', condition: 'morning' }),
      ctx({ trades: [trade({ startDate: tsAt(9, 0) })] })
    )
    expect(r.evaluated).toBe(false)
  })
})

describe('currency rules', () => {
  it('follows when the worst loss is within the limit', () => {
    const r = evaluateRule(
      rule({ type: 'currency', condition: '100' }),
      ctx({ trades: [trade({ profitLoss: -50 }), trade({ profitLoss: 20 })] })
    )
    expect(r).toMatchObject({ followed: true, actual: '-$50.00' })
  })

  it('breaks when a single trade exceeds the limit', () => {
    const r = evaluateRule(
      rule({ type: 'currency', condition: '100' }),
      ctx({ trades: [trade({ profitLoss: -150 }), trade({ profitLoss: -10 })] })
    )
    expect(r).toMatchObject({ followed: false, actual: '-$150.00' })
  })

  it('passes trivially on an all-green day', () => {
    const r = evaluateRule(
      rule({ type: 'currency', condition: '100' }),
      ctx({ trades: [trade({ profitLoss: 40 })] })
    )
    expect(r).toMatchObject({ followed: true, actual: '$0.00' })
  })

  it('tolerates a "$100" condition', () => {
    const r = evaluateRule(
      rule({ type: 'currency', condition: '$100' }),
      ctx({ trades: [trade({ profitLoss: -50 })] })
    )
    expect(r.evaluated).toBe(true)
    expect(r.followed).toBe(true)
  })

  it('ignores incomplete cycles', () => {
    const r = evaluateRule(
      rule({ type: 'currency', condition: '100' }),
      ctx({ trades: [trade({ profitLoss: -500, isComplete: false })] })
    )
    expect(r.evaluated).toBe(false)
  })
})

describe('percentage rules', () => {
  it('follows at 100% strategy linkage', () => {
    const r = evaluateRule(
      rule({ type: 'percentage', condition: '100' }),
      ctx({
        trades: [trade(), trade()],
        journals: [{ strategyId: 'a' }, { strategyId: 'b' }] as JournalData[],
      })
    )
    expect(r).toMatchObject({ followed: true, actual: '100%' })
  })

  it('breaks at partial linkage', () => {
    const r = evaluateRule(
      rule({ type: 'percentage', condition: '100' }),
      ctx({
        trades: [trade(), trade()],
        journals: [{ strategyId: 'a' }, {}] as JournalData[],
      })
    )
    expect(r).toMatchObject({ followed: false, actual: '50%' })
  })

  it('is unevaluable with no completed trades', () => {
    expect(
      evaluateRule(rule({ type: 'percentage', condition: '100' }), ctx()).evaluated
    ).toBe(false)
  })
})

describe('count rules', () => {
  it('follows at or under the cap', () => {
    const r = evaluateRule(
      rule({ type: 'count', condition: '5' }),
      ctx({ trades: [trade(), trade(), trade()] })
    )
    expect(r).toMatchObject({ followed: true, actual: '3' })
  })

  it('is inclusive at exactly the cap', () => {
    const r = evaluateRule(
      rule({ type: 'count', condition: '2' }),
      ctx({ trades: [trade(), trade()] })
    )
    expect(r.followed).toBe(true)
  })

  it('breaks over the cap', () => {
    const r = evaluateRule(
      rule({ type: 'count', condition: '2' }),
      ctx({ trades: [trade(), trade(), trade()] })
    )
    expect(r).toMatchObject({ followed: false, actual: '3' })
  })
})

describe('manual rules', () => {
  it('follows when checked', () => {
    const r = evaluateRule(rule({ id: 'm' }), ctx({ manualChecks: { m: true } }))
    expect(r).toMatchObject({ followed: true, source: 'manual', evaluated: true })
  })

  it('breaks when explicitly unchecked', () => {
    const r = evaluateRule(rule({ id: 'm' }), ctx({ manualChecks: { m: false } }))
    expect(r).toMatchObject({ followed: false, evaluated: true })
  })

  it('is unevaluated when the user has not answered', () => {
    const r = evaluateRule(rule({ id: 'm' }), ctx())
    expect(r.evaluated).toBe(false)
  })
})

describe('evaluateRules', () => {
  it('skips inactive rules', () => {
    const results = evaluateRules(
      [rule({ id: 'a' }), rule({ id: 'b', isActive: false })],
      ctx({ manualChecks: { a: true, b: true } })
    )
    expect(results.map((r) => r.ruleId)).toEqual(['a'])
  })
})

describe('computeDayScore', () => {
  it('counts only evaluated rules in the denominator', () => {
    const results = evaluateRules(
      [
        rule({ id: 'a', type: 'count', condition: '5' }),
        rule({ id: 'b', type: 'time', condition: '09:30' }), // unevaluable: no ts
        rule({ id: 'c' }),
      ],
      ctx({ trades: [trade({ startDate: tsAt(9, 0) })], manualChecks: { c: false } })
    )
    // a: followed (1 trade <= 5). b: evaluated (has a trade). c: evaluated, not followed.
    const score = computeDayScore(results)
    expect(score.total).toBe(3)
    expect(score.followed).toBe(2) // a and b both pass
    expect(score.percentage).toBe(67)
  })

  it('is 0/0 → 0% rather than NaN', () => {
    expect(computeDayScore([])).toEqual({ followed: 0, total: 0, percentage: 0 })
  })
})

describe('DEFAULT_TYPED_RULES', () => {
  it('encodes the five-rule methodology from the analysis doc', () => {
    expect(DEFAULT_TYPED_RULES).toHaveLength(5)
    expect(DEFAULT_TYPED_RULES.map((r) => r.type)).toEqual([
      'time',
      'percentage',
      'manual',
      'currency',
      'count',
    ])
  })
})

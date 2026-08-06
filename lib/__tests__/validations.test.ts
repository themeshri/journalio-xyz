/**
 * @jest-environment node
 *
 * validations.ts transitively imports next/server (NextResponse), which needs
 * Web globals (Request/Response) that jsdom lacks. The node env provides them.
 *
 * Characterization tests for lib/validations.ts — representative subset.
 * Pins the validateBody wrapper contract + a few schema behaviors that later
 * refactors could accidentally alter (defaults, .transform trims, enums,
 * regex, the update-refinement).
 */
import {
  validateBody,
  createTradeCommentSchema,
  createStrategySchema,
  createRuleSchema,
  updatePaperedPlaySchema,
  updateSettingsSchema,
  createManualTradesSchema,
  createJournalSchema,
} from '../validations'

function ok<T>(r: { data: T } | { error: unknown }): T {
  if (!('data' in r)) throw new Error('expected success')
  return r.data
}

describe('validateBody wrapper', () => {
  it('returns { data } on success, applying schema defaults', () => {
    const r = validateBody(createRuleSchema, { text: 'hold the line' })
    // A rule with no declared type defaults to `manual` — a user-checked rule.
    expect(ok(r)).toEqual({
      text: 'hold the line',
      type: 'manual',
      condition: '',
      isActive: true,
    })
  })

  it('returns { error } (a 400 NextResponse) on failure', async () => {
    const r = validateBody(createRuleSchema, {})
    expect('error' in r).toBe(true)
    if ('error' in r) {
      const res = r.error as Response
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/^Validation error:/)
    }
  })
})

describe('createTradeCommentSchema', () => {
  it('trims label and accepts valid enums', () => {
    const d = ok(validateBody(createTradeCommentSchema, {
      label: '  Waited  ', category: 'entry', rating: 'positive',
    }))
    expect(d.label).toBe('Waited')
  })

  it('rejects an invalid rating enum', () => {
    const r = validateBody(createTradeCommentSchema, {
      label: 'x', category: 'entry', rating: 'great',
    })
    expect('error' in r).toBe(true)
  })

  it('rejects an invalid category enum', () => {
    const r = validateBody(createTradeCommentSchema, {
      label: 'x', category: 'scalp', rating: 'positive',
    })
    expect('error' in r).toBe(true)
  })
})

describe('createStrategySchema defaults + trim', () => {
  it('applies defaults for optional fields and trims name', () => {
    const d = ok(validateBody(createStrategySchema, { name: '  Breakout ' }))
    expect(d.name).toBe('Breakout')
    expect(d.description).toBe('')
    expect(d.color).toBe('#10b981')
    expect(d.icon).toBe('📋')
    expect(d.ruleGroups).toEqual([])
    expect(d.isArchived).toBe(false)
  })

  it('rejects empty name', () => {
    expect('error' in validateBody(createStrategySchema, { name: '' })).toBe(true)
  })
})

describe('updatePaperedPlaySchema refinement', () => {
  it('rejects an empty object (needs at least one field)', () => {
    expect('error' in validateBody(updatePaperedPlaySchema, {})).toBe(true)
  })

  it('accepts a single field', () => {
    const d = ok(validateBody(updatePaperedPlaySchema, { coinName: 'BONK' }))
    expect(d.coinName).toBe('BONK')
  })
})

describe('updateSettingsSchema', () => {
  it('accepts a valid HH:mm tradingStartTime', () => {
    const d = ok(validateBody(updateSettingsSchema, { tradingStartTime: '09:30' }))
    expect(d.tradingStartTime).toBe('09:30')
  })

  it('rejects a malformed tradingStartTime', () => {
    expect('error' in validateBody(updateSettingsSchema, { tradingStartTime: '9:30' })).toBe(true)
  })

  it('enforces transactionLimit bounds (1..1000)', () => {
    expect('error' in validateBody(updateSettingsSchema, { transactionLimit: 0 })).toBe(true)
    expect('error' in validateBody(updateSettingsSchema, { transactionLimit: 1001 })).toBe(true)
    expect(ok(validateBody(updateSettingsSchema, { transactionLimit: 500 })).transactionLimit).toBe(500)
  })

  it('allows onboardingStep to be null', () => {
    const d = ok(validateBody(updateSettingsSchema, { onboardingStep: null }))
    expect(d.onboardingStep).toBeNull()
  })
})

describe('createManualTradesSchema', () => {
  it('rejects an empty trades array', () => {
    expect('error' in validateBody(createManualTradesSchema, { trades: [] })).toBe(true)
  })

  it('applies per-trade defaults', () => {
    const d = ok(validateBody(createManualTradesSchema, {
      trades: [{ walletAddress: 'w', signature: 's', timestamp: 1 }],
    }))
    expect(d.trades[0].chain).toBe('solana')
    expect(d.trades[0].dex).toBe('Manual')
    expect(d.trades[0].amountIn).toBe(0)
  })
})

describe('createJournalSchema', () => {
  const base = { walletAddress: 'w', tokenMint: 't', tradeNumber: 0 }

  // Regression: buy/sell RatingScale renders 1-10 (its default max), so a
  // rating above 5 used to 400 and surface only "Failed to save journal entry".
  it.each([1, 5, 6, 10])('accepts buyRating/sellRating of %i', (n) => {
    const d = ok(validateBody(createJournalSchema, { ...base, buyRating: n, sellRating: n }))
    expect(d.buyRating).toBe(n)
    expect(d.sellRating).toBe(n)
  })

  it('rejects ratings past the 1-10 scale', () => {
    expect('error' in validateBody(createJournalSchema, { ...base, buyRating: 11 })).toBe(true)
    expect('error' in validateBody(createJournalSchema, { ...base, sellRating: 11 })).toBe(true)
    expect('error' in validateBody(createJournalSchema, { ...base, buyRating: -1 })).toBe(true)
  })

  // tradeRating is the separate 1-5 subjective grade and keeps its own bound.
  it('keeps tradeRating on a 1-5 scale', () => {
    expect(ok(validateBody(createJournalSchema, { ...base, tradeRating: 5 })).tradeRating).toBe(5)
    expect('error' in validateBody(createJournalSchema, { ...base, tradeRating: 6 })).toBe(true)
    expect('error' in validateBody(createJournalSchema, { ...base, tradeRating: 0 })).toBe(true)
    expect(ok(validateBody(createJournalSchema, { ...base, tradeRating: null })).tradeRating).toBeNull()
  })

  it('accepts the full modal payload with everything left at its default', () => {
    const d = ok(validateBody(createJournalSchema, {
      ...base,
      strategy: '', strategyId: '', ruleResults: [], emotionalState: '',
      buyNotes: '', buyRating: 0, exitPlan: '', sellRating: 0,
      followedExitRule: null, sellMistakes: [], sellNotes: '',
      entryCommentId: '', exitCommentId: '', managementCommentId: '',
      emotionTag: '', stopLoss: null, takeProfit: null, tagIds: [],
      tradeRating: null, reviewed: false, rMultiple: null,
      journaledAt: '2026-08-06T00:00:00.000Z',
    }))
    expect(d.buyRating).toBe(0)
    expect(d.stopLoss).toBeNull()
  })

  // NaN reaches the schema as a number-typed value that z.number() rejects.
  // JournalModal now maps unparseable input to null before it gets here.
  it('rejects NaN for stopLoss/takeProfit', () => {
    expect('error' in validateBody(createJournalSchema, { ...base, stopLoss: NaN })).toBe(true)
    expect('error' in validateBody(createJournalSchema, { ...base, takeProfit: NaN })).toBe(true)
  })

  it('still requires wallet, mint and a non-negative int tradeNumber', () => {
    expect('error' in validateBody(createJournalSchema, { ...base, walletAddress: '' })).toBe(true)
    expect('error' in validateBody(createJournalSchema, { ...base, tokenMint: '' })).toBe(true)
    expect('error' in validateBody(createJournalSchema, { ...base, tradeNumber: 1.5 })).toBe(true)
    expect('error' in validateBody(createJournalSchema, { ...base, tradeNumber: -1 })).toBe(true)
  })
})

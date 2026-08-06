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
  createPreSessionSchema,
  createPostSessionSchema,
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

  // ── Four-layer thesis scorecard ──
  it('accepts the thesis scorecard', () => {
    const d = ok(validateBody(createJournalSchema, {
      ...base,
      narrativeStage: 'early',
      narrativeThesis: 'first mover',
      fundTeam: 4, fundUsage: 3, fundTokenomics: 2,
      riskToZero: 'unlock cliff', riskSignal: 'watch the wallet',
      entryReason: 'research',
    }))
    expect(d.narrativeStage).toBe('early')
    expect(d.fundTeam).toBe(4)
    expect(d.entryReason).toBe('research')
  })

  it('rejects an unknown narrative stage or entry reason', () => {
    // Analytics groups on these, so an unconstrained typo would split a bucket.
    expect('error' in validateBody(createJournalSchema, { ...base, narrativeStage: 'peaking' })).toBe(true)
    expect('error' in validateBody(createJournalSchema, { ...base, entryReason: 'vibes' })).toBe(true)
  })

  it('treats empty string as "not answered" for the thesis enums', () => {
    const d = ok(validateBody(createJournalSchema, { ...base, narrativeStage: '', entryReason: '' }))
    expect(d.narrativeStage).toBe('')
    expect(d.entryReason).toBe('')
  })

  it('bounds the fundamentals ratings to 0-5', () => {
    expect('error' in validateBody(createJournalSchema, { ...base, fundTeam: 6 })).toBe(true)
    expect('error' in validateBody(createJournalSchema, { ...base, fundUsage: -1 })).toBe(true)
  })
})

describe('createPreSessionSchema — framework fields', () => {
  const base = { date: '2026-08-06' }

  it('defaults every framework field so old clients keep working', () => {
    const d = ok(validateBody(createPreSessionSchema, base))
    expect(d.narrativeStage).toBe('')
    expect(d.conviction).toBe(0)
    expect(d.watchlist).toEqual([])
    expect(d.sectors).toEqual([])
    expect(d.communities).toEqual([])
  })

  it('accepts a populated watchlist', () => {
    const d = ok(validateBody(createPreSessionSchema, {
      ...base,
      narrativeStage: 'discovery',
      conviction: 7,
      watchlist: [{ symbol: 'FOO', narrativeStage: 'early', thesis: 't', invalidation: 'i' }],
      sectors: ['DeFi'],
      communities: ['pump.fun'],
    }))
    expect(d.watchlist).toHaveLength(1)
    expect(d.watchlist[0].symbol).toBe('FOO')
    expect(d.sectors).toEqual(['DeFi'])
  })

  it('fills watchlist row defaults for a partial row', () => {
    const d = ok(validateBody(createPreSessionSchema, { ...base, watchlist: [{ symbol: 'BAR' }] }))
    expect(d.watchlist[0]).toEqual({
      symbol: 'BAR', narrativeStage: '', thesis: '', invalidation: '',
    })
  })

  it('rejects an invalid stage on the session or a watchlist row', () => {
    expect('error' in validateBody(createPreSessionSchema, { ...base, narrativeStage: 'hot' })).toBe(true)
    expect('error' in validateBody(createPreSessionSchema, {
      ...base, watchlist: [{ symbol: 'X', narrativeStage: 'hot' }],
    })).toBe(true)
  })

  it('bounds conviction to 0-10', () => {
    expect('error' in validateBody(createPreSessionSchema, { ...base, conviction: 11 })).toBe(true)
    expect('error' in validateBody(createPreSessionSchema, { ...base, conviction: -1 })).toBe(true)
  })

  // z.object is non-strict: a field the UI sends but the schema omits is
  // dropped silently rather than rejected. Pinned because that failure mode is
  // invisible — the save succeeds and the data just never lands.
  it('silently strips unknown keys rather than rejecting them', () => {
    const result = validateBody(createPreSessionSchema, { ...base, notAField: 'dropped' })
    expect('error' in result).toBe(false)
    expect(ok(result)).not.toHaveProperty('notAField')
  })
})

describe('createPostSessionSchema — plan vs outcome', () => {
  const base = { date: '2026-08-06' }

  it('defaults the adherence fields', () => {
    const d = ok(validateBody(createPostSessionSchema, base))
    expect(d.followedPlan).toBeUndefined()
    expect(d.fomoEntries).toBe(0)
    expect(d.limitsBreached).toEqual([])
    expect(d.processRating).toBe(0)
  })

  it('accepts a full plan-vs-outcome payload', () => {
    const d = ok(validateBody(createPostSessionSchema, {
      ...base,
      followedPlan: false,
      planDeviations: 'took a 4th trade',
      fomoEntries: 2,
      narrativeCallCorrect: true,
      limitsBreached: ['trades', 'loss'],
      processRating: 6,
    }))
    expect(d.followedPlan).toBe(false)
    expect(d.limitsBreached).toEqual(['trades', 'loss'])
    expect(d.processRating).toBe(6)
  })

  it('rejects an unknown limit kind', () => {
    expect('error' in validateBody(createPostSessionSchema, {
      ...base, limitsBreached: ['position-size'],
    })).toBe(true)
  })

  it('rejects a negative fomo count and an out-of-range process rating', () => {
    expect('error' in validateBody(createPostSessionSchema, { ...base, fomoEntries: -1 })).toBe(true)
    expect('error' in validateBody(createPostSessionSchema, { ...base, processRating: 11 })).toBe(true)
  })
})

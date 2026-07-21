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
} from '../validations'

function ok<T>(r: { data: T } | { error: unknown }): T {
  if (!('data' in r)) throw new Error('expected success')
  return r.data
}

describe('validateBody wrapper', () => {
  it('returns { data } on success', () => {
    const r = validateBody(createRuleSchema, { text: 'hold the line' })
    expect(ok(r)).toEqual({ text: 'hold the line' })
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

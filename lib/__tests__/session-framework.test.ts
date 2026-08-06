/**
 * @jest-environment node
 *
 * The framework vocabulary and the two derived computations that behaviour
 * hangs off: lenient limit parsing (SessionHero's warnings and post-session's
 * breach prefill both depend on it) and pre-session quality (the ActivityCalendar
 * point).
 */
import {
  parseLimit,
  computeLimitBreaches,
  computePreSessionQuality,
  countPreSessionSections,
  PRE_SESSION_QUALITY_CHECK_COUNT,
  PRE_SESSION_QUALITY_THRESHOLD,
  NARRATIVE_STAGES,
  ENTRY_REASONS,
  NARRATIVE_STAGE_VALUES,
  ENTRY_REASON_VALUES,
  MAX_WATCHLIST_ITEMS,
  type PreSessionQualityInput,
} from '../session-framework'

describe('parseLimit', () => {
  // The columns are String and hold real prose from before enforcement
  // existed, so parsing has to cope with whatever is already in there.
  it.each([
    ['3', 3],
    ['3 trades', 3],
    ['$50', 50],
    ['50%', 50],
    ['2.5', 2.5],
    ['about 4 trades max', 4],
    ['120 minutes', 120],
    ['0', 0],
  ])('parses %p as %p', (input, expected) => {
    expect(parseLimit(input)).toBe(expected)
  })

  it.each([['', null], ['abc', null], ['   ', null], [null, null], [undefined, null]])(
    'returns null for %p',
    (input, expected) => {
      expect(parseLimit(input as string)).toBe(expected)
    }
  )

  it('returns null rather than 0 for unparseable input', () => {
    // This distinction is what stops every session being instantly "over
    // limit" — 0 would compare true against any trade count.
    expect(parseLimit('no limit')).toBeNull()
    expect(parseLimit('no limit')).not.toBe(0)
  })
})

describe('computeLimitBreaches', () => {
  const base = {
    maxTrades: '',
    maxLoss: '',
    timeLimit: '',
    tradeCount: 0,
    sessionPL: 0,
    elapsedMinutes: 0,
  }

  it('reports nothing when no limits are set', () => {
    expect(computeLimitBreaches({ ...base, tradeCount: 99, sessionPL: -9999 })).toEqual([])
  })

  it('flags the trade limit at and past the threshold', () => {
    expect(computeLimitBreaches({ ...base, maxTrades: '3', tradeCount: 2 })).toEqual([])
    const at = computeLimitBreaches({ ...base, maxTrades: '3', tradeCount: 3 })
    expect(at.map((b) => b.kind)).toEqual(['trades'])
    expect(at[0].message).toContain('3 of 3')
  })

  it('flags the loss limit, entered as a positive magnitude', () => {
    expect(computeLimitBreaches({ ...base, maxLoss: '50', sessionPL: -49 })).toEqual([])
    expect(
      computeLimitBreaches({ ...base, maxLoss: '50', sessionPL: -50 }).map((b) => b.kind)
    ).toEqual(['loss'])
  })

  it('does not flag the loss limit on a winning session', () => {
    expect(computeLimitBreaches({ ...base, maxLoss: '50', sessionPL: 500 })).toEqual([])
  })

  it('flags the time limit in minutes', () => {
    expect(computeLimitBreaches({ ...base, timeLimit: '60', elapsedMinutes: 59 })).toEqual([])
    expect(
      computeLimitBreaches({ ...base, timeLimit: '60', elapsedMinutes: 60 }).map((b) => b.kind)
    ).toEqual(['time'])
  })

  it('reports every breached limit at once', () => {
    const all = computeLimitBreaches({
      maxTrades: '2',
      maxLoss: '50',
      timeLimit: '30',
      tradeCount: 5,
      sessionPL: -100,
      elapsedMinutes: 90,
    })
    expect(all.map((b) => b.kind).sort()).toEqual(['loss', 'time', 'trades'])
  })
})

describe('computePreSessionQuality', () => {
  const full: PreSessionQualityInput = {
    energyLevel: 8,
    emotionalState: 'Calm',
    sessionIntent: 'Focus on majors',
    maxTrades: '3',
    rulesChecked: ['r1'],
    narrativeStage: 'early',
    conviction: 7,
  }

  it('scores an absent session as 0', () => {
    expect(computePreSessionQuality(null)).toBe(0)
    expect(computePreSessionQuality(undefined)).toBe(0)
    expect(computePreSessionQuality({})).toBe(0)
  })

  it('scores a fully answered session as 1', () => {
    expect(computePreSessionQuality(full)).toBe(1)
    expect(countPreSessionSections(full)).toBe(PRE_SESSION_QUALITY_CHECK_COUNT)
  })

  it('ignores zero and empty-string as unanswered', () => {
    // 0 energy and '' emotional state are the defaults, not real answers.
    expect(computePreSessionQuality({ energyLevel: 0, emotionalState: '', conviction: 0 })).toBe(0)
  })

  it('treats whitespace-only intent as unanswered', () => {
    expect(computePreSessionQuality({ sessionIntent: '   ' })).toBe(0)
  })

  it('counts any one of the three limit fields as the limits section', () => {
    expect(countPreSessionSections({ maxTrades: '3' })).toBe(1)
    expect(countPreSessionSections({ maxLoss: '50' })).toBe(1)
    expect(countPreSessionSections({ timeLimit: '60' })).toBe(1)
    // All three together are still one section, not three.
    expect(countPreSessionSections({ maxTrades: '3', maxLoss: '50', timeLimit: '60' })).toBe(1)
  })

  it('puts a bare energy-only save below the calendar threshold', () => {
    // The regression this scoring exists to fix: a one-field save used to earn
    // the same calendar point as a full framework run.
    expect(computePreSessionQuality({ energyLevel: 5 })).toBeLessThan(
      PRE_SESSION_QUALITY_THRESHOLD
    )
  })

  it('puts a substantive save at or above the threshold', () => {
    const substantive: PreSessionQualityInput = {
      energyLevel: 8,
      emotionalState: 'Calm',
      sessionIntent: 'plan',
      maxTrades: '3',
      narrativeStage: 'early',
    }
    expect(computePreSessionQuality(substantive)).toBeGreaterThanOrEqual(
      PRE_SESSION_QUALITY_THRESHOLD
    )
  })
})

describe('framework vocabulary', () => {
  it('exposes the four narrative stages in lifecycle order', () => {
    expect(NARRATIVE_STAGE_VALUES).toEqual(['early', 'discovery', 'memed', 'exhausted'])
  })

  it('includes fomo as a first-class entry reason', () => {
    // Layer 4 only works if naming the failure is an available answer.
    expect(ENTRY_REASON_VALUES).toContain('fomo')
    expect(ENTRY_REASON_VALUES).toContain('research')
  })

  it('gives every option a label and description', () => {
    for (const option of [...NARRATIVE_STAGES, ...ENTRY_REASONS]) {
      expect(option.label).toBeTruthy()
      expect(option.description).toBeTruthy()
    }
  })

  it('keeps the watchlist short enough for a morning routine', () => {
    expect(MAX_WATCHLIST_ITEMS).toBeGreaterThan(0)
    expect(MAX_WATCHLIST_ITEMS).toBeLessThanOrEqual(10)
  })
})

/**
 * Characterization tests for lib/discipline.ts — capture CURRENT behavior
 * before any refactor. Do not "fix" surprising results here; flag them.
 */
import {
  ratingToScore,
  computeTradeDiscipline,
  computeRollingDiscipline,
  disciplineColor,
  disciplineBgClass,
  disciplineColorClass,
} from '../discipline'
import type { TradeComment } from '../trade-comments'
import type { JournalData } from '@/lib/types/journal'

const comments: TradeComment[] = [
  { id: 'pos', category: 'entry', label: 'good', rating: 'positive', createdAt: '' },
  { id: 'neu', category: 'exit', label: 'ok', rating: 'neutral', createdAt: '' },
  { id: 'neg', category: 'management', label: 'bad', rating: 'negative', createdAt: '' },
]

const journal = (over: Partial<JournalData>): JournalData => ({ ...over } as JournalData)

describe('ratingToScore', () => {
  it('maps positive→1, negative→-1, neutral→0', () => {
    expect(ratingToScore('positive')).toBe(1)
    expect(ratingToScore('negative')).toBe(-1)
    expect(ratingToScore('neutral')).toBe(0)
  })
})

describe('computeTradeDiscipline', () => {
  it('returns null for null journal', () => {
    expect(computeTradeDiscipline(null, comments)).toBeNull()
  })

  it('returns null when no comment ids present', () => {
    expect(computeTradeDiscipline(journal({}), comments)).toBeNull()
  })

  it('returns null when ids present but none resolve to a comment', () => {
    expect(
      computeTradeDiscipline(journal({ entryCommentId: 'missing' }), comments)
    ).toBeNull()
  })

  it('maps all-positive (score 3) to 100%', () => {
    const r = computeTradeDiscipline(
      journal({ entryCommentId: 'pos', exitCommentId: 'pos', managementCommentId: 'pos' }),
      comments
    )
    expect(r).not.toBeNull()
    expect(r!.score).toBe(3)
    expect(r!.percentage).toBe(100)
  })

  it('maps all-negative (score -3) to 0%', () => {
    const r = computeTradeDiscipline(
      journal({ entryCommentId: 'neg', exitCommentId: 'neg', managementCommentId: 'neg' }),
      comments
    )
    expect(r!.score).toBe(-3)
    expect(r!.percentage).toBe(0)
  })

  it('maps a single neutral (score 0) to 50%', () => {
    const r = computeTradeDiscipline(journal({ entryCommentId: 'neu' }), comments)
    expect(r!.score).toBe(0)
    expect(r!.percentage).toBe(50)
  })

  it('mixed pos+neg (score 0) → 50%, ignores unresolved ids', () => {
    const r = computeTradeDiscipline(
      journal({ entryCommentId: 'pos', exitCommentId: 'neg', managementCommentId: 'missing' }),
      comments
    )
    expect(r!.score).toBe(0)
    expect(r!.percentage).toBe(50)
    expect(r!.managementComment).toBeUndefined()
  })
})

describe('disciplineColor thresholds', () => {
  it('<=33 red, <=66 yellow, >66 emerald (boundaries exact)', () => {
    expect(disciplineColor(0)).toBe('red')
    expect(disciplineColor(33)).toBe('red')
    expect(disciplineColor(33.01)).toBe('yellow')
    expect(disciplineColor(66)).toBe('yellow')
    expect(disciplineColor(66.01)).toBe('emerald')
    expect(disciplineColor(100)).toBe('emerald')
  })

  it('bg/text class helpers follow the color', () => {
    expect(disciplineBgClass(10)).toBe('bg-red-500')
    expect(disciplineBgClass(50)).toBe('bg-yellow-500')
    expect(disciplineBgClass(90)).toBe('bg-emerald-500')
    expect(disciplineColorClass(10)).toBe('text-red-500')
    expect(disciplineColorClass(50)).toBe('text-yellow-500')
    expect(disciplineColorClass(90)).toBe('text-emerald-500')
  })
})

describe('computeRollingDiscipline', () => {
  it('returns null when no journals resolve', () => {
    expect(computeRollingDiscipline([null, journal({})], comments)).toBeNull()
  })

  it('averages the last windowSize resolved results', () => {
    // three all-positive (100) and two all-negative (0); window of 5 → avg 60
    const js = [
      journal({ entryCommentId: 'pos', exitCommentId: 'pos', managementCommentId: 'pos' }),
      journal({ entryCommentId: 'pos', exitCommentId: 'pos', managementCommentId: 'pos' }),
      journal({ entryCommentId: 'pos', exitCommentId: 'pos', managementCommentId: 'pos' }),
      journal({ entryCommentId: 'neg', exitCommentId: 'neg', managementCommentId: 'neg' }),
      journal({ entryCommentId: 'neg', exitCommentId: 'neg', managementCommentId: 'neg' }),
    ]
    const r = computeRollingDiscipline(js, comments, 5)
    expect(r!.percentage).toBe(60)
    expect(r!.color).toBe('yellow')
  })

  it('window slices to the most recent N', () => {
    // 6 entries: 1 negative (0) then 5 positive (100); window 5 → only the 5 positives → 100
    const js = [
      journal({ entryCommentId: 'neg' }),
      ...Array(5).fill(journal({ entryCommentId: 'pos', exitCommentId: 'pos', managementCommentId: 'pos' })),
    ]
    const r = computeRollingDiscipline(js, comments, 5)
    expect(r!.percentage).toBe(100)
  })
})

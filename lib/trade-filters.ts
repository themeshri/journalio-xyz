/**
 * The shared trade-filter vocabulary.
 *
 * Phase B5 of the TradeZella refactor. `GlobalFilterBar` already encodes
 * outcome / month / day / search / P&L range / lastN into the URL, but the
 * server only ever honoured startDate/endDate. This module makes that
 * vocabulary a single parseable, appliable unit so the Compare view can hold
 * TWO independent cohorts (doc §3.5) without duplicating filter logic.
 *
 * Pure and I/O-free — usable on both sides of the wire.
 */

import type { FlattenedTrade } from './tradeCycles'
import type { JournalData } from './types/journal'

export interface TradeFilterSet {
  /** UNIX seconds. */
  startDate?: number
  endDate?: number
  outcome?: 'win' | 'loss' | 'breakeven'
  /** 0-indexed, matching Date#getMonth. */
  month?: number
  /** 0=Sunday, matching Date#getDay. */
  dayOfWeek?: number
  /** Case-insensitive substring match on token symbol or mint. */
  search?: string
  minPl?: number
  maxPl?: number
  /** Keep only the N most recent trades, applied last. */
  lastN?: number
  /** Journal dimensions — require a journalMap to evaluate. */
  strategyId?: string
  tagIds?: string[]
  minRating?: number
  reviewed?: boolean
}

/** Context needed for the journal-backed dimensions. Optional. */
export interface FilterContext {
  journalMap?: Record<string, JournalData & { id?: string }>
  /** journal entry id -> tag ids. */
  tagsByJournalId?: Record<string, string[]>
  keyFor?: (t: FlattenedTrade) => string
}

function num(v: string | null): number | undefined {
  if (v === null || v.trim() === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Parse a filter set from search params.
 *
 * @param prefix  Namespace for the Compare view — pass "a." / "b." to read
 *                two independent cohorts from one URL.
 */
export function parseTradeFilters(
  searchParams: URLSearchParams,
  prefix = ''
): TradeFilterSet {
  const p = (k: string) => searchParams.get(`${prefix}${k}`)

  const outcome = p('outcome')
  const month = num(p('month'))
  const day = num(p('day'))
  const tagIds = p('tags')?.split(',').filter(Boolean)
  const reviewed = p('reviewed')

  return {
    startDate: num(p('startDate')),
    endDate: num(p('endDate')),
    outcome:
      outcome === 'win' || outcome === 'loss' || outcome === 'breakeven' ? outcome : undefined,
    month: month !== undefined && month >= 0 && month <= 11 ? month : undefined,
    dayOfWeek: day !== undefined && day >= 0 && day <= 6 ? day : undefined,
    search: p('search') || undefined,
    minPl: num(p('minPl')),
    maxPl: num(p('maxPl')),
    lastN: num(p('lastN')),
    strategyId: p('strategyId') || undefined,
    tagIds: tagIds?.length ? tagIds : undefined,
    minRating: num(p('minRating')),
    reviewed: reviewed === 'true' ? true : reviewed === 'false' ? false : undefined,
  }
}

/** True when the set would not remove anything — lets callers skip the walk. */
export function isEmptyFilterSet(f: TradeFilterSet): boolean {
  return Object.values(f).every((v) => v === undefined)
}

/**
 * Apply a filter set to a list of trades.
 *
 * Date comparisons use `startDate` (cycle open), preserving the exact semantics
 * of the original `applyDateFilter` that the six /api/analytics/* routes rely on.
 */
export function applyTradeFilters(
  trades: FlattenedTrade[],
  filters: TradeFilterSet,
  ctx: FilterContext = {}
): FlattenedTrade[] {
  if (isEmptyFilterSet(filters)) return trades

  const keyFor =
    ctx.keyFor ?? ((t: FlattenedTrade) => `${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`)
  const search = filters.search?.toLowerCase()

  let result = trades.filter((t) => {
    if (filters.startDate !== undefined && t.startDate < filters.startDate) return false
    if (filters.endDate !== undefined && t.startDate > filters.endDate) return false

    if (filters.outcome) {
      // Only completed cycles have a settled outcome.
      if (!t.isComplete) return false
      if (filters.outcome === 'win' && !(t.profitLoss > 0)) return false
      if (filters.outcome === 'loss' && !(t.profitLoss < 0)) return false
      if (filters.outcome === 'breakeven' && t.profitLoss !== 0) return false
    }

    if (filters.month !== undefined || filters.dayOfWeek !== undefined) {
      const d = new Date((t.endDate || t.startDate) * 1000)
      if (filters.month !== undefined && d.getMonth() !== filters.month) return false
      if (filters.dayOfWeek !== undefined && d.getDay() !== filters.dayOfWeek) return false
    }

    if (search) {
      const token = (t.token || '').toLowerCase()
      const mint = (t.tokenMint || '').toLowerCase()
      if (!token.includes(search) && !mint.includes(search)) return false
    }

    if (filters.minPl !== undefined && t.profitLoss < filters.minPl) return false
    if (filters.maxPl !== undefined && t.profitLoss > filters.maxPl) return false

    // Journal-backed dimensions. Without a journalMap these cannot be
    // evaluated, so a trade is excluded rather than silently kept — an
    // unanswerable filter must not widen the cohort.
    const needsJournal =
      filters.strategyId !== undefined ||
      filters.tagIds !== undefined ||
      filters.minRating !== undefined ||
      filters.reviewed !== undefined

    if (needsJournal) {
      const journal = ctx.journalMap?.[keyFor(t)]
      if (!journal) return false

      if (filters.strategyId !== undefined && journal.strategyId !== filters.strategyId) {
        return false
      }
      if (filters.minRating !== undefined) {
        const rating = journal.tradeRating
        if (rating === null || rating === undefined || rating < filters.minRating) return false
      }
      if (filters.reviewed !== undefined) {
        if ((journal.reviewed ?? false) !== filters.reviewed) return false
      }
      if (filters.tagIds !== undefined) {
        const journalTags = journal.id ? ctx.tagsByJournalId?.[journal.id] : undefined
        if (!journalTags?.length) return false
        // OR semantics: keep the trade if it carries ANY of the selected tags.
        if (!filters.tagIds.some((id) => journalTags.includes(id))) return false
      }
    }

    return true
  })

  // Applied last so "last 20 winners" means the 20 most recent winners,
  // not "winners among the 20 most recent trades".
  if (filters.lastN !== undefined && filters.lastN > 0) {
    result = [...result]
      .sort((a, b) => (b.endDate || b.startDate) - (a.endDate || a.startDate))
      .slice(0, filters.lastN)
  }

  return result
}

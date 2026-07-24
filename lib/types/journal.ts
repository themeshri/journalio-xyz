/**
 * Journal entry types.
 *
 * These live in lib/ (not in components/JournalModal) so that domain/data
 * modules — lib/journals.ts, lib/discipline.ts, lib/analytics/types.ts — can
 * depend on them without importing from the UI layer (a wrong-direction edge).
 * The JournalModal component re-exports these for backward compatibility.
 */

export interface TradeRuleResult {
  ruleId: string
  ruleGroupId: string
  followed: boolean
}

export interface JournalData {
  strategy: string
  strategyId?: string | null
  ruleResults?: TradeRuleResult[]
  emotionalState: string
  buyNotes: string
  buyRating: number
  exitPlan: string
  sellRating: number
  followedExitRule: boolean | null
  sellMistakes: string[]
  sellNotes: string
  attachment?: string
  entryCommentId?: string | null
  exitCommentId?: string | null
  managementCommentId?: string | null
  emotionTag?: string | null
  stopLoss?: number | null
  takeProfit?: number | null
  journaledAt?: string
  /** Auto-computed from stopLoss on save; see lib/analytics/r-multiple.ts */
  rMultiple?: number | null
  /** Subjective 1-5 self-grade */
  tradeRating?: number | null
  reviewed?: boolean
  /** Tag ids attached to this entry (TradeTag, kind: mistake | custom) */
  tagIds?: string[]
  // Legacy fields preserved for backward compat when reading old data
  buyCategory?: string
  fomoLevel?: number
  energyLevel?: number
}

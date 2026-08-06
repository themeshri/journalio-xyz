'use client'

import { createContext, useContext } from 'react'
import { type TradeComment } from '../trade-comments'
import { type Strategy } from '../strategies'
import { type JournalRecord } from '../journals'
import { type MissedTradeEntry } from '../analytics'
import { type TimePreset, type TimeRange } from '../time-filters'
import { type TypedRule } from '../rules-engine'
import { type AdherenceRecord, type RuleStats } from '../analytics/rule-stats'
import { type TradeTag } from '../tags'
import { type PreSessionQualityInput } from '../session-framework'

/**
 * The per-day pre-session summary the dashboard returns for the calendar.
 * Carries the quality inputs (not just `savedAt`) because the ActivityCalendar
 * now scores completeness rather than mere existence.
 */
export type YearlyPreSession = PreSessionQualityInput & {
  date: string
  savedAt?: string
}

export interface MetadataContextValue {
  tradeComments: TradeComment[]
  strategies: Strategy[]
  journalMap: Record<string, JournalRecord>
  streak: { current: number; longest: number }
  preSessionDone: boolean
  postSessionDone: boolean
  missedTrades: MissedTradeEntry[]
  yearlyPreSessions: YearlyPreSession[]
  yearlyPostSessions: { date: string }[]
  /** Typed rules + their evaluated adherence (Phase B1). */
  rules: TypedRule[]
  adherence: AdherenceRecord[]
  ruleStats: RuleStats[]
  /** Today's followed/total, for the score-first badge in the nav. */
  todayRuleScore: { followed: number; total: number } | null
  tags: TradeTag[]
  /** journal entry id -> tag ids attached to it. */
  tagsByJournalId: Record<string, string[]>
  reloadRules: () => Promise<void>
  reloadTags: () => Promise<void>
  updateJournalEntry: (key: string, data: Partial<JournalRecord>) => void
  reloadStrategies: () => Promise<void>
  reloadTradeComments: () => Promise<void>
  reloadJournals: () => Promise<void>
  reloadPreSessionStatus: () => Promise<void>
  reloadPostSessionStatus: () => Promise<void>
  reloadMissedTrades: () => Promise<void>
  timeRange: TimeRange
  timePreset: TimePreset
  setTimeFilter: (range: TimeRange, preset: TimePreset) => void
  timezone: string
  tradingStartTime: string
  onboardingStep: number | null
  setOnboardingStep: (step: number | null) => void
}

export const MetadataContext = createContext<MetadataContextValue | null>(null)

export function useMetadata() {
  const ctx = useContext(MetadataContext)
  if (!ctx) throw new Error('useMetadata must be used within DashboardProviders')
  return ctx
}

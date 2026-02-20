import type { FlattenedTrade } from '../tradeCycles'
import type { JournalData } from '@/components/JournalModal'
import type { TradeComment } from '@/lib/trade-comments'

// Re-export dependency types for convenience
export type { FlattenedTrade, JournalData, TradeComment }

// --- Core ---

export interface DurationBucket {
  bucket: string
  count: number
  avgPL: number
}

export interface CumulativePLPoint {
  date: string
  cumulativePL: number
  tradePL: number
  token: string
}

export interface TradingHourData {
  hour: string
  count: number
  avgPL: number
  totalPL: number
}

// --- Discipline ---

export interface CommentPerformance {
  commentId: string
  label: string
  category: 'entry' | 'exit' | 'management'
  rating: 'positive' | 'neutral' | 'negative'
  totalPnL: number
  avgPnL: number
  tradeCount: number
  winRate: number
}

export interface EfficiencyPoint {
  tradeIndex: number
  date: string
  cumulativeEfficiency: number
  rollingEfficiency: number
}

export interface DisciplineEquityPoint {
  tradeIndex: number
  date: string
  cumulativePnL: number
  disciplineScore: number
}

// --- What-If ---

export interface WhatIfFilter {
  excludeComments: string[]
  excludeRatings: ('positive' | 'neutral' | 'negative')[]
  excludeTags: string[]
  excludeStrategies: string[]
  excludeUndisciplined: boolean
}

export interface WhatIfStats {
  totalTrades: number
  totalPnL: number
  winRate: number
  profitFactor: number
  avgPnL: number
}

export interface WhatIfResult {
  original: WhatIfStats
  filtered: WhatIfStats
  tradesRemoved: number
  pnlDifference: number
}

export interface WhatIfEquityPoint {
  tradeIndex: number
  date: string
  actualPnL: number
  filteredPnL: number
}

// --- Patterns ---

export interface DetectedPattern {
  id: string
  type: 'positive' | 'negative' | 'neutral'
  title: string
  description: string
  severity: 'info' | 'warning' | 'critical'
}

// --- Calendar ---

export interface CalendarDay {
  date: string // YYYY-MM-DD
  pnl: number
  tradeCount: number
  wins: number
  losses: number
}

export interface CalendarWeek {
  days: (CalendarDay | null)[] // 7 entries, null for days outside the month
  weeklyPnL: number
}

export interface CalendarMonth {
  year: number
  month: number // 0-indexed
  weeks: CalendarWeek[]
  totalPnL: number
  totalTrades: number
  bestDay: CalendarDay | null
  worstDay: CalendarDay | null
}

// --- Time Analytics ---

export interface HourlyPerformance {
  hour: number
  label: string
  tradeCount: number
  totalPnL: number
  avgPnL: number
  winRate: number
  wins: number
  losses: number
}

export interface DayOfWeekPerformance {
  day: number // 0=Sun
  label: string
  tradeCount: number
  totalPnL: number
  avgPnL: number
  winRate: number
  wins: number
  losses: number
}

export interface TradingSession {
  name: string
  startHour: number
  endHour: number
  color: string
}

export interface SessionPerformance {
  session: TradingSession
  tradeCount: number
  totalPnL: number
  avgPnL: number
  winRate: number
  wins: number
  losses: number
  profitFactor: number
}

export interface DayHourPerformance {
  day: number
  hour: number
  tradeCount: number
  avgPnL: number
  totalPnL: number
}

export interface EnhancedDurationBucket {
  bucket: string
  count: number
  avgPL: number
  winRate: number
  profitFactor: number
  totalPnL: number
}

// --- Strategy ---

export interface StrategyPerformance {
  strategyId: string
  strategyName: string
  tradeCount: number
  totalPnL: number
  avgPnL: number
  winRate: number
  wins: number
  losses: number
  profitFactor: number
  avgFollowRate: number
  bestTrade: number
  worstTrade: number
}

export interface RulePerformance {
  ruleId: string
  ruleText: string
  groupName: string
  followedCount: number
  skippedCount: number
  avgPnLWhenFollowed: number
  avgPnLWhenSkipped: number
  impact: number // difference
}

export interface CompletionBucket {
  range: string // e.g. "0-25%"
  minPct: number
  maxPct: number
  tradeCount: number
  avgPnL: number
  winRate: number
}

// --- Missed Trades ---

export interface MissedTradeEntry {
  id: string
  missReason: string | null
  strategyId: string | null
  outcome: string | null
  potentialPnL: number | null
  potentialMultiplier: number | null
  createdAt: string
}

export interface MissReasonBreakdown {
  reason: string
  count: number
  totalMissedPnL: number
  avgMultiplier: number
  winCount: number
}

export interface MissedTradeAnalytics {
  totalMissed: number
  totalMissedPnL: number
  avgMultiplier: number
  winCount: number
  reasonBreakdown: MissReasonBreakdown[]
  strategyBreakdown: { strategyId: string; count: number; totalPnL: number }[]
  monthlyTrend: { month: string; count: number; missedPnL: number }[]
}

export interface HesitationCostAnalysis {
  totalActualPnL: number
  totalMissedPnL: number
  hesitationCost: number
  missedWinRate: number
  actualWinRate: number
  missedPerActual: number
}

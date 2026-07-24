import useSWR from 'swr'
import type {
  DurationBucket,
  CumulativePLPoint,
  TradingHourData,
  CalendarMonth,
  HourlyPerformance,
  DayOfWeekPerformance,
  SessionPerformance,
  EnhancedDurationBucket,
  CommentPerformance,
  EfficiencyPoint,
  DisciplineEquityPoint,
  DetectedPattern,
  WhatIfResult,
  WhatIfEquityPoint,
  StrategyPerformance,
  RulePerformance,
  CompletionBucket,
  MissedTradeAnalytics,
  HesitationCostAnalysis,
  TagCost,
  RuleStats,
  AdherenceRecord,
  DrawdownResult,
  WhatIfStats,
} from '@/lib/analytics'
import type { TypedRule } from '@/lib/rules-engine'
import type { TradeFilterSet } from '@/lib/trade-filters'

const fetcher = (url: string) => fetch(url).then(r => r.json())

const postFetcher = ([url, body]: [string, string]) =>
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  }).then(r => r.json())

const SWR_OPTIONS = {
  revalidateOnFocus: false,
  dedupingInterval: 60000,
} as const

interface OverviewData {
  durationBuckets: DurationBucket[]
  cumulativePL: CumulativePLPoint[]
  tradingHours: TradingHourData[]
  avgDuration: number
}

interface TimeData {
  hourlyPerformance: HourlyPerformance[]
  dayOfWeekPerformance: DayOfWeekPerformance[]
  sessionPerformance: SessionPerformance[]
  enhancedDurationBuckets: EnhancedDurationBucket[]
}

interface DisciplineData {
  commentPerformance: CommentPerformance[]
  efficiency: EfficiencyPoint[]
  disciplineEquity: DisciplineEquityPoint[]
  patterns: DetectedPattern[]
  whatIf?: WhatIfResult
  whatIfEquity?: WhatIfEquityPoint[]
}

interface StrategyData {
  strategyPerformance: StrategyPerformance[]
  ruleImpact: RulePerformance[]
  completionVsPerformance: CompletionBucket[]
}

interface MissedData {
  missedStats: MissedTradeAnalytics
  hesitationCost: HesitationCostAnalysis
}

export function useOverviewAnalytics(walletQueryParams: string | null) {
  return useSWR<OverviewData>(
    walletQueryParams ? `/api/analytics/overview?${walletQueryParams}` : null,
    fetcher,
    SWR_OPTIONS
  )
}

export function useCalendarAnalytics(walletQueryParams: string | null, year: number, month: number) {
  return useSWR<CalendarMonth>(
    walletQueryParams ? `/api/analytics/calendar?${walletQueryParams}&year=${year}&month=${month}` : null,
    fetcher,
    SWR_OPTIONS
  )
}

export function useTimeAnalytics(walletQueryParams: string | null) {
  return useSWR<TimeData>(
    walletQueryParams ? `/api/analytics/time?${walletQueryParams}` : null,
    fetcher,
    SWR_OPTIONS
  )
}

export function useMissedAnalytics(walletQueryParams: string | null) {
  return useSWR<MissedData>(
    walletQueryParams ? `/api/analytics/missed?${walletQueryParams}` : null,
    fetcher,
    SWR_OPTIONS
  )
}

export function useDisciplineAnalytics(walletQueryParams: string | null, bodyJson: string | null) {
  return useSWR<DisciplineData>(
    walletQueryParams && bodyJson ? [`/api/analytics/discipline?${walletQueryParams}`, bodyJson] : null,
    postFetcher,
    SWR_OPTIONS
  )
}

export function useStrategyAnalytics(walletQueryParams: string | null, bodyJson: string | null) {
  return useSWR<StrategyData>(
    walletQueryParams && bodyJson ? [`/api/analytics/strategy?${walletQueryParams}`, bodyJson] : null,
    postFetcher,
    SWR_OPTIONS
  )
}

// ─── TradeZella refactor: rules, tags, drawdown, compare ──────

interface AdherenceData {
  rules: (TypedRule & { text: string })[]
  adherence: AdherenceRecord[]
  stats: RuleStats[]
  periodScore: number
  today: string
}

export function useRuleAdherence(walletQueryParams: string | null, from?: string, to?: string) {
  const range = [from ? `from=${from}` : '', to ? `to=${to}` : ''].filter(Boolean).join('&')
  return useSWR<AdherenceData>(
    walletQueryParams
      ? `/api/rules/adherence?${walletQueryParams}${range ? `&${range}` : ''}`
      : null,
    fetcher,
    SWR_OPTIONS
  )
}

interface TagAnalyticsData {
  tags: TagCost[]
  mistakes: TagCost[]
  custom: TagCost[]
  topMistakes: TagCost[]
}

export function useTagAnalytics(walletQueryParams: string | null) {
  return useSWR<TagAnalyticsData>(
    walletQueryParams ? `/api/analytics/tags?${walletQueryParams}` : null,
    fetcher,
    SWR_OPTIONS
  )
}

interface DrawdownData extends Partial<DrawdownResult> {
  hasInitialBalance: boolean
  walletsMissingBalance: string[]
}

export function useDrawdownAnalytics(walletQueryParams: string | null) {
  return useSWR<DrawdownData>(
    walletQueryParams ? `/api/analytics/drawdown?${walletQueryParams}` : null,
    fetcher,
    SWR_OPTIONS
  )
}

interface CompareCohort {
  filters: TradeFilterSet
  stats: WhatIfStats
  cumulativePL: CumulativePLPoint[]
}

interface CompareData {
  a: CompareCohort
  b: CompareCohort
  delta: WhatIfStats
  totalTrades: number
}

/** @param filterQuery already-encoded "a.*"/"b.*" params from the URL. */
export function useCompareAnalytics(walletQueryParams: string | null, filterQuery: string) {
  return useSWR<CompareData>(
    walletQueryParams
      ? `/api/analytics/compare?${walletQueryParams}${filterQuery ? `&${filterQuery}` : ''}`
      : null,
    fetcher,
    SWR_OPTIONS
  )
}

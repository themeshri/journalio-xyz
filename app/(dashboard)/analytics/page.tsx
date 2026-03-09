'use client'

import { useMemo, useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useWallet, useMetadata, buildWalletQueryParams } from '@/lib/wallet-context'
import { formatValue, formatDuration } from '@/lib/formatters'
import {
  useOverviewAnalytics,
  useCalendarAnalytics,
  useTimeAnalytics,
  useMissedAnalytics,
  useDisciplineAnalytics,
  useStrategyAnalytics,
} from '@/lib/hooks/use-analytics'
import {
  getDayColorClass,
  type WhatIfFilter,
  type WhatIfResult,
  type MissedTradeAnalytics,
  type HesitationCostAnalysis,
} from '@/lib/analytics'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
} from 'recharts'
import { Separator } from '@/components/ui/separator'
import {
  GlowFilter,
  GlowAreaGradient,
  GradientBarDefs,
  HatchPatternDefs,
  DottedBackgroundPattern,
  CustomGradientBar,
  CustomHatchedBar,
  CustomDuotoneBar,
  ActivePingingDot,
} from '@/lib/chart-effects'
import { StatStripSkeleton, ChartSkeleton } from '@/components/skeletons'
import ErrorBoundary from '@/components/ErrorBoundary'
import { TimeRangeFilter } from '@/components/TimeRangeFilter'
import { SlidersHorizontal } from 'lucide-react'
import { loadPreSessions, type PreSessionData } from '@/lib/pre-sessions'
import { loadPostSessions, type PostSessionData } from '@/lib/post-sessions'
import { getCommentsByCategory, type TradeComment } from '@/lib/trade-comments'
import type { JournalData } from '@/components/JournalModal'

const durationConfig = {
  count: { label: 'Trades', color: 'var(--chart-1)' },
} satisfies ChartConfig

const plConfig = {
  cumulativePL: { label: 'Cumulative P/L', color: 'var(--chart-1)' },
} satisfies ChartConfig

const hoursConfig = {
  count: { label: 'Trades', color: 'var(--chart-1)' },
} satisfies ChartConfig

const commentPerfConfig = {
  totalPnL: { label: 'Total P/L', color: 'var(--chart-1)' },
} satisfies ChartConfig

const efficiencyConfig = {
  cumulativeEfficiency: { label: 'Cumulative', color: 'oklch(0.527 0.154 163.225)' },
  rollingEfficiency: { label: 'Rolling', color: 'var(--chart-1)' },
} satisfies ChartConfig

const disciplineEquityConfig = {
  cumulativePnL: { label: 'Cumulative P/L', color: 'var(--chart-1)' },
  disciplineScore: { label: 'Discipline', color: 'oklch(0.527 0.154 163.225)' },
} satisfies ChartConfig

const whatIfEquityConfig = {
  actualPnL: { label: 'Actual P/L', color: 'var(--chart-1)' },
  filteredPnL: { label: 'What-If P/L', color: 'oklch(0.527 0.154 163.225)' },
} satisfies ChartConfig

const hourlyPLConfig = {
  totalPnL: { label: 'Total P/L', color: 'var(--chart-1)' },
} satisfies ChartConfig

const dayOfWeekConfig = {
  totalPnL: { label: 'Total P/L', color: 'var(--chart-1)' },
} satisfies ChartConfig

const ruleImpactConfig = {
  impact: { label: 'Impact', color: 'var(--chart-1)' },
} satisfies ChartConfig

const completionConfig = {
  avgPnL: { label: 'Avg P/L', color: 'var(--chart-1)' },
} satisfies ChartConfig

const behaviorBarConfig = {
  avgPnL: { label: 'Avg P/L', color: 'var(--chart-1)' },
} satisfies ChartConfig

const sessionLineConfig = {
  value: { label: 'Value', color: 'var(--chart-1)' },
} satisfies ChartConfig

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const EMOTION_TAGS = [
  { id: 'confident', label: 'Confident' },
  { id: 'calm', label: 'Calm' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'fomo', label: 'FOMO' },
  { id: 'revenge', label: 'Revenge' },
  { id: 'greedy', label: 'Greedy' },
  { id: 'fearful', label: 'Fearful' },
  { id: 'bored', label: 'Bored' },
  { id: 'euphoric', label: 'Euphoric' },
  { id: 'frustrated', label: 'Frustrated' },
  { id: 'neutral', label: 'Neutral' },
]

const MISTAKE_OPTIONS = [
  'Entered too early', 'Entered too late', 'Position size too large', 'Position size too small',
  "Didn't follow plan", 'Emotional decision', 'Ignored stop loss', 'Held too long',
  'Sold too early', 'Poor risk management', "Didn't do enough research", 'Overtraded', 'Other',
]

// What-If filter emotion tags (subset without positive ones)
const whatIfEmotionTags = [
  { id: 'fomo', label: 'FOMO' },
  { id: 'revenge', label: 'Revenge' },
  { id: 'greedy', label: 'Greedy' },
  { id: 'bored', label: 'Bored' },
  { id: 'anxious', label: 'Anxious' },
  { id: 'fearful', label: 'Fearful' },
  { id: 'euphoric', label: 'Euphoric' },
  { id: 'frustrated', label: 'Frustrated' },
]

const defaultFilter: WhatIfFilter = {
  excludeComments: [],
  excludeRatings: [],
  excludeTags: [],
  excludeStrategies: [],
  excludeUndisciplined: false,
}

const emptyWhatIfResult: WhatIfResult = {
  original: { totalTrades: 0, totalPnL: 0, winRate: 0, profitFactor: 0, avgPnL: 0 },
  filtered: { totalTrades: 0, totalPnL: 0, winRate: 0, profitFactor: 0, avgPnL: 0 },
  tradesRemoved: 0,
  pnlDifference: 0,
}

/** Handle null profitFactor from server (was Infinity before JSON serialization) */
function restoreInfinity(val: number | null): number {
  return val === null ? Infinity : val
}

function restoreInfinityInArray<T extends Record<string, any>>(arr: T[], key: keyof T): T[] {
  return arr.map((item) => ({ ...item, [key]: restoreInfinity(item[key] as number | null) }))
}

const tabErrorFallback = (
  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-muted-foreground">
    Something went wrong loading this section. Try refreshing the page.
  </div>
)

const PIE_COLORS = [
  'oklch(0.527 0.154 163.225)', // emerald
  'oklch(0.577 0.245 27.325)',  // red
  'oklch(0.65 0.15 250)',       // blue
  'oklch(0.7 0.15 80)',         // amber
  'oklch(0.6 0.2 330)',         // purple
  'oklch(0.65 0.15 180)',       // teal
  'oklch(0.7 0.1 60)',          // orange
  'oklch(0.55 0.15 300)',       // pink
]

export default function AnalyticsPage() {
  const { flattenedTrades, isAnyLoading, hasActiveWallets, allTrades, tradeComments, strategies: allStrategies, journalMap, activeWallets, initialized } = useWallet()
  const { timeRange, timePreset, setTimeFilter } = useMetadata()

  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const validTabs = ['overview', 'time', 'discipline', 'strategy', 'missed', 'behavior', 'sessions'] as const
  type TabType = typeof validTabs[number]
  const activeTab: TabType = validTabs.includes(tabParam as TabType) ? (tabParam as TabType) : 'overview'

  const walletQueryParams = useMemo(() => {
    const base = buildWalletQueryParams(activeWallets)
    if (!base) return null
    const parts = [base]
    if (timeRange.startDate) parts.push(`startDate=${timeRange.startDate}`)
    if (timeRange.endDate) parts.push(`endDate=${timeRange.endDate}`)
    return parts.join('&')
  }, [activeWallets, timeRange])

  const completedTrades = useMemo(
    () => flattenedTrades.filter((t) => t.isComplete),
    [flattenedTrades]
  )

  // ─── SWR data fetching ─────────────────────────────────────────────
  const swrQueryParams = walletQueryParams && flattenedTrades.length > 0 ? walletQueryParams : null

  const { data: overviewData, isLoading: overviewLoading } = useOverviewAnalytics(swrQueryParams)

  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const { data: calendarRaw, isLoading: calendarLoading } = useCalendarAnalytics(swrQueryParams, calYear, calMonth)

  const { data: timeRaw, isLoading: timeLoading } = useTimeAnalytics(
    activeTab === 'time' ? swrQueryParams : null
  )
  const { data: missedRaw, isLoading: missedLoading } = useMissedAnalytics(
    activeTab === 'missed' ? swrQueryParams : null
  )

  const durationData = overviewData?.durationBuckets || []
  const plData = overviewData?.cumulativePL || []
  const hoursData = overviewData?.tradingHours || []
  const avgDuration = overviewData?.avgDuration || 0

  const calendarData = calendarRaw || { year: calYear, month: calMonth, weeks: [], totalTrades: 0, totalPnL: 0, bestDay: null, worstDay: null }

  const calMaxPnl = useMemo(() => {
    let max = 0
    for (const w of calendarData.weeks) {
      for (const d of w.days) {
        if (d && d.pnl > max) max = d.pnl
      }
    }
    return max
  }, [calendarData])

  const calMaxLoss = useMemo(() => {
    let max = 0
    for (const w of calendarData.weeks) {
      for (const d of w.days) {
        if (d && Math.abs(d.pnl) > max && d.pnl < 0) max = Math.abs(d.pnl)
      }
    }
    return max
  }, [calendarData])

  // Time data with Infinity restoration
  const timeData = useMemo(() => {
    if (!timeRaw) return null
    return {
      ...timeRaw,
      sessionPerformance: restoreInfinityInArray(timeRaw.sessionPerformance || [], 'profitFactor'),
      enhancedDurationBuckets: restoreInfinityInArray(timeRaw.enhancedDurationBuckets || [], 'profitFactor'),
    }
  }, [timeRaw])

  const hourlyPerfData = timeData?.hourlyPerformance || []
  const dayOfWeekData = timeData?.dayOfWeekPerformance || []
  const sessionPerfData = timeData?.sessionPerformance || []
  const enhancedDurationData = timeData?.enhancedDurationBuckets || []

  // ─── POST-based hooks (only fire when tab is active) ──────────────
  const [whatIfFilter, setWhatIfFilter] = useState<WhatIfFilter>(defaultFilter)

  const hasFilter = whatIfFilter.excludeComments.length > 0 || whatIfFilter.excludeRatings.length > 0 ||
    whatIfFilter.excludeTags.length > 0 || whatIfFilter.excludeStrategies.length > 0 || whatIfFilter.excludeUndisciplined

  const disciplineBodyJson = useMemo(() => {
    if (activeTab !== 'discipline' || !swrQueryParams) return null
    return JSON.stringify({
      addresses: activeWallets.map((w) => w.address),
      chains: activeWallets.map((w) => w.chain),
      dexes: activeWallets.map((w) => w.dex),
      journalMap,
      tradeComments,
      ...(hasFilter ? { whatIfFilter } : {}),
    })
  }, [activeTab, swrQueryParams, activeWallets, journalMap, tradeComments, hasFilter, whatIfFilter])

  const { data: disciplineRaw, isLoading: disciplineLoading } = useDisciplineAnalytics(
    activeTab === 'discipline' ? swrQueryParams : null,
    disciplineBodyJson
  )

  const strategyBodyJson = useMemo(() => {
    if (activeTab !== 'strategy' || !swrQueryParams) return null
    return JSON.stringify({
      addresses: activeWallets.map((w) => w.address),
      chains: activeWallets.map((w) => w.chain),
      dexes: activeWallets.map((w) => w.dex),
      journalMap,
      strategies: allStrategies,
    })
  }, [activeTab, swrQueryParams, activeWallets, journalMap, allStrategies])

  const { data: strategyRaw, isLoading: strategyLoading } = useStrategyAnalytics(
    activeTab === 'strategy' ? swrQueryParams : null,
    strategyBodyJson
  )

  // Discipline data with Infinity restoration
  const disciplineData = useMemo(() => {
    if (!disciplineRaw) return null
    const result = { ...disciplineRaw }
    if (result.whatIf) {
      result.whatIf = {
        ...result.whatIf,
        original: { ...result.whatIf.original, profitFactor: restoreInfinity(result.whatIf.original.profitFactor) },
        filtered: { ...result.whatIf.filtered, profitFactor: restoreInfinity(result.whatIf.filtered.profitFactor) },
      }
    }
    return result
  }, [disciplineRaw])

  const commentPerfData = disciplineData?.commentPerformance || []
  const efficiencyData = disciplineData?.efficiency || []
  const disciplineEquityData = disciplineData?.disciplineEquity || []
  const patterns = disciplineData?.patterns || []
  const whatIfResult = disciplineData?.whatIf || emptyWhatIfResult
  const whatIfEquityData = disciplineData?.whatIfEquity || []

  // Strategy data with Infinity restoration
  const strategyData = useMemo(() => {
    if (!strategyRaw) return null
    return {
      ...strategyRaw,
      strategyPerformance: restoreInfinityInArray(strategyRaw.strategyPerformance || [], 'profitFactor'),
    }
  }, [strategyRaw])

  const strategyPerfData = strategyData?.strategyPerformance || []
  const ruleImpactData = strategyData?.ruleImpact || []
  const completionData = strategyData?.completionVsPerformance || []

  // Missed trades data
  const missedStats = missedRaw?.missedStats ?? { totalMissed: 0, totalMissedPnL: 0, avgMultiplier: 0, winCount: 0, reasonBreakdown: [] as MissedTradeAnalytics['reasonBreakdown'], strategyBreakdown: [] as MissedTradeAnalytics['strategyBreakdown'], monthlyTrend: [] as MissedTradeAnalytics['monthlyTrend'] }
  const hesitationCost = missedRaw?.hesitationCost ?? { totalActualPnL: 0, actualWinRate: 0, hesitationCost: 0, missedWinRate: 0, missedPerActual: 0 }

  // ─── Behavior tab data (client-side from journal + trades) ─────────
  const behaviorData = useMemo(() => {
    if (activeTab !== 'behavior') return null

    const entries = Object.entries(journalMap) as [string, JournalData][]

    // Emotion tag performance
    const emotionPerf = EMOTION_TAGS.map((tag) => {
      const matching = entries.filter(([, j]) => j.emotionTag === tag.id)
      const matchingTrades = matching
        .map(([key]) => flattenedTrades.find((t) => `${t.token}-${t.startDate}` === key || t.token === key.split('-')[0]))
        .filter(Boolean)

      const pnls = matchingTrades.map((t) => t!.profitLoss)
      const count = pnls.length
      const wins = pnls.filter((p) => p > 0).length
      const totalPnL = pnls.reduce((s, v) => s + v, 0)
      return {
        tag: tag.label,
        count,
        avgPnL: count > 0 ? totalPnL / count : 0,
        totalPnL,
        winRate: count > 0 ? Math.round((wins / count) * 100) : 0,
      }
    }).filter((d) => d.count > 0)

    // Comment breakdown by category
    function commentBreakdown(category: TradeComment['category']) {
      const catComments = getCommentsByCategory(tradeComments, category)
      const field = category === 'entry' ? 'entryCommentId' : category === 'exit' ? 'exitCommentId' : 'managementCommentId'
      return catComments.map((c) => {
        const matching = entries.filter(([, j]) => (j as any)[field] === c.id)
        const matchingTrades = matching
          .map(([key]) => flattenedTrades.find((t) => `${t.token}-${t.startDate}` === key || t.token === key.split('-')[0]))
          .filter(Boolean)
        const pnls = matchingTrades.map((t) => t!.profitLoss)
        const count = pnls.length
        const wins = pnls.filter((p) => p > 0).length
        const totalPnL = pnls.reduce((s, v) => s + v, 0)
        return {
          label: c.label,
          rating: c.rating,
          count,
          avgPnL: count > 0 ? totalPnL / count : 0,
          totalPnL,
          winRate: count > 0 ? Math.round((wins / count) * 100) : 0,
        }
      }).filter((d) => d.count > 0)
    }

    const entryComments = commentBreakdown('entry')
    const exitComments = commentBreakdown('exit')
    const managementComments = commentBreakdown('management')

    // Mistake frequency
    const mistakeFreq = MISTAKE_OPTIONS.map((mistake) => {
      const matching = entries.filter(([, j]) => {
        const mistakes: string[] = j.sellMistakes || []
        return mistakes.includes(mistake)
      })
      const matchingTrades = matching
        .map(([key]) => flattenedTrades.find((t) => `${t.token}-${t.startDate}` === key || t.token === key.split('-')[0]))
        .filter(Boolean)
      const pnls = matchingTrades.map((t) => t!.profitLoss)
      const count = pnls.length
      const totalPnL = pnls.reduce((s, v) => s + v, 0)
      return {
        label: mistake,
        count,
        avgPnL: count > 0 ? totalPnL / count : 0,
      }
    }).filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count)

    // Emotion x outcome heatmap
    const emotionOutcome = EMOTION_TAGS.map((tag) => {
      const matching = entries.filter(([, j]) => j.emotionTag === tag.id)
      let wins = 0, losses = 0, breakeven = 0
      for (const [key] of matching) {
        const trade = flattenedTrades.find((t) => `${t.token}-${t.startDate}` === key || t.token === key.split('-')[0])
        if (!trade) continue
        if (trade.profitLoss > 0) wins++
        else if (trade.profitLoss < 0) losses++
        else breakeven++
      }
      const total = wins + losses + breakeven
      return { tag: tag.label, wins, losses, breakeven, total }
    }).filter((d) => d.total > 0)

    return { emotionPerf, entryComments, exitComments, managementComments, mistakeFreq, emotionOutcome }
  }, [activeTab, journalMap, flattenedTrades, tradeComments])

  // ─── Sessions tab data ────────────────────────────────────────────
  const [preSessions, setPreSessions] = useState<PreSessionData[]>([])
  const [postSessions, setPostSessions] = useState<PostSessionData[]>([])
  const [sessionsLoaded, setSessionsLoaded] = useState(false)

  useEffect(() => {
    if (activeTab !== 'sessions' || sessionsLoaded) return
    Promise.all([loadPreSessions(), loadPostSessions()]).then(([pre, post]) => {
      setPreSessions(pre)
      setPostSessions(post)
      setSessionsLoaded(true)
    })
  }, [activeTab, sessionsLoaded])

  const sessionsData = useMemo(() => {
    if (activeTab !== 'sessions') return null

    // Energy vs Performance (scatter)
    const energyPerf = preSessions
      .filter((ps) => ps.energyLevel > 0)
      .map((ps) => {
        const dayTrades = flattenedTrades.filter((t) => {
          const d = new Date((t.startDate || 0) * 1000).toISOString().split('T')[0]
          return d === ps.date
        })
        const dayPnL = dayTrades.reduce((s, t) => s + t.profitLoss, 0)
        return { energy: ps.energyLevel, pnl: dayPnL, date: ps.date }
      })

    // Pre-session emotional state distribution
    const emotionalDist: Record<string, number> = {}
    for (const ps of preSessions) {
      if (ps.emotionalState) {
        emotionalDist[ps.emotionalState] = (emotionalDist[ps.emotionalState] || 0) + 1
      }
    }
    const emotionalDistData = Object.entries(emotionalDist)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    // Post-session ratings trend
    const ratingsTrend = postSessions
      .filter((ps) => ps.rating > 0)
      .map((ps) => ({ date: ps.date, rating: ps.rating }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Rules adherence
    const rulesAdherence = preSessions
      .filter((ps) => ps.rulesChecked.length > 0)
      .map((ps) => ({
        date: ps.date,
        percentage: ps.rulesChecked.length > 0 ? 100 : 0, // checked count / total rules
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Session completion over time (daily)
    const allDates = new Set<string>()
    preSessions.forEach((ps) => allDates.add(ps.date))
    postSessions.forEach((ps) => allDates.add(ps.date))
    const sortedDates = [...allDates].sort()
    const completionOverTime = sortedDates.map((date) => ({
      date,
      preDone: preSessions.some((ps) => ps.date === date) ? 100 : 0,
      postDone: postSessions.some((ps) => ps.date === date) ? 100 : 0,
    }))

    // Journaling streak
    const journaledDates = new Set<string>()
    for (const [, j] of Object.entries(journalMap)) {
      if (j.journaledAt) {
        journaledDates.add(j.journaledAt.split('T')[0])
      }
    }

    let currentStreak = 0
    let longestStreak = 0
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      if (journaledDates.has(dateStr) || preSessions.some((ps) => ps.date === dateStr) || postSessions.some((ps) => ps.date === dateStr)) {
        streak++
        if (streak > longestStreak) longestStreak = streak
        if (i === 0 || currentStreak === i) currentStreak = streak
      } else {
        streak = 0
      }
    }

    const totalDays = sortedDates.length
    const consistency = totalDays > 0 ? Math.round((journaledDates.size / Math.max(totalDays, 1)) * 100) : 0

    return { energyPerf, emotionalDistData, ratingsTrend, rulesAdherence, completionOverTime, currentStreak, longestStreak, consistency }
  }, [activeTab, preSessions, postSessions, flattenedTrades, journalMap])

  // ─── Derived client-side values (lightweight) ───────────────────────
  const journalStrategies = useMemo(() => {
    const set = new Set<string>()
    for (const j of Object.values(journalMap)) {
      if (j.strategy) set.add(j.strategy)
    }
    return [...set]
  }, [journalMap])

  const negativeComments = useMemo(
    () => tradeComments.filter((c) => c.rating === 'negative'),
    [tradeComments]
  )

  const hasAnyFilter = whatIfFilter.excludeComments.length > 0 ||
    whatIfFilter.excludeRatings.length > 0 ||
    whatIfFilter.excludeTags.length > 0 ||
    whatIfFilter.excludeStrategies.length > 0 ||
    whatIfFilter.excludeUndisciplined

  const toggleFilterComment = useCallback((id: string) => {
    setWhatIfFilter((f) => ({
      ...f,
      excludeComments: f.excludeComments.includes(id)
        ? f.excludeComments.filter((c) => c !== id)
        : [...f.excludeComments, id],
    }))
  }, [])

  const toggleFilterTag = useCallback((tag: string) => {
    setWhatIfFilter((f) => ({
      ...f,
      excludeTags: f.excludeTags.includes(tag)
        ? f.excludeTags.filter((t) => t !== tag)
        : [...f.excludeTags, tag],
    }))
  }, [])

  const toggleFilterStrategy = useCallback((strat: string) => {
    setWhatIfFilter((f) => ({
      ...f,
      excludeStrategies: f.excludeStrategies.includes(strat)
        ? f.excludeStrategies.filter((s) => s !== strat)
        : [...f.excludeStrategies, strat],
    }))
  }, [])

  // Check if current tab is loading
  const isTabLoading = (activeTab === 'overview' && (overviewLoading || calendarLoading)) ||
    (activeTab === 'time' && timeLoading) ||
    (activeTab === 'discipline' && disciplineLoading) ||
    (activeTab === 'strategy' && strategyLoading) ||
    (activeTab === 'missed' && missedLoading) ||
    (activeTab === 'sessions' && !sessionsLoaded)

  if (!initialized || (isAnyLoading && allTrades.length === 0)) {
    return (
      <div className="max-w-4xl pt-8">
        <h1 className="text-xl font-semibold mb-6">Analytics</h1>
        <StatStripSkeleton count={5} />
        <div className="space-y-10">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    )
  }

  if (!hasActiveWallets) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Activate a wallet in Wallet Management to view trading analytics.
        </p>
      </div>
    )
  }

  if (flattenedTrades.length === 0) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          No trade cycles found. Make some trades to see analytics.
        </p>
      </div>
    )
  }

  const totalTrades = flattenedTrades.length
  const profitableTrades = flattenedTrades.filter((t) => t.profitLoss > 0).length
  const totalPL = flattenedTrades.reduce((s, t) => s + t.profitLoss, 0)
  const avgPLPerTrade = totalTrades > 0 ? totalPL / totalTrades : 0

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Analytics</h1>
        <TimeRangeFilter value={timeRange} preset={timePreset} onChange={setTimeFilter} />
      </div>

      {/* Stats row — overview only */}
      {activeTab === 'overview' && (
        <div className="flex flex-wrap gap-x-10 gap-y-2 mb-6 text-sm">
          <div>
            <span className="text-muted-foreground">Completed</span>
            <span className="ml-2 font-mono tabular-nums font-semibold">
              {completedTrades.length}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Win Rate</span>
            <span className="ml-2 font-mono tabular-nums font-semibold">
              {totalTrades > 0
                ? ((profitableTrades / totalTrades) * 100).toFixed(0)
                : 0}
              %
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg Duration</span>
            <span className="ml-2 font-mono tabular-nums font-semibold">
              {avgDuration > 0 ? formatDuration(avgDuration) : '-'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Avg P/L</span>
            <span
              className={`ml-2 font-mono tabular-nums font-semibold ${
                avgPLPerTrade >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {avgPLPerTrade >= 0 ? '+' : ''}
              {formatValue(avgPLPerTrade)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Total P/L</span>
            <span
              className={`ml-2 font-mono tabular-nums font-semibold ${
                totalPL >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {totalPL >= 0 ? '+' : ''}
              {formatValue(totalPL)}
            </span>
          </div>
        </div>
      )}

      {/* Key Metrics — overview only */}
      {activeTab === 'overview' && (() => {
        const winners = completedTrades.filter((t) => t.profitLoss > 0)
        const losers = completedTrades.filter((t) => t.profitLoss < 0)
        const avgWinner = winners.length > 0 ? winners.reduce((s, t) => s + t.profitLoss, 0) / winners.length : 0
        const avgLoser = losers.length > 0 ? losers.reduce((s, t) => s + t.profitLoss, 0) / losers.length : 0
        const totalCompletedPL = completedTrades.reduce((s, t) => s + t.profitLoss, 0)
        const expectancy = completedTrades.length > 0 ? totalCompletedPL / completedTrades.length : 0
        const winSum = winners.reduce((s, t) => s + t.profitLoss, 0)
        const lossSum = Math.abs(losers.reduce((s, t) => s + t.profitLoss, 0))
        const profitFactor = lossSum > 0 ? winSum / lossSum : (winSum > 0 ? Infinity : 0)

        let peak = 0, maxDD = 0, cumPL = 0
        for (const t of completedTrades) {
          cumPL += t.profitLoss
          if (cumPL > peak) peak = cumPL
          const dd = peak - cumPL
          if (dd > maxDD) maxDD = dd
        }

        const pctReturns = completedTrades.filter((t) => t.totalBuyValue > 0).map((t) => t.profitLoss / t.totalBuyValue)
        const n = pctReturns.length
        const meanRet = n > 0 ? pctReturns.reduce((s, r) => s + r, 0) / n : 0
        const variance = n > 1 ? pctReturns.reduce((s, r) => s + (r - meanRet) ** 2, 0) / (n - 1) : 0
        const stdDev = Math.sqrt(variance)
        const annFactor = Math.sqrt(252 / Math.max(1, n))
        const sharpe = stdDev > 0 ? (meanRet / stdDev) * annFactor : 0

        const downsideSquares = pctReturns.filter((r) => r < 0).map((r) => r ** 2)
        const downVariance = downsideSquares.length > 0 ? downsideSquares.reduce((s, v) => s + v, 0) / n : 0
        const sortino = Math.sqrt(downVariance) > 0 ? (meanRet / Math.sqrt(downVariance)) * annFactor : 0

        const calmar = maxDD > 0 ? totalCompletedPL / maxDD : 0
        const gainToPain = lossSum > 0 ? totalCompletedPL / lossSum : (totalCompletedPL > 0 ? Infinity : 0)

        const metrics = [
          { label: 'Avg Winner', value: avgWinner, isCurrency: true },
          { label: 'Avg Loser', value: avgLoser, isCurrency: true },
          { label: 'Expectancy', value: expectancy, isCurrency: true },
          { label: 'Profit Factor', value: profitFactor, isCurrency: false },
          { label: 'Max Drawdown', value: -maxDD, isCurrency: true },
          { label: 'Sharpe Ratio', value: sharpe, isCurrency: false },
          { label: 'Sortino Ratio', value: sortino, isCurrency: false },
          { label: 'Calmar Ratio', value: calmar, isCurrency: false },
          { label: 'Gain to Pain', value: gainToPain, isCurrency: false },
        ]

        return completedTrades.length > 0 ? (
          <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-8">
            {metrics.map((m) => (
              <div key={m.label} className="rounded-lg border bg-card p-3 text-center">
                <div
                  className={`text-sm font-mono tabular-nums font-semibold ${
                    m.isCurrency ? (m.value >= 0 ? 'text-emerald-600' : 'text-red-600') : ''
                  }`}
                >
                  {m.value === Infinity
                    ? '\u221e'
                    : m.isCurrency
                      ? `${m.value >= 0 ? '+' : ''}${formatValue(m.value)}`
                      : m.value.toFixed(2)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        ) : null
      })()}

      {/* ─── Advanced Filters (What-If) ─── */}
      {activeTab === 'discipline' && (
        <div className="mb-8 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Advanced Filters</span>
            <span className="text-xs text-muted-foreground ml-1">What-If Scenario</span>
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            Exclude certain trades to see the impact on your results.
          </p>

          {/* Filter: Undisciplined */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={whatIfFilter.excludeUndisciplined}
                onChange={(e) => setWhatIfFilter((f) => ({ ...f, excludeUndisciplined: e.target.checked }))}
                className="rounded border-border"
              />
              All undisciplined trades (any negative comment)
            </label>

            {/* Filter: Negative comments */}
            {negativeComments.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Exclude trades with comment:</p>
                <div className="flex flex-wrap gap-1.5">
                  {negativeComments.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => toggleFilterComment(c.id)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                        whatIfFilter.excludeComments.includes(c.id)
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filter: Emotion tags */}
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Exclude by emotion:</p>
              <div className="flex flex-wrap gap-1.5">
                {whatIfEmotionTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleFilterTag(tag.id)}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                      whatIfFilter.excludeTags.includes(tag.id)
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter: Strategies */}
            {journalStrategies.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Exclude by strategy:</p>
                <div className="flex flex-wrap gap-1.5">
                  {journalStrategies.map((strat) => (
                    <button
                      key={strat}
                      onClick={() => toggleFilterStrategy(strat)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                        whatIfFilter.excludeStrategies.includes(strat)
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border text-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      {strat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reset */}
            {hasAnyFilter && (
              <button
                onClick={() => setWhatIfFilter(defaultFilter)}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Reset filters
              </button>
            )}

            {/* What-If Results */}
            {hasAnyFilter && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground mb-3 font-medium">Actual</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Trades</span>
                        <span className="font-mono tabular-nums">{whatIfResult.original.totalTrades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">P/L</span>
                        <span className={`font-mono tabular-nums ${whatIfResult.original.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatValue(whatIfResult.original.totalPnL)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Win Rate</span>
                        <span className="font-mono tabular-nums">{whatIfResult.original.winRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profit Factor</span>
                        <span className="font-mono tabular-nums">
                          {whatIfResult.original.profitFactor === Infinity ? '\u221e' : whatIfResult.original.profitFactor.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <p className="text-xs text-muted-foreground mb-3 font-medium">
                      What-If <span className="text-muted-foreground/70">(-{whatIfResult.tradesRemoved} trades)</span>
                    </p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Trades</span>
                        <span className="font-mono tabular-nums">{whatIfResult.filtered.totalTrades}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">P/L</span>
                        <span className={`font-mono tabular-nums ${whatIfResult.filtered.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatValue(whatIfResult.filtered.totalPnL)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Win Rate</span>
                        <span className="font-mono tabular-nums">{whatIfResult.filtered.winRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profit Factor</span>
                        <span className="font-mono tabular-nums">
                          {whatIfResult.filtered.profitFactor === Infinity ? '\u221e' : whatIfResult.filtered.profitFactor.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {whatIfResult.pnlDifference !== 0 && (
                  <p className="text-xs text-muted-foreground">
                    {whatIfResult.pnlDifference > 0
                      ? `Those ${whatIfResult.tradesRemoved} excluded trades cost you $${Math.abs(whatIfResult.pnlDifference).toFixed(2)}.`
                      : `Removing those ${whatIfResult.tradesRemoved} trades would reduce your P/L by $${Math.abs(whatIfResult.pnlDifference).toFixed(2)}.`
                    }
                  </p>
                )}

                {whatIfEquityData.length >= 2 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-3">Equity curve comparison</p>
                    <ChartContainer config={whatIfEquityConfig} className="h-[220px] w-full">
                      <LineChart data={whatIfEquityData}>
                        <defs>
                          <GlowFilter id="whatif-glow" color="var(--color-actualPnL)" stdDeviation={2.5} />
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="tradeIndex" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => [
                                `$${Number(value).toFixed(2)}`,
                                name === 'actualPnL' ? 'Actual' : 'What-If',
                              ]}
                            />
                          }
                        />
                        <Line type="monotone" dataKey="actualPnL" stroke="var(--color-actualPnL)" strokeWidth={2} dot={false} filter="url(#whatif-glow)" />
                        <Line type="monotone" dataKey="filteredPnL" stroke="var(--color-filteredPnL)" strokeWidth={2} strokeDasharray="6 3" dot={false} />
                      </LineChart>
                    </ChartContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab loading skeleton */}
      {isTabLoading && (
        <div className="space-y-10">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      )}

      {/* ─── Overview Tab ─── */}
      {activeTab === 'overview' && !overviewLoading && (<ErrorBoundary fallback={tabErrorFallback}><>

      {/* Cumulative P/L */}
      {plData.length >= 2 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Cumulative P/L</h2>
          <ChartContainer config={plConfig} className="h-[250px] w-full">
            <LineChart data={plData}>
              <defs>
                <GlowFilter id="pl-glow" color="var(--color-cumulativePL)" stdDeviation={3} />
                <GlowAreaGradient id="pl-area-grad" color="var(--color-cumulativePL)" topOpacity={0.2} />
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tickFormatter={(value, index) => {
                  if (index === 0) return value
                  const prevDate = plData[index - 1]?.date
                  return prevDate === value ? '' : value
                }}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      `$${Number(value).toFixed(2)}`,
                      name === 'cumulativePL' ? 'Cumulative' : String(name),
                    ]}
                  />
                }
              />
              <Area type="monotone" dataKey="cumulativePL" stroke="none" fill="url(#pl-area-grad)" />
              <Line type="monotone" dataKey="cumulativePL" stroke="var(--color-cumulativePL)" strokeWidth={2} dot={false} filter="url(#pl-glow)" activeDot={<ActivePingingDot />} />
            </LineChart>
          </ChartContainer>
        </section>
      )}

      {/* Duration Distribution */}
      {durationData.some((d) => d.count > 0) && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Trade Duration Distribution</h2>
          <ChartContainer config={durationConfig} className="h-[220px] w-full">
            <BarChart data={durationData}>
              <defs>
                <GradientBarDefs id="duration-grad" color="var(--color-count)" />
                <DottedBackgroundPattern id="duration-dots" />
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <rect width="100%" height="100%" fill="url(#duration-dots)" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="url(#duration-grad)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </section>
      )}

      {/* Trading Hours */}
      {hoursData.some((d) => d.count > 0) && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Trading Hours</h2>
          <div className="flex items-center gap-4 mb-3">
            <p className="text-xs text-muted-foreground">
              When your trades start, colored by average profitability
            </p>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'oklch(0.527 0.154 163.225)' }} /> Profitable</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'oklch(0.577 0.245 27.325)' }} /> Losing</span>
            </div>
          </div>
          <ChartContainer config={hoursConfig} className="h-[220px] w-full">
            <BarChart data={hoursData}>
              <defs>
                <GradientBarDefs id="hours-grad-green" color="oklch(0.527 0.154 163.225)" />
                <GradientBarDefs id="hours-grad-red" color="oklch(0.577 0.245 27.325)" />
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      name === 'count' ? `${value} trades` : `$${Number(value).toFixed(2)}`,
                      name === 'count' ? 'Count' : 'Avg P/L',
                    ]}
                  />
                }
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {hoursData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.count === 0 ? 'var(--color-count)'
                        : entry.avgPL >= 0 ? 'url(#hours-grad-green)' : 'url(#hours-grad-red)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </section>
      )}

      {/* P/L Calendar */}
      {!calendarLoading && (
      <section className="mb-10">
        <h2 className="text-sm font-semibold mb-4">P/L Calendar</h2>
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={() => {
              if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1) }
              else setCalMonth((m) => m - 1)
            }}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border"
          >
            Prev
          </button>
          <span className="text-sm font-medium">{MONTH_NAMES[calMonth]} {calYear}</span>
          <button
            onClick={() => {
              if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1) }
              else setCalMonth((m) => m + 1)
            }}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded border border-border"
          >
            Next
          </button>
          <span className="ml-auto text-xs text-muted-foreground">
            {calendarData.totalTrades} trades | {calendarData.totalPnL >= 0 ? '+' : ''}{formatValue(calendarData.totalPnL)}
          </span>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-8 text-xs text-muted-foreground border-b">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Wk P/L'].map((d) => (
              <div key={d} className="p-2 text-center font-medium">{d}</div>
            ))}
          </div>
          {calendarData.weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-8 border-b last:border-b-0">
              {week.days.map((day, di) => (
                <div
                  key={di}
                  className={`p-1.5 min-h-[52px] border-r text-center cursor-pointer hover:ring-1 hover:ring-primary/30 hover:shadow-[0_0_8px_rgba(16,185,129,0.2)] transition-all ${
                    day && day.tradeCount > 0 ? getDayColorClass(day.pnl, calMaxPnl, calMaxLoss) : 'bg-zinc-100 dark:bg-zinc-800/30'
                  } ${selectedDay === day?.date ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => day && day.tradeCount > 0 && setSelectedDay(selectedDay === day.date ? null : day.date)}
                >
                  {day && (
                    <>
                      <div className="text-[10px] text-muted-foreground">{parseInt(day.date.split('-')[2])}</div>
                      {day.tradeCount > 0 && (
                        <div className={`text-[10px] font-mono font-medium ${day.pnl >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                          {day.pnl >= 0 ? '+' : ''}{formatValue(day.pnl)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              <div className="p-1.5 text-center flex items-center justify-center">
                <span className={`text-xs font-mono ${week.weeklyPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {week.weeklyPnL !== 0 ? `${week.weeklyPnL >= 0 ? '+' : ''}${formatValue(week.weeklyPnL)}` : '-'}
                </span>
              </div>
            </div>
          ))}
        </div>
        {selectedDay && (() => {
          const dayData = calendarData.weeks.flatMap((w) => w.days).find((d) => d?.date === selectedDay)
          if (!dayData || dayData.tradeCount === 0) return null
          return (
            <div className="mt-3 p-3 rounded-lg border bg-muted/30 text-sm">
              <p className="font-medium mb-1">{selectedDay}</p>
              <div className="flex gap-6 text-xs text-muted-foreground">
                <span>Trades: {dayData.tradeCount}</span>
                <span>Wins: {dayData.wins}</span>
                <span>Losses: {dayData.losses}</span>
                <span className={dayData.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                  P/L: {dayData.pnl >= 0 ? '+' : ''}{formatValue(dayData.pnl)}
                </span>
              </div>
            </div>
          )
        })()}
        {calendarData.bestDay && (
          <div className="flex gap-6 mt-3 text-xs text-muted-foreground">
            <span>Best day: {calendarData.bestDay.date} (+{formatValue(calendarData.bestDay.pnl)})</span>
            {calendarData.worstDay && (
              <span>Worst day: {calendarData.worstDay.date} ({formatValue(calendarData.worstDay.pnl)})</span>
            )}
          </div>
        )}
      </section>
      )}

      </></ErrorBoundary>)}

      {/* ─── Time Analysis Tab ─── */}
      {activeTab === 'time' && !timeLoading && (<ErrorBoundary fallback={tabErrorFallback}><>

      <h2 className="text-lg font-semibold mb-6">Time Analysis</h2>

      {hourlyPerfData.some((d) => d.tradeCount > 0) && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Hourly P/L Breakdown</h2>
          <p className="text-xs text-muted-foreground mb-3">Total P/L by hour of day</p>
          <ChartContainer config={hourlyPLConfig} className="h-[220px] w-full">
            <BarChart data={hourlyPerfData}>
              <defs>
                <GradientBarDefs id="hourly-grad-green" color="oklch(0.527 0.154 163.225)" />
                <GradientBarDefs id="hourly-grad-red" color="oklch(0.577 0.245 27.325)" />
                <DottedBackgroundPattern id="hourly-dots" />
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <rect width="100%" height="100%" fill="url(#hourly-dots)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const d = item.payload as (typeof hourlyPerfData)[number]
                      return [`$${Number(value).toFixed(2)} total | ${d.tradeCount} trades | ${d.winRate}% WR`, d.label]
                    }}
                  />
                }
              />
              <Bar dataKey="totalPnL" radius={[2, 2, 0, 0]}>
                {hourlyPerfData.map((entry, index) => (
                  <Cell key={index} fill={entry.totalPnL >= 0 ? 'url(#hourly-grad-green)' : 'url(#hourly-grad-red)'} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          {(() => {
            const active = hourlyPerfData.filter((d) => d.tradeCount >= 2)
            if (active.length < 2) return null
            const best = active.reduce((a, b) => (b.avgPnL > a.avgPnL ? b : a))
            const worst = active.reduce((a, b) => (b.avgPnL < a.avgPnL ? b : a))
            return (
              <p className="text-xs text-muted-foreground mt-2">
                Best hour: {best.label} (avg +${best.avgPnL.toFixed(2)}, {best.winRate}% WR) | Worst: {worst.label} (avg ${worst.avgPnL.toFixed(2)})
              </p>
            )
          })()}
        </section>
      )}

      {dayOfWeekData.some((d) => d.tradeCount > 0) && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Day of Week Performance</h2>
          <ChartContainer config={dayOfWeekConfig} className="h-[200px] w-full">
            <BarChart data={dayOfWeekData}>
              <defs>
                <GradientBarDefs id="dow-grad-green" color="oklch(0.527 0.154 163.225)" />
                <HatchPatternDefs id="dow-hatch-red" color="oklch(0.577 0.245 27.325)" />
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const d = item.payload as (typeof dayOfWeekData)[number]
                      return [`$${Number(value).toFixed(2)} | ${d.tradeCount} trades | ${d.winRate}% WR`, d.label]
                    }}
                  />
                }
              />
              <Bar dataKey="totalPnL" radius={[3, 3, 0, 0]}>
                {dayOfWeekData.map((entry, index) => (
                  <Cell key={index} fill={entry.totalPnL >= 0 ? 'url(#dow-grad-green)' : 'url(#dow-hatch-red)'} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </section>
      )}

      {sessionPerfData.some((s) => s.tradeCount > 0) && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Session Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {sessionPerfData.filter((s) => s.tradeCount > 0).map((s) => (
              <div key={s.session.name} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.session.color }} />
                  <span className="text-xs font-medium">{s.session.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{s.session.startHour}:00-{s.session.endHour}:00</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Trades</span><span className="font-mono">{s.tradeCount}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">P/L</span><span className={`font-mono ${s.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{s.totalPnL >= 0 ? '+' : ''}{formatValue(s.totalPnL)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Win Rate</span><span className="font-mono">{s.winRate}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">PF</span><span className="font-mono">{s.profitFactor === Infinity ? '\u221e' : s.profitFactor.toFixed(2)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {enhancedDurationData.some((d) => d.count > 0) && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Duration Analysis</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left p-2">Duration</th>
                  <th className="text-right p-2">Trades</th>
                  <th className="text-right p-2">Avg P/L</th>
                  <th className="text-right p-2">Total P/L</th>
                  <th className="text-right p-2">Win Rate</th>
                  <th className="text-right p-2">Profit Factor</th>
                </tr>
              </thead>
              <tbody>
                {enhancedDurationData.filter((d) => d.count > 0).map((d) => (
                  <tr key={d.bucket} className="border-b border-border/50">
                    <td className="p-2 font-medium">{d.bucket}</td>
                    <td className="p-2 text-right font-mono">{d.count}</td>
                    <td className={`p-2 text-right font-mono ${d.avgPL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{d.avgPL >= 0 ? '+' : ''}{formatValue(d.avgPL)}</td>
                    <td className={`p-2 text-right font-mono ${d.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{d.totalPnL >= 0 ? '+' : ''}{formatValue(d.totalPnL)}</td>
                    <td className="p-2 text-right font-mono">{d.winRate}%</td>
                    <td className="p-2 text-right font-mono">{d.profitFactor === Infinity ? '\u221e' : d.profitFactor.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      </></ErrorBoundary>)}

      {/* ─── Strategy Tab ─── */}
      {activeTab === 'strategy' && !strategyLoading && (<ErrorBoundary fallback={tabErrorFallback}><>

      <h2 className="text-lg font-semibold mb-6">Strategy Analysis</h2>

      {strategyPerfData.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Strategy Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left p-2">Strategy</th>
                  <th className="text-right p-2">Trades</th>
                  <th className="text-right p-2">Total P/L</th>
                  <th className="text-right p-2">Avg P/L</th>
                  <th className="text-right p-2">Win Rate</th>
                  <th className="text-right p-2">PF</th>
                  <th className="text-right p-2">Follow Rate</th>
                  <th className="text-right p-2">Best</th>
                  <th className="text-right p-2">Worst</th>
                </tr>
              </thead>
              <tbody>
                {strategyPerfData.map((s) => (
                  <tr key={s.strategyId} className="border-b border-border/50">
                    <td className="p-2 font-medium">{s.strategyName}</td>
                    <td className="p-2 text-right font-mono">{s.tradeCount}</td>
                    <td className={`p-2 text-right font-mono ${s.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{s.totalPnL >= 0 ? '+' : ''}{formatValue(s.totalPnL)}</td>
                    <td className={`p-2 text-right font-mono ${s.avgPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatValue(s.avgPnL)}</td>
                    <td className="p-2 text-right font-mono">{s.winRate}%</td>
                    <td className="p-2 text-right font-mono">{s.profitFactor === Infinity ? '\u221e' : s.profitFactor.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">{s.avgFollowRate > 0 ? `${s.avgFollowRate}%` : '-'}</td>
                    <td className="p-2 text-right font-mono text-emerald-600">+{formatValue(s.bestTrade)}</td>
                    <td className="p-2 text-right font-mono text-red-600">{formatValue(s.worstTrade)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {ruleImpactData.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Rule Impact Analysis</h2>
          <p className="text-xs text-muted-foreground mb-3">Difference in avg P/L when rule is followed vs skipped</p>
          <ChartContainer config={ruleImpactConfig} className="w-full" style={{ height: `${ruleImpactData.length * 32 + 40}px` }}>
            <BarChart data={ruleImpactData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <defs>
                <GradientBarDefs id="rule-grad-green" color="oklch(0.527 0.154 163.225)" />
                <HatchPatternDefs id="rule-hatch-red" color="oklch(0.577 0.245 27.325)" />
              </defs>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <YAxis dataKey="ruleText" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={180} />
              <ReferenceLine x={0} stroke="var(--border)" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const d = item.payload as (typeof ruleImpactData)[number]
                      return [`Impact: $${Number(value).toFixed(2)} | Followed: ${d.followedCount}x ($${d.avgPnLWhenFollowed}) | Skipped: ${d.skippedCount}x ($${d.avgPnLWhenSkipped})`, d.ruleText]
                    }}
                  />
                }
              />
              <Bar dataKey="impact" radius={[0, 3, 3, 0]}>
                {ruleImpactData.map((entry, index) => (
                  <Cell key={index} fill={entry.impact >= 0 ? 'url(#rule-grad-green)' : 'url(#rule-hatch-red)'} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </section>
      )}

      {completionData.some((b) => b.tradeCount > 0) && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Checklist Completion vs P/L</h2>
          <ChartContainer config={completionConfig} className="h-[200px] w-full">
            <BarChart data={completionData}>
              <defs>
                <GradientBarDefs id="comp-grad-green" color="oklch(0.527 0.154 163.225)" />
                <GradientBarDefs id="comp-grad-red" color="oklch(0.577 0.245 27.325)" />
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const d = item.payload as (typeof completionData)[number]
                      return [`$${Number(value).toFixed(2)} avg | ${d.tradeCount} trades | ${d.winRate}% WR`, d.range]
                    }}
                  />
                }
              />
              <Bar dataKey="avgPnL" radius={[3, 3, 0, 0]}>
                {completionData.map((entry, index) => (
                  <Cell key={index} fill={entry.avgPnL >= 0 ? 'url(#comp-grad-green)' : 'url(#comp-grad-red)'} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </section>
      )}

      </></ErrorBoundary>)}

      {/* ─── Missed Trades Tab ─── */}
      {activeTab === 'missed' && !missedLoading && (<ErrorBoundary fallback={tabErrorFallback}><>

      <h2 className="text-lg font-semibold mb-6">Missed Trades</h2>

      {missedStats.totalMissed > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Missed Trade Analytics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-lg font-mono font-semibold">{missedStats.totalMissed}</div>
              <div className="text-[10px] text-muted-foreground">Total Missed</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-lg font-mono font-semibold text-amber-500">{formatValue(missedStats.totalMissedPnL)}</div>
              <div className="text-[10px] text-muted-foreground">Missed Profit</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-lg font-mono font-semibold">{missedStats.avgMultiplier.toFixed(1)}x</div>
              <div className="text-[10px] text-muted-foreground">Avg Multiplier</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-lg font-mono font-semibold">
                {missedStats.totalMissed > 0 ? Math.round((missedStats.winCount / missedStats.totalMissed) * 100) : 0}%
              </div>
              <div className="text-[10px] text-muted-foreground">Would-be Win Rate</div>
            </div>
          </div>

          {missedStats.reasonBreakdown.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-2">By Reason</h3>
              <div className="space-y-1.5">
                {missedStats.reasonBreakdown.map((r) => (
                  <div key={r.reason} className="flex items-center gap-2 text-xs">
                    <span className="w-24 truncate">{r.reason}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(r.count / missedStats.totalMissed) * 100}%` }} />
                    </div>
                    <span className="font-mono w-8 text-right">{r.count}</span>
                    <span className="font-mono w-20 text-right text-muted-foreground">{formatValue(r.totalMissedPnL)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Actual Trading</p>
              <div className={`text-sm font-mono font-semibold ${hesitationCost.totalActualPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {hesitationCost.totalActualPnL >= 0 ? '+' : ''}{formatValue(hesitationCost.totalActualPnL)}
              </div>
              <p className="text-[10px] text-muted-foreground">{hesitationCost.actualWinRate}% win rate</p>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Hesitation Cost</p>
              <div className="text-sm font-mono font-semibold text-amber-500">{formatValue(hesitationCost.hesitationCost)}</div>
              <p className="text-[10px] text-muted-foreground">{hesitationCost.missedWinRate}% would-be WR</p>
            </div>
          </div>
        </section>
      )}

      </></ErrorBoundary>)}

      {/* ─── Discipline Tab ─── */}
      {activeTab === 'discipline' && !disciplineLoading && (<ErrorBoundary fallback={tabErrorFallback}><>

      <h2 className="text-lg font-semibold mb-6">Discipline</h2>

      {patterns.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Insights</h2>
          <div className="grid gap-3">
            {patterns.map((p) => (
              <div
                key={p.id}
                className={`rounded-lg border p-4 text-sm ${
                  p.severity === 'critical' ? 'border-red-500/30 bg-red-500/5'
                    : p.severity === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5'
                    : 'border-border bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>{p.type === 'positive' ? '\u2705' : p.type === 'negative' ? '\u26a0\ufe0f' : '\ud83d\udca1'}</span>
                  <span className="font-medium">{p.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{p.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-sm font-semibold mb-4">Comment Performance</h2>
        <p className="text-xs text-muted-foreground mb-4">How each trade comment correlates with P/L across your trades</p>
        {commentPerfData.length > 0 ? (
          <ChartContainer config={commentPerfConfig} className="w-full" style={{ height: `${commentPerfData.length * 36 + 40}px` }}>
            <BarChart data={commentPerfData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <defs>
                <GradientBarDefs id="comment-grad-green" color="oklch(0.527 0.154 163.225)" />
                <GradientBarDefs id="comment-grad-red" color="oklch(0.577 0.245 27.325)" />
              </defs>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={160} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const d = item.payload as (typeof commentPerfData)[number]
                      return [`$${Number(value).toFixed(2)} total | $${d.avgPnL.toFixed(2)} avg | ${d.tradeCount} trades | ${d.winRate}% WR`, d.label]
                    }}
                  />
                }
              />
              <Bar dataKey="totalPnL" radius={[0, 3, 3, 0]}>
                {commentPerfData.map((entry, index) => (
                  <Cell key={index} fill={entry.totalPnL >= 0 ? 'url(#comment-grad-green)' : 'url(#comment-grad-red)'} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-xs text-muted-foreground/70">Journal trades with comments assigned to see performance insights.</p>
        )}
      </section>

      {efficiencyData.length >= 2 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Discipline Efficiency</h2>
          <p className="text-xs text-muted-foreground mb-3">% of positive comments out of all non-neutral comments assigned</p>
          <ChartContainer config={efficiencyConfig} className="h-[250px] w-full">
            <LineChart data={efficiencyData}>
              <defs>
                <GlowFilter id="eff-glow" color="oklch(0.527 0.154 163.225)" stdDeviation={2.5} />
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="tradeIndex" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} label={{ value: 'Trade #', position: 'insideBottomRight', offset: -5, fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <ReferenceLine y={70} stroke="oklch(0.527 0.154 163.225)" strokeDasharray="4 4" strokeOpacity={0.5} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [`${Number(value)}%`, name === 'cumulativeEfficiency' ? 'Cumulative' : 'Rolling (20)']}
                  />
                }
              />
              <Line type="monotone" dataKey="cumulativeEfficiency" stroke="var(--color-cumulativeEfficiency)" strokeWidth={2} dot={false} filter="url(#eff-glow)" activeDot={<ActivePingingDot />} />
              <Line type="monotone" dataKey="rollingEfficiency" stroke="var(--color-rollingEfficiency)" strokeWidth={1.5} strokeDasharray="4 2" dot={false} />
            </LineChart>
          </ChartContainer>
        </section>
      )}

      {disciplineEquityData.length >= 2 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Discipline vs P/L</h2>
          <p className="text-xs text-muted-foreground mb-3">See how discipline score correlates with your equity curve</p>
          <ChartContainer config={disciplineEquityConfig} className="h-[280px] w-full">
            <ComposedChart data={disciplineEquityData}>
              <defs>
                <GlowFilter id="disc-eq-glow" color="var(--color-cumulativePnL)" stdDeviation={3} />
                <GlowAreaGradient id="disc-area-grad" color="oklch(0.527 0.154 163.225)" topOpacity={0.15} />
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="tradeIndex" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="pnl" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <YAxis yAxisId="discipline" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      name === 'cumulativePnL' ? `$${Number(value).toFixed(2)}` : `${Number(value)}%`,
                      name === 'cumulativePnL' ? 'P/L' : 'Discipline',
                    ]}
                  />
                }
              />
              <Area yAxisId="discipline" type="monotone" dataKey="disciplineScore" stroke="oklch(0.527 0.154 163.225)" fill="url(#disc-area-grad)" strokeWidth={1} />
              <Line yAxisId="pnl" type="monotone" dataKey="cumulativePnL" stroke="var(--color-cumulativePnL)" strokeWidth={2} dot={false} filter="url(#disc-eq-glow)" activeDot={<ActivePingingDot />} />
            </ComposedChart>
          </ChartContainer>
        </section>
      )}

      </></ErrorBoundary>)}

      {/* ─── Behavior Tab ─── */}
      {activeTab === 'behavior' && (<ErrorBoundary fallback={tabErrorFallback}><>

      <h2 className="text-lg font-semibold mb-6">Behavior</h2>

      {behaviorData && behaviorData.emotionPerf.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Emotion Tag Performance</h2>
          <p className="text-xs text-muted-foreground mb-3">Average P/L when trading with each emotional state</p>
          <ChartContainer config={behaviorBarConfig} className="w-full" style={{ height: `${behaviorData.emotionPerf.length * 36 + 40}px` }}>
            <BarChart data={behaviorData.emotionPerf} layout="vertical" margin={{ left: 20, right: 20 }}>
              <defs>
                <GradientBarDefs id="emo-grad-green" color="oklch(0.527 0.154 163.225)" />
                <GradientBarDefs id="emo-grad-red" color="oklch(0.577 0.245 27.325)" />
              </defs>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <YAxis dataKey="tag" type="category" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={100} />
              <ReferenceLine x={0} stroke="var(--border)" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const d = item.payload as (typeof behaviorData.emotionPerf)[number]
                      return [`$${Number(value).toFixed(2)} avg | ${d.count} trades | ${d.winRate}% WR`, d.tag]
                    }}
                  />
                }
              />
              <Bar dataKey="avgPnL" radius={[0, 3, 3, 0]}>
                {behaviorData.emotionPerf.map((entry, index) => (
                  <Cell key={index} fill={entry.avgPnL >= 0 ? 'url(#emo-grad-green)' : 'url(#emo-grad-red)'} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </section>
      )}

      {/* Comment breakdowns */}
      {behaviorData && [
        { title: 'Entry Comment Breakdown', data: behaviorData.entryComments },
        { title: 'Management Comment Breakdown', data: behaviorData.managementComments },
        { title: 'Exit Comment Breakdown', data: behaviorData.exitComments },
      ].map(({ title, data }) => data.length > 0 && (
        <section key={title} className="mb-10">
          <h2 className="text-sm font-semibold mb-4">{title}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left p-2">Comment</th>
                  <th className="text-center p-2">Rating</th>
                  <th className="text-right p-2">Count</th>
                  <th className="text-right p-2">Avg P/L</th>
                  <th className="text-right p-2">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {data.map((d) => (
                  <tr key={d.label} className="border-b border-border/50">
                    <td className="p-2 font-medium">{d.label}</td>
                    <td className="p-2 text-center">
                      <span className={`inline-block h-2 w-2 rounded-full ${d.rating === 'positive' ? 'bg-emerald-500' : d.rating === 'negative' ? 'bg-red-500' : 'bg-zinc-400'}`} />
                    </td>
                    <td className="p-2 text-right font-mono">{d.count}</td>
                    <td className={`p-2 text-right font-mono ${d.avgPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {d.avgPnL >= 0 ? '+' : ''}{formatValue(d.avgPnL)}
                    </td>
                    <td className="p-2 text-right font-mono">{d.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {/* Mistake Frequency */}
      {behaviorData && behaviorData.mistakeFreq.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Mistakes Frequency</h2>
          <ChartContainer config={behaviorBarConfig} className="w-full" style={{ height: `${behaviorData.mistakeFreq.length * 36 + 40}px` }}>
            <BarChart data={behaviorData.mistakeFreq} layout="vertical" margin={{ left: 20, right: 20 }}>
              <defs>
                <HatchPatternDefs id="mistake-hatch" color="oklch(0.577 0.245 27.325)" />
              </defs>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis dataKey="label" type="category" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={160} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const d = item.payload as (typeof behaviorData.mistakeFreq)[number]
                      return [`${value} times | avg P/L: $${d.avgPnL.toFixed(2)}`, d.label]
                    }}
                  />
                }
              />
              <Bar dataKey="count" fill="url(#mistake-hatch)" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ChartContainer>
        </section>
      )}

      {/* Emotion x Outcome Heatmap */}
      {behaviorData && behaviorData.emotionOutcome.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Emotion x Outcome</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left p-2">Emotion</th>
                  <th className="text-right p-2">Wins</th>
                  <th className="text-right p-2">Losses</th>
                  <th className="text-right p-2">Breakeven</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-right p-2">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {behaviorData.emotionOutcome.map((d) => (
                  <tr key={d.tag} className="border-b border-border/50">
                    <td className="p-2 font-medium">{d.tag}</td>
                    <td className="p-2 text-right font-mono text-emerald-600">{d.wins}</td>
                    <td className="p-2 text-right font-mono text-red-600">{d.losses}</td>
                    <td className="p-2 text-right font-mono text-muted-foreground">{d.breakeven}</td>
                    <td className="p-2 text-right font-mono">{d.total}</td>
                    <td className="p-2 text-right font-mono">{d.total > 0 ? Math.round((d.wins / d.total) * 100) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {(!behaviorData || (behaviorData.emotionPerf.length === 0 && behaviorData.mistakeFreq.length === 0)) && (
        <p className="text-sm text-muted-foreground">Journal trades with emotion tags, comments, and mistake labels to see behavior analytics.</p>
      )}

      </></ErrorBoundary>)}

      {/* ─── Sessions Tab ─── */}
      {activeTab === 'sessions' && sessionsLoaded && (<ErrorBoundary fallback={tabErrorFallback}><>

      <h2 className="text-lg font-semibold mb-6">Sessions</h2>

      {sessionsData && (
        <>
          {/* Journaling Streak */}
          <section className="mb-10">
            <h2 className="text-sm font-semibold mb-4">Journaling Streak</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-lg font-mono font-semibold text-emerald-500">{sessionsData.currentStreak}</div>
                <div className="text-[10px] text-muted-foreground">Current Streak</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-lg font-mono font-semibold">{sessionsData.longestStreak}</div>
                <div className="text-[10px] text-muted-foreground">Longest Streak</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-lg font-mono font-semibold">{sessionsData.consistency}%</div>
                <div className="text-[10px] text-muted-foreground">Consistency</div>
              </div>
            </div>
          </section>

          {/* Session Completion Over Time */}
          {sessionsData.completionOverTime.length > 0 && (
            <section className="mb-10">
              <h2 className="text-sm font-semibold mb-4">Session Completion Over Time</h2>
              <p className="text-xs text-muted-foreground mb-3">Daily pre-session and post-session completion</p>
              <ChartContainer config={{ preDone: { label: 'Pre-Session', color: 'oklch(0.527 0.154 163.225)' }, postDone: { label: 'Post-Session', color: 'var(--chart-1)' } }} className="h-[200px] w-full">
                <LineChart data={sessionsData.completionOverTime}>
                  <defs>
                    <GlowFilter id="session-comp-glow" color="oklch(0.527 0.154 163.225)" stdDeviation={2} />
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="stepAfter" dataKey="preDone" stroke="oklch(0.527 0.154 163.225)" strokeWidth={2} dot={false} filter="url(#session-comp-glow)" />
                  <Line type="stepAfter" dataKey="postDone" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
              <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 rounded-sm" style={{ background: 'oklch(0.527 0.154 163.225)' }} /> Pre-Session</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-0.5 rounded-sm" style={{ background: 'var(--chart-1)' }} /> Post-Session</span>
              </div>
            </section>
          )}

          {/* Energy vs Performance */}
          {sessionsData.energyPerf.length > 0 && (
            <section className="mb-10">
              <h2 className="text-sm font-semibold mb-4">Energy vs Performance</h2>
              <p className="text-xs text-muted-foreground mb-3">Pre-session energy level (1-10) vs that day's total P/L</p>
              <ChartContainer config={sessionLineConfig} className="h-[250px] w-full">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <defs>
                    <GlowFilter id="energy-glow" color="oklch(0.527 0.154 163.225)" stdDeviation={2} />
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="energy" type="number" name="Energy" domain={[0, 10]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} label={{ value: 'Energy Level', position: 'insideBottom', offset: -5, fontSize: 10 }} />
                  <YAxis dataKey="pnl" type="number" name="P/L" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <ReferenceLine y={0} stroke="var(--border)" />
                  <ChartTooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="rounded border bg-popover p-2 text-xs shadow-md">
                          <p>Energy: {d.energy}/10</p>
                          <p className={d.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>P/L: {formatValue(d.pnl)}</p>
                          <p className="text-muted-foreground">{d.date}</p>
                        </div>
                      )
                    }}
                  />
                  <Scatter data={sessionsData.energyPerf} fill="oklch(0.527 0.154 163.225)" filter="url(#energy-glow)" />
                </ScatterChart>
              </ChartContainer>
            </section>
          )}

          {/* Emotional State Distribution */}
          {sessionsData.emotionalDistData.length > 0 && (
            <section className="mb-10">
              <h2 className="text-sm font-semibold mb-4">Pre-Session Emotional State Distribution</h2>
              <div className="grid grid-cols-2 gap-6">
                <ChartContainer config={sessionLineConfig} className="h-[200px]">
                  <PieChart>
                    <Pie
                      data={sessionsData.emotionalDistData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      cornerRadius={6}
                      paddingAngle={3}
                    >
                      {sessionsData.emotionalDistData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-col justify-center space-y-1.5">
                  {sessionsData.emotionalDistData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-mono ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Post-Session Ratings Trend */}
          {sessionsData.ratingsTrend.length > 0 && (
            <section className="mb-10">
              <h2 className="text-sm font-semibold mb-4">Post-Session Ratings Trend</h2>
              <p className="text-xs text-muted-foreground mb-3">Your self-rated session quality over time (1-10)</p>
              <ChartContainer config={sessionLineConfig} className="h-[200px] w-full">
                <LineChart data={sessionsData.ratingsTrend}>
                  <defs>
                    <GlowFilter id="rating-glow" color="oklch(0.527 0.154 163.225)" stdDeviation={2.5} />
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 10]} />
                  <ChartTooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div className="rounded border bg-popover p-2 text-xs shadow-md">
                          <p>{d.date}</p>
                          <p>Rating: {d.rating}/10</p>
                        </div>
                      )
                    }}
                  />
                  <Line type="monotone" dataKey="rating" stroke="oklch(0.527 0.154 163.225)" strokeWidth={2} dot={{ r: 3 }} filter="url(#rating-glow)" activeDot={<ActivePingingDot />} />
                </LineChart>
              </ChartContainer>
            </section>
          )}

          {preSessions.length === 0 && postSessions.length === 0 && (
            <p className="text-sm text-muted-foreground">Complete pre-session and post-session forms to see session analytics.</p>
          )}
        </>
      )}

      </></ErrorBoundary>)}

    </div>
  )
}

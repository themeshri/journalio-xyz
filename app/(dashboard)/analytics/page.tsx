'use client'

import { useMemo, useState, useCallback } from 'react'
import { useWallet, buildWalletQueryParams } from '@/lib/wallet-context'
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
} from 'recharts'
import { Separator } from '@/components/ui/separator'
import { StatStripSkeleton, ChartSkeleton } from '@/components/skeletons'

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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const emotionTags = [
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

export default function AnalyticsPage() {
  const { flattenedTrades, isAnyLoading, hasActiveWallets, allTrades, tradeComments, strategies: allStrategies, journalMap, activeWallets } = useWallet()

  const [activeTab, setActiveTab] = useState<'overview' | 'time' | 'discipline' | 'strategy' | 'missed'>('overview')

  const walletQueryParams = useMemo(
    () => buildWalletQueryParams(activeWallets),
    [activeWallets]
  )

  const completedTrades = useMemo(
    () => flattenedTrades.filter((t) => t.isComplete),
    [flattenedTrades]
  )

  // ─── SWR data fetching ─────────────────────────────────────────────
  // GET-based hooks fire immediately for all tabs (prefetch)
  const swrQueryParams = walletQueryParams && flattenedTrades.length > 0 ? walletQueryParams : null

  const { data: overviewData, isLoading: overviewLoading } = useOverviewAnalytics(swrQueryParams)

  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const { data: calendarRaw, isLoading: calendarLoading } = useCalendarAnalytics(swrQueryParams, calYear, calMonth)

  const { data: timeRaw, isLoading: timeLoading } = useTimeAnalytics(swrQueryParams)
  const { data: missedRaw, isLoading: missedLoading } = useMissedAnalytics(swrQueryParams)

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
  const [whatIfOpen, setWhatIfOpen] = useState(false)

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

  // Check if current tab is loading (SWR shows cached data instantly on tab switch)
  const isTabLoading = (activeTab === 'overview' && (overviewLoading || calendarLoading)) ||
    (activeTab === 'time' && timeLoading) ||
    (activeTab === 'discipline' && disciplineLoading) ||
    (activeTab === 'strategy' && strategyLoading) ||
    (activeTab === 'missed' && missedLoading)

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

  if (isAnyLoading && allTrades.length === 0) {
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
      <h1 className="text-xl font-semibold mb-6">Analytics</h1>

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-10 gap-y-2 mb-10 text-sm">
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

      {/* Tab navigation */}
      <div className="flex gap-1 mb-8 text-xs">
        {([
          ['overview', 'Overview'],
          ['time', 'Time Analysis'],
          ['discipline', 'Discipline'],
          ['strategy', 'Strategy'],
          ['missed', 'Missed Trades'],
        ] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded transition-colors ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab loading skeleton */}
      {isTabLoading && (
        <div className="space-y-10">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      )}

      {/* ─── Overview Tab ─── */}
      {activeTab === 'overview' && !overviewLoading && (<>

      {/* Cumulative P/L */}
      {plData.length >= 2 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Cumulative P/L</h2>
          <ChartContainer config={plConfig} className="h-[250px] w-full">
            <LineChart data={plData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
              />
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
              <Line
                type="monotone"
                dataKey="cumulativePL"
                stroke="var(--color-cumulativePL)"
                strokeWidth={2}
                dot={false}
              />
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
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </section>
      )}

      {/* Trading Hours */}
      {hoursData.some((d) => d.count > 0) && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Trading Hours</h2>
          <p className="text-xs text-muted-foreground mb-3">
            When your trades start, colored by average profitability
          </p>
          <ChartContainer config={hoursConfig} className="h-[220px] w-full">
            <BarChart data={hoursData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
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
                      entry.count === 0
                        ? 'var(--color-count)'
                        : entry.avgPL >= 0
                          ? 'oklch(0.527 0.154 163.225)'
                          : 'oklch(0.577 0.245 27.325)'
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
                  className={`p-1.5 min-h-[52px] border-r text-center cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all ${
                    day && day.tradeCount > 0 ? getDayColorClass(day.pnl, calMaxPnl, calMaxLoss) : ''
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

      </>)}

      {/* ─── Time Analysis Tab ─── */}
      {activeTab === 'time' && !timeLoading && (<>

      {/* Hourly P/L */}
      {hourlyPerfData.some((d) => d.tradeCount > 0) && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Hourly P/L Breakdown</h2>
          <p className="text-xs text-muted-foreground mb-3">Total P/L by hour of day</p>
          <ChartContainer config={hourlyPLConfig} className="h-[220px] w-full">
            <BarChart data={hourlyPerfData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <ReferenceLine y={0} stroke="var(--border)" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const d = item.payload as (typeof hourlyPerfData)[number]
                      return [
                        `$${Number(value).toFixed(2)} total | ${d.tradeCount} trades | ${d.winRate}% WR`,
                        d.label,
                      ]
                    }}
                  />
                }
              />
              <Bar dataKey="totalPnL" radius={[2, 2, 0, 0]}>
                {hourlyPerfData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.totalPnL >= 0 ? 'oklch(0.527 0.154 163.225)' : 'oklch(0.577 0.245 27.325)'}
                  />
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

      {/* Day of Week P/L */}
      {dayOfWeekData.some((d) => d.tradeCount > 0) && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Day of Week Performance</h2>
          <ChartContainer config={dayOfWeekConfig} className="h-[200px] w-full">
            <BarChart data={dayOfWeekData}>
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
                  <Cell
                    key={index}
                    fill={entry.totalPnL >= 0 ? 'oklch(0.527 0.154 163.225)' : 'oklch(0.577 0.245 27.325)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </section>
      )}

      {/* Session Performance */}
      {sessionPerfData.some((s) => s.tradeCount > 0) && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Session Performance</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {sessionPerfData.filter((s) => s.tradeCount > 0).map((s) => (
              <div key={s.session.name} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.session.color }} />
                  <span className="text-xs font-medium">{s.session.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {s.session.startHour}:00-{s.session.endHour}:00
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trades</span>
                    <span className="font-mono">{s.tradeCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">P/L</span>
                    <span className={`font-mono ${s.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {s.totalPnL >= 0 ? '+' : ''}{formatValue(s.totalPnL)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Win Rate</span>
                    <span className="font-mono">{s.winRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PF</span>
                    <span className="font-mono">{s.profitFactor === Infinity ? '\u221e' : s.profitFactor.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Enhanced Duration Table */}
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
                    <td className={`p-2 text-right font-mono ${d.avgPL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {d.avgPL >= 0 ? '+' : ''}{formatValue(d.avgPL)}
                    </td>
                    <td className={`p-2 text-right font-mono ${d.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {d.totalPnL >= 0 ? '+' : ''}{formatValue(d.totalPnL)}
                    </td>
                    <td className="p-2 text-right font-mono">{d.winRate}%</td>
                    <td className="p-2 text-right font-mono">
                      {d.profitFactor === Infinity ? '\u221e' : d.profitFactor.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      </>)}

      {/* ─── Strategy Tab ─── */}
      {activeTab === 'strategy' && !strategyLoading && (<>

      {/* Strategy Performance */}
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
                    <td className={`p-2 text-right font-mono ${s.totalPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {s.totalPnL >= 0 ? '+' : ''}{formatValue(s.totalPnL)}
                    </td>
                    <td className={`p-2 text-right font-mono ${s.avgPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatValue(s.avgPnL)}
                    </td>
                    <td className="p-2 text-right font-mono">{s.winRate}%</td>
                    <td className="p-2 text-right font-mono">
                      {s.profitFactor === Infinity ? '\u221e' : s.profitFactor.toFixed(2)}
                    </td>
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

      {/* Rule Impact */}
      {ruleImpactData.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Rule Impact Analysis</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Difference in avg P/L when rule is followed vs skipped
          </p>
          <ChartContainer
            config={ruleImpactConfig}
            className="w-full"
            style={{ height: `${ruleImpactData.length * 32 + 40}px` }}
          >
            <BarChart data={ruleImpactData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <YAxis
                dataKey="ruleText"
                type="category"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={180}
              />
              <ReferenceLine x={0} stroke="var(--border)" />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const d = item.payload as (typeof ruleImpactData)[number]
                      return [
                        `Impact: $${Number(value).toFixed(2)} | Followed: ${d.followedCount}x ($${d.avgPnLWhenFollowed}) | Skipped: ${d.skippedCount}x ($${d.avgPnLWhenSkipped})`,
                        d.ruleText,
                      ]
                    }}
                  />
                }
              />
              <Bar dataKey="impact" radius={[0, 3, 3, 0]}>
                {ruleImpactData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.impact >= 0 ? 'oklch(0.527 0.154 163.225)' : 'oklch(0.577 0.245 27.325)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </section>
      )}

      {/* Checklist Completion vs Performance */}
      {completionData.some((b) => b.tradeCount > 0) && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Checklist Completion vs P/L</h2>
          <ChartContainer config={completionConfig} className="h-[200px] w-full">
            <BarChart data={completionData}>
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
                  <Cell
                    key={index}
                    fill={entry.avgPnL >= 0 ? 'oklch(0.527 0.154 163.225)' : 'oklch(0.577 0.245 27.325)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </section>
      )}

      </>)}

      {/* ─── Missed Trades Tab ─── */}
      {activeTab === 'missed' && !missedLoading && (<>

      {/* Missed Trade Analytics */}
      {missedStats.totalMissed > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Missed Trade Analytics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-lg font-mono font-semibold">{missedStats.totalMissed}</div>
              <div className="text-[10px] text-muted-foreground">Total Missed</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-lg font-mono font-semibold text-amber-500">
                {formatValue(missedStats.totalMissedPnL)}
              </div>
              <div className="text-[10px] text-muted-foreground">Missed Profit</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-lg font-mono font-semibold">{missedStats.avgMultiplier.toFixed(1)}x</div>
              <div className="text-[10px] text-muted-foreground">Avg Multiplier</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-lg font-mono font-semibold">
                {missedStats.totalMissed > 0
                  ? Math.round((missedStats.winCount / missedStats.totalMissed) * 100)
                  : 0}%
              </div>
              <div className="text-[10px] text-muted-foreground">Would-be Win Rate</div>
            </div>
          </div>

          {/* Reason breakdown */}
          {missedStats.reasonBreakdown.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-medium text-muted-foreground mb-2">By Reason</h3>
              <div className="space-y-1.5">
                {missedStats.reasonBreakdown.map((r) => (
                  <div key={r.reason} className="flex items-center gap-2 text-xs">
                    <span className="w-24 truncate">{r.reason}</span>
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${(r.count / missedStats.totalMissed) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono w-8 text-right">{r.count}</span>
                    <span className="font-mono w-20 text-right text-muted-foreground">
                      {formatValue(r.totalMissedPnL)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hesitation cost comparison */}
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
              <div className="text-sm font-mono font-semibold text-amber-500">
                {formatValue(hesitationCost.hesitationCost)}
              </div>
              <p className="text-[10px] text-muted-foreground">{hesitationCost.missedWinRate}% would-be WR</p>
            </div>
          </div>
        </section>
      )}

      </>)}

      {/* ─── Discipline Tab ─── */}
      {activeTab === 'discipline' && !disciplineLoading && (<>

      {/* Item 9: Insights / Pattern Detection */}
      {patterns.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Insights</h2>
          <div className="grid gap-3">
            {patterns.map((p) => (
              <div
                key={p.id}
                className={`rounded-lg border p-4 text-sm ${
                  p.severity === 'critical'
                    ? 'border-red-500/30 bg-red-500/5'
                    : p.severity === 'warning'
                      ? 'border-yellow-500/30 bg-yellow-500/5'
                      : 'border-border bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span>
                    {p.type === 'positive' ? '\u2705' : p.type === 'negative' ? '\u26a0\ufe0f' : '\ud83d\udca1'}
                  </span>
                  <span className="font-medium">{p.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">{p.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Item 5: Comment Performance */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold mb-4">Comment Performance</h2>
        <p className="text-xs text-muted-foreground mb-4">
          How each trade comment correlates with P/L across your trades
        </p>

        {commentPerfData.length > 0 ? (
          <ChartContainer
            config={commentPerfConfig}
            className="w-full"
            style={{ height: `${commentPerfData.length * 36 + 40}px` }}
          >
            <BarChart data={commentPerfData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                dataKey="label"
                type="category"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={160}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const d = item.payload as (typeof commentPerfData)[number]
                      return [
                        `$${Number(value).toFixed(2)} total | $${d.avgPnL.toFixed(2)} avg | ${d.tradeCount} trades | ${d.winRate}% WR`,
                        d.label,
                      ]
                    }}
                  />
                }
              />
              <Bar dataKey="totalPnL" radius={[0, 3, 3, 0]}>
                {commentPerfData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.totalPnL >= 0
                        ? 'oklch(0.527 0.154 163.225)'
                        : 'oklch(0.577 0.245 27.325)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <p className="text-xs text-muted-foreground/70">
            Journal trades with comments assigned to see performance insights.
          </p>
        )}
      </section>

      {/* Item 6: Efficiency Graph */}
      {efficiencyData.length >= 2 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Discipline Efficiency</h2>
          <p className="text-xs text-muted-foreground mb-3">
            % of positive comments out of all non-neutral comments assigned
          </p>
          <ChartContainer config={efficiencyConfig} className="h-[250px] w-full">
            <LineChart data={efficiencyData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="tradeIndex"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Trade #', position: 'insideBottomRight', offset: -5, fontSize: 10 }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <ReferenceLine y={70} stroke="oklch(0.527 0.154 163.225)" strokeDasharray="4 4" strokeOpacity={0.5} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      `${Number(value)}%`,
                      name === 'cumulativeEfficiency' ? 'Cumulative' : 'Rolling (20)',
                    ]}
                  />
                }
              />
              <Line
                type="monotone"
                dataKey="cumulativeEfficiency"
                stroke="var(--color-cumulativeEfficiency)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="rollingEfficiency"
                stroke="var(--color-rollingEfficiency)"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </section>
      )}

      {/* Item 7: Discipline + Equity Overlay */}
      {disciplineEquityData.length >= 2 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold mb-4">Discipline vs P/L</h2>
          <p className="text-xs text-muted-foreground mb-3">
            See how discipline score correlates with your equity curve
          </p>
          <ChartContainer config={disciplineEquityConfig} className="h-[280px] w-full">
            <ComposedChart data={disciplineEquityData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="tradeIndex"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="pnl"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
              />
              <YAxis
                yAxisId="discipline"
                orientation="right"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
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
              <Area
                yAxisId="discipline"
                type="monotone"
                dataKey="disciplineScore"
                stroke="oklch(0.527 0.154 163.225)"
                fill="oklch(0.527 0.154 163.225)"
                fillOpacity={0.1}
                strokeWidth={1}
              />
              <Line
                yAxisId="pnl"
                type="monotone"
                dataKey="cumulativePnL"
                stroke="var(--color-cumulativePnL)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ChartContainer>
        </section>
      )}

      <Separator className="my-8" />

      {/* Item 8: What-If Scenario */}
      <section className="mb-10">
        <button
          onClick={() => setWhatIfOpen(!whatIfOpen)}
          className="flex items-center gap-2 text-sm font-semibold mb-4 hover:text-foreground transition-colors cursor-pointer"
        >
          <span>What-If Scenario</span>
          <span className="text-xs text-muted-foreground">{whatIfOpen ? '\u25b4' : '\u25be'}</span>
        </button>

        {whatIfOpen && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              What if you excluded certain trades? Select criteria below to see the impact.
            </p>

            {/* Filter: Undisciplined */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatIfFilter.excludeUndisciplined}
                  onChange={(e) => setWhatIfFilter((f) => ({ ...f, excludeUndisciplined: e.target.checked }))}
                  className="rounded border-border"
                />
                All undisciplined trades (any negative comment)
              </label>
            </div>

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
                {emotionTags.map((tag) => (
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

            {/* Results */}
            {hasAnyFilter && (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  {/* Actual */}
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
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg P/L</span>
                        <span className={`font-mono tabular-nums ${whatIfResult.original.avgPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatValue(whatIfResult.original.avgPnL)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* What-If */}
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
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg P/L</span>
                        <span className={`font-mono tabular-nums ${whatIfResult.filtered.avgPnL >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatValue(whatIfResult.filtered.avgPnL)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Impact summary */}
                {whatIfResult.pnlDifference !== 0 && (
                  <p className="text-xs text-muted-foreground">
                    {whatIfResult.pnlDifference > 0
                      ? `Those ${whatIfResult.tradesRemoved} excluded trades cost you $${Math.abs(whatIfResult.pnlDifference).toFixed(2)}. Without them, your P/L would be $${whatIfResult.filtered.totalPnL.toFixed(2)}.`
                      : `Removing those ${whatIfResult.tradesRemoved} trades would reduce your P/L by $${Math.abs(whatIfResult.pnlDifference).toFixed(2)}.`
                    }
                  </p>
                )}

                {/* Item 10: What-If Equity Curve */}
                {whatIfEquityData.length >= 2 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-3">Equity curve comparison</p>
                    <ChartContainer config={whatIfEquityConfig} className="h-[220px] w-full">
                      <LineChart data={whatIfEquityData}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="tradeIndex"
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `$${v}`}
                        />
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
                        <Line
                          type="monotone"
                          dataKey="actualPnL"
                          stroke="var(--color-actualPnL)"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="filteredPnL"
                          stroke="var(--color-filteredPnL)"
                          strokeWidth={2}
                          strokeDasharray="6 3"
                          dot={false}
                        />
                      </LineChart>
                    </ChartContainer>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      </>)}
    </div>
  )
}

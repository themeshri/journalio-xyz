'use client'

import { useMemo, useState, useEffect, useCallback } from 'react'
import { useWallet } from '@/lib/wallet-context'
import { formatValue, formatDuration } from '@/lib/formatters'
import {
  computeDurationBuckets,
  computeCumulativePL,
  computeTradingHours,
  computeAvgDuration,
  computeCommentPerformance,
  computeEfficiency,
  computeDisciplineEquity,
  computeWhatIf,
  computeWhatIfEquity,
  detectPatterns,
  type WhatIfFilter,
} from '@/lib/analytics'
import { loadTradeComments, type TradeComment } from '@/lib/trade-comments'
import type { JournalData } from '@/components/JournalModal'
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

export default function AnalyticsPage() {
  const { flattenedTrades, isAnyLoading, hasActiveWallets, allTrades } = useWallet()

  const completedTrades = useMemo(
    () => flattenedTrades.filter((t) => t.isComplete),
    [flattenedTrades]
  )

  const durationData = useMemo(
    () => computeDurationBuckets(flattenedTrades),
    [flattenedTrades]
  )

  const plData = useMemo(
    () => computeCumulativePL(flattenedTrades),
    [flattenedTrades]
  )

  const hoursData = useMemo(
    () => computeTradingHours(flattenedTrades),
    [flattenedTrades]
  )

  const avgDuration = useMemo(
    () => computeAvgDuration(flattenedTrades),
    [flattenedTrades]
  )

  const [journalMap, setJournalMap] = useState<Record<string, JournalData>>({})
  const [tradeComments, setTradeComments] = useState<TradeComment[]>([])
  const [whatIfFilter, setWhatIfFilter] = useState<WhatIfFilter>(defaultFilter)
  const [whatIfOpen, setWhatIfOpen] = useState(false)

  useEffect(() => {
    setTradeComments(loadTradeComments())
  }, [])

  useEffect(() => {
    if (flattenedTrades.length === 0) return
    const map: Record<string, JournalData> = {}
    for (const t of flattenedTrades) {
      try {
        const raw = localStorage.getItem(`journalio_journal_${t.walletAddress}_${t.tokenMint}_${t.tradeNumber}`)
        if (raw) map[`${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`] = JSON.parse(raw)
      } catch { /* ignore */ }
    }
    setJournalMap(map)
  }, [flattenedTrades])

  const commentPerfData = useMemo(
    () => computeCommentPerformance(flattenedTrades, journalMap, tradeComments),
    [flattenedTrades, journalMap, tradeComments]
  )

  const efficiencyData = useMemo(
    () => computeEfficiency(flattenedTrades, journalMap, tradeComments),
    [flattenedTrades, journalMap, tradeComments]
  )

  const disciplineEquityData = useMemo(
    () => computeDisciplineEquity(flattenedTrades, journalMap, tradeComments),
    [flattenedTrades, journalMap, tradeComments]
  )

  const whatIfResult = useMemo(
    () => computeWhatIf(flattenedTrades, journalMap, tradeComments, whatIfFilter),
    [flattenedTrades, journalMap, tradeComments, whatIfFilter]
  )

  const whatIfEquityData = useMemo(
    () => whatIfResult.tradesRemoved > 0
      ? computeWhatIfEquity(flattenedTrades, journalMap, tradeComments, whatIfFilter)
      : [],
    [flattenedTrades, journalMap, tradeComments, whatIfFilter, whatIfResult.tradesRemoved]
  )

  const patterns = useMemo(
    () => detectPatterns(flattenedTrades, journalMap, tradeComments),
    [flattenedTrades, journalMap, tradeComments]
  )

  // Collect unique strategies from journals
  const strategies = useMemo(() => {
    const set = new Set<string>()
    for (const j of Object.values(journalMap)) {
      if (j.strategy) set.add(j.strategy)
    }
    return [...set]
  }, [journalMap])

  // Collect negative comments for What-If filter options
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

      <Separator className="my-8" />

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
            {strategies.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Exclude by strategy:</p>
                <div className="flex flex-wrap gap-1.5">
                  {strategies.map((strat) => (
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
    </div>
  )
}

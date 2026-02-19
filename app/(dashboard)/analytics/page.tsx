'use client'

import { useMemo } from 'react'
import { useWallet } from '@/lib/wallet-context'
import { calculateTradeCycles, flattenTradeCycles } from '@/lib/tradeCycles'
import { formatValue, formatDuration } from '@/lib/formatters'
import {
  computeDurationBuckets,
  computeCumulativePL,
  computeTradingHours,
  computeAvgDuration,
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
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
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

export default function AnalyticsPage() {
  const { currentWallet, currentChain, trades, isLoading, error } = useWallet()

  const flattenedTrades = useMemo(() => {
    if (trades.length === 0) return []
    const cycles = calculateTradeCycles(trades, currentChain)
    return flattenTradeCycles(cycles)
  }, [trades, currentChain])

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

  if (!currentWallet) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Enter a wallet address in the sidebar to view trading analytics.
        </p>
      </div>
    )
  }

  if (isLoading) {
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

  if (error) {
    return (
      <div className="pt-8">
        <p className="text-sm text-destructive">{error}</p>
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

      {/* Journal Analytics - Placeholders */}
      <section>
        <h2 className="text-sm font-semibold mb-4">Journal Analytics</h2>
        <p className="text-xs text-muted-foreground mb-6">
          These require journal entries on your trade cycles. Rate and review your trades
          in the Trade Journal to unlock these insights.
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm text-muted-foreground mb-1">Sell Rating Trend</h3>
            <p className="text-xs text-muted-foreground/70">
              Rate your trades in the Trade Journal to see how your ratings change over time.
            </p>
          </div>
          <div>
            <h3 className="text-sm text-muted-foreground mb-1">Common Mistakes</h3>
            <p className="text-xs text-muted-foreground/70">
              Select mistakes when journaling sells to see which patterns repeat most often.
            </p>
          </div>
          <div>
            <h3 className="text-sm text-muted-foreground mb-1">Buy Categories</h3>
            <p className="text-xs text-muted-foreground/70">
              Categorize your buys in the Trade Journal to see which strategies you use most.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

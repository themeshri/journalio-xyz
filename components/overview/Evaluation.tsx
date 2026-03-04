'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatValue } from '@/lib/formatters'
import type { FlattenedTrade } from '@/lib/tradeCycles'

interface EvaluationProps {
  trades: FlattenedTrade[]
}

function formatHours(ms: number): string {
  const hours = ms / 3_600_000
  if (hours < 1) return `${Math.round(hours * 60)}m`
  return `${hours.toFixed(1)}h`
}

export function Evaluation({ trades }: EvaluationProps) {
  const stats = useMemo(() => {
    const completed = trades.filter((t) => t.isComplete)
    if (completed.length === 0) return null

    const totalPL = completed.reduce((s, t) => s + t.profitLoss, 0)
    const wins = completed.filter((t) => t.profitLoss > 0)
    const losses = completed.filter((t) => t.profitLoss < 0)
    const totalBuyValue = completed.reduce((s, t) => s + t.totalBuyValue, 0)

    // Unique trading days
    const daySet = new Set<string>()
    const weekSet = new Set<string>()
    const dayPL = new Map<string, number>()
    for (const t of completed) {
      const d = new Date((t.endDate || t.startDate) * 1000)
      const dayKey = d.toISOString().slice(0, 10)
      daySet.add(dayKey)
      dayPL.set(dayKey, (dayPL.get(dayKey) || 0) + t.profitLoss)
      // ISO week key
      const startOfYear = new Date(d.getFullYear(), 0, 1)
      const weekNum = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
      weekSet.add(`${d.getFullYear()}-W${weekNum}`)
    }

    const uniqueDays = daySet.size
    const uniqueWeeks = weekSet.size
    const avgProfitPerDay = uniqueDays > 0 ? totalPL / uniqueDays : 0
    const tradesPerDay = uniqueDays > 0 ? completed.length / uniqueDays : 0
    const tradesPerWeek = uniqueWeeks > 0 ? completed.length / uniqueWeeks : 0

    // Winning / losing days
    let winningDays = 0
    let losingDays = 0
    for (const pl of dayPL.values()) {
      if (pl > 0) winningDays++
      else if (pl < 0) losingDays++
    }

    // Biggest winner / loser
    const biggestWinner = completed.length > 0 ? Math.max(...completed.map((t) => t.profitLoss)) : 0
    const biggestLoser = completed.length > 0 ? Math.min(...completed.map((t) => t.profitLoss)) : 0

    // Total fees (approximate from buy+sell value * typical fee)
    const totalFees = completed.reduce((s, t) => s + (t.totalBuyValue + t.totalSellValue) * 0.005, 0)

    // Avg hold time
    const withDuration = completed.filter((t) => t.duration && t.duration > 0)
    const avgHoldTime = withDuration.length > 0 ? withDuration.reduce((s, t) => s + t.duration!, 0) / withDuration.length : 0

    // Winrate without breakeven
    const nonBE = wins.length + losses.length
    const winRateNoBE = nonBE > 0 ? (wins.length / nonBE) * 100 : 0

    // ROI
    const roi = totalBuyValue > 0 ? (totalPL / totalBuyValue) * 100 : 0

    // Max drawdown (peak-to-trough on cumulative P/L)
    const sorted = [...completed].sort((a, b) => (a.endDate || a.startDate) - (b.endDate || b.startDate))
    let peak = 0
    let cumPL = 0
    let maxDD = 0
    for (const t of sorted) {
      cumPL += t.profitLoss
      if (cumPL > peak) peak = cumPL
      const dd = peak - cumPL
      if (dd > maxDD) maxDD = dd
    }
    const maxDrawdownPct = peak > 0 ? (maxDD / peak) * 100 : 0

    // Current streak (last 5 trades)
    const recentSorted = [...completed].sort((a, b) => (b.endDate || 0) - (a.endDate || 0))
    const streak = recentSorted.slice(0, 5).map((t) => (t.profitLoss >= 0 ? 'W' : 'L'))

    return {
      totalTrades: completed.length,
      avgProfitPerDay,
      biggestWinner,
      biggestLoser,
      totalFees,
      avgHoldTime,
      winRateNoBE,
      roi,
      maxDrawdownPct,
      winningDays,
      losingDays,
      tradesPerDay,
      tradesPerWeek,
      streak,
    }
  }, [trades])

  if (!stats) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Evaluation</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-xs text-muted-foreground">Not enough trade data.</p>
        </CardContent>
      </Card>
    )
  }

  const rows: { label: string; tip: string; value: React.ReactNode }[] = [
    { label: 'Total Number of Trades', tip: 'Total completed trade cycles in the selected time range.', value: stats.totalTrades },
    { label: 'Avg. Profit per Trading Day', tip: 'Total P/L divided by the number of unique days you traded.', value: formatValue(stats.avgProfitPerDay, false) },
    { label: 'Biggest Winner', tip: 'The single trade cycle with the highest profit.', value: formatValue(stats.biggestWinner, false) },
    { label: 'Biggest Loser', tip: 'The single trade cycle with the largest loss.', value: formatValue(stats.biggestLoser, false) },
    { label: 'Total Fees', tip: 'Estimated total fees paid across all trades (approx. 0.5% of volume).', value: formatValue(stats.totalFees, false) },
    { label: 'Avg. Hold Time (Hours)', tip: 'Average time between opening and closing a trade.', value: stats.avgHoldTime > 0 ? formatHours(stats.avgHoldTime) : '-' },
    { label: 'Winrate w/o BE', tip: 'Win rate excluding breakeven trades. Only counts wins and losses.', value: `${stats.winRateNoBE.toFixed(2)}%` },
    { label: 'ROI', tip: 'Return on investment: total profit divided by total capital invested.', value: `${stats.roi.toFixed(2)}%` },
    { label: 'Max Drawdown', tip: 'Largest peak-to-trough decline in your cumulative P/L curve.', value: `${stats.maxDrawdownPct.toFixed(2)}%` },
    { label: 'Winning / Losing Days', tip: 'Number of days with net positive P/L vs net negative P/L.', value: `${stats.winningDays} / ${stats.losingDays}` },
    { label: 'Trades Per Day / Week', tip: 'Average number of completed trades per trading day and per trading week.', value: `${stats.tradesPerDay.toFixed(2)} / ${stats.tradesPerWeek.toFixed(2)}` },
    {
      label: 'Current Streak',
      tip: 'Your last 5 trade results. Green = win, red = loss.',
      value: (
        <div className="flex gap-0.5">
          {stats.streak.map((r, i) => (
            <div
              key={i}
              className={`w-4 h-3.5 rounded-[2px] flex items-center justify-center text-[8px] font-bold text-white ${
                r === 'W' ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            >
              {r}
            </div>
          ))}
        </div>
      ),
    },
  ]

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Evaluation</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <TooltipProvider delayDuration={200}>
          <div className="divide-y divide-border">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-6 py-2.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/30">{row.label}</span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px] text-xs">
                    {row.tip}
                  </TooltipContent>
                </Tooltip>
                <span className="text-xs font-mono tabular-nums font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}

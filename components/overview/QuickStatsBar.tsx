'use client'

import { useMemo } from 'react'
import { formatValue, formatDuration } from '@/lib/formatters'
import { HOUR_LABELS } from '@/lib/analytics/helpers'
import { computeHesitationCost, type MissedTradeEntry } from '@/lib/analytics'
import type { FlattenedTrade } from '@/lib/tradeCycles'
import type { StreakResult } from '@/lib/streaks'
import Link from 'next/link'

interface QuickStatsBarProps {
  trades: FlattenedTrade[]
  streak?: StreakResult
  missedTrades?: MissedTradeEntry[]
}

export function QuickStatsBar({ trades, streak, missedTrades = [] }: QuickStatsBarProps) {
  const stats = useMemo(() => {
    const completed = trades.filter((t) => t.isComplete)
    if (completed.length === 0) return null

    const wins = completed.filter((t) => t.profitLoss > 0)
    const losses = completed.filter((t) => t.profitLoss < 0)
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.profitLoss, 0) / wins.length : 0
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.profitLoss, 0) / losses.length : 0

    const withDuration = completed.filter((t) => t.duration && t.duration > 0)
    const avgHoldTime = withDuration.length > 0
      ? withDuration.reduce((s, t) => s + t.duration!, 0) / withDuration.length
      : 0

    // Best trading hour
    const hourMap = new Map<number, { count: number; totalPL: number }>()
    for (const t of completed) {
      const hour = new Date(t.startDate * 1000).getHours()
      const entry = hourMap.get(hour) || { count: 0, totalPL: 0 }
      entry.count += 1
      entry.totalPL += t.profitLoss
      hourMap.set(hour, entry)
    }
    let bestHour = 0
    let bestHourPL = -Infinity
    for (const [hour, data] of hourMap) {
      if (data.count >= 3 && data.totalPL > bestHourPL) {
        bestHour = hour
        bestHourPL = data.totalPL
      }
    }

    // Best / Worst trade
    const bestTrade = completed.length > 0 ? Math.max(...completed.map((t) => t.profitLoss)) : 0
    const worstTrade = completed.length > 0 ? Math.min(...completed.map((t) => t.profitLoss)) : 0

    // Most traded token
    const tokenMap = new Map<string, number>()
    for (const t of completed) {
      tokenMap.set(t.token, (tokenMap.get(t.token) || 0) + 1)
    }
    let topToken = '-'
    let topTokenCount = 0
    for (const [token, count] of tokenMap) {
      if (count > topTokenCount) {
        topToken = token
        topTokenCount = count
      }
    }

    // Win/loss streak from recent trades
    const sorted = [...completed].sort((a, b) => (b.endDate || 0) - (a.endDate || 0))
    let tradeStreakType: 'win' | 'loss' | 'none' = 'none'
    let tradeStreakCount = 0
    if (sorted.length > 0) {
      tradeStreakType = sorted[0].profitLoss >= 0 ? 'win' : 'loss'
      for (const t of sorted) {
        const result = t.profitLoss >= 0 ? 'win' : 'loss'
        if (result === tradeStreakType) tradeStreakCount++
        else break
      }
    }

    return { avgWin, avgLoss, avgHoldTime, bestHour, bestHourPL, topToken, topTokenCount, bestTrade, worstTrade, tradeStreakType, tradeStreakCount }
  }, [trades])

  const hesitation = useMemo(
    () => missedTrades.length > 0 ? computeHesitationCost(missedTrades, trades) : null,
    [missedTrades, trades]
  )

  if (!stats) return (
    <div className="flex items-center justify-center rounded-lg border p-3 text-xs text-muted-foreground">
      Not enough trade data for statistics.
    </div>
  )

  const items: { label: string; value: string; className: string; href?: string }[] = [
    { label: 'Avg Win', value: formatValue(stats.avgWin, true), className: 'text-lime-500' },
    { label: 'Avg Loss', value: formatValue(stats.avgLoss, true), className: 'text-red-500' },
    { label: 'Avg Hold', value: stats.avgHoldTime > 0 ? formatDuration(stats.avgHoldTime) : '-', className: '' },
    { label: 'Best Hour', value: stats.bestHourPL > -Infinity ? HOUR_LABELS[stats.bestHour] : '-', className: '' },
    { label: 'Best', value: formatValue(stats.bestTrade, true), className: 'text-lime-500' },
    { label: 'Worst', value: formatValue(stats.worstTrade, true), className: 'text-red-500' },
    { label: 'Top Token', value: `${stats.topToken} (${stats.topTokenCount})`, className: '' },
    {
      label: stats.tradeStreakType === 'win' ? 'Win Streak' : stats.tradeStreakType === 'loss' ? 'Loss Streak' : 'Streak',
      value: `${stats.tradeStreakCount}`,
      className: stats.tradeStreakType === 'win' ? 'text-lime-500' : stats.tradeStreakType === 'loss' ? 'text-red-500' : '',
    },
  ]

  if (streak) {
    items.push({
      label: 'Journal Streak',
      value: streak.longest > streak.current ? `${streak.current} (best: ${streak.longest})` : `${streak.current}`,
      className: '',
    })
  }

  if (hesitation && hesitation.hesitationCost !== 0) {
    items.push({
      label: 'Hesitation Cost',
      value: formatValue(hesitation.hesitationCost),
      className: 'text-amber-500',
      href: '/missed-trades',
    })
  }

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border p-3 text-xs">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{item.label}</span>
          {item.href ? (
            <Link href={item.href} className={`font-mono tabular-nums font-medium hover:underline ${item.className}`}>
              {item.value}
            </Link>
          ) : (
            <span className={`font-mono tabular-nums font-medium ${item.className}`}>{item.value}</span>
          )}
        </div>
      ))}
    </div>
  )
}

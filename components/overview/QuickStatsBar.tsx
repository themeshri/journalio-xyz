'use client'

import { useMemo } from 'react'
import { formatValue, formatDuration } from '@/lib/formatters'
import { HOUR_LABELS } from '@/lib/analytics/helpers'
import type { FlattenedTrade } from '@/lib/tradeCycles'

interface QuickStatsBarProps {
  trades: FlattenedTrade[]
}

export function QuickStatsBar({ trades }: QuickStatsBarProps) {
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

    return { avgWin, avgLoss, avgHoldTime, bestHour, bestHourPL, topToken, topTokenCount }
  }, [trades])

  if (!stats) return null

  const items = [
    { label: 'Avg Win', value: `+${formatValue(stats.avgWin)}`, className: 'text-emerald-500' },
    { label: 'Avg Loss', value: formatValue(stats.avgLoss), className: 'text-red-500' },
    { label: 'Avg Hold', value: stats.avgHoldTime > 0 ? formatDuration(stats.avgHoldTime) : '-', className: '' },
    { label: 'Best Hour', value: stats.bestHourPL > -Infinity ? HOUR_LABELS[stats.bestHour] : '-', className: '' },
    { label: 'Top Token', value: `${stats.topToken} (${stats.topTokenCount})`, className: '' },
  ]

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-lg border p-3 text-xs">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className="text-muted-foreground">{item.label}</span>
          <span className={`font-mono tabular-nums font-medium ${item.className}`}>{item.value}</span>
        </div>
      ))}
    </div>
  )
}

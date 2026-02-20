'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatValue } from '@/lib/formatters'
import type { FlattenedTrade } from '@/lib/tradeCycles'

interface KPICardsProps {
  trades: FlattenedTrade[]
}

export function KPICards({ trades }: KPICardsProps) {
  const stats = useMemo(() => {
    const completed = trades.filter((t) => t.isComplete)
    const active = trades.filter((t) => !t.isComplete)
    const totalPL = completed.reduce((s, t) => s + t.profitLoss, 0)
    const wins = completed.filter((t) => t.profitLoss > 0)
    const losses = completed.filter((t) => t.profitLoss < 0)
    const winRate = completed.length > 0 ? Math.round((wins.length / completed.length) * 100) : 0
    const grossProfit = wins.reduce((s, t) => s + t.profitLoss, 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profitLoss, 0))
    const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? Infinity : 0
    const bestTrade = completed.length > 0 ? Math.max(...completed.map((t) => t.profitLoss)) : 0
    const worstTrade = completed.length > 0 ? Math.min(...completed.map((t) => t.profitLoss)) : 0

    return { totalPL, winRate, profitFactor, totalTrades: completed.length, activeCycles: active.length, bestTrade, worstTrade }
  }, [trades])

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {/* Net P/L */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Net P/L</p>
          <p
            className={`text-xl font-mono tabular-nums font-bold ${
              stats.totalPL >= 0 ? 'text-emerald-500' : 'text-red-500'
            }`}
          >
            {stats.totalPL >= 0 ? '+' : ''}{formatValue(stats.totalPL)}
          </p>
        </CardContent>
      </Card>

      {/* Win Rate */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
          <p className="text-xl font-mono tabular-nums font-bold">{stats.winRate}%</p>
        </CardContent>
      </Card>

      {/* Profit Factor */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Profit Factor</p>
          <p
            className={`text-xl font-mono tabular-nums font-bold ${
              stats.profitFactor >= 1 ? 'text-emerald-500' : stats.profitFactor > 0 ? 'text-red-500' : ''
            }`}
          >
            {stats.profitFactor === Infinity ? '\u221E' : stats.profitFactor.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Total Trades */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Trades</p>
          <p className="text-xl font-mono tabular-nums font-bold">{stats.totalTrades}</p>
          {stats.activeCycles > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{stats.activeCycles} active</p>
          )}
        </CardContent>
      </Card>

      {/* Best / Worst Trade */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Best / Worst</p>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-mono tabular-nums font-semibold text-emerald-500">
              +{formatValue(stats.bestTrade)}
            </span>
            <span className="text-muted-foreground text-[10px]">/</span>
            <span className="text-sm font-mono tabular-nums font-semibold text-red-500">
              {formatValue(stats.worstTrade)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

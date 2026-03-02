'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatValue } from '@/lib/formatters'
import type { FlattenedTrade } from '@/lib/tradeCycles'

interface KPICardsProps {
  trades: FlattenedTrade[]
  streak?: { current: number; longest: number }
}

function computeSharpe(trades: FlattenedTrade[]): number {
  const completed = trades.filter((t) => t.isComplete)
  if (completed.length < 2) return 0
  const returns = completed.map((t) => t.profitLoss)
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1)
  const stdDev = Math.sqrt(variance)
  if (stdDev === 0) return 0
  return mean / stdDev
}

export function KPICards({ trades, streak }: KPICardsProps) {
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
    const avgPL = completed.length > 0 ? totalPL / completed.length : 0
    const sharpe = computeSharpe(trades)

    return { totalPL, winRate, profitFactor, totalTrades: completed.length, activeCycles: active.length, avgPL, sharpe }
  }, [trades])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {/* Net P/L */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Net P/L</p>
          <p
            className={`text-xl font-mono tabular-nums font-bold ${
              stats.totalPL >= 0 ? 'text-emerald-500' : 'text-red-500'
            }`}
          >
            {formatValue(stats.totalPL, true)}
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

      {/* Avg P/L */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Avg P/L</p>
          <p
            className={`text-xl font-mono tabular-nums font-bold ${
              stats.avgPL >= 0 ? 'text-emerald-500' : 'text-red-500'
            }`}
          >
            {formatValue(stats.avgPL, true)}
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

      {/* Sharpe Ratio */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Sharpe Ratio</p>
          <p
            className={`text-xl font-mono tabular-nums font-bold ${
              stats.sharpe >= 1 ? 'text-emerald-500' : stats.sharpe > 0 ? '' : 'text-red-500'
            }`}
          >
            {stats.sharpe.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* Streak */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Streak</p>
          <p className="text-xl font-mono tabular-nums font-bold">
            {streak && streak.current > 0 ? (
              <>{'\ud83d\udd25'} {streak.current}d</>
            ) : (
              '0d'
            )}
          </p>
          {streak && streak.longest > 0 && streak.longest !== streak.current && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Best: {streak.longest}d</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

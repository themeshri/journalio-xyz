'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatValue } from '@/lib/formatters'
import type { FlattenedTrade } from '@/lib/tradeCycles'

interface KPICardsProps {
  trades: FlattenedTrade[]
}

function TradeLineItem({ trade, type }: { trade: FlattenedTrade; type: 'best' | 'worst' }) {
  const logo = trade.buys[0]?.tokenOut?.logoURI || trade.sells[0]?.tokenIn?.logoURI || null
  const colorClass = type === 'best' ? 'text-emerald-500' : 'text-red-500'

  return (
    <div className="flex items-center gap-2">
      {logo ? (
        <img src={logo} alt={trade.token} className="w-4 h-4 rounded-full shrink-0" />
      ) : (
        <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[7px] font-bold text-zinc-300 shrink-0">
          {trade.token.slice(0, 2)}
        </div>
      )}
      <div className="min-w-0">
        <p className={`text-sm font-mono tabular-nums font-semibold ${colorClass}`}>
          {trade.profitLoss >= 0 ? '+' : ''}{formatValue(trade.profitLoss)}
        </p>
        <p className="text-[9px] text-muted-foreground truncate">{trade.token}</p>
      </div>
    </div>
  )
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
    let bestTradeObj: FlattenedTrade | null = null
    let worstTradeObj: FlattenedTrade | null = null
    for (const t of completed) {
      if (!bestTradeObj || t.profitLoss > bestTradeObj.profitLoss) bestTradeObj = t
      if (!worstTradeObj || t.profitLoss < worstTradeObj.profitLoss) worstTradeObj = t
    }

    return { totalPL, winRate, profitFactor, totalTrades: completed.length, activeCycles: active.length, bestTradeObj, worstTradeObj }
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
          <div className="space-y-1.5">
            {stats.bestTradeObj && (
              <TradeLineItem trade={stats.bestTradeObj} type="best" />
            )}
            {stats.worstTradeObj && (
              <TradeLineItem trade={stats.worstTradeObj} type="worst" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

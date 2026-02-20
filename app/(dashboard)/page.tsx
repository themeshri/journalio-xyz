'use client'

import { useMemo, useState, useEffect } from 'react'
import { useWallet } from '@/lib/wallet-context'
import { formatValue } from '@/lib/formatters'
import { computeCalendarData, getDayColorClass, computeHesitationCost, type MissedTradeEntry } from '@/lib/analytics'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'
import { StatStripSkeleton, TableRowsSkeleton } from '@/components/skeletons'
import { ChainIcon } from '@/components/chain-badge'

export default function OverviewPage() {
  const { allTrades, flattenedTrades, isAnyLoading, hasActiveWallets, walletSlots, activeWallets } = useWallet()

  if (!hasActiveWallets) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Add a wallet in Wallet Management to start tracking trades.
        </p>
      </div>
    )
  }

  if (isAnyLoading && allTrades.length === 0) {
    return (
      <div className="pt-8">
        <h1 className="text-xl font-semibold mb-6">Overview</h1>
        <StatStripSkeleton count={4} />
        <h2 className="text-sm font-semibold mb-3">Recent Trades</h2>
        <TableRowsSkeleton rows={5} cols={6} />
      </div>
    )
  }

  const errors = activeWallets
    .map((w) => walletSlots[`${w.chain}:${w.address}`]?.error)
    .filter(Boolean)

  if (errors.length > 0 && allTrades.length === 0) {
    return (
      <div className="pt-8">
        {errors.map((err, i) => (
          <p key={i} className="text-sm text-destructive">{err}</p>
        ))}
      </div>
    )
  }

  if (allTrades.length === 0) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Overview</h1>
        <p className="text-sm text-muted-foreground">
          No transactions found for your active wallets.
        </p>
      </div>
    )
  }

  const totalTrades = flattenedTrades.length
  const profitableTrades = flattenedTrades.filter((t) => t.profitLoss > 0).length
  const winRate = totalTrades > 0 ? ((profitableTrades / totalTrades) * 100).toFixed(0) : '0'
  const totalPL = flattenedTrades.reduce((sum, t) => sum + t.profitLoss, 0)
  const activeCycles = flattenedTrades.filter((t) => !t.isComplete).length

  const recentTrades = allTrades.slice(0, 10)

  // Mini calendar - last 7 days
  const now = new Date()
  const calData = useMemo(
    () => computeCalendarData(flattenedTrades, now.getFullYear(), now.getMonth()),
    [flattenedTrades]
  )
  const last7Days = useMemo(() => {
    const days: { date: string; pnl: number; trades: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const dayData = calData.weeks.flatMap((w) => w.days).find((dd) => dd?.date === key)
      days.push({ date: key, pnl: dayData?.pnl || 0, trades: dayData?.tradeCount || 0 })
    }
    return days
  }, [calData])
  const miniMaxPnl = Math.max(...last7Days.map((d) => d.pnl), 0.01)
  const miniMaxLoss = Math.max(...last7Days.map((d) => Math.abs(Math.min(d.pnl, 0))), 0.01)

  // Hesitation cost
  const [missedTrades, setMissedTrades] = useState<MissedTradeEntry[]>([])
  useEffect(() => {
    fetch('/api/papered-plays')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMissedTrades(data) })
      .catch(() => {})
  }, [])
  const hesitation = useMemo(
    () => computeHesitationCost(missedTrades, flattenedTrades),
    [missedTrades, flattenedTrades]
  )

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Overview</h1>

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-10 gap-y-2 mb-10 text-sm">
        <div>
          <span className="text-muted-foreground">Total Cycles</span>
          <span className="ml-2 font-mono tabular-nums font-semibold">{totalTrades}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Win Rate</span>
          <span className="ml-2 font-mono tabular-nums font-semibold">{winRate}%</span>
        </div>
        <div>
          <span className="text-muted-foreground">P/L</span>
          <span
            className={`ml-2 font-mono tabular-nums font-semibold ${
              totalPL >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {totalPL >= 0 ? '+' : ''}{formatValue(totalPL)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Active</span>
          <span className="ml-2 font-mono tabular-nums font-semibold">{activeCycles}</span>
        </div>
      </div>

      {/* Dashboard widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {/* Mini P/L Calendar - Last 7 Days */}
        <div className="rounded-lg border p-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-3">Last 7 Days</h3>
          <div className="flex gap-1.5">
            {last7Days.map((day) => (
              <div key={day.date} className="flex-1 text-center">
                <div className="text-[10px] text-muted-foreground mb-1">
                  {new Date(day.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' })}
                </div>
                <div
                  className={`h-8 rounded flex items-center justify-center ${
                    day.trades > 0 ? getDayColorClass(day.pnl, miniMaxPnl, miniMaxLoss) : 'bg-zinc-800/50'
                  }`}
                >
                  {day.trades > 0 && (
                    <span className={`text-[9px] font-mono font-medium ${day.pnl >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                      {day.pnl >= 0 ? '+' : ''}{formatValue(day.pnl)}
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-muted-foreground mt-0.5">{day.trades}t</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hesitation Cost */}
        {missedTrades.length > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-3">Hesitation Cost</h3>
            <div className="flex items-baseline gap-3">
              <span className="text-xl font-mono font-semibold text-amber-500">
                {formatValue(hesitation.hesitationCost)}
              </span>
              <span className="text-xs text-muted-foreground">missed profit</span>
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
              <span>{missedTrades.length} missed trades</span>
              <span>{hesitation.missedWinRate}% would-be WR</span>
              <span>{hesitation.missedPerActual}x per actual trade</span>
            </div>
          </div>
        )}
      </div>

      {/* Recent trades table */}
      <h2 className="text-sm font-semibold mb-3">Recent Trades</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Time</TableHead>
            <TableHead className="w-[60px]">Type</TableHead>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead>DEX</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recentTrades.map((trade, i) => (
            <TableRow key={`${trade.signature}-${i}`}>
              <TableCell className="font-mono text-xs tabular-nums">
                {formatTimestamp(trade.timestamp)}
              </TableCell>
              <TableCell>
                <span
                  className={`text-xs font-medium ${
                    trade.type === 'buy'
                      ? 'text-emerald-600'
                      : trade.type === 'sell'
                        ? 'text-red-600'
                        : 'text-muted-foreground'
                  }`}
                >
                  {trade.type}
                </span>
              </TableCell>
              <TableCell className="text-xs">
                <span className="flex items-center gap-1">
                  <ChainIcon chain={trade._chain || 'solana'} size={10} />
                  {trade.tokenIn?.symbol || '?'}
                </span>
              </TableCell>
              <TableCell className="text-xs">
                {trade.tokenOut?.symbol || '?'}
              </TableCell>
              <TableCell className="text-right font-mono text-xs tabular-nums">
                ${trade.valueUSD?.toFixed(2) ?? '0.00'}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {trade.dex}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function formatTimestamp(ts: number) {
  try {
    return format(new Date(ts * 1000), 'MMM dd HH:mm')
  } catch {
    return '-'
  }
}

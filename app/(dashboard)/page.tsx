'use client'

import { useWallet } from '@/lib/wallet-context'
import { calculateTradeCycles, flattenTradeCycles } from '@/lib/tradeCycles'
import { formatValue } from '@/lib/formatters'
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

export default function OverviewPage() {
  const { currentWallet, currentChain, trades, isLoading, error } = useWallet()

  if (!currentWallet) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Add a wallet in Wallet Management to start tracking trades.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="pt-8">
        <h1 className="text-xl font-semibold mb-6">Overview</h1>
        <StatStripSkeleton count={4} />
        <h2 className="text-sm font-semibold mb-3">Recent Trades</h2>
        <TableRowsSkeleton rows={5} cols={6} />
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

  if (trades.length === 0) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Overview</h1>
        <p className="text-sm text-muted-foreground">
          No transactions found for this wallet.
        </p>
      </div>
    )
  }

  const tradeCycles = calculateTradeCycles(trades, currentChain)
  const flattenedTrades = flattenTradeCycles(tradeCycles)
  const totalTrades = flattenedTrades.length
  const profitableTrades = flattenedTrades.filter((t) => t.profitLoss > 0).length
  const winRate = totalTrades > 0 ? ((profitableTrades / totalTrades) * 100).toFixed(0) : '0'
  const totalPL = flattenedTrades.reduce((sum, t) => sum + t.profitLoss, 0)
  const activeCycles = flattenedTrades.filter((t) => !t.isComplete).length

  const recentTrades = trades.slice(0, 10)

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
                {trade.tokenIn?.symbol || '?'}
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

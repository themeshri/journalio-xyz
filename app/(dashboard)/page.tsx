'use client'

import { useMemo } from 'react'
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
import { ChainIcon } from '@/components/chain-badge'
import { type Chain } from '@/lib/chains'

export default function OverviewPage() {
  const { allTrades, activeWallets, isAnyLoading, hasActiveWallets, walletSlots } = useWallet()

  const flattenedTrades = useMemo(() => {
    if (!hasActiveWallets) return []
    const allFlattened = activeWallets.flatMap((w) => {
      const key = `${w.chain}:${w.address}`
      const slot = walletSlots[key]
      if (!slot?.trades?.length) return []
      const cycles = calculateTradeCycles(slot.trades, w.chain as Chain, w.address)
      return flattenTradeCycles(cycles)
    })
    return allFlattened.sort((a, b) => b.startDate - a.startDate)
  }, [activeWallets, walletSlots, hasActiveWallets])

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

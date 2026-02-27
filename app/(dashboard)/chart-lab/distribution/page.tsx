'use client'

import { useMemo } from 'react'
import { useWallet } from '@/lib/wallet-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatValue } from '@/lib/formatters'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export default function DistributionPage() {
  const { flattenedTrades } = useWallet()

  const { buckets, stats } = useMemo(() => {
    const completed = flattenedTrades.filter((t) => t.isComplete)
    if (completed.length === 0) return { buckets: [], stats: null }

    const pnls = completed.map((t) => t.profitLoss)
    const min = Math.min(...pnls)
    const max = Math.max(...pnls)
    const range = max - min

    if (range === 0) return { buckets: [], stats: null }

    // Create ~15 buckets
    const bucketCount = Math.min(15, Math.max(5, Math.ceil(completed.length / 3)))
    const bucketSize = range / bucketCount
    const bucketMap = new Map<number, { min: number; max: number; count: number; wins: number }>()

    for (let i = 0; i < bucketCount; i++) {
      const bMin = min + i * bucketSize
      const bMax = min + (i + 1) * bucketSize
      bucketMap.set(i, { min: bMin, max: bMax, count: 0, wins: 0 })
    }

    for (const pnl of pnls) {
      let idx = Math.floor((pnl - min) / bucketSize)
      if (idx >= bucketCount) idx = bucketCount - 1
      const b = bucketMap.get(idx)!
      b.count++
      if (pnl > 0) b.wins++
    }

    const bkts = Array.from(bucketMap.values()).map((b) => ({
      label: `${formatValue(b.min)}`,
      count: b.count,
      isPositive: (b.min + b.max) / 2 >= 0,
      range: `${formatValue(b.min)} to ${formatValue(b.max)}`,
    }))

    const wins = pnls.filter((p) => p > 0).length
    const losses = pnls.filter((p) => p < 0).length
    const avgWin = wins > 0 ? pnls.filter((p) => p > 0).reduce((s, v) => s + v, 0) / wins : 0
    const avgLoss = losses > 0 ? pnls.filter((p) => p < 0).reduce((s, v) => s + v, 0) / losses : 0

    return {
      buckets: bkts,
      stats: {
        total: completed.length,
        wins,
        losses,
        avgWin,
        avgLoss,
        ratio: avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0,
      },
    }
  }, [flattenedTrades])

  if (!stats || buckets.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">P/L Distribution</h1>
        <p className="text-sm text-muted-foreground">
          No completed trades available. Add a wallet with trade history.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">P/L Distribution</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Avg Winner</p>
            <p className="text-lg font-mono font-bold text-emerald-500">+{formatValue(stats.avgWin)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Avg Loser</p>
            <p className="text-lg font-mono font-bold text-red-500">{formatValue(stats.avgLoss)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Win/Loss Ratio</p>
            <p className="text-lg font-mono font-bold">{stats.ratio.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Record</p>
            <p className="text-lg font-mono font-bold">
              <span className="text-emerald-500">{stats.wins}W</span>
              {' / '}
              <span className="text-red-500">{stats.losses}L</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">P/L Distribution (Histogram)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="rounded border bg-popover p-2 text-xs shadow-md">
                        <p className="font-medium">{d.range}</p>
                        <p className="text-muted-foreground">{d.count} trades</p>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {buckets.map((b, i) => (
                    <Cell
                      key={i}
                      fill={b.isPositive ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'}
                      fillOpacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

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
import {
  GradientBarDefs,
  HatchPatternDefs,
  DottedBackgroundPattern,
} from '@/lib/chart-effects'

/** Nice round bucket edges for P/L distribution */
const NICE_EDGES = [-10000, -5000, -2000, -1000, -500, -200, -100, -50, -20, -10, 0, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]

function buildNiceBuckets(pnls: number[]) {
  const min = Math.min(...pnls)
  const max = Math.max(...pnls)

  // Find the relevant range of edges
  let startIdx = 0
  for (let i = NICE_EDGES.length - 1; i >= 0; i--) {
    if (NICE_EDGES[i] <= min) { startIdx = i; break }
  }
  let endIdx = NICE_EDGES.length - 1
  for (let i = 0; i < NICE_EDGES.length; i++) {
    if (NICE_EDGES[i] >= max) { endIdx = i; break }
  }

  const edges = NICE_EDGES.slice(startIdx, endIdx + 1)
  // Ensure at least 3 edges
  if (edges.length < 3) {
    return edges.length >= 2
      ? [{ min: edges[0], max: edges[1] }]
      : [{ min: Math.floor(min), max: Math.ceil(max) }]
  }

  const bucketDefs: { min: number; max: number }[] = []
  for (let i = 0; i < edges.length - 1; i++) {
    bucketDefs.push({ min: edges[i], max: edges[i + 1] })
  }

  return bucketDefs
}

export default function DistributionPage() {
  const { flattenedTrades } = useWallet()

  const { buckets, stats } = useMemo(() => {
    const completed = flattenedTrades.filter((t) => t.isComplete)
    if (completed.length === 0) return { buckets: [], stats: null }

    const pnls = completed.map((t) => t.profitLoss)
    const range = Math.max(...pnls) - Math.min(...pnls)
    if (range === 0) return { buckets: [], stats: null }

    const bucketDefs = buildNiceBuckets(pnls)

    const bkts = bucketDefs.map((b) => {
      let count = 0
      let wins = 0
      for (const pnl of pnls) {
        const inBucket = b.max === bucketDefs[bucketDefs.length - 1].max
          ? pnl >= b.min && pnl <= b.max  // last bucket is inclusive on both ends
          : pnl >= b.min && pnl < b.max
        if (inBucket) {
          count++
          if (pnl > 0) wins++
        }
      }
      return {
        label: `${formatValue(b.min)}`,
        count,
        isPositive: (b.min + b.max) / 2 >= 0,
        range: `${formatValue(b.min)} to ${formatValue(b.max)}`,
      }
    }).filter((b) => b.count > 0)

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
                <defs>
                  <GradientBarDefs id="dist-grad-green" color="oklch(0.527 0.154 163.225)" />
                  <HatchPatternDefs id="dist-hatch-red" color="oklch(0.577 0.245 27.325)" />
                  <DottedBackgroundPattern id="dist-dots" />
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <rect width="100%" height="100%" fill="url(#dist-dots)" />
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
                      fill={b.isPositive ? 'url(#dist-grad-green)' : 'url(#dist-hatch-red)'}
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

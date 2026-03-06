'use client'

import { useMemo } from 'react'
import { useWallet } from '@/lib/wallet-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatValue, formatDuration } from '@/lib/formatters'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

export default function HoldingTimePage() {
  const { flattenedTrades } = useWallet()

  const data = useMemo(() => {
    return flattenedTrades
      .filter((t) => t.isComplete && t.duration && t.duration > 0)
      .map((t) => ({
        token: t.token,
        durationMin: Math.round((t.duration! / 1000) / 60),
        pnl: t.profitLoss,
      }))
  }, [flattenedTrades])

  if (data.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Holding Time Analysis</h1>
        <p className="text-sm text-muted-foreground">
          No completed trades available. Add a wallet with trade history.
        </p>
      </div>
    )
  }

  const avgDuration = data.reduce((s, d) => s + d.durationMin, 0) / data.length
  const winsAboveAvg = data.filter((d) => d.durationMin > avgDuration && d.pnl > 0).length
  const winsBelowAvg = data.filter((d) => d.durationMin <= avgDuration && d.pnl > 0).length
  const totalAbove = data.filter((d) => d.durationMin > avgDuration).length
  const totalBelow = data.filter((d) => d.durationMin <= avgDuration).length

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Holding Time Analysis</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Avg Hold Time</p>
            <p className="text-lg font-mono font-bold">{formatDuration(avgDuration * 60 * 1000)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Win Rate (Short Holds)</p>
            <p className="text-lg font-mono font-bold">
              {totalBelow > 0 ? Math.round((winsBelowAvg / totalBelow) * 100) : 0}%
            </p>
            <p className="text-[10px] text-muted-foreground">&le; {formatDuration(avgDuration * 60 * 1000)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Win Rate (Long Holds)</p>
            <p className="text-lg font-mono font-bold">
              {totalAbove > 0 ? Math.round((winsAboveAvg / totalAbove) * 100) : 0}%
            </p>
            <p className="text-[10px] text-muted-foreground">&gt; {formatDuration(avgDuration * 60 * 1000)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Duration vs P/L</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="durationMin"
                  name="Duration"
                  unit="m"
                  type="number"
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Duration (minutes)', position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
                />
                <YAxis
                  dataKey="pnl"
                  name="P/L"
                  tick={{ fontSize: 10 }}
                  label={{ value: 'P/L ($)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
                />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="rounded border bg-popover p-2 text-xs shadow-md">
                        <p className="font-medium">{d.token}</p>
                        <p className="text-muted-foreground">Duration: {formatDuration(d.durationMin * 60 * 1000)}</p>
                        <p className={d.pnl >= 0 ? 'text-lime-500' : 'text-red-500'}>
                          P/L: {d.pnl >= 0 ? '+' : ''}{formatValue(d.pnl)}
                        </p>
                      </div>
                    )
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <ReferenceLine x={avgDuration} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: 'Avg', position: 'top', style: { fontSize: 10, fill: 'hsl(var(--primary))' } }} />
                <Scatter data={data} fill="hsl(var(--primary))" fillOpacity={0.6} r={4} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

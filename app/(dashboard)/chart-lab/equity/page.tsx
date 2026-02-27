'use client'

import { useMemo } from 'react'
import { useWallet } from '@/lib/wallet-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatValue } from '@/lib/formatters'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

export default function EquityPage() {
  const { flattenedTrades } = useWallet()

  const { equityData, stats } = useMemo(() => {
    const completed = flattenedTrades
      .filter((t) => t.isComplete && t.endDate)
      .sort((a, b) => (a.endDate || 0) - (b.endDate || 0))

    if (completed.length === 0) {
      return { equityData: [], stats: null }
    }

    let cumPnl = 0
    let peak = 0
    let maxDrawdown = 0
    let maxDrawdownPct = 0

    const points = completed.map((t, i) => {
      cumPnl += t.profitLoss
      if (cumPnl > peak) peak = cumPnl
      const dd = peak - cumPnl
      if (dd > maxDrawdown) maxDrawdown = dd
      if (peak > 0) {
        const ddPct = (dd / peak) * 100
        if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct
      }

      const d = new Date((t.endDate || 0) * 1000)
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        equity: Math.round(cumPnl * 100) / 100,
        trade: i + 1,
        token: t.token,
        pnl: t.profitLoss,
      }
    })

    // SQN approximation: (avg P/L / stddev P/L) * sqrt(N)
    const pnls = completed.map((t) => t.profitLoss)
    const mean = pnls.reduce((s, v) => s + v, 0) / pnls.length
    const variance = pnls.reduce((s, v) => s + (v - mean) ** 2, 0) / pnls.length
    const stddev = Math.sqrt(variance)
    const sqn = stddev > 0 ? (mean / stddev) * Math.sqrt(Math.min(pnls.length, 100)) : 0

    return {
      equityData: points,
      stats: {
        totalPnl: cumPnl,
        maxDrawdown,
        maxDrawdownPct: Math.round(maxDrawdownPct * 10) / 10,
        sqn: Math.round(sqn * 100) / 100,
        tradeCount: completed.length,
      },
    }
  }, [flattenedTrades])

  if (!stats || equityData.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Equity Curve</h1>
        <p className="text-sm text-muted-foreground">
          No completed trades available. Add a wallet with trade history.
        </p>
      </div>
    )
  }

  function sqnLabel(sqn: number): string {
    if (sqn >= 5) return 'Superb'
    if (sqn >= 3) return 'Excellent'
    if (sqn >= 2) return 'Good'
    if (sqn >= 1.5) return 'Above Average'
    if (sqn >= 0.7) return 'Average'
    return 'Poor'
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Equity Curve</h1>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Total P/L</p>
            <p className={`text-lg font-mono font-bold ${stats.totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {stats.totalPnl >= 0 ? '+' : ''}{formatValue(stats.totalPnl)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Max Drawdown</p>
            <p className="text-lg font-mono font-bold text-red-500">
              -{formatValue(stats.maxDrawdown)}
            </p>
            <p className="text-[10px] text-muted-foreground">{stats.maxDrawdownPct}% from peak</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">SQN</p>
            <p className="text-lg font-mono font-bold">{stats.sqn}</p>
            <p className="text-[10px] text-muted-foreground">{sqnLabel(stats.sqn)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Trades</p>
            <p className="text-lg font-mono font-bold">{stats.tradeCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cumulative P/L</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData} margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="trade"
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Trade #', position: 'insideBottom', offset: -10, style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  label={{ value: 'Equity ($)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: 'hsl(var(--muted-foreground))' } }}
                />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="rounded border bg-popover p-2 text-xs shadow-md">
                        <p className="font-medium">Trade #{d.trade} — {d.token}</p>
                        <p className={d.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                          P/L: {d.pnl >= 0 ? '+' : ''}{formatValue(d.pnl)}
                        </p>
                        <p className="text-muted-foreground">
                          Equity: {formatValue(d.equity)}
                        </p>
                      </div>
                    )
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="hsl(var(--primary))"
                  fill="url(#equityGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

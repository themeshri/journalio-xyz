'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatValue } from '@/lib/formatters'
import { computeCumulativePL } from '@/lib/analytics'
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import type { FlattenedTrade } from '@/lib/tradeCycles'

const chartConfig = {
  cumulativePL: { label: 'Cumulative P/L', color: 'oklch(0.527 0.154 163.225)' },
} satisfies ChartConfig

interface EquityCurveProps {
  trades: FlattenedTrade[]
}

export function EquityCurve({ trades }: EquityCurveProps) {
  const data = useMemo(() => computeCumulativePL(trades), [trades])

  if (data.length === 0) {
    return (
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">No completed trades yet.</p>
        </CardContent>
      </Card>
    )
  }

  const lastValue = data[data.length - 1]?.cumulativePL ?? 0
  const minPL = Math.min(...data.map((d) => d.cumulativePL))
  const maxPL = Math.max(...data.map((d) => d.cumulativePL))

  return (
    <Card className="col-span-1">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Equity Curve</CardTitle>
          <span
            className={`text-sm font-mono tabular-nums font-semibold ${
              lastValue >= 0 ? 'text-emerald-500' : 'text-red-500'
            }`}
          >
            {lastValue >= 0 ? '+' : ''}{formatValue(lastValue)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <ChartContainer config={chartConfig} className="h-[220px] w-full">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={lastValue >= 0 ? 'oklch(0.527 0.154 163.225)' : 'oklch(0.577 0.245 27.325)'}
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor={lastValue >= 0 ? 'oklch(0.527 0.154 163.225)' : 'oklch(0.577 0.245 27.325)'}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `$${v}`}
              domain={[Math.floor(minPL * 1.1), Math.ceil(maxPL * 1.1)]}
              width={50}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.5} />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
                    <p className="text-muted-foreground">{d.date} &middot; {d.token}</p>
                    <p className="font-mono font-semibold">
                      Cumulative: {d.cumulativePL >= 0 ? '+' : ''}{formatValue(d.cumulativePL)}
                    </p>
                    <p className={`font-mono ${d.tradePL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      Trade: {d.tradePL >= 0 ? '+' : ''}{formatValue(d.tradePL)}
                    </p>
                  </div>
                )
              }}
            />
            <Area
              type="monotone"
              dataKey="cumulativePL"
              stroke={lastValue >= 0 ? 'oklch(0.527 0.154 163.225)' : 'oklch(0.577 0.245 27.325)'}
              strokeWidth={2}
              fill="url(#equityGradient)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

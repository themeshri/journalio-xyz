'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatValue } from '@/lib/formatters'
import { AreaChart, Area } from 'recharts'
import type { FlattenedTrade } from '@/lib/tradeCycles'

/** Format USD without cents (whole dollars only) */
function formatWhole(amount: number, showSign: boolean = false): string {
  const isNegative = amount < 0
  const formatted = Math.round(Math.abs(amount)).toLocaleString('en-US')
  if (isNegative) return `-$${formatted}`
  if (showSign && amount > 0) return `+$${formatted}`
  return `$${formatted}`
}

/** Format duration without seconds */
function formatDurationNoSec(ms: number): string {
  const minutes = Math.floor(ms / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours % 24 > 0) parts.push(`${hours % 24}h`)
  if (minutes % 60 > 0) parts.push(`${minutes % 60}m`)
  return parts.length > 0 ? parts.join(' ') : '<1m'
}

interface KPICardsProps {
  trades: FlattenedTrade[]
}

// ─── Mini Visualizations ─────────────────────────────────────

function Sparkline({ data, positive }: { data: { value: number }[]; positive: boolean }) {
  if (data.length < 2) return <div className="w-[80px] h-[40px]" />
  const color = positive ? '#F59E0B' : '#ef4444'
  return (
    <AreaChart width={80} height={40} data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
      <defs>
        <linearGradient id={`spark-${positive ? 'g' : 'r'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area
        type="monotone"
        dataKey="value"
        stroke={color}
        strokeWidth={1.5}
        fill={`url(#spark-${positive ? 'g' : 'r'})`}
        isAnimationActive={false}
      />
    </AreaChart>
  )
}

function DonutRing({ winPct, lossPct }: { winPct: number; lossPct: number }) {
  const size = 48
  const outerR = 20
  const innerR = 12
  const cx = size / 2
  const cy = size / 2
  const evenPct = 100 - winPct - lossPct

  function wedgePath(startPct: number, endPct: number) {
    if (endPct - startPct >= 99.99) {
      // Full circle — use two arcs
      return [
        `M ${cx} ${cy - outerR}`,
        `A ${outerR} ${outerR} 0 1 1 ${cx} ${cy + outerR}`,
        `A ${outerR} ${outerR} 0 1 1 ${cx} ${cy - outerR}`,
        `Z`,
        `M ${cx} ${cy - innerR}`,
        `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy + innerR}`,
        `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR}`,
        `Z`,
      ].join(' ')
    }
    const startAngle = (startPct / 100) * 2 * Math.PI - Math.PI / 2
    const endAngle = (endPct / 100) * 2 * Math.PI - Math.PI / 2
    const large = endPct - startPct > 50 ? 1 : 0
    const ox1 = cx + outerR * Math.cos(startAngle)
    const oy1 = cy + outerR * Math.sin(startAngle)
    const ox2 = cx + outerR * Math.cos(endAngle)
    const oy2 = cy + outerR * Math.sin(endAngle)
    const ix1 = cx + innerR * Math.cos(endAngle)
    const iy1 = cy + innerR * Math.sin(endAngle)
    const ix2 = cx + innerR * Math.cos(startAngle)
    const iy2 = cy + innerR * Math.sin(startAngle)
    return `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${large} 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${large} 0 ${ix2} ${iy2} Z`
  }

  const segments: { path: string; color: string }[] = []
  let cursor = 0

  if (winPct > 0.1) {
    segments.push({ path: wedgePath(cursor, cursor + winPct), color: '#F59E0B' })
    cursor += winPct
  }
  if (evenPct > 0.1) {
    segments.push({ path: wedgePath(cursor, cursor + evenPct), color: '#52525b' })
    cursor += evenPct
  }
  if (lossPct > 0.1) {
    segments.push({ path: wedgePath(cursor, cursor + lossPct), color: '#ef4444' })
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background */}
      <circle cx={cx} cy={cy} r={outerR} fill="#27272a" />
      <circle cx={cx} cy={cy} r={innerR} fill="transparent" />
      {segments.map((seg, i) => (
        <path key={i} d={seg.path} fill={seg.color} />
      ))}
      {/* Inner hole */}
      <circle cx={cx} cy={cy} r={innerR} fill="var(--card)" />
    </svg>
  )
}

function ProfitBar({ avgWin, avgLoss, ratio }: { avgWin: number; avgLoss: number; ratio: string }) {
  const total = avgWin + avgLoss
  const winPct = total > 0 ? (avgWin / total) * 100 : 50
  return (
    <div className="space-y-1 w-full">
      <p className="text-[10px] text-muted-foreground text-center font-mono">{ratio}</p>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-zinc-800">
        <div className="bg-amber-500 rounded-l-full" style={{ width: `${winPct}%` }} />
        <div className="bg-red-500 rounded-r-full" style={{ width: `${100 - winPct}%` }} />
      </div>
      <div className="flex justify-between text-[9px] font-mono tabular-nums">
        <span className="text-amber-500">{formatValue(avgWin, true)}</span>
        <span className="text-red-500">{formatValue(-avgLoss, true)}</span>
      </div>
    </div>
  )
}

function DotIndicator({ factor }: { factor: number }) {
  // 8 squares: red → yellow → green gradient based on profit factor
  // PF 0 = all red, PF 1 = halfway (4 red, 1 yellow, 3 green-ish), PF 2+ = mostly green
  const count = 8
  const filled = factor === Infinity ? count : Math.min(count, Math.max(0, Math.round((factor / (factor + 1)) * count)))
  const colors = Array.from({ length: count }).map((_, i) => {
    if (i >= filled) return 'bg-red-500'
    // last filled squares are green, middle ones yellow
    const pos = i / (count - 1)
    if (pos < 0.35) return 'bg-red-500'
    if (pos < 0.5) return 'bg-amber-500'
    return 'bg-amber-500'
  })
  // Override: color by position in the filled range
  // Red for low positions, yellow for mid, gold for high
  const result = Array.from({ length: count }).map((_, i) => {
    if (i >= filled) return 'bg-zinc-700'
    if (i < 2) return 'bg-red-500'
    if (i < 4) return 'bg-yellow-500'
    return 'bg-amber-500'
  })
  return (
    <div className="flex gap-0.5">
      {result.map((color, i) => (
        <div key={i} className={`w-3.5 h-2 rounded-[2px] ${color}`} />
      ))}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────

export function KPICards({ trades }: KPICardsProps) {
  const stats = useMemo(() => {
    const completed = trades.filter((t) => t.isComplete)
    const totalPL = completed.reduce((s, t) => s + t.profitLoss, 0)
    const wins = completed.filter((t) => t.profitLoss > 0)
    const losses = completed.filter((t) => t.profitLoss < 0)
    const breakeven = completed.filter((t) => t.profitLoss === 0)
    const winRate = completed.length > 0 ? (wins.length / completed.length) * 100 : 0
    const lossRate = completed.length > 0 ? (losses.length / completed.length) * 100 : 0
    const grossProfit = wins.reduce((s, t) => s + t.profitLoss, 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profitLoss, 0))
    const profitFactor = grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? Infinity : 0
    const avgPL = completed.length > 0 ? totalPL / completed.length : 0
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0

    const sorted = [...completed].sort((a, b) => (a.endDate || a.startDate) - (b.endDate || b.startDate))
    let cumulative = 0
    const cumulativePL = sorted.map((t) => {
      cumulative += t.profitLoss
      return { value: cumulative }
    })

    const winLossRatio = avgLoss > 0 ? `${(avgWin / avgLoss).toFixed(2)}:1` : avgWin > 0 ? '\u221E:1' : '0:0'

    const withDuration = completed.filter((t) => t.duration && t.duration > 0)
    const avgDuration = withDuration.length > 0 ? withDuration.reduce((s, t) => s + t.duration!, 0) / withDuration.length : 0
    const winsWithDur = wins.filter((t) => t.duration && t.duration > 0)
    const lossesWithDur = losses.filter((t) => t.duration && t.duration > 0)
    const avgWinDuration = winsWithDur.length > 0 ? winsWithDur.reduce((s, t) => s + t.duration!, 0) / winsWithDur.length : 0
    const avgLossDuration = lossesWithDur.length > 0 ? lossesWithDur.reduce((s, t) => s + t.duration!, 0) / lossesWithDur.length : 0

    return {
      totalPL, winRate: Math.round(winRate), lossRate, profitFactor,
      avgPL, avgWin, avgLoss, cumulativePL,
      winCount: wins.length, lossCount: losses.length, evenCount: breakeven.length,
      winLossRatio, avgDuration, avgWinDuration, avgLossDuration,
    }
  }, [trades])

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">

      {/* Net Return — left: label+value, right: sparkline */}
      <Card>
        <CardContent className="flex items-center justify-between p-4 h-[100px]">
          <div className="flex flex-col justify-center gap-2">
            <p className="text-[11px] text-muted-foreground">Net Return</p>
            <p className="text-lg font-mono tabular-nums font-bold">
              {formatWhole(stats.totalPL, true)}
            </p>
          </div>
          <div className="flex items-center justify-center">
            <Sparkline data={stats.cumulativePL} positive={stats.totalPL >= 0} />
          </div>
        </CardContent>
      </Card>

      {/* Winrate — left: label+value, right: donut+counts */}
      <Card>
        <CardContent className="flex items-center justify-between p-4 h-[100px]">
          <div className="flex flex-col justify-center gap-2">
            <p className="text-[11px] text-muted-foreground">Winrate</p>
            <p className="text-lg font-mono tabular-nums font-bold">{stats.winRate}%</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <DonutRing winPct={stats.winRate} lossPct={stats.lossRate} />
            <div className="flex gap-2 text-[10px] font-mono tabular-nums -mt-0.5">
              <span className="text-amber-500">{stats.winCount}</span>
              <span className="text-zinc-500">{stats.evenCount}</span>
              <span className="text-red-500">{stats.lossCount}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avg P/L — left: label+value, right: bar */}
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4 h-[100px]">
          <div className="flex flex-col justify-center gap-2 shrink-0">
            <p className="text-[11px] text-muted-foreground">Avg P/L</p>
            <p className="text-lg font-mono tabular-nums font-bold">
              {formatWhole(stats.avgPL, true)}
            </p>
          </div>
          <div className="flex items-center justify-center w-1/2 max-w-[50%]">
            <ProfitBar avgWin={stats.avgWin} avgLoss={stats.avgLoss} ratio={stats.winLossRatio} />
          </div>
        </CardContent>
      </Card>

      {/* Profit Factor — left: label+value, right: dots */}
      <Card>
        <CardContent className="flex items-center justify-between p-4 h-[100px]">
          <div className="flex flex-col justify-center gap-2">
            <p className="text-[11px] text-muted-foreground">Profit Factor</p>
            <p className="text-lg font-mono tabular-nums font-bold">
              {stats.profitFactor === Infinity ? '\u221E' : stats.profitFactor.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center justify-center">
            <DotIndicator factor={stats.profitFactor} />
          </div>
        </CardContent>
      </Card>

      {/* Avg Duration — left: label+value, right: W/L durations */}
      <Card>
        <CardContent className="flex items-center justify-between p-4 h-[100px]">
          <div className="flex flex-col justify-center gap-2">
            <p className="text-[11px] text-muted-foreground">Avg Duration</p>
            <p className="text-lg font-mono tabular-nums font-bold">
              {stats.avgDuration > 0 ? formatDurationNoSec(stats.avgDuration) : '-'}
            </p>
          </div>
          <div className="flex flex-col items-end justify-center gap-1 text-[10px] font-mono tabular-nums">
            <span className="text-amber-500">W {stats.avgWinDuration > 0 ? formatDurationNoSec(stats.avgWinDuration) : '-'}</span>
            <span className="text-red-500">L {stats.avgLossDuration > 0 ? formatDurationNoSec(stats.avgLossDuration) : '-'}</span>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}

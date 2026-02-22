'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatValue } from '@/lib/formatters'
import Link from 'next/link'
import type { FlattenedTrade } from '@/lib/tradeCycles'
import type { Strategy } from '@/lib/strategies'

interface StrategySummaryProps {
  trades: FlattenedTrade[]
  journalMap: Record<string, any>
  strategies: Strategy[]
}

function journalKey(t: FlattenedTrade) {
  return `${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`
}

interface StrategyStats {
  id: string
  name: string
  tradeCount: number
  totalPnL: number
  wins: number
  losses: number
  winRate: number
  avgFollowRate: number
}

export function StrategySummary({ trades, journalMap, strategies }: StrategySummaryProps) {
  const { best, mostUsed, avgCompliance, hasData } = useMemo(() => {
    const completed = trades.filter((t) => t.isComplete)
    const stratMap = new Map<string, StrategyStats>()
    const stratNames = new Map<string, string>()
    for (const s of strategies) stratNames.set(s.id, s.name)

    let totalFollowRates: number[] = []

    for (const t of completed) {
      const j = journalMap[journalKey(t)]
      if (!j?.strategyId) continue

      const sid = j.strategyId
      const existing = stratMap.get(sid) || {
        id: sid,
        name: stratNames.get(sid) || j.strategy || 'Unknown',
        tradeCount: 0,
        totalPnL: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        avgFollowRate: 0,
      }

      existing.tradeCount++
      existing.totalPnL += t.profitLoss
      if (t.profitLoss > 0) existing.wins++
      else existing.losses++
      stratMap.set(sid, existing)

      // Rule compliance
      if (j.ruleResults && j.ruleResults.length > 0) {
        const followed = j.ruleResults.filter((r: any) => r.followed).length
        totalFollowRates.push((followed / j.ruleResults.length) * 100)
      }
    }

    if (stratMap.size === 0) {
      return { best: null, mostUsed: null, avgCompliance: 0, hasData: false }
    }

    const allStrats = Array.from(stratMap.values()).map((s) => ({
      ...s,
      winRate: s.tradeCount > 0 ? Math.round((s.wins / s.tradeCount) * 100) : 0,
    }))

    const bestStrat = [...allStrats].sort((a, b) => b.totalPnL - a.totalPnL)[0]
    const mostUsedStrat = [...allStrats].sort((a, b) => b.tradeCount - a.tradeCount)[0]
    const avgComp = totalFollowRates.length > 0
      ? Math.round(totalFollowRates.reduce((s, v) => s + v, 0) / totalFollowRates.length)
      : 0

    return { best: bestStrat, mostUsed: mostUsedStrat, avgCompliance: avgComp, hasData: true }
  }, [trades, journalMap, strategies])

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Strategy</p>
          <Link href="/strategies" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            View all &rarr;
          </Link>
        </div>
        {!hasData ? (
          <div>
            <p className="text-[10px] text-muted-foreground">No strategies tracked yet.</p>
            <Link href="/strategies" className="text-[10px] text-emerald-500 hover:underline mt-0.5 inline-block">
              Set up strategies &rarr;
            </Link>
          </div>
        ) : (
          <>
            {best && (
              <div>
                <p className="text-xs font-medium truncate">{best.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {best.tradeCount} trades &middot; {best.winRate}% WR &middot;{' '}
                  <span className={best.totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                    {best.totalPnL >= 0 ? '+' : ''}{formatValue(best.totalPnL)}
                  </span>
                </p>
              </div>
            )}

            {mostUsed && mostUsed.id !== best?.id && (
              <div>
                <p className="text-[10px] text-muted-foreground">
                  Most used: <span className="text-foreground">{mostUsed.name}</span> &middot; {mostUsed.tradeCount} trades
                </p>
              </div>
            )}

            {avgCompliance > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-1 rounded-full bg-zinc-800 overflow-hidden flex-1">
                  <div
                    className={`h-full rounded-full ${avgCompliance >= 70 ? 'bg-emerald-500' : avgCompliance >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${avgCompliance}%` }}
                  />
                </div>
                <p className="text-[10px] font-mono tabular-nums text-muted-foreground">{avgCompliance}%</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

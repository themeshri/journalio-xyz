'use client'

import { useMemo, useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatValue } from '@/lib/formatters'
import { computeHesitationCost, type MissedTradeEntry } from '@/lib/analytics'
import Link from 'next/link'
import type { FlattenedTrade } from '@/lib/tradeCycles'
import type { StreakResult } from '@/lib/streaks'

interface InsightsPanelProps {
  trades: FlattenedTrade[]
  streak: StreakResult
}

export function InsightsPanel({ trades, streak }: InsightsPanelProps) {
  // Hesitation cost
  const [missedTrades, setMissedTrades] = useState<MissedTradeEntry[]>([])
  useEffect(() => {
    fetch('/api/papered-plays')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMissedTrades(data) })
      .catch(() => {})
  }, [])

  const hesitation = useMemo(
    () => computeHesitationCost(missedTrades, trades),
    [missedTrades, trades]
  )

  // Pre-session status
  const [preSessionDone, setPreSessionDone] = useState(false)
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    fetch(`/api/pre-sessions/${today}`)
      .then((r) => r.json())
      .then((data) => setPreSessionDone(data !== null && !!data?.savedAt))
      .catch(() => {})
  }, [])

  // Win/loss streak from trades
  const tradeStreak = useMemo(() => {
    const completed = trades.filter((t) => t.isComplete).sort((a, b) => (b.endDate || 0) - (a.endDate || 0))
    if (completed.length === 0) return { type: 'none' as const, count: 0 }
    const firstResult = completed[0].profitLoss >= 0 ? 'win' : 'loss'
    let count = 0
    for (const t of completed) {
      const result = t.profitLoss >= 0 ? 'win' : 'loss'
      if (result === firstResult) count++
      else break
    }
    return { type: firstResult as 'win' | 'loss', count }
  }, [trades])

  return (
    <div className="col-span-1 flex flex-col gap-3">
      {/* Streak Counter */}
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-2">Streaks</p>
          <div className="flex gap-4">
            <div>
              <p className="text-lg font-mono tabular-nums font-bold">
                {tradeStreak.count}
              </p>
              <p className={`text-[10px] ${tradeStreak.type === 'win' ? 'text-emerald-500' : tradeStreak.type === 'loss' ? 'text-red-500' : 'text-muted-foreground'}`}>
                {tradeStreak.type === 'win' ? 'Win Streak' : tradeStreak.type === 'loss' ? 'Loss Streak' : 'No trades'}
              </p>
            </div>
            <div className="border-l pl-4">
              <p className="text-lg font-mono tabular-nums font-bold">{streak.current}</p>
              <p className="text-[10px] text-muted-foreground">
                Journal Streak {streak.longest > streak.current && `(best: ${streak.longest})`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hesitation Cost */}
      {missedTrades.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Hesitation Cost</p>
            <p className="text-lg font-mono tabular-nums font-semibold text-amber-500">
              {formatValue(hesitation.hesitationCost)}
            </p>
            <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
              <span>{missedTrades.length} missed</span>
              <span>{hesitation.missedWinRate}% WR</span>
            </div>
            <Link href="/missed-trades" className="text-[10px] text-amber-500 hover:underline mt-1 inline-block">
              View missed trades &rarr;
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Pre-Session Status */}
      <Card className={preSessionDone ? 'border-emerald-500/20 bg-emerald-500/5' : ''}>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Today&apos;s Pre-Session</p>
          {preSessionDone ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-500 font-medium">Completed</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-xs text-muted-foreground">Not started</span>
              </div>
              <Link href="/pre-session" className="text-[10px] text-emerald-500 hover:underline">
                Start checklist &rarr;
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

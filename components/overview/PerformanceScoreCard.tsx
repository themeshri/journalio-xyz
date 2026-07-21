'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { computePerformanceScore } from '@/lib/performance-score'
import type { FlattenedTrade } from '@/lib/tradeCycles'

interface PerformanceScoreCardProps {
  trades: FlattenedTrade[]
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-500'
  if (score >= 40) return 'text-yellow-500'
  return 'text-red-500'
}
function scoreRing(score: number): string {
  if (score >= 70) return 'stroke-emerald-500'
  if (score >= 40) return 'stroke-yellow-500'
  return 'stroke-red-500'
}

/**
 * Composite performance-score widget (R7) — a single 0–100 headline ("GPA for
 * your trading"), distinct from the discipline score. Simplified, transparent
 * blend of win rate, profit factor, and max drawdown (see lib/performance-score).
 */
export function PerformanceScoreCard({ trades }: PerformanceScoreCardProps) {
  const { score, components } = useMemo(() => computePerformanceScore(trades), [trades])

  if (score === null) {
    return (
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border text-muted-foreground">
            <span className="font-mono text-sm">—</span>
          </div>
          <div>
            <div className="text-sm font-medium">Performance Score</div>
            <p className="text-[11px] text-muted-foreground">Complete at least 5 trades to see your score.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const circumference = 2 * Math.PI * 24
  const dash = (score / 100) * circumference

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="relative h-14 w-14 shrink-0">
          <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
            <circle cx="28" cy="28" r="24" fill="none" className="stroke-muted" strokeWidth="4" />
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              className={scoreRing(score)}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-mono text-lg font-semibold ${scoreColor(score)}`}>{score}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">Performance Score</div>
          <p className="text-[11px] text-muted-foreground">
            Win rate {components.winRate} · Profit factor {components.profitFactor} · Drawdown {components.drawdown}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

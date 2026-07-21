'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { detectPatterns } from '@/lib/analytics/patterns'
import type { FlattenedTrade } from '@/lib/tradeCycles'
import type { JournalData } from '@/lib/types/journal'
import type { TradeComment } from '@/lib/trade-comments'

interface InsightsCardProps {
  trades: FlattenedTrade[]
  journalMap: Record<string, JournalData>
  tradeComments: TradeComment[]
  /** How many insights to show (default 2). */
  limit?: number
}

const SEVERITY_RANK: Record<'critical' | 'warning' | 'info', number> = {
  critical: 0,
  warning: 1,
  info: 2,
}

/**
 * Surfaces the top auto-detected behavioral insights on the home dashboard.
 * These previously lived only on the Analytics → Discipline tab. Reuses the
 * same pure detectPatterns() so the wording matches; ranks most-actionable
 * first (critical/warning severity, negative patterns before positive).
 */
export function InsightsCard({ trades, journalMap, tradeComments, limit = 2 }: InsightsCardProps) {
  const top = useMemo(() => {
    const patterns = detectPatterns(trades, journalMap, tradeComments)
    return [...patterns]
      .sort((a, b) => {
        const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
        if (s !== 0) return s
        // Within a severity, surface negative (actionable) before positive.
        const rank = (t: string) => (t === 'negative' ? 0 : t === 'neutral' ? 1 : 2)
        return rank(a.type) - rank(b.type)
      })
      .slice(0, limit)
  }, [trades, journalMap, tradeComments, limit])

  if (top.length === 0) return null

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Insights</h2>
          <Link
            href="/analytics?tab=discipline"
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            View all
          </Link>
        </div>
        <div className="grid gap-2">
          {top.map((p) => (
            <div
              key={p.id}
              className={`rounded-lg border p-3 text-sm ${
                p.severity === 'critical'
                  ? 'border-red-500/30 bg-red-500/5'
                  : p.severity === 'warning'
                    ? 'border-yellow-500/30 bg-yellow-500/5'
                    : 'border-border bg-muted/30'
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span>{p.type === 'positive' ? '✅' : p.type === 'negative' ? '⚠️' : '💡'}</span>
                <span className="font-medium">{p.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{p.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

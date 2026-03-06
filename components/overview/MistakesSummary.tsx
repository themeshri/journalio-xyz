'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { formatValue } from '@/lib/formatters'
import Link from 'next/link'
import type { FlattenedTrade } from '@/lib/tradeCycles'
import type { TradeComment } from '@/lib/trade-comments'
import { journalKey } from '@/lib/journal-utils'

interface MistakesSummaryProps {
  trades: FlattenedTrade[]
  journalMap: Record<string, any>
  tradeComments: TradeComment[]
}

export function MistakesSummary({ trades, journalMap, tradeComments }: MistakesSummaryProps) {
  const { disciplineScore, topMistake, emotionTags, hasData } = useMemo(() => {
    const completed = trades.filter((t) => t.isComplete)

    // Build comment rating lookup
    const commentRating = new Map<string, 'positive' | 'neutral' | 'negative'>()
    for (const c of tradeComments) commentRating.set(c.id, c.rating)

    // Collect discipline scores and mistakes
    const scores: number[] = []
    const mistakeCount = new Map<string, { count: number; totalPnL: number }>()
    const emotionCount = new Map<string, { count: number; totalPnL: number }>()

    for (const t of completed) {
      const j = journalMap[journalKey(t)]
      if (!j) continue

      // Discipline score from entry/exit/management comments
      let score = 0
      let hasComments = false
      for (const commentKey of ['entryCommentId', 'exitCommentId', 'managementCommentId'] as const) {
        const cid = j[commentKey]
        if (cid) {
          const rating = commentRating.get(cid)
          if (rating === 'positive') score += 1
          else if (rating === 'negative') score -= 1
          hasComments = true
        }
      }
      if (hasComments) {
        scores.push(((score + 3) / 6) * 100)
      }

      // Sell mistakes
      if (j.sellMistakes && Array.isArray(j.sellMistakes)) {
        for (const mistake of j.sellMistakes) {
          const existing = mistakeCount.get(mistake) || { count: 0, totalPnL: 0 }
          existing.count++
          existing.totalPnL += t.profitLoss
          mistakeCount.set(mistake, existing)
        }
      }

      // Emotion tags
      if (j.emotionTag) {
        const existing = emotionCount.get(j.emotionTag) || { count: 0, totalPnL: 0 }
        existing.count++
        existing.totalPnL += t.profitLoss
        emotionCount.set(j.emotionTag, existing)
      }
    }

    if (scores.length === 0 && mistakeCount.size === 0 && emotionCount.size === 0) {
      return { disciplineScore: 0, topMistake: null, emotionTags: [], hasData: false }
    }

    // Rolling discipline (last 20 scores)
    const recentScores = scores.slice(-20)
    const avgDiscipline = recentScores.length > 0
      ? Math.round(recentScores.reduce((s, v) => s + v, 0) / recentScores.length)
      : 0

    // Top mistake by frequency
    const sortedMistakes = Array.from(mistakeCount.entries())
      .sort((a, b) => b[1].count - a[1].count)
    const topM = sortedMistakes.length > 0
      ? { name: sortedMistakes[0][0], count: sortedMistakes[0][1].count, avgPnL: sortedMistakes[0][1].totalPnL / sortedMistakes[0][1].count }
      : null

    // Emotion tags sorted by count, filter out neutral ones
    const negativeEmotions = ['fomo', 'revenge', 'greedy', 'fearful', 'bored', 'anxious']
    const emotionEntries = Array.from(emotionCount.entries())
      .filter(([tag]) => negativeEmotions.includes(tag))
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([tag, data]) => ({ tag, count: data.count, totalPnL: data.totalPnL }))

    return { disciplineScore: avgDiscipline, topMistake: topM, emotionTags: emotionEntries, hasData: true }
  }, [trades, journalMap, tradeComments])

  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Discipline</p>
          <Link href="/analytics" className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            View analytics &rarr;
          </Link>
        </div>
        {!hasData ? (
          <div>
            <p className="text-[10px] text-muted-foreground">Journal trades to see discipline stats.</p>
            <Link href="/trade-journal" className="text-[10px] text-amber-500 hover:underline mt-0.5 inline-block">
              Start journaling &rarr;
            </Link>
          </div>
        ) : (
          <>
            {disciplineScore > 0 && (
              <div className="flex items-center gap-2">
                <div className="h-1 rounded-full bg-zinc-800 overflow-hidden flex-1">
                  <div
                    className={`h-full rounded-full ${disciplineScore >= 70 ? 'bg-amber-500' : disciplineScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${disciplineScore}%` }}
                  />
                </div>
                <p className="text-[10px] font-mono tabular-nums text-muted-foreground">{disciplineScore}%</p>
              </div>
            )}

            {topMistake && (
              <div>
                <p className="text-xs font-medium">{topMistake.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {topMistake.count} time{topMistake.count !== 1 ? 's' : ''} &middot; avg{' '}
                  <span className={topMistake.avgPnL >= 0 ? 'text-amber-500' : 'text-red-500'}>
                    {topMistake.avgPnL >= 0 ? '+' : ''}{formatValue(topMistake.avgPnL)}
                  </span>
                  /trade
                </p>
              </div>
            )}

            {emotionTags.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground">Emotions</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1">
                  {emotionTags.map((e) => (
                    <span key={e.tag} className="text-[10px]">
                      <span className="text-muted-foreground capitalize">{e.tag}</span>{' '}
                      <span className="font-mono tabular-nums">{e.count}</span>
                    </span>
                  ))}
                </div>
                {(() => {
                  const totalCost = emotionTags.reduce((s, e) => s + e.totalPnL, 0)
                  return totalCost !== 0 ? (
                    <p className="text-[10px] mt-0.5">
                      <span className="text-muted-foreground">Cost: </span>
                      <span className={`font-mono tabular-nums ${totalCost >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
                        {totalCost >= 0 ? '+' : ''}{formatValue(totalCost)}
                      </span>
                    </p>
                  ) : null
                })()}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

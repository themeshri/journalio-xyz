'use client'

import { useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { formatValue, formatDuration } from '@/lib/formatters'
import { computeTradeDiscipline, disciplineColorClass } from '@/lib/discipline'
import { TokenWithBadge } from '@/components/chain-badge'
import JournalModal, { type JournalData } from '@/components/JournalModal'
import { type CalendarDay } from '@/lib/analytics'
import { type FlattenedTrade } from '@/lib/tradeCycles'
import { type TradeComment } from '@/lib/trade-comments'
import { saveJournal } from '@/lib/journals'
import { useWallet } from '@/lib/wallet-context'
import { CheckCircle, XCircle, ChevronRight, CalendarOff } from 'lucide-react'
import { type PreSessionData } from '@/lib/pre-sessions'
import { type PostSessionData } from '@/lib/post-sessions'
import { journalKey } from '@/lib/journal-utils'

interface DayDetailModalProps {
  selectedDay: CalendarDay | null
  onClose: () => void
  trades: FlattenedTrade[]
  journalMap: Record<string, any>
  tradeComments: TradeComment[]
  /**
   * Only `date` (and `rating`, when present) are read — this component just
   * reports whether a session exists for the day. Typed structurally rather
   * than as the full Pre/PostSessionData so callers holding the dashboard's
   * date-only yearly summaries can pass them directly.
   */
  preSessions?: Pick<PreSessionData, 'date'>[]
  postSessions?: (Pick<PostSessionData, 'date'> & { rating?: number })[]
}

function ratingLabel(rating: string | undefined) {
  if (rating === 'positive') return 'Good'
  if (rating === 'negative') return 'Bad'
  if (rating === 'neutral') return 'Neutral'
  return '-'
}

function ratingColor(rating: string | undefined) {
  if (rating === 'positive') return 'text-emerald-500'
  if (rating === 'negative') return 'text-red-500'
  return 'text-muted-foreground'
}

export function DayDetailModal({
  selectedDay,
  onClose,
  trades,
  journalMap,
  tradeComments,
  preSessions = [],
  postSessions = [],
}: DayDetailModalProps) {
  const { updateJournalEntry } = useWallet()
  const router = useRouter()
  const [journalTrade, setJournalTrade] = useState<FlattenedTrade | null>(null)

  // Get trades for a specific day
  const getDayTrades = useCallback((dateStr: string): FlattenedTrade[] => {
    return trades.filter((t) => {
      if (!t.isComplete || !t.endDate) return false
      const d = new Date(t.endDate * 1000)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return key === dateStr
    })
  }, [trades])

  // Compute day detail stats
  const dayDetail = useMemo(() => {
    if (!selectedDay || selectedDay.tradeCount === 0) return null
    const dayTrades = getDayTrades(selectedDay.date)
    if (dayTrades.length === 0) return null

    const wins = dayTrades.filter((t) => t.profitLoss > 0).length
    const losses = dayTrades.filter((t) => t.profitLoss < 0).length
    const winRate = dayTrades.length > 0 ? Math.round((wins / dayTrades.length) * 100) : 0
    const bestTrade = Math.max(...dayTrades.map((t) => t.profitLoss))
    const worstTrade = Math.min(...dayTrades.map((t) => t.profitLoss))

    // Discipline & ratings analysis
    let entryRatings: string[] = []
    let exitRatings: string[] = []
    let managementRatings: string[] = []
    let disciplineScores: number[] = []
    let journaledCount = 0
    let mistakeCount = 0
    const mistakeLabels: string[] = []

    for (const t of dayTrades) {
      const jKey = journalKey(t)
      const journal = journalMap[jKey] as JournalData | undefined
      if (!journal) continue
      journaledCount++

      const discipline = computeTradeDiscipline(journal, tradeComments)
      if (discipline) {
        disciplineScores.push(discipline.percentage)
        if (discipline.entryComment) entryRatings.push(discipline.entryComment.rating)
        if (discipline.exitComment) exitRatings.push(discipline.exitComment.rating)
        if (discipline.managementComment) managementRatings.push(discipline.managementComment.rating)

        // Count negative ratings as mistakes
        if (discipline.entryComment?.rating === 'negative') {
          mistakeCount++
          mistakeLabels.push(discipline.entryComment.label)
        }
        if (discipline.exitComment?.rating === 'negative') {
          mistakeCount++
          mistakeLabels.push(discipline.exitComment.label)
        }
        if (discipline.managementComment?.rating === 'negative') {
          mistakeCount++
          mistakeLabels.push(discipline.managementComment.label)
        }
      }
    }

    // Average ratings (prefer negative > positive > neutral)
    const avgEntryRating = entryRatings.find(r => r === 'negative') ? 'negative' :
                           entryRatings.find(r => r === 'positive') ? 'positive' : 
                           entryRatings.find(r => r === 'neutral') ? 'neutral' : undefined
    const avgExitRating = exitRatings.find(r => r === 'negative') ? 'negative' :
                          exitRatings.find(r => r === 'positive') ? 'positive' :
                          exitRatings.find(r => r === 'neutral') ? 'neutral' : undefined
    const avgManagementRating = managementRatings.find(r => r === 'negative') ? 'negative' :
                                managementRatings.find(r => r === 'positive') ? 'positive' :
                                managementRatings.find(r => r === 'neutral') ? 'neutral' : undefined
    const avgDiscipline = disciplineScores.length > 0 
      ? Math.round(disciplineScores.reduce((a, b) => a + b, 0) / disciplineScores.length)
      : null

    // Unique mistakes
    const uniqueMistakes = Array.from(new Set(mistakeLabels))

    return {
      trades: dayTrades,
      wins,
      losses,
      winRate,
      bestTrade,
      worstTrade,
      journaledCount,
      avgDiscipline,
      avgEntryRating,
      avgExitRating,
      avgManagementRating,
      mistakeCount,
      mistakes: uniqueMistakes,
    }
  }, [selectedDay, getDayTrades, journalMap, tradeComments])

  const handleJournalSave = async (trade: FlattenedTrade, data: JournalData) => {
    await saveJournal({
      tokenMint: trade.tokenMint,
      tradeNumber: trade.tradeNumber,
      walletAddress: trade.walletAddress,
      ...data,
    })
    updateJournalEntry(journalKey(trade), data)
    setJournalTrade(null)
  }

  // Pre/Post-session rows are useful on any day — even one with no trades you
  // can still prep or recap. Shared between the populated and empty states.
  const sessionRows = selectedDay && (
    <div className="space-y-2">
      {/* Pre-Session */}
      <div
        onClick={() => {
          router.push(`/history?tab=pre-sessions&date=${selectedDay.date}`)
          onClose()
        }}
        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2">
          {preSessions.find(p => p.date === selectedDay.date) ? (
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <p className="text-xs font-medium">Pre-Session</p>
            <p className="text-[10px] text-muted-foreground">
              {preSessions.find(p => p.date === selectedDay.date)
                ? 'Completed'
                : 'Not completed'}
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Post-Session */}
      <div
        onClick={() => {
          router.push(`/history?tab=post-sessions&date=${selectedDay.date}`)
          onClose()
        }}
        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2">
          {postSessions.find(p => p.date === selectedDay.date) ? (
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <div>
            <p className="text-xs font-medium">Post-Session</p>
            <p className="text-[10px] text-muted-foreground">
              {postSessions.find(p => p.date === selectedDay.date)
                ? `Rating: ${postSessions.find(p => p.date === selectedDay.date)?.rating}/10`
                : 'Not completed'}
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  )

  return (
    <>
      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => { if (!open) onClose() }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedDay && (
            <DialogHeader>
              <DialogTitle className="text-base">
                {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </DialogTitle>
            </DialogHeader>
          )}

          {/* Empty state — day with no trades. Named, not blank (docs §5). */}
          {selectedDay && !dayDetail && (
            <>
              <div className="flex flex-col items-center text-center py-6">
                <CalendarOff className="h-8 w-8 text-muted-foreground/60 mb-3" />
                <p className="text-sm font-medium">No trades on this day</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                  Nothing was traded yet. You can still review your session
                  checklist below, or come back after the day&apos;s trades sync.
                </p>
              </div>
              <Separator className="my-1" />
              {sessionRows}
            </>
          )}

          {selectedDay && dayDetail && (
            <>
              {/* Day Stats */}
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">P/L</p>
                  <p className={`text-lg font-mono tabular-nums font-bold ${selectedDay.pnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {selectedDay.pnl >= 0 ? '+' : ''}{formatValue(selectedDay.pnl)}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Win Rate</p>
                  <p className="text-lg font-mono tabular-nums font-bold">{dayDetail.winRate}%</p>
                  <p className="text-[10px] text-muted-foreground">{dayDetail.wins}W / {dayDetail.losses}L</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Trades</p>
                  <p className="text-lg font-mono tabular-nums font-bold">{dayDetail.trades.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-1">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Best Trade</p>
                  <p className="text-sm font-mono tabular-nums font-semibold text-emerald-500">+{formatValue(dayDetail.bestTrade)}</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-[10px] text-muted-foreground">Worst Trade</p>
                  <p className="text-sm font-mono tabular-nums font-semibold text-red-500">{formatValue(dayDetail.worstTrade)}</p>
                </div>
              </div>

              {/* Discipline & Ratings */}
              {dayDetail.journaledCount > 0 && (
                <>
                  <Separator className="my-3" />
                  <div>
                    <p className="text-xs font-medium mb-2">Discipline & Ratings</p>
                    <div className="grid grid-cols-4 gap-2">
                      {dayDetail.avgDiscipline !== null && (
                        <div className="rounded-lg border p-2 text-center">
                          <p className="text-[10px] text-muted-foreground">Discipline</p>
                          <p className={`text-sm font-mono font-bold ${disciplineColorClass(dayDetail.avgDiscipline)}`}>
                            {dayDetail.avgDiscipline}%
                          </p>
                        </div>
                      )}
                      <div className="rounded-lg border p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">Entry</p>
                        <p className={`text-sm font-semibold ${ratingColor(dayDetail.avgEntryRating)}`}>
                          {ratingLabel(dayDetail.avgEntryRating)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">Exit</p>
                        <p className={`text-sm font-semibold ${ratingColor(dayDetail.avgExitRating)}`}>
                          {ratingLabel(dayDetail.avgExitRating)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">Mgmt</p>
                        <p className={`text-sm font-semibold ${ratingColor(dayDetail.avgManagementRating)}`}>
                          {ratingLabel(dayDetail.avgManagementRating)}
                        </p>
                      </div>
                    </div>

                    {/* Mistakes */}
                    {dayDetail.mistakeCount > 0 && (
                      <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/5 p-2">
                        <p className="text-[10px] text-muted-foreground mb-1">
                          {dayDetail.mistakeCount} Mistake{dayDetail.mistakeCount !== 1 ? 's' : ''}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {dayDetail.mistakes.map((mistake) => (
                            <span key={mistake} className="text-xs text-red-500">
                              {mistake}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Pre-Session and Post-Session */}
              <Separator className="my-3" />
              {sessionRows}

              {/* Trades Table */}
              <Separator className="my-3" />
              <div>
                <p className="text-xs font-medium mb-2">Trades</p>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-8">
                        <TableHead className="text-[10px]">Token</TableHead>
                        <TableHead className="text-[10px] text-right">P/L</TableHead>
                        <TableHead className="text-[10px] text-right">Duration</TableHead>
                        <TableHead className="text-[10px] text-center">Journal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dayDetail.trades.map((trade) => {
                        const jKey = journalKey(trade)
                        const hasJournal = !!journalMap[jKey]
                        return (
                          <TableRow 
                            key={jKey} 
                            className="h-10 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => setJournalTrade(trade)}
                          >
                            <TableCell className="text-xs">
                              <div className="flex items-center gap-2">
                                {(trade.buys[0]?.tokenOut?.logoURI || trade.sells[0]?.tokenIn?.logoURI) && (
                                  <img 
                                    src={trade.buys[0]?.tokenOut?.logoURI || trade.sells[0]?.tokenIn?.logoURI || ''} 
                                    alt={trade.token}
                                    className="w-5 h-5 rounded-full"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                )}
                                <div className="flex flex-col">
                                  <span className="font-medium">{trade.token}</span>
                                  {(trade.buys[0]?.tokenOut?.name || trade.sells[0]?.tokenIn?.name) && (
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                                      {trade.buys[0]?.tokenOut?.name || trade.sells[0]?.tokenIn?.name}
                                    </span>
                                  )}
                                </div>
                                <TokenWithBadge chain={trade.chain}>
                                  <span />
                                </TokenWithBadge>
                              </div>
                            </TableCell>
                            <TableCell className={`text-xs text-right font-mono tabular-nums ${
                              trade.profitLoss >= 0 ? 'text-emerald-500' : 'text-red-500'
                            }`}>
                              {trade.profitLoss >= 0 ? '+' : ''}{formatValue(trade.profitLoss)}
                            </TableCell>
                            <TableCell className="text-xs text-right text-muted-foreground">
                              {formatDuration(trade.duration ?? 0)}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`text-xs ${
                                hasJournal 
                                  ? 'text-emerald-500 font-medium' 
                                  : 'text-muted-foreground'
                              }`}>
                                {hasJournal ? 'Journaled' : 'Not journaled'}
                              </span>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Journal Modal */}
      {journalTrade && (
        <JournalModal
          key={journalKey(journalTrade)}
          trade={journalTrade}
          initialData={journalMap[journalKey(journalTrade)] || null}
          tokenLogo={journalTrade.buys[0]?.tokenOut?.logoURI || journalTrade.sells[0]?.tokenIn?.logoURI || null}
          onSave={(data) => handleJournalSave(journalTrade, data)}
          onClose={() => setJournalTrade(null)}
        />
      )}
    </>
  )
}
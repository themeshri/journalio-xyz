'use client'

import { useMemo, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { computeCalendarData, getDayColorClass, type CalendarDay } from '@/lib/analytics'
import { computeTradeDiscipline, disciplineColorClass } from '@/lib/discipline'
import { getCommentById, type TradeComment } from '@/lib/trade-comments'
import { TokenWithBadge } from '@/components/chain-badge'
import JournalModal, { type JournalData } from '@/components/JournalModal'
import { useWallet } from '@/lib/wallet-context'
import { saveJournal } from '@/lib/journals'
import type { FlattenedTrade } from '@/lib/tradeCycles'

interface PLCalendarProps {
  trades: FlattenedTrade[]
  journalMap: Record<string, any>
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function journalKey(t: FlattenedTrade) {
  return `${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`
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

export function PLCalendar({ trades, journalMap }: PLCalendarProps) {
  const { tradeComments, updateJournalEntry } = useWallet()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)
  const [journalTrade, setJournalTrade] = useState<FlattenedTrade | null>(null)

  const calData = useMemo(
    () => computeCalendarData(trades, year, month),
    [trades, year, month]
  )

  const maxPnl = useMemo(() => {
    const allDays = calData.weeks.flatMap((w) => w.days).filter(Boolean)
    return Math.max(...allDays.map((d) => d?.pnl ?? 0), 0.01)
  }, [calData])

  const maxLoss = useMemo(() => {
    const allDays = calData.weeks.flatMap((w) => w.days).filter(Boolean)
    return Math.max(...allDays.map((d) => Math.abs(Math.min(d?.pnl ?? 0, 0))), 0.01)
  }, [calData])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(year - 1) }
    else setMonth(month - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(year + 1) }
    else setMonth(month + 1)
  }

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

    const avgDiscipline = disciplineScores.length > 0
      ? Math.round(disciplineScores.reduce((s, v) => s + v, 0) / disciplineScores.length)
      : null

    const avgEntryRating = getMostCommonRating(entryRatings)
    const avgExitRating = getMostCommonRating(exitRatings)
    const avgManagementRating = getMostCommonRating(managementRatings)

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
      mistakeLabels,
    }
  }, [selectedDay, trades, journalMap, tradeComments, getDayTrades])

  const handleJournalSave = useCallback(async (data: JournalData) => {
    if (!journalTrade) return
    const key = journalKey(journalTrade)
    const saved = await saveJournal({
      walletAddress: journalTrade.walletAddress,
      tokenMint: journalTrade.tokenMint,
      tradeNumber: journalTrade.tradeNumber,
      ...data,
    })
    updateJournalEntry(key, saved)
    setJournalTrade(null)
  }, [journalTrade, updateJournalEntry])

  return (
    <>
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">P/L Calendar</CardTitle>
            <span
              className={`text-xs font-mono tabular-nums font-semibold ${
                calData.totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'
              }`}
            >
              {calData.totalPnL >= 0 ? '+' : ''}{formatValue(calData.totalPnL)}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={prevMonth}>
              &larr;
            </Button>
            <span className="text-xs font-medium">{MONTH_NAMES[month]} {year}</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground" onClick={nextMonth}>
              &rarr;
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          {/* Weekday headers */}
          <div className="grid grid-cols-8 gap-0.5 mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="text-[9px] text-muted-foreground text-center">{d}</div>
            ))}
            <div className="text-[9px] text-muted-foreground text-center">Wk</div>
          </div>

          {/* Calendar weeks */}
          {calData.weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-8 gap-0.5 mb-0.5">
              {week.days.map((day, di) => {
                if (!day) {
                  return <div key={di} className="h-8 rounded" />
                }

                const hasJournal = trades.some((t) => {
                  const endTs = t.endDate || t.startDate
                  const d = new Date(endTs * 1000)
                  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                  if (dateStr !== day.date) return false
                  const jKey = journalKey(t)
                  return !!journalMap[jKey]
                })

                const dayNum = parseInt(day.date.split('-')[2], 10)
                const colorClass = day.tradeCount > 0 ? getDayColorClass(day.pnl, maxPnl, maxLoss) : 'bg-zinc-800/30'
                const isClickable = day.tradeCount > 0

                return (
                  <div
                    key={di}
                    className={`h-8 rounded flex flex-col items-center justify-center relative ${colorClass} ${isClickable ? 'cursor-pointer hover:ring-1 hover:ring-zinc-500 transition-shadow' : 'cursor-default'}`}
                    title={`${day.date}: ${day.tradeCount} trades, ${day.pnl >= 0 ? '+' : ''}${formatValue(day.pnl)}`}
                    onClick={() => { if (isClickable) setSelectedDay(day) }}
                  >
                    <span className="text-[8px] leading-none text-zinc-300">{dayNum}</span>
                    {day.tradeCount > 0 && (
                      <span className={`text-[7px] font-mono leading-none mt-0.5 ${day.pnl >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                        {day.pnl >= 0 ? '+' : ''}{Math.abs(day.pnl) >= 1000 ? `${(day.pnl / 1000).toFixed(1)}k` : formatValue(day.pnl)}
                      </span>
                    )}
                    {hasJournal && (
                      <span className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-blue-400" />
                    )}
                  </div>
                )
              })}

              {/* Weekly P/L */}
              <div className="h-8 rounded flex items-center justify-center">
                <span
                  className={`text-[8px] font-mono tabular-nums ${
                    week.weeklyPnL >= 0 ? 'text-emerald-500' : 'text-red-500'
                  }`}
                >
                  {week.weeklyPnL !== 0 ? (week.weeklyPnL >= 0 ? '+' : '') + formatValue(week.weeklyPnL) : ''}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={(open) => { if (!open) setSelectedDay(null) }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedDay && dayDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">
                  {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </DialogTitle>
              </DialogHeader>

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
                          Mistakes ({dayDetail.mistakeCount})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {[...new Set(dayDetail.mistakeLabels)].map((label) => (
                            <span key={label} className="text-[10px] text-red-400 bg-red-500/10 rounded px-1.5 py-0.5">
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Trade Cycles */}
              <Separator className="my-3" />
              <div>
                <p className="text-xs font-medium mb-2">Trade Cycles</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] h-7">Token</TableHead>
                      <TableHead className="text-[10px] h-7 text-right">P/L</TableHead>
                      <TableHead className="text-[10px] h-7 text-right">Duration</TableHead>
                      <TableHead className="text-[10px] h-7 text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayDetail.trades.map((t) => {
                      const tokenLogo = t.buys[0]?.tokenOut?.logoURI || t.sells[0]?.tokenIn?.logoURI || null
                      const jKey = journalKey(t)
                      const isJournaled = !!journalMap[jKey]

                      return (
                        <TableRow
                          key={jKey}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setJournalTrade(t)}
                        >
                          <TableCell className="text-xs py-1.5">
                            <div className="flex items-center gap-2">
                              <TokenWithBadge chain={t.chain} size="sm">
                                {tokenLogo ? (
                                  <img src={tokenLogo} alt={t.token} className="w-5 h-5 rounded-full" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] font-bold text-zinc-300">
                                    {t.token.slice(0, 2)}
                                  </div>
                                )}
                              </TokenWithBadge>
                              <span className="font-medium">{t.token}</span>
                            </div>
                          </TableCell>
                          <TableCell className={`text-xs py-1.5 text-right font-mono tabular-nums font-medium ${t.profitLoss >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {t.profitLoss >= 0 ? '+' : ''}{formatValue(t.profitLoss)}
                          </TableCell>
                          <TableCell className="text-xs py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                            {t.duration ? formatDuration(t.duration) : '-'}
                          </TableCell>
                          <TableCell className="text-xs py-1.5 text-center">
                            {isJournaled ? (
                              <span className="inline-flex items-center gap-1 text-emerald-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[10px]">Journaled</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                <span className="text-[10px]">Open</span>
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
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
          onSave={handleJournalSave}
          onClose={() => setJournalTrade(null)}
        />
      )}
    </>
  )
}

/** Get the most common rating from an array of rating strings */
function getMostCommonRating(ratings: string[]): string | undefined {
  if (ratings.length === 0) return undefined
  const counts = new Map<string, number>()
  for (const r of ratings) {
    counts.set(r, (counts.get(r) || 0) + 1)
  }
  let best = ratings[0]
  let bestCount = 0
  for (const [rating, count] of counts) {
    if (count > bestCount) {
      best = rating
      bestCount = count
    }
  }
  return best
}

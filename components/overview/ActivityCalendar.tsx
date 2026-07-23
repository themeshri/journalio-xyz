'use client'

import { useMemo, useState, useCallback } from 'react'
import { type FlattenedTrade } from '@/lib/tradeCycles'
import { computeYearlyHeatmap } from '@/lib/analytics/calendar'
import { computeCalendarData, type CalendarDay } from '@/lib/analytics'
import { Card, CardContent } from '@/components/ui/card'
import { Info } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { DayDetailModal } from '@/components/DayDetailModal'
import { useWallet, useMetadata } from '@/lib/wallet-context'

interface PreSessionRecord {
  date: string
  savedAt?: string
}

interface PostSessionRecord {
  date: string
}

interface ActivityCalendarProps {
  trades: FlattenedTrade[]
  journalMap: Record<string, any>
  preSessions: PreSessionRecord[]
  postSessions: PostSessionRecord[]
}

/** One of the five score components, and whether the day earned it. */
interface ScorePoint {
  label: string
  earned: boolean
  detail?: string
}

interface ActivityDay {
  date: string
  score: number // 0-5
  points: ScorePoint[]
  traded: boolean
  preSession: boolean
  postSession: boolean
  journalCoverage: number // 0-1
  ruleAdherence: number // 0-1, -1 if not available
  tradeCount: number
  pnl: number
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

function getScoreColor(score: number): string {
  if (score === 0) return 'bg-zinc-800/50'
  if (score === 1) return 'bg-emerald-900/60'
  if (score === 2) return 'bg-emerald-700/70'
  if (score === 3) return 'bg-emerald-600/80'
  if (score === 4) return 'bg-emerald-500'
  return 'bg-emerald-400'
}

function buildActivityData(
  trades: FlattenedTrade[],
  journalMap: Record<string, any>,
  preSessions: PreSessionRecord[],
  postSessions: PostSessionRecord[],
  year: number,
  adherenceByDate: Map<string, { followed: number; total: number }>,
): Map<string, ActivityDay> {
  // Get trade data from existing heatmap logic
  const tradeDays = computeYearlyHeatmap(trades, year)
  const tradeDayMap = new Map(tradeDays.map(d => [d.date, d]))

  // Build pre/post session lookup sets
  const preSessionDates = new Set(
    preSessions.filter(p => p.savedAt).map(p => p.date)
  )
  const postSessionDates = new Set(postSessions.map(p => p.date))

  // Build journal coverage per day
  const completedTrades = trades.filter(t => t.isComplete && t.endDate)
  const tradesByDate = new Map<string, FlattenedTrade[]>()
  for (const t of completedTrades) {
    const d = new Date((t.endDate || t.startDate) * 1000)
    if (d.getFullYear() !== year) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const arr = tradesByDate.get(key) || []
    arr.push(t)
    tradesByDate.set(key, arr)
  }

  // Collect all active dates
  const allDates = new Set<string>()
  tradeDayMap.forEach((_, k) => allDates.add(k))
  preSessionDates.forEach(d => allDates.add(d))
  postSessionDates.forEach(d => allDates.add(d))
  // A day with only rule adherence recorded still deserves a square.
  adherenceByDate.forEach((_, d) => { if (d.startsWith(String(year))) allDates.add(d) })

  const result = new Map<string, ActivityDay>()

  for (const date of allDates) {
    const tradeDay = tradeDayMap.get(date)
    const dayTrades = tradesByDate.get(date) || []
    const traded = (tradeDay?.tradeCount || 0) > 0
    const preSession = preSessionDates.has(date)
    const postSession = postSessionDates.has(date)

    // Journal coverage
    let journalCoverage = 0
    if (dayTrades.length > 0) {
      const journaledCount = dayTrades.filter(t => {
        const key = `${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`
        return !!journalMap[key]
      }).length
      journalCoverage = journaledCount / dayTrades.length
    } else if (!traded) {
      journalCoverage = 1 // No trades = nothing to journal
    }

    // Rule adherence from journals
    let ruleAdherence = -1
    const dayJournals = dayTrades
      .map(t => journalMap[`${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`])
      .filter(Boolean)

    // Prefer real RuleAdherence rows (Phase B1) — they score the user's own
    // typed global rules for the day. Fall back to per-trade strategy rule
    // results only where no adherence has been recorded.
    const dayAdherence = adherenceByDate.get(date)
    if (dayAdherence && dayAdherence.total > 0) {
      ruleAdherence = dayAdherence.followed / dayAdherence.total
    } else if (dayJournals.length > 0) {
      let totalRules = 0
      let followedRules = 0
      for (const j of dayJournals) {
        const rules = j.ruleResults || []
        for (const r of rules) {
          totalRules++
          if (r.followed) followedRules++
        }
      }
      ruleAdherence = totalRules > 0 ? followedRules / totalRules : 1
    }

    // Score 0-5. Each point is tracked individually so the tooltip can say
    // WHICH points were earned — "explainable instead of binary" (docs §4).
    const points: ScorePoint[] = [
      { label: 'Traded', earned: traded },
      { label: 'Pre-session', earned: preSession },
      { label: 'Post-session', earned: postSession },
      { label: 'All trades journaled', earned: journalCoverage >= 1 },
      {
        label: 'Rule adherence ≥ 70%',
        earned: ruleAdherence >= 0.7,
        // -1 marks "no rules measured", which is not the same as 0% followed.
        detail:
          ruleAdherence < 0
            ? 'not measured'
            : dayAdherence && dayAdherence.total > 0
              ? `${dayAdherence.followed}/${dayAdherence.total} rules`
              : `${Math.round(ruleAdherence * 100)}%`,
      },
    ]
    const score = points.filter((p) => p.earned).length

    result.set(date, {
      date,
      score,
      points,
      traded,
      preSession,
      postSession,
      journalCoverage,
      ruleAdherence,
      tradeCount: tradeDay?.tradeCount || 0,
      pnl: tradeDay?.pnl || 0,
    })
  }

  return result
}

function buildWeekGrid(year: number): string[][] {
  // Build 53×7 grid of dates for the year
  const jan1 = new Date(year, 0, 1)
  const dec31 = new Date(year, 11, 31)

  // Start from the Sunday of the week containing Jan 1
  const startDate = new Date(jan1)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const weeks: string[][] = []
  const current = new Date(startDate)

  while (current <= dec31 || weeks.length < 53) {
    const week: string[] = []
    for (let d = 0; d < 7; d++) {
      if (current.getFullYear() === year) {
        const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`
        week.push(key)
      } else {
        week.push('')
      }
      current.setDate(current.getDate() + 1)
    }
    weeks.push(week)
    if (current.getFullYear() > year && weeks.length >= 52) break
  }

  return weeks
}

function getMonthLabels(weeks: string[][]): { label: string; col: number; colSpan: number }[] {
  const labels: { label: string; col: number; colSpan: number }[] = []
  let lastMonth = -1
  let lastCol = -1

  for (let w = 0; w < weeks.length; w++) {
    // Find first valid date in week
    const firstDate = weeks[w].find(d => d !== '')
    if (!firstDate) continue
    const month = parseInt(firstDate.split('-')[1]) - 1
    if (month !== lastMonth) {
      if (labels.length > 0) {
        // Set span for previous label
        labels[labels.length - 1].colSpan = w - lastCol
      }
      labels.push({ label: MONTHS[month], col: w, colSpan: 1 })
      lastMonth = month
      lastCol = w
    }
  }
  
  // Set span for last label
  if (labels.length > 0) {
    labels[labels.length - 1].colSpan = weeks.length - lastCol
  }

  return labels
}

export function ActivityCalendar({
  trades,
  journalMap,
  preSessions,
  postSessions,
}: ActivityCalendarProps) {
  const { tradeComments } = useWallet()
  const { adherence } = useMetadata()
  const currentYear = new Date().getFullYear()
  const minYear = 2024
  const [year, setYear] = useState(currentYear)
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

  // Collapse adherence rows into followed/total per day.
  const adherenceByDate = useMemo(() => {
    const map = new Map<string, { followed: number; total: number }>()
    for (const a of adherence) {
      const entry = map.get(a.date) || { followed: 0, total: 0 }
      entry.total += 1
      if (a.followed) entry.followed += 1
      map.set(a.date, entry)
    }
    return map
  }, [adherence])

  const activityData = useMemo(
    () => buildActivityData(trades, journalMap, preSessions, postSessions, year, adherenceByDate),
    [trades, journalMap, preSessions, postSessions, year, adherenceByDate]
  )

  const weeks = useMemo(() => buildWeekGrid(year), [year])
  const monthLabels = useMemo(() => getMonthLabels(weeks), [weeks])

  const today = new Date().toISOString().slice(0, 10)

  // Stats
  const totalActiveDays = Array.from(activityData.values()).filter(d => d.score > 0).length
  const perfectDays = Array.from(activityData.values()).filter(d => d.score === 5).length

  // Handle day click
  const handleDayClick = useCallback((date: string) => {
    const activity = activityData.get(date)
    if (!activity || activity.tradeCount === 0) return
    
    // Find month for this date
    const [y, m, d] = date.split('-').map(Number)
    const dayCalData = computeCalendarData(trades, y, m - 1)
    const dayObj = dayCalData.weeks
      .flatMap(w => w.days)
      .find(day => day?.date === date)
    
    if (dayObj) {
      setSelectedDay(dayObj)
    }
  }, [activityData, trades])

  return (
    <>
    <Card>
      <CardContent className="p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold">Activity</h3>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-[220px] text-xs space-y-1.5 p-3 bg-popover text-popover-foreground border border-border shadow-md">
                <p className="font-medium">How scoring works</p>
                <p className="text-muted-foreground">Each day earns up to 5 points. The greener the cell, the more you completed:</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li className="flex items-center gap-1.5"><span className="font-mono">+1</span> Traded</li>
                  <li className="flex items-center gap-1.5"><span className="font-mono">+1</span> Pre-session done</li>
                  <li className="flex items-center gap-1.5"><span className="font-mono">+1</span> Post-session done</li>
                  <li className="flex items-center gap-1.5"><span className="font-mono">+1</span> All trades journaled</li>
                  <li className="flex items-center gap-1.5"><span className="font-mono">+1</span> Rule adherence {'\u2265'} 70%</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {totalActiveDays} active day{totalActiveDays !== 1 ? 's' : ''}
            {perfectDays > 0 && ` · ${perfectDays} perfect`}
          </span>
          <span className="text-xs text-muted-foreground sm:hidden">
            {totalActiveDays} active{perfectDays > 0 && ` · ${perfectDays} perfect`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setYear(y => Math.max(y - 1, minYear))}
              className="text-xs text-muted-foreground hover:text-foreground px-1 disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={year <= minYear}
            >
              &larr;
            </button>
            <span className="text-xs font-mono text-muted-foreground w-8 text-center">{year}</span>
            <button
              onClick={() => setYear(y => Math.min(y + 1, currentYear))}
              className="text-xs text-muted-foreground hover:text-foreground px-1"
              disabled={year >= currentYear}
            >
              &rarr;
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0">
        <TooltipProvider delayDuration={100}>
          <div className="inline-block min-w-full sm:min-w-0">
            {/* Month labels */}
            <div className="flex ml-5 sm:ml-7 mb-1 gap-[1px]">
              {weeks.map((_, weekIndex) => {
                // Find which month this week belongs to
                const firstDateInWeek = weeks[weekIndex].find(d => d !== '')
                if (!firstDateInWeek) return <div key={weekIndex} className="w-[12px] sm:w-[14px]" />
                
                const month = parseInt(firstDateInWeek.split('-')[1]) - 1
                const monthLabel = MONTHS[month]
                
                // Only show label at the start of each month
                const prevWeek = weekIndex > 0 ? weeks[weekIndex - 1] : null
                const prevDate = prevWeek ? prevWeek.find(d => d !== '') : null
                const prevMonth = prevDate ? parseInt(prevDate.split('-')[1]) - 1 : -1
                
                const showLabel = month !== prevMonth
                
                return (
                  <div key={weekIndex} className="w-[12px] sm:w-[14px] text-[9px] sm:text-[10px] text-muted-foreground overflow-hidden">
                    {showLabel ? monthLabel.slice(0, 3) : ''}
                  </div>
                )
              })}
            </div>

            {/* Grid */}
            <div className="flex gap-0">
              {/* Day labels */}
              <div className="flex flex-col gap-[1px] mr-0.5 sm:mr-1 pt-0">
                {DAYS.map((d, i) => (
                  <span key={i} className="text-[9px] sm:text-[10px] text-muted-foreground h-[12px] sm:h-[14px] flex items-center justify-end w-4 sm:w-6 pr-0.5 sm:pr-1">
                    {d}
                  </span>
                ))}
              </div>

              {/* Weeks */}
              <div className="flex gap-[1px]">
                {weeks.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-[1px]">
                    {week.map((date, di) => {
                      if (!date) {
                        return <div key={di} className="w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] flex items-center justify-center" />
                      }

                      const activity = activityData.get(date)
                      const score = activity?.score || 0
                      const isToday = date === today

                      return (
                        <Tooltip key={date}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              tabIndex={0}
                              onClick={() => handleDayClick(date)}
                              aria-label={`${new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}: ${score} ${score === 1 ? 'activity' : 'activities'}`}
                              className={`w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] flex items-center justify-center p-0 touch-manipulation ${
                                (activity?.tradeCount ?? 0) > 0 ? 'cursor-pointer hover:ring-2 hover:ring-zinc-400 hover:ring-offset-1' : ''
                              }`}
                            >
                              <span className={`block w-[11px] h-[11px] sm:w-[13px] sm:h-[13px] rounded-[1px] sm:rounded-[2px] ${getScoreColor(score)} ${
                                isToday ? 'ring-1 ring-zinc-400' : ''
                              }`} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs space-y-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <p className="font-medium">{date}</p>
                              <p className="font-mono text-muted-foreground">
                                {activity?.score ?? 0}/5
                              </p>
                            </div>
                            {activity ? (
                              <>
                                {activity.traded && (
                                  <p>{activity.tradeCount} trade{activity.tradeCount !== 1 ? 's' : ''} · ${activity.pnl >= 0 ? '+' : ''}${activity.pnl.toFixed(2)}</p>
                                )}
                                {/* Name each point earned and missed, so the
                                    score is explainable rather than a bare
                                    number (docs §4, Tier 1 item 1). */}
                                <ul className="space-y-0.5 pt-0.5">
                                  {activity.points.map((p) => (
                                    <li
                                      key={p.label}
                                      className={`flex items-center gap-1.5 ${
                                        p.earned ? 'text-emerald-400' : 'text-zinc-500'
                                      }`}
                                    >
                                      <span>{p.earned ? '✓' : '○'}</span>
                                      <span>{p.label}</span>
                                      {p.detail && (
                                        <span className="ml-auto pl-2 font-mono text-[10px] opacity-70">
                                          {p.detail}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              </>
                            ) : (
                              <p className="text-muted-foreground">No activity</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-0.5 sm:gap-1 mt-1.5 sm:mt-2 ml-5 sm:ml-7">
              <span className="text-[9px] sm:text-[10px] text-muted-foreground mr-0.5 sm:mr-1">Less</span>
              {[0, 1, 2, 3, 4, 5].map(s => (
                <div key={s} className={`w-[10px] h-[10px] sm:w-[11px] sm:h-[11px] rounded-[1px] sm:rounded-[2px] ${getScoreColor(s)}`} />
              ))}
              <span className="text-[9px] sm:text-[10px] text-muted-foreground ml-0.5 sm:ml-1">More</span>
            </div>
          </div>
        </TooltipProvider>
      </div>
      </CardContent>
    </Card>

    {/* Shared Day Detail Modal */}
    <DayDetailModal
      selectedDay={selectedDay}
      onClose={() => setSelectedDay(null)}
      trades={trades}
      journalMap={journalMap}
      tradeComments={tradeComments}
      preSessions={preSessions as any}
      postSessions={postSessions as any}
    />
    </>
  )
}

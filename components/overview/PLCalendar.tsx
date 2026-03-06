'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatValue } from '@/lib/formatters'
import { computeCalendarData, getDayColorClass, type CalendarDay } from '@/lib/analytics'
import { DayDetailModal } from '@/components/DayDetailModal'
import { useWallet } from '@/lib/wallet-context'
import type { FlattenedTrade } from '@/lib/tradeCycles'
import { type PreSessionData } from '@/lib/pre-sessions'
import { type PostSessionData } from '@/lib/post-sessions'

interface PLCalendarProps {
  trades: FlattenedTrade[]
  journalMap: Record<string, any>
  preSessions?: PreSessionData[]
  postSessions?: PostSessionData[]
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function PLCalendar({ trades, journalMap, preSessions = [], postSessions = [] }: PLCalendarProps) {
  const { tradeComments } = useWallet()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null)

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

  return (
    <>
      <Card className="col-span-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">P/L Calendar</CardTitle>
            <span
              className={`text-xs font-mono tabular-nums font-semibold ${
                calData.totalPnL >= 0 ? 'text-lime-500' : 'text-red-500'
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
                  return <div key={di} className="h-8 rounded bg-muted/20" />
                }

                const pnl = day.pnl
                const colorClass = getDayColorClass(pnl, maxPnl, maxLoss)
                const isToday = day.date === new Date().toISOString().slice(0, 10)

                return (
                  <div
                    key={day.date}
                    onClick={() => day.tradeCount > 0 && setSelectedDay(day)}
                    className={`h-8 rounded flex flex-col items-center justify-center cursor-pointer transition-all hover:ring-2 hover:ring-offset-1 ${colorClass} ${
                      isToday ? 'ring-1 ring-zinc-400' : ''
                    }`}
                  >
                    <span className="text-[10px] font-medium">{parseInt(day.date.slice(8, 10))}</span>
                    {day.tradeCount > 0 && (
                      <span
                        className={`text-[7px] font-mono tabular-nums ${
                          pnl >= 0 ? 'text-lime-500' : 'text-red-600'
                        }`}
                      >
                        {pnl >= 0 ? '+' : ''}{Math.abs(pnl) >= 1000 ? `${(pnl / 1000).toFixed(1)}k` : pnl.toFixed(0)}
                      </span>
                    )}
                  </div>
                )
              })}

              {/* Weekly P/L */}
              <div className="h-8 rounded flex items-center justify-center">
                <span
                  className={`text-[8px] font-mono tabular-nums ${
                    week.weeklyPnL >= 0 ? 'text-lime-500' : 'text-red-500'
                  }`}
                >
                  {week.weeklyPnL !== 0 ? (week.weeklyPnL >= 0 ? '+' : '') + formatValue(week.weeklyPnL) : ''}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Shared Day Detail Modal */}
      <DayDetailModal
        selectedDay={selectedDay}
        onClose={() => setSelectedDay(null)}
        trades={trades}
        journalMap={journalMap}
        tradeComments={tradeComments}
        preSessions={preSessions}
        postSessions={postSessions}
      />
    </>
  )
}
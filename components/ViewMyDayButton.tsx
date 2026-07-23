'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarDays } from 'lucide-react'
import { DayDetailModal } from '@/components/DayDetailModal'
import { useWallet, useMetadata } from '@/lib/wallet-context'
import { getTradingDay } from '@/lib/trading-day'
import type { CalendarDay } from '@/lib/analytics'

/**
 * "View my day" — one ritual entry point, repeated across screens.
 *
 * docs §5: TradeZella repeats this CTA everywhere rather than expecting users
 * to assemble the daily-review habit themselves. It opens the existing
 * DayDetailModal for the current trading day, so there is exactly one review
 * surface no matter where you enter from.
 */
export function ViewMyDayButton({
  variant = 'outline',
  className,
}: {
  variant?: 'outline' | 'ghost' | 'default'
  className?: string
}) {
  const { flattenedTrades, journalMap, tradeComments } = useWallet()
  const { yearlyPreSessions, yearlyPostSessions, timezone, tradingStartTime } = useMetadata()
  const [open, setOpen] = useState(false)

  const today = useMemo(
    () => getTradingDay(timezone, tradingStartTime),
    [timezone, tradingStartTime]
  )

  // DayDetailModal takes a CalendarDay; it recomputes the day's trades itself,
  // so the aggregates here only need to be consistent, not authoritative.
  const day = useMemo<CalendarDay>(() => {
    const dayTrades = flattenedTrades.filter((t) => {
      if (!t.isComplete) return false
      const ts = t.endDate || t.startDate
      if (!ts) return false
      const d = new Date(ts * 1000)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`
      return key === today
    })
    return {
      date: today,
      pnl: dayTrades.reduce((s, t) => s + t.profitLoss, 0),
      tradeCount: dayTrades.length,
      wins: dayTrades.filter((t) => t.profitLoss > 0).length,
      losses: dayTrades.filter((t) => t.profitLoss < 0).length,
    }
  }, [flattenedTrades, today])

  return (
    <>
      <Button
        size="sm"
        variant={variant}
        className={className ?? 'h-8 text-xs'}
        onClick={() => setOpen(true)}
      >
        <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
        View my day
      </Button>

      {open && (
        <DayDetailModal
          selectedDay={day}
          onClose={() => setOpen(false)}
          trades={flattenedTrades}
          journalMap={journalMap}
          tradeComments={tradeComments}
          preSessions={yearlyPreSessions}
          postSessions={yearlyPostSessions}
        />
      )}
    </>
  )
}

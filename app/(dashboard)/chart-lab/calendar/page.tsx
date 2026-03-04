'use client'

import { useWallet } from '@/lib/wallet-context'
import { PLCalendar } from '@/components/overview/PLCalendar'

export default function CalendarPage() {
  const { flattenedTrades, journalMap } = useWallet()

  if (flattenedTrades.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          No trade data available. Add a wallet to see your P/L calendar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Calendar</h1>
      <div className="max-w-2xl">
        <PLCalendar
          trades={flattenedTrades}
          journalMap={journalMap}
        />
      </div>
    </div>
  )
}

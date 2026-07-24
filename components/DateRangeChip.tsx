'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { CalendarDays, Check } from 'lucide-react'
import { useMetadata } from '@/lib/wallet-context'
import { type TimePreset, presetToRange } from '@/lib/time-filters'
import type { DateRange } from 'react-day-picker'

/**
 * Date range as a compact header chip.
 *
 * Completes the TradeZella-style toolbar row (Filters · Date range · Wallets,
 * docs §1). The expanded pill strip (TimeRangeFilter) still lives on the Home
 * and Analytics pages; this is the same dimension in a dropdown so it can sit
 * in the always-visible global header without crowding it.
 *
 * It shares the single global time filter in MetadataContext — no new state
 * source — so the chip and the page strips move together.
 */

const PRESETS: { label: string; value: TimePreset }[] = [
  { label: 'Last 24 hours', value: '1d' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'All time', value: 'all' },
]

function shortLabel(preset: TimePreset, startDate: number | null, endDate: number | null): string {
  const found = { '1d': '24h', '7d': '7D', '30d': '30D', '90d': '90D', all: 'All time' } as Record<string, string>
  if (preset === 'custom') {
    if (!startDate) return 'Custom'
    const fmt = (s: number) => new Date(s * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return endDate ? `${fmt(startDate)} – ${fmt(endDate)}` : `${fmt(startDate)} –`
  }
  return found[preset] ?? 'Date range'
}

export function DateRangeChip() {
  const { timeRange, timePreset, setTimeFilter } = useMetadata()
  const [open, setOpen] = useState(false)

  const dateRange: DateRange | undefined =
    timePreset === 'custom' && timeRange.startDate
      ? {
          from: new Date(timeRange.startDate * 1000),
          to: timeRange.endDate ? new Date(timeRange.endDate * 1000) : undefined,
        }
      : undefined

  function handleDateRangeSelect(range: DateRange | undefined) {
    if (!range?.from) return
    const startDate = Math.floor(range.from.getTime() / 1000)
    const endDate = range.to ? Math.floor(range.to.getTime() / 1000) + 86399 : null
    setTimeFilter({ startDate, endDate }, 'custom')
    if (range.to) setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1.5" aria-label="Date range">
          <CalendarDays className="h-3.5 w-3.5" />
          <span className="max-w-[140px] truncate">
            {shortLabel(timePreset, timeRange.startDate, timeRange.endDate ?? null)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-1.5">
        <div className="w-44 space-y-0.5">
          {PRESETS.map((p) => {
            const active = timePreset === p.value
            return (
              <button
                key={p.value}
                onClick={() => {
                  setTimeFilter(presetToRange(p.value), p.value)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-xs transition-colors ${
                  active ? 'bg-muted font-medium' : 'hover:bg-muted/50'
                }`}
              >
                {p.label}
                {active && <Check className="h-3.5 w-3.5" />}
              </button>
            )
          })}
          <div className="my-1 border-t" />
          <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Custom range
          </p>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleDateRangeSelect}
            numberOfMonths={1}
            disabled={{ after: new Date() }}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

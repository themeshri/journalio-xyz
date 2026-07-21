'use client'

import { useState } from 'react'
// NOTE: Calendar + Popover intentionally kept on shadcn/ui — the custom date-range
// picker relies on react-day-picker's DateRange (mode="range") and shadcn Popover's
// asChild trigger semantics. Swapping these to HeroUI risks breaking the range logic
// (see heroui-mapping.md "Final mappings": Calendar is a KNOWN-HARD swap).
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@heroui/react'
import { type TimePreset, type TimeRange, presetToRange } from '@/lib/time-filters'
import type { DateRange } from 'react-day-picker'

const PRESETS: { label: string; value: TimePreset }[] = [
  { label: '1D', value: '1d' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: 'All', value: 'all' },
]

interface TimeRangeFilterProps {
  value: TimeRange
  preset: TimePreset
  onChange: (range: TimeRange, preset: TimePreset) => void
}

export function TimeRangeFilter({ value, preset, onChange }: TimeRangeFilterProps) {
  const [popoverOpen, setPopoverOpen] = useState(false)

  const dateRange: DateRange | undefined =
    preset === 'custom' && value.startDate
      ? {
          from: new Date(value.startDate * 1000),
          to: value.endDate ? new Date(value.endDate * 1000) : undefined,
        }
      : undefined

  function handlePreset(p: TimePreset) {
    onChange(presetToRange(p), p)
  }

  function handleDateRangeSelect(range: DateRange | undefined) {
    if (!range?.from) return
    const startDate = Math.floor(range.from.getTime() / 1000)
    const endDate = range.to
      ? Math.floor(range.to.getTime() / 1000) + 86399 // end of day
      : null
    onChange({ startDate, endDate }, 'custom')
    if (range.to) setPopoverOpen(false)
  }

  function formatCustomLabel(): string {
    if (!value.startDate) return 'Custom'
    const from = new Date(value.startDate * 1000)
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    if (!value.endDate) return `${fmt(from)} –`
    const to = new Date(value.endDate * 1000)
    return `${fmt(from)} – ${fmt(to)}`
  }

  return (
    <div className="flex items-center gap-1">
      {PRESETS.map((p) => (
        <Button
          key={p.value}
          size="sm"
          variant="light"
          onPress={() => handlePreset(p.value)}
          className={`h-auto min-w-0 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
            preset === p.value
              ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
              : 'border-border text-muted-foreground hover:bg-muted/50'
          }`}
        >
          {p.label}
        </Button>
      ))}

      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
              preset === 'custom'
                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                : 'border-border text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {preset === 'custom' ? formatCustomLabel() : 'Custom'}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleDateRangeSelect}
            numberOfMonths={2}
            disabled={{ after: new Date() }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

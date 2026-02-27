'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

const OUTCOME_OPTIONS = [
  { value: 'all', label: 'All Outcomes' },
  { value: 'win', label: 'Win' },
  { value: 'loss', label: 'Loss' },
  { value: 'breakeven', label: 'Break Even' },
]

const MONTH_OPTIONS = [
  { value: 'all', label: 'All Months' },
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
]

const DAY_OPTIONS = [
  { value: 'all', label: 'All Days' },
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

export function GlobalFilterBar() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Only show on pages that use trade data
  const filterPages = ['/', '/trade-journal', '/analytics', '/chart-lab']
  const shouldShow = filterPages.some((p) => pathname === p || pathname.startsWith(p + '/'))
  if (!shouldShow) return null

  const outcome = searchParams.get('outcome') || 'all'
  const month = searchParams.get('month') || 'all'
  const day = searchParams.get('day') || 'all'
  const search = searchParams.get('search') || ''
  const minPl = searchParams.get('minPl') || ''
  const maxPl = searchParams.get('maxPl') || ''
  const lastN = searchParams.get('lastN') || ''

  const hasFilters = outcome !== 'all' || month !== 'all' || day !== 'all' || search || minPl || maxPl || lastN
  const activeCount = [outcome !== 'all', month !== 'all', day !== 'all', !!search, !!minPl || !!maxPl, !!lastN].filter(Boolean).length

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'all' || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function clearAll() {
    setOpen(false)
    router.replace(pathname, { scroll: false })
  }

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Toggle button row */}
      <div className="flex items-center gap-2 px-4 py-1.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5"
          onClick={() => setOpen(!open)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Advanced
          {activeCount > 0 && (
            <span className="ml-1 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 leading-none font-medium">
              {activeCount}
            </span>
          )}
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1 text-muted-foreground"
            onClick={clearAll}
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </Button>
        )}
      </div>

      {/* All filters panel (collapsed by default) */}
      {open && (
        <div className="px-4 pb-3 space-y-3">
          {/* Row 1: Search + Outcome + Month + Day */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search token..."
                value={search}
                onChange={(e) => setParam('search', e.target.value)}
                className="h-8 w-40 pl-8 text-xs"
              />
            </div>

            <Select value={outcome} onValueChange={(v) => setParam('outcome', v)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={month} onValueChange={(v) => setParam('month', v)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={day} onValueChange={(v) => setParam('day', v)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: P/L Range + Last N */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">P/L Range:</span>
              <Input
                type="number"
                placeholder="Min"
                value={minPl}
                onChange={(e) => setParam('minPl', e.target.value)}
                className="h-8 w-20 text-xs"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={maxPl}
                onChange={(e) => setParam('maxPl', e.target.value)}
                className="h-8 w-20 text-xs"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Last N trades:</span>
              <Input
                type="number"
                placeholder="e.g. 50"
                value={lastN}
                onChange={(e) => setParam('lastN', e.target.value)}
                className="h-8 w-20 text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import type { ReactNode } from 'react'
import { GlobalFilterBar } from '@/components/GlobalFilterBar'
import { DateRangeChip } from '@/components/DateRangeChip'
import { WalletFilterChip } from '@/components/WalletFilterChip'

/**
 * The per-page header row: title on the left; the Filters · Date · Wallets
 * toolbar and the page's action button(s) on the right — all on one line.
 *
 * TradeZella keeps these controls in the page (not the global chrome) and on
 * the same line as the page title. `actions` is where a page passes its own
 * button(s) (e.g. "View my day", "Add Manual Trade").
 *
 * `showFilters` defaults to true; pass false on pages where trade filters don't
 * apply (e.g. Settings).
 */
export function PageHeader({
  title,
  actions,
  showFilters = true,
}: {
  title: ReactNode
  actions?: ReactNode
  showFilters?: boolean
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        {showFilters && (
          <div className="hidden items-center gap-1 rounded-md border bg-muted/30 px-1 py-0.5 md:flex">
            <GlobalFilterBar />
            <div className="h-4 w-px bg-border" />
            <DateRangeChip />
            <div className="h-4 w-px bg-border" />
            <WalletFilterChip />
          </div>
        )}
        {actions}
      </div>
    </div>
  )
}

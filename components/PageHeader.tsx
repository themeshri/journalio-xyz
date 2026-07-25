import type { ReactNode } from 'react'
import { GlobalFilterBar } from '@/components/GlobalFilterBar'
import { DateRangeChip } from '@/components/DateRangeChip'
import { WalletFilterChip } from '@/components/WalletFilterChip'

/**
 * The per-page header: title on the left and the Filters · Date · Wallets
 * toolbar on the right (one row); the page's action button(s) sit on a second
 * row below the filters, right-aligned, with a bit of space.
 *
 * TradeZella keeps these controls in the page (not the global chrome). `actions`
 * is where a page passes its own button(s) (e.g. "View my day", "Add Manual
 * Trade").
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
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        {showFilters && (
          <div className="hidden items-center gap-1 rounded-md border bg-muted/30 px-1 py-0.5 md:flex">
            <GlobalFilterBar />
            <div className="h-4 w-px bg-border" />
            <DateRangeChip />
            <div className="h-4 w-px bg-border" />
            <WalletFilterChip />
          </div>
        )}
      </div>
      {actions && (
        <div className="mt-3 flex items-center justify-end gap-2">{actions}</div>
      )}
    </div>
  )
}

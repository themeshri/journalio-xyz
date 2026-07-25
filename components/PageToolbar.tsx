import { GlobalFilterBar } from '@/components/GlobalFilterBar'
import { DateRangeChip } from '@/components/DateRangeChip'
import { WalletFilterChip } from '@/components/WalletFilterChip'

/**
 * Filters · Date range · Wallets, as a per-page toolbar row.
 *
 * TradeZella places these controls in the page content (above the KPI cards,
 * beside the page's action button) rather than the global chrome. Rendered
 * once at the top of the dashboard content area so it sits above every page's
 * own header row, right-aligned, without each page having to wire it up.
 */
export function PageToolbar() {
  return (
    <div className="hidden md:flex md:justify-end">
      <div className="flex items-center gap-1 rounded-md border bg-muted/30 px-1 py-0.5">
        <GlobalFilterBar />
        <div className="h-4 w-px bg-border" />
        <DateRangeChip />
        <div className="h-4 w-px bg-border" />
        <WalletFilterChip />
      </div>
    </div>
  )
}

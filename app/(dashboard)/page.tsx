'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useWallet, useMetadata } from '@/lib/wallet-context'
import { StatStripSkeleton, ChartSkeleton } from '@/components/skeletons'
import { KPICards } from '@/components/overview/KPICards'
import { PLCalendar } from '@/components/overview/PLCalendar'
import { RecentCycles } from '@/components/overview/RecentCycles'
import { InsightsPanel } from '@/components/overview/InsightsPanel'
import { QuickStatsBar } from '@/components/overview/QuickStatsBar'
import { TimeRangeFilter } from '@/components/TimeRangeFilter'
import { filterTradesByRange } from '@/lib/time-filters'
import ErrorBoundary from '@/components/ErrorBoundary'

const EquityCurve = dynamic(
  () => import('@/components/overview/EquityCurve').then((m) => ({ default: m.EquityCurve })),
  { ssr: false, loading: () => <ChartSkeleton /> }
)

const sectionErrorFallback = (
  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-muted-foreground">
    Something went wrong loading this section. Try refreshing the page.
  </div>
)

export default function OverviewPage() {
  const { allTrades, flattenedTrades, isAnyLoading, hasActiveWallets, walletSlots, activeWallets, journalMap, streak } = useWallet()
  const { preSessionDone, missedTrades, timeRange, timePreset, setTimeFilter } = useMetadata()

  const filteredTrades = useMemo(
    () => filterTradesByRange(flattenedTrades, timeRange),
    [flattenedTrades, timeRange],
  )

  if (!hasActiveWallets) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Add a wallet in Wallet Management to start tracking trades.
        </p>
      </div>
    )
  }

  if (isAnyLoading && allTrades.length === 0) {
    return (
      <div className="pt-8 space-y-6">
        <h1 className="text-xl font-semibold">Overview</h1>
        <StatStripSkeleton count={5} />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3"><ChartSkeleton /></div>
          <div className="lg:col-span-2"><ChartSkeleton /></div>
        </div>
      </div>
    )
  }

  const errors = activeWallets
    .map((w) => walletSlots[`${w.chain}:${w.address}`]?.error)
    .filter(Boolean)

  if (errors.length > 0 && allTrades.length === 0) {
    return (
      <div className="pt-8">
        {errors.map((err, i) => (
          <p key={i} className="text-sm text-destructive">{err}</p>
        ))}
      </div>
    )
  }

  if (allTrades.length === 0) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Overview</h1>
        <p className="text-sm text-muted-foreground">
          No transactions found for your active wallets.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Overview</h1>
        <TimeRangeFilter value={timeRange} preset={timePreset} onChange={setTimeFilter} />
      </div>

      {/* Row 1: KPI Stat Cards */}
      <ErrorBoundary fallback={sectionErrorFallback}>
        <KPICards trades={filteredTrades} />
      </ErrorBoundary>

      {/* Row 2: Equity Curve + P/L Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ErrorBoundary fallback={sectionErrorFallback}>
            <EquityCurve trades={filteredTrades} />
          </ErrorBoundary>
        </div>
        <div className="lg:col-span-2">
          <ErrorBoundary fallback={sectionErrorFallback}>
            <PLCalendar trades={filteredTrades} journalMap={journalMap} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Row 3: Recent Trade Cycles + Insights Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ErrorBoundary fallback={sectionErrorFallback}>
            <RecentCycles trades={filteredTrades} />
          </ErrorBoundary>
        </div>
        <div className="lg:col-span-2">
          <ErrorBoundary fallback={sectionErrorFallback}>
            <InsightsPanel trades={filteredTrades} streak={streak} missedTrades={missedTrades} preSessionDone={preSessionDone} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Row 4: Quick Stats Bar */}
      <ErrorBoundary fallback={sectionErrorFallback}>
        <QuickStatsBar trades={filteredTrades} />
      </ErrorBoundary>
    </div>
  )
}

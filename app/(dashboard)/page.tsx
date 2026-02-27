'use client'

import { useMemo, useCallback, useState } from 'react'
import dynamic from 'next/dynamic'
import { useWallet, useMetadata } from '@/lib/wallet-context'
import type { FlattenedTrade } from '@/lib/tradeCycles'
import { StatStripSkeleton, ChartSkeleton } from '@/components/skeletons'
import { KPICards } from '@/components/overview/KPICards'
import { PLCalendar } from '@/components/overview/PLCalendar'
import { RecentCycles } from '@/components/overview/RecentCycles'
import { ActionBanner } from '@/components/overview/ActionBanner'
import { StrategySummary } from '@/components/overview/StrategySummary'
import { MistakesSummary } from '@/components/overview/MistakesSummary'
import { QuickStatsBar } from '@/components/overview/QuickStatsBar'
import { TimeRangeFilter } from '@/components/TimeRangeFilter'
import { filterTradesByRange } from '@/lib/time-filters'
import JournalModal, { type JournalData } from '@/components/JournalModal'
import { saveJournal } from '@/lib/journals'
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

function journalKey(t: { tokenMint: string; tradeNumber: number; walletAddress: string }) {
  return `${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`
}

export default function OverviewPage() {
  const { allTrades, flattenedTrades, isAnyLoading, hasActiveWallets, walletSlots, activeWallets, journalMap, updateJournalEntry, streak } = useWallet()
  const { preSessionDone, missedTrades, timeRange, timePreset, setTimeFilter, strategies, tradeComments } = useMetadata()

  const filteredTrades = useMemo(
    () => filterTradesByRange(flattenedTrades, timeRange),
    [flattenedTrades, timeRange],
  )

  const { unjournalledCount, firstUnjournaled } = useMemo(() => {
    const completed = filteredTrades.filter(t => t.isComplete)
    const unjournaled = completed.filter(t => !journalMap[journalKey(t)])
    return { unjournalledCount: unjournaled.length, firstUnjournaled: unjournaled[0] || null }
  }, [filteredTrades, journalMap])

  // State for ActionBanner-triggered journal modal
  const [bannerJournalTrade, setBannerJournalTrade] = useState<FlattenedTrade | null>(null)

  const handleJournalClick = useCallback(() => {
    if (firstUnjournaled) {
      setBannerJournalTrade(firstUnjournaled)
    }
  }, [firstUnjournaled])

  const handleBannerJournalSave = useCallback(async (data: JournalData) => {
    if (!bannerJournalTrade) return
    const key = journalKey(bannerJournalTrade)
    const saved = await saveJournal({
      walletAddress: bannerJournalTrade.walletAddress,
      tokenMint: bannerJournalTrade.tokenMint,
      tradeNumber: bannerJournalTrade.tradeNumber,
      ...data,
    })
    if (saved) updateJournalEntry(key, saved)

    // Find next un-journaled trade
    const updatedMap = { ...journalMap, [key]: saved || data }
    const completed = filteredTrades.filter(t => t.isComplete)
    const currentIdx = completed.indexOf(bannerJournalTrade)
    const nextTrade = completed.find(
      (t, i) => i > currentIdx && !updatedMap[journalKey(t)]
    )

    if (nextTrade) {
      setBannerJournalTrade(nextTrade)
    } else {
      setBannerJournalTrade(null)
    }
  }, [bannerJournalTrade, journalMap, filteredTrades, updateJournalEntry])

  if (!hasActiveWallets) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Home</h1>
        <p className="text-sm text-muted-foreground">
          Add a wallet in Wallet Management to start tracking trades.
        </p>
      </div>
    )
  }

  if (isAnyLoading && allTrades.length === 0) {
    return (
      <div className="pt-8 space-y-6">
        <h1 className="text-xl font-semibold">Home</h1>
        <StatStripSkeleton count={7} />
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
        <h1 className="text-xl font-semibold mb-2">Home</h1>
        <p className="text-sm text-muted-foreground">
          No transactions found for your active wallets.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Home</h1>
        <TimeRangeFilter value={timeRange} preset={timePreset} onChange={setTimeFilter} />
      </div>

      {/* Row 1: Action Banner */}
      <ErrorBoundary fallback={sectionErrorFallback}>
        <ActionBanner
          preSessionDone={preSessionDone}
          unjournalledCount={unjournalledCount}
          onJournalClick={handleJournalClick}
        />
      </ErrorBoundary>

      {/* Row 2: KPI Cards — 7-card horizontal strip */}
      <ErrorBoundary fallback={sectionErrorFallback}>
        <KPICards trades={filteredTrades} streak={streak} />
      </ErrorBoundary>

      {/* Row 3: Equity Curve — full width (prominent position) */}
      <ErrorBoundary fallback={sectionErrorFallback}>
        <EquityCurve trades={filteredTrades} />
      </ErrorBoundary>

      {/* Row 4: Recent Trades + P/L Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ErrorBoundary fallback={sectionErrorFallback}>
            <RecentCycles trades={filteredTrades} unjournalledCount={unjournalledCount} />
          </ErrorBoundary>
        </div>
        <div className="lg:col-span-2">
          <ErrorBoundary fallback={sectionErrorFallback}>
            <PLCalendar trades={filteredTrades} journalMap={journalMap} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Row 5: Strategy Summary + Mistakes Summary — side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ErrorBoundary fallback={sectionErrorFallback}>
          <StrategySummary trades={filteredTrades} journalMap={journalMap} strategies={strategies} />
        </ErrorBoundary>
        <ErrorBoundary fallback={sectionErrorFallback}>
          <MistakesSummary trades={filteredTrades} journalMap={journalMap} tradeComments={tradeComments} />
        </ErrorBoundary>
      </div>

      {/* Row 6: Quick Stats Bar */}
      <ErrorBoundary fallback={sectionErrorFallback}>
        <QuickStatsBar trades={filteredTrades} streak={streak} missedTrades={missedTrades} />
      </ErrorBoundary>

      {/* Journal Modal triggered from ActionBanner */}
      {bannerJournalTrade && (
        <JournalModal
          key={journalKey(bannerJournalTrade)}
          trade={bannerJournalTrade}
          initialData={journalMap[journalKey(bannerJournalTrade)] || null}
          tokenLogo={bannerJournalTrade.buys[0]?.tokenOut?.logoURI || bannerJournalTrade.sells[0]?.tokenIn?.logoURI || null}
          onSave={handleBannerJournalSave}
          onClose={() => setBannerJournalTrade(null)}
        />
      )}
    </div>
  )
}

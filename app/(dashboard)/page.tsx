'use client'

import { useMemo, useCallback, useState, useEffect } from 'react'
import { useWallet, useMetadata } from '@/lib/wallet-context'
import type { FlattenedTrade } from '@/lib/tradeCycles'
import { StatStripSkeleton, ChartSkeleton } from '@/components/skeletons'
import { KPICards } from '@/components/overview/KPICards'
import { RecentCycles } from '@/components/overview/RecentCycles'
import { SessionHero } from '@/components/overview/SessionHero'
import { ActivityCalendar } from '@/components/overview/ActivityCalendar'
import { Evaluation } from '@/components/overview/Evaluation'
import { TimeRangeFilter } from '@/components/TimeRangeFilter'
import { filterTradesByRange } from '@/lib/time-filters'
import JournalModal, { type JournalData } from '@/components/JournalModal'
import { saveJournal } from '@/lib/journals'
import ErrorBoundary from '@/components/ErrorBoundary'
import Link from 'next/link'
import { journalKey } from '@/lib/journal-utils'

const sectionErrorFallback = (
  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-muted-foreground">
    Something went wrong loading this section. Try refreshing the page.
  </div>
)

export default function OverviewPage() {
  const { allTrades, flattenedTrades, isAnyLoading, hasActiveWallets, initialized, walletSlots, activeWallets, journalMap, updateJournalEntry } = useWallet()
  const { preSessionDone, postSessionDone, yearlyPreSessions, yearlyPostSessions, timeRange, timePreset, setTimeFilter, timezone, tradingStartTime } = useMetadata()

  // Set page title
  useEffect(() => {
    document.title = 'Overview | Journalio'
  }, [])

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

  if (!initialized || (isAnyLoading && allTrades.length === 0)) {
    return (
      <div className="pt-8 space-y-6">
        <h1 className="text-xl font-semibold">Home</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
          <span>Loading trades<span className="animate-pulse">...</span></span>
        </div>
        <StatStripSkeleton count={7} />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3"><ChartSkeleton /></div>
          <div className="lg:col-span-2"><ChartSkeleton /></div>
        </div>
      </div>
    )
  }

  if (!hasActiveWallets) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Home</h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/wallet-management" className="text-emerald-600 hover:underline">Add a wallet</Link> in Wallet Management to start tracking trades.
        </p>
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

      {/* Row 1: Session Hero */}
      <ErrorBoundary fallback={sectionErrorFallback}>
        <SessionHero
          preSessionDone={preSessionDone}
          postSessionDone={postSessionDone}
          flattenedTrades={flattenedTrades}
          journalMap={journalMap}
          onJournalClick={handleJournalClick}
          timezone={timezone}
          tradingStartTime={tradingStartTime}
        />
      </ErrorBoundary>

      {/* Row 2: KPI Cards — 7-card horizontal strip */}
      <ErrorBoundary fallback={sectionErrorFallback}>
        <KPICards trades={filteredTrades} />
      </ErrorBoundary>

      {/* Row 3: Recent Trades + Evaluation */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ErrorBoundary fallback={sectionErrorFallback}>
            <RecentCycles trades={filteredTrades} unjournalledCount={unjournalledCount} />
          </ErrorBoundary>
        </div>
        <div className="lg:col-span-2">
          <ErrorBoundary fallback={sectionErrorFallback}>
            <Evaluation trades={filteredTrades} />
          </ErrorBoundary>
        </div>
      </div>

      {/* Row 4: Activity Calendar — full width */}
      <ErrorBoundary fallback={sectionErrorFallback}>
        <ActivityCalendar
          trades={flattenedTrades}
          journalMap={journalMap}
          preSessions={yearlyPreSessions}
          postSessions={yearlyPostSessions}
        />
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

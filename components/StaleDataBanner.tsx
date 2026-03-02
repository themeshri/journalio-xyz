'use client'

import { useWallet } from '@/lib/wallet-context'

export function StaleDataBanner() {
  const { isAnyStale, hasActiveWallets } = useWallet()

  if (!hasActiveWallets || !isAnyStale) return null

  return (
    <div role="alert" className="mb-4 px-3 py-2 text-xs rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-600">
      Showing cached data — Solana Tracker API unavailable. Trades may be out of date.
    </div>
  )
}

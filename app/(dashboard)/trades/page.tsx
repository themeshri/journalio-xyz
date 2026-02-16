'use client'

import { useState } from 'react'
import { useWallet } from '@/lib/wallet-context'
import { TradesTable } from '@/components/TradesTable'
import { Button } from '@/components/ui/button'

export default function TradesPage() {
  const { currentWallet, trades, isLoading, error, searchWallet, cacheInfo } =
    useWallet()

  if (!currentWallet) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Trades</h1>
        <p className="text-sm text-muted-foreground">
          Enter a wallet address in the sidebar to view trades.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="pt-8">
        <p className="text-sm text-muted-foreground">Loading trades...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pt-8">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">
          Trades
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {trades.length} total
          </span>
        </h1>
        <div className="flex items-center gap-3">
          {cacheInfo?.cached && cacheInfo.cachedAt && (
            <span className="text-xs text-muted-foreground">
              Cached {cacheInfo.cachedAt.toLocaleTimeString()}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => searchWallet(currentWallet, true)}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {trades.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No transactions found for this wallet.
        </p>
      ) : (
        <TradesTable trades={trades} />
      )}
    </div>
  )
}

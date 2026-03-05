'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useWallet } from '@/lib/wallet-context'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function SyncButton() {
  const { activeWallets, walletSlots, refreshWallet } = useWallet()
  const [isSyncing, setIsSyncing] = useState(false)
  const [, setTick] = useState(0)

  // Find most recent cachedAt across all active wallet slots
  const lastSyncedAt = useMemo(() => {
    let latest: Date | null = null
    for (const w of activeWallets) {
      const slot = walletSlots[`${w.chain}:${w.address}`]
      const cachedAt = slot?.cacheInfo?.cachedAt
      if (cachedAt && (!latest || cachedAt > latest)) {
        latest = cachedAt
      }
    }
    return latest
  }, [activeWallets, walletSlots])

  // Re-render every 60s to keep the "ago" text fresh
  useEffect(() => {
    if (!lastSyncedAt) return
    const id = setInterval(() => setTick(t => t + 1), 60_000)
    return () => clearInterval(id)
  }, [lastSyncedAt])

  const handleSync = useCallback(async () => {
    if (activeWallets.length === 0) {
      toast.error('No active wallets to sync')
      return
    }

    setIsSyncing(true)

    try {
      const refreshPromises = activeWallets.map(wallet =>
        refreshWallet(wallet.address, wallet.chain)
      )

      await Promise.allSettled(refreshPromises)

      toast.success(`Synced ${activeWallets.length} wallet${activeWallets.length !== 1 ? 's' : ''}`)
    } catch (error) {
      console.error('Error syncing wallets:', error)
      toast.error('Failed to sync wallets')
    } finally {
      setIsSyncing(false)
    }
  }, [activeWallets, refreshWallet])

  return (
    <div className="flex items-center gap-1.5">
      {lastSyncedAt && !isSyncing && (
        <span className="text-[11px] text-muted-foreground/70">
          {formatTimeAgo(lastSyncedAt)}
        </span>
      )}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSync}
              disabled={isSyncing || activeWallets.length === 0}
              className="h-8 w-8"
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4 transition-transform duration-500",
                  isSyncing && "animate-spin"
                )}
              />
              <span className="sr-only">Sync trades</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              {isSyncing
                ? 'Syncing...'
                : activeWallets.length === 0
                ? 'No active wallets'
                : `Sync ${activeWallets.length} wallet${activeWallets.length !== 1 ? 's' : ''}`
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
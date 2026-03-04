'use client'

import { useState, useCallback } from 'react'
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

export function SyncButton() {
  const { activeWallets, refreshWallet } = useWallet()
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSync = useCallback(async () => {
    if (activeWallets.length === 0) {
      toast.error('No active wallets to sync')
      return
    }

    setIsSyncing(true)
    
    try {
      // Refresh all active wallets
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
  )
}
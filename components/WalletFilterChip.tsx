'use client'

import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Wallet, ChevronsUpDown } from 'lucide-react'
import { ChainIcon } from '@/components/chain-badge'
import { useWallet, makeWalletKey } from '@/lib/wallet-context'

/**
 * Wallet/account dimension as a header filter chip.
 *
 * TradeZella keeps an account selector in its persistent toolbar (docs §1);
 * Journalio had wallet selection only on `/wallet-management` and in the
 * sidebar. This surfaces the same dimension alongside the other filters.
 *
 * It does NOT introduce a new state source — it reads `savedWallets` /
 * `activeWallets` and toggles through `setWalletActive`, the exact path the
 * wallet-management page uses, which already mirrors the selection into the
 * `?wallets=` URL param (see use-wallet-url-sync). So the chip, the sidebar,
 * and a pasted link all stay in agreement.
 */
function truncate(address: string) {
  if (address.length <= 10) return address
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}

export function WalletFilterChip() {
  const { savedWallets, activeWallets, setWalletActive } = useWallet()

  const activeKeys = useMemo(
    () => new Set(activeWallets.map((w) => makeWalletKey(w.address, w.chain))),
    [activeWallets]
  )

  // Nothing to filter by until at least one wallet is saved. Hiding beats a
  // dead control — the onboarding "Connect a wallet" step is the right path.
  if (savedWallets.length === 0) return null

  const label =
    activeWallets.length === 0
      ? 'All wallets'
      : activeWallets.length === 1
        ? activeWallets[0].nickname || truncate(activeWallets[0].address)
        : `${activeWallets.length} wallets`

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5"
          aria-label="Filter by wallet"
        >
          <Wallet className="h-3.5 w-3.5" />
          <span className="max-w-[120px] truncate">{label}</span>
          <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5">
        <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Wallets
        </p>
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {savedWallets.map((w) => {
            const key = makeWalletKey(w.address, w.chain)
            const checked = activeKeys.has(key)
            return (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-muted/50"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) =>
                    setWalletActive(w.address, w.chain, v === true)
                  }
                />
                <ChainIcon chain={w.chain} size={14} />
                <span className="flex-1 truncate font-medium">
                  {w.nickname || truncate(w.address)}
                </span>
              </label>
            )
          })}
        </div>
        {activeWallets.length > 0 && (
          <>
            <div className="my-1 border-t" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-start text-xs text-muted-foreground"
              onClick={() =>
                activeWallets.forEach((w) =>
                  setWalletActive(w.address, w.chain, false)
                )
              }
            >
              Show all wallets
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

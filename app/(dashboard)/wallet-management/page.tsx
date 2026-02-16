'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet } from '@/lib/wallet-context'
import { isValidSolanaAddress } from '@/lib/solana-tracker'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface SavedWallet {
  address: string
  chain: 'solana' | 'base' | 'bnb'
  nickname: string
}

const STORAGE_KEY = 'journalio_saved_wallets'

function loadWallets(): SavedWallet[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveWallets(wallets: SavedWallet[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(wallets))
}

export default function WalletManagementPage() {
  const { currentWallet, searchWallet, clearWallet, isLoading } = useWallet()
  const [wallets, setWallets] = useState<SavedWallet[]>([])
  const [address, setAddress] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setWallets(loadWallets())
    setMounted(true)
  }, [])

  const persistWallets = useCallback((next: SavedWallet[]) => {
    setWallets(next)
    saveWallets(next)
  }, [])

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const trimmed = address.trim()
    if (!trimmed) {
      setError('Enter an address')
      return
    }
    if (!isValidSolanaAddress(trimmed)) {
      setError('Invalid Solana address')
      return
    }
    if (wallets.some((w) => w.address === trimmed)) {
      setError('Wallet already saved')
      return
    }
    const next = [
      ...wallets,
      { address: trimmed, chain: 'solana' as const, nickname: nickname.trim() },
    ]
    persistWallets(next)
    setAddress('')
    setNickname('')

    // Auto-switch if no active wallet
    if (!currentWallet) {
      searchWallet(trimmed)
    }
  }

  function handleSwitch(addr: string) {
    searchWallet(addr)
  }

  function handleRemove(addr: string) {
    const next = wallets.filter((w) => w.address !== addr)
    persistWallets(next)
    if (currentWallet === addr) {
      clearWallet()
    }
  }

  function truncate(addr: string) {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  return (
    <div className="max-w-2xl pt-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Wallet Management</h1>
        <p className="text-sm text-muted-foreground">
          Add wallets, switch between them, and manage your tracking.
        </p>
      </div>

      {/* Active wallet */}
      {currentWallet && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">Active Wallet</h2>
          <div className="border border-border rounded-md p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">SOL</span>
              <span className="font-mono text-sm truncate">{currentWallet}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => searchWallet(currentWallet, true)}
                disabled={isLoading}
              >
                {isLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={clearWallet}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      )}

      <Separator />

      {/* Add wallet form */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium">Add Wallet</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Input
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  setError('')
                }}
                placeholder="Solana wallet address..."
                className="text-sm font-mono"
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Nickname (optional)"
                className="text-sm"
              />
            </div>
            <div className="flex gap-1.5">
              <span className="text-xs font-medium bg-muted px-2 py-1.5 rounded border border-border">
                Solana
              </span>
              <span className="text-xs text-muted-foreground px-2 py-1.5 rounded border border-dashed border-border">
                Base (soon)
              </span>
              <span className="text-xs text-muted-foreground px-2 py-1.5 rounded border border-dashed border-border">
                BNB (soon)
              </span>
            </div>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" className="text-xs" disabled={isLoading}>
            Add Wallet
          </Button>
        </form>
      </div>

      <Separator />

      {/* Saved wallets list */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium">Saved Wallets</h2>
        {mounted && wallets.length === 0 && (
          <p className="text-sm text-muted-foreground">No saved wallets yet.</p>
        )}
        <div className="space-y-2">
          {wallets.map((w) => {
            const isActive = currentWallet === w.address
            return (
              <div
                key={w.address}
                className={`border rounded-md p-3 flex items-center justify-between gap-3 ${
                  isActive ? 'border-foreground' : 'border-border'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">
                      SOL
                    </span>
                    {w.nickname && (
                      <span className="text-sm font-medium">{w.nickname}</span>
                    )}
                    {isActive && (
                      <span className="text-xs text-muted-foreground">(active)</span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground mt-1 truncate">
                    {w.address}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {!isActive && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleSwitch(w.address)}
                      disabled={isLoading}
                    >
                      Switch
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive"
                    onClick={() => handleRemove(w.address)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

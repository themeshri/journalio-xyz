'use client'

import { useState, useEffect, useCallback } from 'react'
import { safeLocalStorage } from '@/lib/local-storage'
import { useWallet, makeWalletKey } from '@/lib/wallet-context'
import { type Chain, CHAIN_CONFIG, detectChainFromAddress, isValidAddress } from '@/lib/chains'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface SavedWallet {
  address: string
  chain: Chain
  nickname: string
  dex: string
}

const DEX_OPTIONS = [
  { value: 'fomo', label: 'Fomo' },
  { value: 'axiom', label: 'Axiom' },
  { value: 'jupiter', label: 'Jupiter' },
  { value: 'gmgn', label: 'GMGN' },
  { value: 'other', label: 'Other' },
] as const

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
  safeLocalStorage.setItem(STORAGE_KEY, wallets)
}

const CHAIN_LABELS: Record<Chain, string> = {
  solana: 'SOL',
  base: 'BASE',
  bnb: 'BNB',
}

export default function WalletManagementPage() {
  const { activeWallets, walletSlots, setWalletActive, refreshWallet, isAnyLoading } = useWallet()
  const [wallets, setWallets] = useState<SavedWallet[]>([])
  const [address, setAddress] = useState('')
  const [nickname, setNickname] = useState('')
  const [selectedChain, setSelectedChain] = useState<Chain>('solana')
  const [selectedDex, setSelectedDex] = useState('other')
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

  function handleAddressChange(value: string) {
    setAddress(value)
    setError('')
    const trimmed = value.trim()
    const detected = detectChainFromAddress(trimmed)
    if (detected === 'solana') {
      setSelectedChain('solana')
    } else if (detected === null && /^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
      if (selectedChain === 'solana') setSelectedChain('base')
    }
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const trimmed = address.trim()
    if (!trimmed) {
      setError('Enter an address')
      return
    }
    if (!isValidAddress(trimmed, selectedChain)) {
      setError(`Invalid ${CHAIN_CONFIG[selectedChain].label} address`)
      return
    }
    if (wallets.some((w) => w.address === trimmed && w.chain === selectedChain)) {
      setError('Wallet already saved')
      return
    }
    const next = [
      ...wallets,
      { address: trimmed, chain: selectedChain, nickname: nickname.trim(), dex: selectedDex },
    ]
    persistWallets(next)
    setAddress('')
    setNickname('')
    setSelectedChain('solana')
    setSelectedDex('other')

    // Auto-toggle new wallet active
    setWalletActive(trimmed, selectedChain, true)
  }

  function handleRemove(addr: string, chain: Chain) {
    const next = wallets.filter((w) => !(w.address === addr && w.chain === chain))
    persistWallets(next)
    // Deactivate if active
    setWalletActive(addr, chain, false)
  }

  function isActive(addr: string, chain: Chain) {
    return activeWallets.some((w) => w.address === addr && w.chain === chain)
  }

  function truncate(addr: string) {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  return (
    <div className="max-w-2xl pt-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Wallet Management</h1>
        <p className="text-sm text-muted-foreground">
          Add wallets and toggle which ones are active. Active wallets load simultaneously.
        </p>
      </div>

      <Separator />

      {/* Add wallet form */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium">Add Wallet</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Input
                value={address}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder="Wallet address (Solana or 0x)..."
                className="text-sm font-mono"
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
              {(['solana', 'base', 'bnb'] as Chain[]).map((chain) => {
                const isSelected = selectedChain === chain
                return (
                  <button
                    key={chain}
                    type="button"
                    onClick={() => setSelectedChain(chain)}
                    className={`text-xs px-2 py-1.5 rounded border transition-colors ${
                      isSelected
                        ? 'font-medium bg-muted border-border'
                        : 'text-muted-foreground border-border hover:bg-muted/50 cursor-pointer'
                    }`}
                  >
                    {CHAIN_CONFIG[chain].label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="flex gap-1.5 items-center">
            <span className="text-xs text-muted-foreground mr-1">App:</span>
            {DEX_OPTIONS.map((opt) => {
              const isSelected = selectedDex === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedDex(opt.value)}
                  className={`text-xs px-2 py-1.5 rounded border transition-colors ${
                    isSelected
                      ? 'font-medium bg-muted border-border'
                      : 'text-muted-foreground border-border hover:bg-muted/50 cursor-pointer'
                  }`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" className="text-xs">
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
            const active = isActive(w.address, w.chain)
            const key = makeWalletKey(w.address, w.chain)
            const slot = walletSlots[key]
            return (
              <div
                key={`${w.chain}-${w.address}`}
                className={`border rounded-md p-3 flex items-center justify-between gap-3 ${
                  active ? 'border-foreground' : 'border-border'
                }`}
              >
                <div className="min-w-0 flex-1 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setWalletActive(w.address, w.chain, e.target.checked)}
                    className="rounded border-border shrink-0"
                    title={active ? 'Deactivate wallet' : 'Activate wallet'}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">
                        {CHAIN_LABELS[w.chain]}
                      </span>
                      {w.dex && w.dex !== 'other' && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {DEX_OPTIONS.find((d) => d.value === w.dex)?.label || w.dex}
                        </span>
                      )}
                      {w.nickname && (
                        <span className="text-sm font-medium">{w.nickname}</span>
                      )}
                      {slot?.isLoading && (
                        <span className="text-xs text-muted-foreground animate-pulse">loading...</span>
                      )}
                      {slot?.error && (
                        <span className="text-xs text-destructive">error</span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground mt-1 truncate">
                      {w.address}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {active && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => refreshWallet(w.address, w.chain)}
                      disabled={slot?.isLoading}
                    >
                      Refresh
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive"
                    onClick={() => handleRemove(w.address, w.chain)}
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

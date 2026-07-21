'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet, makeWalletKey } from '@/lib/wallet-context'
import { type Chain, CHAIN_CONFIG, detectChainFromAddress, isValidAddress } from '@/lib/chains'
// HeroUI migration: this page uses HeroUI (v2) components. Logic/state/API unchanged.
import {
  Input,
  Button,
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react'
import { toast } from 'sonner'

interface ApiWallet {
  id: string
  address: string
  chain: Chain
  nickname: string | null
  dex: string
}

const DEX_OPTIONS = [
  { value: 'fomo', label: 'Fomo' },
  { value: 'axiom', label: 'Axiom' },
  { value: 'jupiter', label: 'Jupiter' },
  { value: 'gmgn', label: 'GMGN' },
  { value: 'other', label: 'Other' },
] as const

const CHAIN_LABELS: Record<Chain, string> = {
  solana: 'SOL',
  base: 'BASE',
  bnb: 'BNB',
}

export default function WalletManagementPage() {
  const { activeWallets, walletSlots, setWalletActive, refreshWallet, isAnyLoading, reloadWallets } = useWallet()
  const [wallets, setWallets] = useState<ApiWallet[]>([])
  const [address, setAddress] = useState('')
  const [nickname, setNickname] = useState('')
  const [selectedChain, setSelectedChain] = useState<Chain>('solana')
  const [selectedDex, setSelectedDex] = useState('other')
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [removeWalletIdx, setRemoveWalletIdx] = useState<number | null>(null)

  const fetchWallets = useCallback(async () => {
    try {
      const res = await fetch('/api/wallets')
      if (!res.ok) return
      const data = await res.json()
      setWallets(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchWallets()
    setMounted(true)
  }, [fetchWallets])

  function handleAddressChange(value: string) {
    setAddress(value)
    setError('')
    const trimmed = value.trim()
    const detected = detectChainFromAddress(trimmed)
    if (detected === 'solana') {
      setSelectedChain('solana')
    } else if (detected === null && isValidAddress(trimmed, 'base')) {
      if (selectedChain === 'solana') setSelectedChain('base')
    }
  }

  async function handleAdd(e: React.FormEvent) {
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

    try {
      const res = await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: trimmed,
          chain: selectedChain,
          nickname: nickname.trim() || null,
          dex: selectedDex,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to add wallet')
        return
      }
      await fetchWallets()
      await reloadWallets()
      setAddress('')
      setNickname('')
      setSelectedChain('solana')
      setSelectedDex('other')

      // Auto-toggle new wallet active
      setWalletActive(trimmed, selectedChain, true)
      toast.success('Wallet added')
    } catch {
      setError('Failed to add wallet')
    }
  }

  async function handleRemove(wallet: ApiWallet) {
    try {
      const res = await fetch(`/api/wallets/${wallet.id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchWallets()
        await reloadWallets()
        setWalletActive(wallet.address, wallet.chain, false)
        toast.success('Wallet removed')
      } else {
        toast.error('Failed to remove wallet')
      }
    } catch {
      toast.error('Failed to remove wallet')
    }
  }

  function isActive(addr: string, chain: Chain) {
    return activeWallets.some((w) => w.address === addr && w.chain === chain)
  }

  function truncate(addr: string) {
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  return (
    <>
    <div className="max-w-2xl pt-8 space-y-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Wallet Management</h1>
        <p className="text-sm text-muted-foreground">
          Add wallets and toggle which ones are active. Active wallets load simultaneously.
        </p>
      </div>

      <Divider />

      {/* Add wallet form */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium">Add Wallet</h2>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Input
                size="sm"
                value={address}
                onValueChange={handleAddressChange}
                placeholder="Wallet address (Solana or 0x)..."
                className="font-mono"
                aria-label="Wallet address"
              />
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                size="sm"
                value={nickname}
                onValueChange={setNickname}
                placeholder="Nickname (optional)"
                aria-label="Wallet nickname"
              />
            </div>
            <div className="flex gap-1.5">
              {(['solana', 'base', 'bnb'] as Chain[]).map((chain) => (
                <Button
                  key={chain}
                  type="button"
                  size="sm"
                  variant={selectedChain === chain ? 'solid' : 'bordered'}
                  color={selectedChain === chain ? 'primary' : 'default'}
                  onPress={() => setSelectedChain(chain)}
                >
                  {CHAIN_CONFIG[chain].label}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-1.5 items-center">
            <span className="text-xs text-muted-foreground mr-1" title="Which trading app/DEX do you use with this wallet?">App:</span>
            {DEX_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={selectedDex === opt.value ? 'solid' : 'bordered'}
                color={selectedDex === opt.value ? 'primary' : 'default'}
                onPress={() => setSelectedDex(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" color="primary">
            Add Wallet
          </Button>
        </form>
      </div>

      <Divider />

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
                key={w.id}
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
                        <span className="text-xs text-destructive flex items-center gap-1.5">
                          {slot.error}
                          {!active && (
                            <button
                              className="underline hover:no-underline"
                              onClick={(e) => { e.stopPropagation(); refreshWallet(w.address, w.chain) }}
                            >
                              Retry
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground mt-1 truncate">
                      {w.address}
                    </p>
                    {active && slot?.cacheInfo?.cachedAt && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        Last synced {slot.cacheInfo.cachedAt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {active && (
                    <Button
                      variant="bordered"
                      size="sm"
                      onPress={() => refreshWallet(w.address, w.chain)}
                      isDisabled={slot?.isLoading}
                    >
                      Refresh
                    </Button>
                  )}
                  <Button
                    variant="light"
                    size="sm"
                    color="danger"
                    onPress={() => setRemoveWalletIdx(wallets.indexOf(w))}
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

    {/* Remove-wallet confirm — HeroUI Modal (replaces shadcn AlertDialog) */}
    <Modal
      isOpen={removeWalletIdx !== null}
      onOpenChange={(open) => { if (!open) setRemoveWalletIdx(null) }}
      size="sm"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>Remove this wallet?</ModalHeader>
            <ModalBody>
              <p className="text-sm text-muted-foreground">
                This will remove the wallet and delete all cached trade data for it. This cannot be undone.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" size="sm" onPress={onClose}>Cancel</Button>
              <Button
                color="danger"
                size="sm"
                onPress={() => {
                  if (removeWalletIdx !== null) handleRemove(wallets[removeWalletIdx])
                  setRemoveWalletIdx(null)
                }}
              >
                Remove
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
    </>
  )
}

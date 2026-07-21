'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { Input, Button } from '@heroui/react'
import { type Chain, CHAIN_CONFIG, detectChainFromAddress, isValidAddress } from '@/lib/chains'
import { useWallet } from '@/lib/wallet-context'
import { toast } from 'sonner'

interface AddWalletStepProps {
  onNext: () => void
}

const DEX_OPTIONS = [
  { value: 'fomo', label: 'Fomo' },
  { value: 'axiom', label: 'Axiom' },
  { value: 'jupiter', label: 'Jupiter' },
  { value: 'gmgn', label: 'GMGN' },
  { value: 'other', label: 'Other' },
] as const

export function AddWalletStep({ onNext }: AddWalletStepProps) {
  const { savedWallets, reloadWallets, setWalletActive } = useWallet()
  const [address, setAddress] = useState('')
  const [nickname, setNickname] = useState('')
  const [selectedChain, setSelectedChain] = useState<Chain>('solana')
  const [selectedDex, setSelectedDex] = useState('other')
  const [error, setError] = useState('')
  const [added, setAdded] = useState(false)
  const [saving, setSaving] = useState(false)

  // Track which wallet we just added so we can activate it once savedWallets updates
  const pendingActivation = useRef<{ address: string; chain: Chain } | null>(null)

  // When savedWallets updates and we have a pending activation, activate the wallet
  // This ensures setWalletActive sees the fresh savedWallets (no stale closure)
  useEffect(() => {
    if (!pendingActivation.current) return
    const { address, chain } = pendingActivation.current
    const found = savedWallets.some(w => w.address === address && w.chain === chain)
    if (found) {
      pendingActivation.current = null
      setWalletActive(address, chain, true)
    }
  }, [savedWallets, setWalletActive])

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

    setSaving(true)
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
      // Queue activation for when savedWallets updates with the new wallet
      pendingActivation.current = { address: trimmed, chain: selectedChain }
      await reloadWallets()
      setAdded(true)
      toast.success('Wallet added')
    } catch {
      setError('Failed to add wallet')
    } finally {
      setSaving(false)
    }
  }

  if (added) {
    return (
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <CheckCircle2 className="h-12 w-12 text-primary mb-4" />
        <h2 className="text-xl font-semibold mb-2">Wallet Added</h2>
        <p className="text-sm text-muted-foreground mb-8">
          Your trades will start importing in the background.
        </p>
        <Button onPress={onNext} color="primary">
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold mb-2">Add Your Wallet</h2>
        <p className="text-sm text-muted-foreground">
          Connect a Solana or EVM wallet to import your trading history.
        </p>
      </div>

      <form onSubmit={handleAdd} className="space-y-4">
        <div>
          <Input
            size="sm"
            aria-label="Wallet address"
            value={address}
            onValueChange={handleAddressChange}
            placeholder="Wallet address (Solana or 0x)..."
            className="text-sm font-mono"
          />
        </div>
        <div>
          <Input
            size="sm"
            aria-label="Wallet nickname"
            value={nickname}
            onValueChange={setNickname}
            placeholder="Nickname (optional)"
            className="text-sm"
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
        <div className="flex gap-1.5 items-center">
          <span className="text-xs text-muted-foreground mr-1">App:</span>
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
        <div className="flex gap-3 pt-2">
          <Button type="submit" color="primary" isDisabled={saving}>
            {saving ? 'Adding...' : 'Add Wallet'}
          </Button>
          <Button type="button" variant="light" onPress={onNext}>
            Skip for now
          </Button>
        </div>
      </form>
    </div>
  )
}

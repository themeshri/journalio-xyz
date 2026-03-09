'use client'

import { useState } from 'react'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  const { reloadWallets, setWalletActive } = useWallet()
  const [address, setAddress] = useState('')
  const [nickname, setNickname] = useState('')
  const [selectedChain, setSelectedChain] = useState<Chain>('solana')
  const [selectedDex, setSelectedDex] = useState('other')
  const [error, setError] = useState('')
  const [added, setAdded] = useState(false)
  const [saving, setSaving] = useState(false)

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
      await reloadWallets()
      setWalletActive(trimmed, selectedChain, true)
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
        <Button onClick={onNext}>
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
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            placeholder="Wallet address (Solana or 0x)..."
            className="text-sm font-mono"
          />
        </div>
        <div>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nickname (optional)"
            className="text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {(['solana', 'base', 'bnb'] as Chain[]).map((chain) => (
            <button
              key={chain}
              type="button"
              onClick={() => setSelectedChain(chain)}
              className={`text-xs px-2.5 py-1.5 rounded border transition-colors ${
                selectedChain === chain
                  ? 'font-medium bg-muted border-border'
                  : 'text-muted-foreground border-border hover:bg-muted/50 cursor-pointer'
              }`}
            >
              {CHAIN_CONFIG[chain].label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 items-center">
          <span className="text-xs text-muted-foreground mr-1">App:</span>
          {DEX_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelectedDex(opt.value)}
              className={`text-xs px-2 py-1.5 rounded border transition-colors ${
                selectedDex === opt.value
                  ? 'font-medium bg-muted border-border'
                  : 'text-muted-foreground border-border hover:bg-muted/50 cursor-pointer'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Adding...' : 'Add Wallet'}
          </Button>
          <Button type="button" variant="ghost" onClick={onNext}>
            Skip for now
          </Button>
        </div>
      </form>
    </div>
  )
}

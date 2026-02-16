'use client'

import { useState } from 'react'
import { useWallet } from '@/lib/wallet-context'
import { isValidSolanaAddress } from '@/lib/solana-tracker'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SidebarWalletInput() {
  const { currentWallet, searchWallet, clearWallet, isLoading } = useWallet()
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
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
    searchWallet(trimmed)
    setAddress('')
  }

  if (currentWallet) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Watching</p>
        <p className="font-mono text-xs truncate" title={currentWallet}>
          {currentWallet}
        </p>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-7 flex-1"
            onClick={() => searchWallet(currentWallet, true)}
            disabled={isLoading}
          >
            Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={clearWallet}
          >
            Change
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-1.5">
      <Input
        value={address}
        onChange={(e) => {
          setAddress(e.target.value)
          setError('')
        }}
        placeholder="Wallet address..."
        className="text-xs h-8 font-mono"
        disabled={isLoading}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <Button
        type="submit"
        size="sm"
        className="w-full text-xs h-7"
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : 'Track Wallet'}
      </Button>
    </form>
  )
}

'use client'

import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface ManualTradeDialogProps {
  walletAddress: string
  chain: string
  onClose: () => void
  onSaved: () => void
}

export function ManualTradeDialog({ walletAddress, chain, onClose, onSaved }: ManualTradeDialogProps) {
  const [tokenName, setTokenName] = useState('')
  const [tokenMint, setTokenMint] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [buyAmount, setBuyAmount] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [sellAmount, setSellAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const buyValue = Number(buyPrice) * Number(buyAmount) || 0
  const sellValue = Number(sellPrice) * Number(sellAmount) || 0
  const pl = sellValue - buyValue

  const canSave = tokenName.trim() && Number(buyAmount) > 0 && Number(buyPrice) > 0

  const handleSave = useCallback(async () => {
    if (!canSave) return
    setSaving(true)

    try {
      const timestamp = Math.floor(new Date(date).getTime() / 1000)
      const manualId = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

      // Create buy trade
      const buyTrade = {
        walletAddress,
        chain,
        signature: `${manualId}-buy`,
        timestamp,
        type: 'trade',
        tokenIn: { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
        tokenOut: { symbol: tokenName.trim(), address: tokenMint.trim() || manualId },
        amountIn: buyValue,
        amountOut: Number(buyAmount),
        priceUSD: Number(buyPrice),
        valueUSD: buyValue,
        dex: 'Manual',
        source: 'manual',
        notes,
      }

      const trades = [buyTrade]

      // Create sell trade if provided
      if (Number(sellAmount) > 0 && Number(sellPrice) > 0) {
        trades.push({
          walletAddress,
          chain,
          signature: `${manualId}-sell`,
          timestamp: timestamp + 1,
          type: 'trade',
          tokenIn: { symbol: tokenName.trim(), address: tokenMint.trim() || manualId },
          tokenOut: { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112' },
          amountIn: Number(sellAmount),
          amountOut: sellValue,
          priceUSD: Number(sellPrice),
          valueUSD: sellValue,
          dex: 'Manual',
          source: 'manual',
          notes,
        })
      }

      const res = await fetch('/api/manual-trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trades }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save manual trade')
      }

      toast.success('Manual trade added')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save manual trade')
    } finally {
      setSaving(false)
    }
  }, [canSave, walletAddress, chain, tokenName, tokenMint, buyPrice, buyAmount, sellPrice, sellAmount, date, notes, buyValue, sellValue, onSaved, onClose])

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Add Manual Trade</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Token Name *</Label>
              <Input
                placeholder="e.g. BONK"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Token Mint</Label>
              <Input
                placeholder="Optional address"
                value={tokenMint}
                onChange={(e) => setTokenMint(e.target.value)}
                className="mt-1 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Buy Price (USD) *</Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Buy Amount *</Label>
              <Input
                type="number"
                step="any"
                placeholder="0"
                value={buyAmount}
                onChange={(e) => setBuyAmount(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
          </div>

          {buyValue > 0 && (
            <p className="text-xs text-muted-foreground">
              Buy total: <span className="font-mono text-foreground">${buyValue.toFixed(2)}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Sell Price (USD)</Label>
              <Input
                type="number"
                step="any"
                placeholder="0.00"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Sell Amount</Label>
              <Input
                type="number"
                step="any"
                placeholder="0"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
          </div>

          {sellValue > 0 && (
            <p className="text-xs text-muted-foreground">
              Sell total: <span className="font-mono text-foreground">${sellValue.toFixed(2)}</span>
              {' | '}P/L:{' '}
              <span className={`font-mono font-medium ${pl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {pl >= 0 ? '+' : ''}${pl.toFixed(2)}
              </span>
            </p>
          )}

          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              placeholder="Optional notes about this trade..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!canSave || saving} onClick={handleSave}>
            {saving ? 'Saving...' : 'Add Trade'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

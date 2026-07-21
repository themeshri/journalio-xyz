'use client'

import React, { useState, useCallback } from 'react'
import {
  Button,
  Input,
  Textarea,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@heroui/react'
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
    <Modal isOpen onOpenChange={(o) => { if (!o) onClose() }} size="md">
      <ModalContent className="max-w-md">
        <ModalHeader className="text-base">Add Manual Trade</ModalHeader>

        <ModalBody>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="Token Name *"
                  labelPlacement="outside"
                  size="sm"
                  placeholder="e.g. BONK"
                  value={tokenName}
                  onValueChange={setTokenName}
                  className="mt-1"
                />
              </div>
              <div>
                <Input
                  label="Token Mint"
                  labelPlacement="outside"
                  size="sm"
                  placeholder="Optional address"
                  value={tokenMint}
                  onValueChange={setTokenMint}
                  className="mt-1 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <Input
                label="Date"
                labelPlacement="outside"
                size="sm"
                type="date"
                value={date}
                onValueChange={setDate}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="Buy Price (USD) *"
                  labelPlacement="outside"
                  size="sm"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={buyPrice}
                  onValueChange={setBuyPrice}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Input
                  label="Buy Amount *"
                  labelPlacement="outside"
                  size="sm"
                  type="number"
                  step="any"
                  placeholder="0"
                  value={buyAmount}
                  onValueChange={setBuyAmount}
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
                <Input
                  label="Sell Price (USD)"
                  labelPlacement="outside"
                  size="sm"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={sellPrice}
                  onValueChange={setSellPrice}
                  className="mt-1 font-mono"
                />
              </div>
              <div>
                <Input
                  label="Sell Amount"
                  labelPlacement="outside"
                  size="sm"
                  type="number"
                  step="any"
                  placeholder="0"
                  value={sellAmount}
                  onValueChange={setSellAmount}
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
              <Textarea
                label="Notes"
                labelPlacement="outside"
                size="sm"
                placeholder="Optional notes about this trade..."
                value={notes}
                onValueChange={setNotes}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="bordered" size="sm" onPress={onClose}>
            Cancel
          </Button>
          <Button color="primary" size="sm" isDisabled={!canSave || saving} onPress={handleSave}>
            {saving ? 'Saving...' : 'Add Trade'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

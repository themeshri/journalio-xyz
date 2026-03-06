'use client'

import React, { useState, useCallback } from 'react'
import { type FlattenedTrade, type TradeInput } from '@/lib/tradeCycles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface EditTradeTabProps {
  trade: FlattenedTrade
}

interface TxEdit {
  editedAmountIn?: number
  editedAmountOut?: number
  editedValueUSD?: number
}

interface WholeTradeEdit {
  totalBuyValue?: number
  totalSellValue?: number
}

function formatTimestamp(timestamp: number) {
  try {
    return format(new Date(timestamp * 1000), 'MMM dd HH:mm')
  } catch {
    return '-'
  }
}

export function EditTradeTab({ trade }: EditTradeTabProps) {
  const allTxs = [...trade.buys, ...trade.sells].sort(
    (a: TradeInput, b: TradeInput) => a.timestamp - b.timestamp
  )

  const [wholeEdit, setWholeEdit] = useState<WholeTradeEdit>({})
  const [txEdits, setTxEdits] = useState<Record<string, TxEdit>>({})
  const [saving, setSaving] = useState(false)

  const updateTxEdit = useCallback((sig: string, field: keyof TxEdit, value: string) => {
    setTxEdits((prev) => ({
      ...prev,
      [sig]: {
        ...prev[sig],
        [field]: value === '' ? undefined : Number(value),
      },
    }))
  }, [])

  const displayBuyValue = wholeEdit.totalBuyValue ?? trade.totalBuyValue
  const displaySellValue = wholeEdit.totalSellValue ?? trade.totalSellValue
  const displayPL = displaySellValue - displayBuyValue

  const hasTxEdits = Object.values(txEdits).some((e) =>
    e.editedAmountIn !== undefined || e.editedAmountOut !== undefined || e.editedValueUSD !== undefined
  )
  const hasWholeEdits = wholeEdit.totalBuyValue !== undefined || wholeEdit.totalSellValue !== undefined
  const hasEdits = hasTxEdits || hasWholeEdits

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      // Save per-transaction edits
      const txToSave = Object.entries(txEdits).filter(
        ([, e]) => e.editedAmountIn !== undefined || e.editedAmountOut !== undefined || e.editedValueUSD !== undefined
      )
      for (const [tradeId, edit] of txToSave) {
        const res = await fetch('/api/trade-edits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tradeId, ...edit }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Failed to save edit for ${tradeId}`)
        }
      }

      // Save whole-trade override (stored as a special trade edit keyed by trade cycle identifier)
      if (hasWholeEdits) {
        const cycleKey = `cycle-${trade.tokenMint}-${trade.tradeNumber}-${trade.walletAddress}`
        const res = await fetch('/api/trade-edits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tradeId: cycleKey,
            editedAmountIn: wholeEdit.totalBuyValue,
            editedAmountOut: wholeEdit.totalSellValue,
            notes: 'Whole trade override',
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || 'Failed to save whole trade edit')
        }
      }

      const count = txToSave.length + (hasWholeEdits ? 1 : 0)
      toast.success(`Saved ${count} edit${count > 1 ? 's' : ''}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save edits')
    } finally {
      setSaving(false)
    }
  }, [txEdits, wholeEdit, hasWholeEdits, trade])

  const isBuy = (tx: TradeInput) => trade.buys.includes(tx)

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Override trade values. Original data is preserved — edits are stored separately.
      </p>

      {/* Edit Whole Trade Section */}
      <div className="border rounded-lg p-4 space-y-3 bg-muted/10">
        <h4 className="text-sm font-medium">Edit Whole Trade</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Total Bought (USD)</Label>
            <Input
              type="number"
              step="any"
              placeholder={`$${trade.totalBuyValue.toFixed(2)}`}
              value={wholeEdit.totalBuyValue ?? ''}
              onChange={(e) => setWholeEdit((prev) => ({
                ...prev,
                totalBuyValue: e.target.value === '' ? undefined : Number(e.target.value),
              }))}
              className="h-8 text-sm font-mono mt-1"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Total Sold (USD)</Label>
            <Input
              type="number"
              step="any"
              placeholder={`$${trade.totalSellValue.toFixed(2)}`}
              value={wholeEdit.totalSellValue ?? ''}
              onChange={(e) => setWholeEdit((prev) => ({
                ...prev,
                totalSellValue: e.target.value === '' ? undefined : Number(e.target.value),
              }))}
              className="h-8 text-sm font-mono mt-1"
            />
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          P/L:{' '}
          <span className={`font-mono font-medium ${displayPL >= 0 ? 'text-lime-500' : 'text-red-500'}`}>
            {displayPL >= 0 ? '+' : ''}${displayPL.toFixed(2)}
          </span>
        </div>
      </div>

      <Separator />

      {/* Individual Transactions */}
      <div>
        <h4 className="text-sm font-medium mb-3">Transactions ({allTxs.length})</h4>
        <div className="space-y-3">
          {allTxs.map((tx: TradeInput, idx: number) => {
            const type = isBuy(tx) ? 'Buy' : 'Sell'
            const edit = txEdits[tx.signature] || {}

            return (
              <div key={`${tx.signature}-${idx}`} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        type === 'Buy'
                          ? 'bg-lime-500/10 text-lime-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      {type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(tx.timestamp)}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      ${tx.valueUSD.toFixed(2)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {tx.signature.slice(0, 8)}...
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      Amount In ({tx.tokenIn?.symbol || '?'})
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder={tx.amountIn.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      value={edit.editedAmountIn ?? ''}
                      onChange={(e) => updateTxEdit(tx.signature, 'editedAmountIn', e.target.value)}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      Amount Out ({tx.tokenOut?.symbol || '?'})
                    </Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder={tx.amountOut.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      value={edit.editedAmountOut ?? ''}
                      onChange={(e) => updateTxEdit(tx.signature, 'editedAmountOut', e.target.value)}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Value (USD)</Label>
                    <Input
                      type="number"
                      step="any"
                      placeholder={`$${tx.valueUSD.toFixed(2)}`}
                      value={edit.editedValueUSD ?? ''}
                      onChange={(e) => updateTxEdit(tx.signature, 'editedValueUSD', e.target.value)}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {allTxs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No transactions in this trade cycle.
          </p>
        )}
      </div>

      <Separator />

      {/* Save button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          disabled={!hasEdits || saving}
          onClick={handleSave}
        >
          {saving ? 'Saving...' : 'Save Edits'}
        </Button>
      </div>
    </div>
  )
}

'use client'

import React, { useState, useCallback } from 'react'
import { type FlattenedTrade } from '@/lib/tradeCycles'
import { type Trade } from '@/lib/solana-tracker'
import { formatPrice } from '@/lib/formatters'
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
  notes?: string
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
    (a: Trade, b: Trade) => a.timestamp - b.timestamp
  )

  const [edits, setEdits] = useState<Record<string, TxEdit>>({})
  const [saving, setSaving] = useState(false)

  const updateEdit = useCallback((sig: string, field: keyof TxEdit, value: string) => {
    setEdits((prev) => ({
      ...prev,
      [sig]: {
        ...prev[sig],
        [field]: value === '' ? undefined : Number(value),
      },
    }))
  }, [])

  const hasEdits = Object.values(edits).some((e) =>
    e.editedAmountIn !== undefined || e.editedAmountOut !== undefined || e.editedValueUSD !== undefined
  )

  const handleSave = useCallback(async () => {
    const toSave = Object.entries(edits).filter(
      ([, e]) => e.editedAmountIn !== undefined || e.editedAmountOut !== undefined || e.editedValueUSD !== undefined
    )
    if (toSave.length === 0) return

    setSaving(true)
    try {
      for (const [tradeId, edit] of toSave) {
        const res = await fetch('/api/trade-edits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tradeId,
            ...edit,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Failed to save edit for ${tradeId}`)
        }
      }
      toast.success(`Saved ${toSave.length} edit${toSave.length > 1 ? 's' : ''}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save edits')
    } finally {
      setSaving(false)
    }
  }, [edits])

  const isBuy = (tx: Trade) => trade.buys.includes(tx)

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Override transaction values. Original data is preserved — edits are stored separately.
      </p>

      <div className="space-y-3">
        {allTxs.map((tx: Trade, idx: number) => {
          const type = isBuy(tx) ? 'Buy' : 'Sell'
          const edit = edits[tx.signature] || {}

          return (
            <div key={`${tx.signature}-${idx}`} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      type === 'Buy'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-red-500/10 text-red-600'
                    }`}
                  >
                    {type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(tx.timestamp)}
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
                    onChange={(e) => updateEdit(tx.signature, 'editedAmountIn', e.target.value)}
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
                    onChange={(e) => updateEdit(tx.signature, 'editedAmountOut', e.target.value)}
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
                    onChange={(e) => updateEdit(tx.signature, 'editedValueUSD', e.target.value)}
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

      <Separator />

      {/* Trade totals summary */}
      <div className="flex items-center justify-between text-xs">
        <div className="space-y-1">
          <div className="text-muted-foreground">
            Total Bought: <span className="font-mono text-foreground">${trade.totalBuyValue.toFixed(2)}</span>
          </div>
          <div className="text-muted-foreground">
            Total Sold: <span className="font-mono text-foreground">${trade.totalSellValue.toFixed(2)}</span>
          </div>
          <div className="text-muted-foreground">
            P/L:{' '}
            <span className={`font-mono font-medium ${trade.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {trade.profitLoss >= 0 ? '+' : ''}${trade.profitLoss.toFixed(2)}
            </span>
          </div>
        </div>
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

'use client';

import React, { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface TradeEditFormProps {
  editedBuyAmount: string;
  editedSellAmount: string;
  editedBalance: string;
  onBuyAmountChange: (value: string) => void;
  onSellAmountChange: (value: string) => void;
  onBalanceChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const TradeEditForm = memo(function TradeEditForm({
  editedBuyAmount,
  editedSellAmount,
  editedBalance,
  onBuyAmountChange,
  onSellAmountChange,
  onBalanceChange,
  onSave,
  onCancel,
}: TradeEditFormProps) {
  return (
    <div className="mb-6 p-4 rounded-md border border-border bg-muted/30">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium">Edit Amounts</h4>
        <div className="flex gap-2">
          <Button size="sm" onClick={onSave}>
            Save
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="buy-amount" className="text-xs mb-1.5">
            Total Buy Amount
          </Label>
          <Input
            id="buy-amount"
            type="number"
            min="0"
            step="any"
            value={editedBuyAmount}
            onChange={(e) => onBuyAmountChange(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="sell-amount" className="text-xs mb-1.5">
            Total Sell Amount
          </Label>
          <Input
            id="sell-amount"
            type="number"
            min="0"
            step="any"
            value={editedSellAmount}
            onChange={(e) => onSellAmountChange(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="final-balance" className="text-xs mb-1.5">
            Final Balance
          </Label>
          <Input
            id="final-balance"
            type="number"
            min="0"
            step="any"
            value={editedBalance}
            onChange={(e) => onBalanceChange(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
});

export default TradeEditForm;

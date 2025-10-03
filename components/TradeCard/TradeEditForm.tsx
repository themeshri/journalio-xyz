'use client';

import React, { memo } from 'react';

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
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-blue-900">Edit Trade Amounts</h4>
        <div className="flex gap-2">
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Save changes"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Cancel editing"
          >
            Cancel
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="buy-amount" className="text-xs text-blue-700 block mb-1">
            Total Buy Amount
          </label>
          <input
            id="buy-amount"
            type="number"
            min="0"
            step="any"
            value={editedBuyAmount}
            onChange={(e) => onBuyAmountChange(e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Total buy amount"
            required
          />
        </div>
        <div>
          <label htmlFor="sell-amount" className="text-xs text-blue-700 block mb-1">
            Total Sell Amount
          </label>
          <input
            id="sell-amount"
            type="number"
            min="0"
            step="any"
            value={editedSellAmount}
            onChange={(e) => onSellAmountChange(e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Total sell amount"
            required
          />
        </div>
        <div>
          <label htmlFor="final-balance" className="text-xs text-blue-700 block mb-1">
            Final Balance
          </label>
          <input
            id="final-balance"
            type="number"
            min="0"
            step="any"
            value={editedBalance}
            onChange={(e) => onBalanceChange(e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-label="Final balance"
            required
          />
        </div>
      </div>
    </div>
  );
});

export default TradeEditForm;

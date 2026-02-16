'use client';

import React, { memo } from 'react';
import { formatTokenAmount, formatValue, formatPrice, formatMarketCap } from '@/lib/formatters';

interface TradeStatsColumnProps {
  type: 'buy' | 'sell';
  count: number;
  totalAmount: number;
  totalValue: number;
  avgPrice: number;
  token: string;
  onClick: () => void;
}

const TradeStatsColumn = memo(function TradeStatsColumn({
  type,
  count,
  totalAmount,
  totalValue,
  avgPrice,
  token,
  onClick,
}: TradeStatsColumnProps) {
  const isBuy = type === 'buy';

  return (
    <button
      className="text-left w-full rounded-md border border-border p-4 hover:bg-muted/50 transition-colors"
      onClick={onClick}
      aria-label={`View ${type} transactions`}
    >
      <div className={`text-xs font-medium mb-3 ${isBuy ? 'text-emerald-600' : 'text-red-600'}`}>
        {isBuy ? 'Buys' : 'Sells'} ({count})
      </div>
      <div className="space-y-2">
        <div>
          <div className="text-xs text-muted-foreground">Amount</div>
          <div className="font-mono tabular-nums text-sm font-medium">
            {formatTokenAmount(totalAmount)} {token}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Value</div>
          <div className="font-mono tabular-nums text-sm">{formatValue(totalValue)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Avg Price</div>
          <div className="font-mono tabular-nums text-sm">{formatPrice(avgPrice)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            MC: {formatMarketCap(avgPrice * 1_000_000_000)}
          </div>
        </div>
      </div>
    </button>
  );
});

export default TradeStatsColumn;

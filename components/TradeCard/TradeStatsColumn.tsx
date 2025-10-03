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
  const bgColor = isBuy ? 'bg-green-50' : 'bg-red-50';
  const borderColor = isBuy ? 'border-green-200' : 'border-red-200';
  const hoverBgColor = isBuy ? 'hover:bg-green-100' : 'hover:bg-red-100';
  const titleColor = isBuy ? 'text-green-800' : 'text-red-800';
  const labelColor = isBuy ? 'text-green-700' : 'text-red-700';
  const valueColor = isBuy ? 'text-green-900' : 'text-red-900';
  const textColor = isBuy ? 'text-green-800' : 'text-red-800';
  const subTextColor = isBuy ? 'text-green-600' : 'text-red-600';

  return (
    <div
      className={`${bgColor} border ${borderColor} rounded-lg p-4 cursor-pointer ${hoverBgColor} transition-colors`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`View ${type} transactions`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <h4 className={`text-sm font-medium ${titleColor} mb-3`}>
        {isBuy ? 'BUYS' : 'SELLS'} ({count})
      </h4>
      <div className="space-y-2">
        <div>
          <div className={`text-xs ${labelColor}`}>Total Amount</div>
          <div className={`text-lg font-semibold ${valueColor}`}>
            {formatTokenAmount(totalAmount)} {token}
          </div>
        </div>
        <div>
          <div className={`text-xs ${labelColor}`}>Total Value</div>
          <div className={`text-sm font-medium ${valueColor}`}>{formatValue(totalValue)}</div>
        </div>
        <div>
          <div className={`text-xs ${labelColor}`}>Avg Price</div>
          <div className={`text-sm ${textColor}`}>{formatPrice(avgPrice)}</div>
          <div className={`text-xs ${subTextColor} mt-1`}>
            MC: {formatMarketCap(avgPrice * 1_000_000_000)}
          </div>
        </div>
      </div>
    </div>
  );
});

export default TradeStatsColumn;

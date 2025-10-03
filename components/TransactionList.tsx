'use client';

import { Trade } from '@/lib/solana-tracker';
import { format } from 'date-fns';
import { formatMarketCap, formatPrice } from '@/lib/formatters';

interface TransactionListProps {
  trades: Trade[];
}

export default function TransactionList({ trades }: TransactionListProps) {
  if (trades.length === 0) {
    return (
      <div className="max-w-6xl mx-auto mt-8">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No transactions found for this wallet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Recent Transactions ({trades.length})
      </h2>

      <div className="space-y-4">
        {trades.map((trade, index) => (
          <TransactionCard key={`${trade.signature}-${index}`} trade={trade} />
        ))}
      </div>
    </div>
  );
}

function TransactionCard({ trade }: { trade: Trade }) {
  // Calculate market cap: price × 1 billion supply
  const ASSUMED_SUPPLY = 1_000_000_000;
  const marketCap = trade.priceUSD * ASSUMED_SUPPLY;

  const formatNumber = (num: number, decimals: number = 2) => {
    if (num === 0) return '0';
    if (num < 0.01) return num.toExponential(2);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  const formatTimestamp = (timestamp: number) => {
    try {
      return format(new Date(timestamp * 1000), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return 'Invalid date';
    }
  };

  const getTransactionType = () => {
    if (trade.type === 'buy') return { label: 'Buy', color: 'text-green-600 bg-green-50' };
    if (trade.type === 'sell') return { label: 'Sell', color: 'text-red-600 bg-red-50' };
    return { label: 'Swap', color: 'text-blue-600 bg-blue-50' };
  };

  const typeInfo = getTransactionType();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Left side - Transaction details */}
        <div className="flex-1 space-y-3">
          {/* Transaction type and timestamp */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${typeInfo.color}`}>
              {typeInfo.label}
            </span>
            <span className="text-sm text-gray-500">
              {formatTimestamp(trade.timestamp)}
            </span>
          </div>

          {/* Token swap details */}
          <div className="flex items-center gap-2 text-lg">
            <div className="flex items-center gap-2">
              {trade.tokenIn.logoURI && (
                <img
                  src={trade.tokenIn.logoURI}
                  alt={trade.tokenIn.symbol}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="font-medium">{formatNumber(trade.amountIn, 4)}</span>
              <span className="text-gray-700">{trade.tokenIn.symbol}</span>
            </div>

            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>

            <div className="flex items-center gap-2">
              {trade.tokenOut.logoURI && (
                <img
                  src={trade.tokenOut.logoURI}
                  alt={trade.tokenOut.symbol}
                  className="w-6 h-6 rounded-full"
                />
              )}
              <span className="font-medium">{formatNumber(trade.amountOut, 4)}</span>
              <span className="text-gray-700">{trade.tokenOut.symbol}</span>
            </div>
          </div>

          {/* Price and Market Cap - Prominent Display */}
          <div className="flex flex-wrap items-center gap-6 text-sm bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Price:</span>
              <span className="font-semibold text-gray-900 text-base">
                {formatPrice(trade.priceUSD)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">MC:</span>
              <span className="font-semibold text-gray-900 text-base">
                {formatMarketCap(marketCap)}
              </span>
            </div>
          </div>

          {/* DEX and Value */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">DEX:</span>
              <span className="font-medium text-gray-900">{trade.dex}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Value:</span>
              <span className="font-medium text-gray-900">
                ${formatNumber(trade.valueUSD)}
              </span>
            </div>
          </div>

          {/* Transaction signature */}
          <div className="pt-2 border-t border-gray-100">
            <a
              href={`https://solscan.io/tx/${trade.signature}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline font-mono break-all"
            >
              {trade.signature}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

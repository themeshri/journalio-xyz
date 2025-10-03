'use client';

import React, { useEffect, useCallback, memo } from 'react';
import { Trade } from '@/lib/solana-tracker';
import { formatPrice, formatMarketCap } from '@/lib/formatters';
import { format } from 'date-fns';

interface TransactionModalProps {
  trades: Trade[];
  title: string;
  onClose: () => void;
}

const TransactionModal = memo(function TransactionModal({
  trades,
  title,
  onClose,
}: TransactionModalProps) {
  const formatNumber = useCallback((num: number, decimals: number = 2) => {
    if (num === 0) return '0';
    if (num < 0.01) return num.toExponential(2);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }, []);

  const formatTimestamp = useCallback((timestamp: number) => {
    try {
      return format(new Date(timestamp * 1000), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return 'Invalid date';
    }
  }, []);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Prevent body scroll when modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = originalOverflow;
    };
  }, [onClose]);

  // Focus trap for accessibility
  useEffect(() => {
    const modalElement = document.getElementById('transaction-modal');
    if (modalElement) {
      const focusableElements = modalElement.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      firstElement?.focus();

      return () => {
        document.removeEventListener('keydown', handleTab);
      };
    }
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        id="transaction-modal"
        className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 id="modal-title" className="text-xl font-bold text-gray-900">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Transaction List */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {trades.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No transactions to display
            </div>
          ) : (
            <div className="space-y-4">
              {trades.map((trade, index) => {
                const marketCap = trade.priceUSD * 1_000_000_000;
                return (
                  <div
                    key={`${trade.signature}-${index}`}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Timestamp */}
                    <div className="text-sm text-gray-500 mb-2">
                      <time dateTime={new Date(trade.timestamp * 1000).toISOString()}>
                        {formatTimestamp(trade.timestamp)}
                      </time>
                    </div>

                    {/* Token swap details */}
                    <div className="flex items-center gap-2 text-base mb-3">
                      <div className="flex items-center gap-2">
                        {trade.tokenIn.logoURI && (
                          <img
                            src={trade.tokenIn.logoURI}
                            alt={`${trade.tokenIn.symbol} logo`}
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                        <span className="font-medium" aria-label="Amount in">
                          {formatNumber(trade.amountIn, 4)}
                        </span>
                        <span className="text-gray-700">{trade.tokenIn.symbol}</span>
                      </div>

                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>

                      <div className="flex items-center gap-2">
                        {trade.tokenOut.logoURI && (
                          <img
                            src={trade.tokenOut.logoURI}
                            alt={`${trade.tokenOut.symbol} logo`}
                            className="w-5 h-5 rounded-full"
                          />
                        )}
                        <span className="font-medium" aria-label="Amount out">
                          {formatNumber(trade.amountOut, 4)}
                        </span>
                        <span className="text-gray-700">{trade.tokenOut.symbol}</span>
                      </div>
                    </div>

                    {/* Price and Market Cap */}
                    <div className="flex flex-wrap items-center gap-4 text-sm bg-gray-50 p-2 rounded-lg mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Price:</span>
                        <span className="font-semibold text-gray-900">
                          {formatPrice(trade.priceUSD)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">MC:</span>
                        <span className="font-semibold text-gray-900">
                          {formatMarketCap(marketCap)}
                        </span>
                      </div>
                    </div>

                    {/* DEX and Value */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                      <span>
                        DEX: <span className="font-medium text-gray-900">{trade.dex}</span>
                      </span>
                      <span>
                        Value: <span className="font-medium text-gray-900">${formatNumber(trade.valueUSD)}</span>
                      </span>
                    </div>

                    {/* Transaction signature */}
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <a
                        href={`https://solscan.io/tx/${trade.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-mono break-all focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                        aria-label={`View transaction ${trade.signature} on Solscan`}
                      >
                        {trade.signature}
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default TransactionModal;

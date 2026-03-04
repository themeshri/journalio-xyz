'use client';

import React, { memo } from 'react';
import { Trade } from '@/lib/solana-tracker';
import { formatPrice, formatMarketCap } from '@/lib/formatters';
import { explorerTxUrl, type Chain } from '@/lib/chains';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface TransactionModalProps {
  trades: Trade[];
  title: string;
  onClose: () => void;
  chain?: Chain;
}

function formatNumber(num: number, decimals: number = 2) {
  if (num === 0) return '0';
  if (num < 0.01) return num.toExponential(2);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatTimestamp(timestamp: number) {
  try {
    return format(new Date(timestamp * 1000), 'MMM dd, yyyy HH:mm:ss');
  } catch {
    return 'Invalid date';
  }
}

const TransactionModal = memo(function TransactionModal({
  trades,
  title,
  onClose,
  chain = 'solana',
}: TransactionModalProps) {
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 -mx-6 px-6">
          {trades.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8">
              No transactions to display
            </p>
          ) : (
            <div className="space-y-0">
              {trades.map((trade, index) => {
                const marketCap = trade.priceUSD * 1_000_000_000;
                return (
                  <div key={`${trade.signature}-${index}`}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="py-1">
                      {/* Timestamp */}
                      <time
                        dateTime={new Date(trade.timestamp * 1000).toISOString()}
                        className="text-xs text-muted-foreground font-mono tabular-nums"
                      >
                        {formatTimestamp(trade.timestamp)}
                      </time>

                      {/* Token swap */}
                      <div className="flex items-center gap-2 mt-2 text-sm">
                        <div className="flex items-center gap-1.5">
                          {trade.tokenIn?.logoURI && (
                            <img
                              src={trade.tokenIn.logoURI}
                              alt=""
                              className="w-4 h-4 rounded-full"
                            />
                          )}
                          <span className="font-mono tabular-nums">
                            {formatNumber(trade.amountIn, 4)}
                          </span>
                          <span className="text-muted-foreground">
                            {trade.tokenIn?.symbol || '?'}
                          </span>
                        </div>

                        <span className="text-muted-foreground text-xs">&rarr;</span>

                        <div className="flex items-center gap-1.5">
                          {trade.tokenOut?.logoURI && (
                            <img
                              src={trade.tokenOut.logoURI}
                              alt=""
                              className="w-4 h-4 rounded-full"
                            />
                          )}
                          <span className="font-mono tabular-nums">
                            {formatNumber(trade.amountOut, 4)}
                          </span>
                          <span className="text-muted-foreground">
                            {trade.tokenOut?.symbol || '?'}
                          </span>
                        </div>
                      </div>

                      {/* Price, MC, DEX, Value */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span>
                          Price <span className="font-mono tabular-nums text-foreground">{formatPrice(trade.priceUSD)}</span>
                        </span>
                        <span>
                          MC <span className="font-mono tabular-nums text-foreground">{formatMarketCap(marketCap)}</span>
                        </span>
                        <span>
                          DEX <span className="text-foreground">{trade.dex}</span>
                        </span>
                        <span>
                          Value <span className="font-mono tabular-nums text-foreground">${formatNumber(trade.valueUSD)}</span>
                        </span>
                      </div>

                      {/* Tx link */}
                      <div className="mt-1.5">
                        <a
                          href={explorerTxUrl(chain, trade.signature)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline font-mono break-all"
                        >
                          {trade.signature}
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

export default TransactionModal;

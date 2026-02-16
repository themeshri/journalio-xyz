'use client';

import React, { memo } from 'react';
import { formatTokenAmount } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { JournalData } from '../JournalModal';

interface TradeBalanceColumnProps {
  isComplete: boolean;
  endBalance: number;
  token: string;
  journalData: JournalData | null;
  onJournalClick: () => void;
}

const TradeBalanceColumn = memo(function TradeBalanceColumn({
  isComplete,
  endBalance,
  token,
  journalData,
  onJournalClick,
}: TradeBalanceColumnProps) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="space-y-2">
        <div>
          <div className="text-xs text-muted-foreground">
            {isComplete ? 'Final Balance' : 'Current Balance'}
          </div>
          <div className="font-mono tabular-nums text-sm font-medium">
            {formatTokenAmount(endBalance)} {token}
          </div>
        </div>

        {journalData && (
          <>
            {journalData.buyCategory && (
              <div className="pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground">Category</div>
                <div className="text-sm">{journalData.buyCategory}</div>
              </div>
            )}
            {journalData.sellMistakes.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground">Mistakes</div>
                <div className="text-xs">{journalData.sellMistakes.join(', ')}</div>
              </div>
            )}
            {journalData.sellRating > 0 && (
              <div>
                <div className="text-xs text-muted-foreground">Rating</div>
                <div className="text-xs font-mono tabular-nums">
                  {journalData.sellRating}/10
                </div>
              </div>
            )}
          </>
        )}

        <div className="pt-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={onJournalClick}
          >
            {journalData ? 'Edit Journal' : 'Journal'}
          </Button>
        </div>
      </div>
    </div>
  );
});

export default TradeBalanceColumn;

'use client';

import React, { memo } from 'react';
import { Button } from '@/components/ui/button';

interface TradeCardHeaderProps {
  token: string;
  globalTradeNumber: number;
  isComplete: boolean;
  hasMismatch: boolean;
  hasBeenEdited: boolean;
  onEdit: () => void;
  onReset: () => void;
}

const TradeCardHeader = memo(function TradeCardHeader({
  token,
  globalTradeNumber,
  isComplete,
  hasMismatch,
  hasBeenEdited,
  onEdit,
  onReset,
}: TradeCardHeaderProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <h3 className="text-base font-semibold">
        {token} #{globalTradeNumber}
      </h3>
      <span
        className={`text-xs font-medium ${
          isComplete ? 'text-primary' : 'text-amber-600'
        }`}
        role="status"
      >
        {isComplete ? 'Completed' : 'Active'}
      </span>
      {hasMismatch && (
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-1 py-0 text-amber-600 text-xs"
          title="Token balance may be wrong — buy/sell amounts don't match. Click Edit to correct."
          onClick={() =>
            alert(
              'Token balance may be wrong, total number bought and sold are not equal, you can edit with exact numbers'
            )
          }
        >
          Mismatch
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={onEdit}
      >
        Edit
      </Button>
      {hasBeenEdited && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground"
          onClick={onReset}
        >
          Reset
        </Button>
      )}
    </div>
  );
});

export default TradeCardHeader;

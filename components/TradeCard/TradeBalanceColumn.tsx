'use client';

import React, { memo } from 'react';
import { formatTokenAmount } from '@/lib/formatters';
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
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="space-y-2">
        <div>
          <div className="text-xs text-gray-700">
            {isComplete ? 'Final Balance' : 'Current Balance'}
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {formatTokenAmount(endBalance)} {token}
          </div>
        </div>

        {journalData && (
          <>
            {journalData.buyCategory && (
              <div className="pt-2 border-t border-gray-300">
                <div className="text-xs text-gray-700">Category</div>
                <div className="text-sm font-medium text-gray-900">{journalData.buyCategory}</div>
              </div>
            )}
            {journalData.sellMistakes.length > 0 && (
              <div>
                <div className="text-xs text-gray-700">Mistakes</div>
                <div className="text-xs text-gray-800">{journalData.sellMistakes.join(', ')}</div>
              </div>
            )}
            {journalData.sellRating > 0 && (
              <div>
                <div className="text-xs text-gray-700">Rating</div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: journalData.sellRating }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-sm" aria-hidden="true">
                      ★
                    </span>
                  ))}
                  <span className="text-xs text-gray-600 ml-1">
                    {journalData.sellRating}/10
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        <div className="mt-3 pt-3 border-t border-gray-300">
          <button
            onClick={onJournalClick}
            className="w-full px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label={journalData ? 'Edit journal' : 'Add journal'}
          >
            {journalData ? 'Edit Journal' : 'Journal'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default TradeBalanceColumn;

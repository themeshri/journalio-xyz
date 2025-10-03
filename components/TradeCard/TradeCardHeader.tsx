'use client';

import React, { memo } from 'react';

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
      <h3 className="text-lg font-semibold text-gray-900">
        {token} - Trade #{globalTradeNumber}
      </h3>
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          isComplete ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'
        }`}
        role="status"
        aria-label={isComplete ? 'Trade completed' : 'Trade active'}
      >
        {isComplete ? 'Completed' : 'Active'}
      </span>
      {hasMismatch && (
        <button
          className="cursor-help text-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 rounded"
          title="Token balance may be wrong, total number bought and sold are not equal, you can edit with exact numbers"
          onClick={() =>
            alert(
              'Token balance may be wrong, total number bought and sold are not equal, you can edit with exact numbers'
            )
          }
          aria-label="Warning: Token balance mismatch"
        >
          ⚠️
        </button>
      )}
      <button
        onClick={onEdit}
        className="text-gray-500 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
        title="Edit trade amounts"
        aria-label="Edit trade amounts"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </button>
      {hasBeenEdited && (
        <button
          onClick={onReset}
          className="text-gray-500 hover:text-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 rounded p-1"
          title="Reset to original amounts"
          aria-label="Reset to original amounts"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      )}
    </div>
  );
});

export default TradeCardHeader;

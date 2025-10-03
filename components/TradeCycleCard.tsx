import { useState } from 'react';
import { FlattenedTrade } from '@/lib/tradeCycles';
import { formatDuration, formatTime, formatValue, formatTokenAmount, formatMarketCap, formatPrice } from '@/lib/formatters';
import { Trade } from '@/lib/solana-tracker';
import { format } from 'date-fns';

interface TradeCycleCardProps {
  trade: FlattenedTrade;
}

export default function TradeCycleCard({ trade: initialTrade }: TradeCycleCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [trade, setTrade] = useState(initialTrade);
  const [editedBuyAmount, setEditedBuyAmount] = useState(trade.totalBuyAmount.toString());
  const [editedSellAmount, setEditedSellAmount] = useState(trade.totalSellAmount.toString());
  const [editedBalance, setEditedBalance] = useState(trade.endBalance.toString());
  const [hasBeenEdited, setHasBeenEdited] = useState(false);
  const [showBuysModal, setShowBuysModal] = useState(false);
  const [showSellsModal, setShowSellsModal] = useState(false);

  const avgBuyPrice = trade.totalBuyAmount > 0 ? trade.totalBuyValue / trade.totalBuyAmount : 0;
  const avgSellPrice = trade.totalSellAmount > 0 ? trade.totalSellValue / trade.totalSellAmount : 0;

  // Calculate market cap: avg price × 1 billion supply
  const ASSUMED_SUPPLY = 1_000_000_000;
  const avgPrice = avgBuyPrice > 0 ? avgBuyPrice : avgSellPrice;
  const marketCap = avgPrice * ASSUMED_SUPPLY;

  // Check if there's a mismatch between buy and sell amounts (potential issue)
  const amountDifference = Math.abs(trade.totalBuyAmount - trade.totalSellAmount);
  const hasMismatch = trade.isComplete && amountDifference > 100;

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    const newBuyAmount = parseFloat(editedBuyAmount);
    const newSellAmount = parseFloat(editedSellAmount);
    const newBalance = parseFloat(editedBalance);

    // Validation
    if (isNaN(newBuyAmount) || newBuyAmount < 0) {
      alert('Invalid buy amount. Please enter a valid positive number.');
      return;
    }
    if (isNaN(newSellAmount) || newSellAmount < 0) {
      alert('Invalid sell amount. Please enter a valid positive number.');
      return;
    }
    if (isNaN(newBalance) || newBalance < 0) {
      alert('Invalid balance. Please enter a valid positive number.');
      return;
    }

    // Update the trade data
    setTrade({
      ...trade,
      totalBuyAmount: newBuyAmount,
      totalSellAmount: newSellAmount,
      endBalance: newBalance,
      isComplete: newBalance < 100,
    });

    setHasBeenEdited(true);
    setIsEditing(false);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset to original amounts?')) {
      setTrade(initialTrade);
      setEditedBuyAmount(initialTrade.totalBuyAmount.toString());
      setEditedSellAmount(initialTrade.totalSellAmount.toString());
      setEditedBalance(initialTrade.endBalance.toString());
      setHasBeenEdited(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setEditedBuyAmount(trade.totalBuyAmount.toString());
    setEditedSellAmount(trade.totalSellAmount.toString());
    setEditedBalance(trade.endBalance.toString());
    setIsEditing(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="text-lg font-semibold text-gray-900">
            {trade.token} - Trade #{trade.globalTradeNumber}
          </h3>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              trade.isComplete
                ? 'bg-blue-100 text-blue-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            {trade.isComplete ? 'Completed' : 'Active'}
          </span>
          {hasMismatch && (
            <span
              className="cursor-help text-lg"
              title="Token balance may be wrong, total number bought and sold are not equal, you can edit with exact numbers"
              onClick={() => alert('Token balance may be wrong, total number bought and sold are not equal, you can edit with exact numbers')}
            >
              ⚠️
            </span>
          )}
          <button
            onClick={handleEdit}
            className="text-gray-500 hover:text-blue-600 transition-colors"
            title="Edit trade amounts"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          {hasBeenEdited && (
            <button
              onClick={handleReset}
              className="text-gray-500 hover:text-green-600 transition-colors"
              title="Reset to original amounts"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div
              className={`text-lg font-bold ${
                trade.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trade.profitLoss >= 0 ? '+' : ''}
              {formatValue(trade.profitLoss)}
            </div>
            {trade.duration && (
              <div className="text-xs text-gray-500">{formatDuration(trade.duration)}</div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Mode */}
      {isEditing && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-blue-900">Edit Trade Amounts</h4>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-blue-700 block mb-1">Total Buy Amount</label>
              <input
                type="number"
                value={editedBuyAmount}
                onChange={(e) => setEditedBuyAmount(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs text-blue-700 block mb-1">Total Sell Amount</label>
              <input
                type="number"
                value={editedSellAmount}
                onChange={(e) => setEditedSellAmount(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs text-blue-700 block mb-1">Final Balance</label>
              <input
                type="number"
                value={editedBalance}
                onChange={(e) => setEditedBalance(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Three-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Buys Column */}
        <div
          className="bg-green-50 border border-green-200 rounded-lg p-4 cursor-pointer hover:bg-green-100 transition-colors"
          onClick={() => setShowBuysModal(true)}
        >
          <h4 className="text-sm font-medium text-green-800 mb-3">
            BUYS ({trade.buys.length})
          </h4>
          <div className="space-y-2">
            <div>
              <div className="text-xs text-green-700">Total Amount</div>
              <div className="text-lg font-semibold text-green-900">
                {formatTokenAmount(trade.totalBuyAmount)} {trade.token}
              </div>
            </div>
            <div>
              <div className="text-xs text-green-700">Total Value</div>
              <div className="text-sm font-medium text-green-900">
                {formatValue(trade.totalBuyValue)}
              </div>
            </div>
            <div>
              <div className="text-xs text-green-700">Avg Price</div>
              <div className="text-sm text-green-800">
                {formatPrice(avgBuyPrice)}
              </div>
              <div className="text-xs text-green-600 mt-1">
                MC: {formatMarketCap(avgBuyPrice * 1_000_000_000)}
              </div>
            </div>
          </div>
        </div>

        {/* Sells Column */}
        <div
          className="bg-red-50 border border-red-200 rounded-lg p-4 cursor-pointer hover:bg-red-100 transition-colors"
          onClick={() => setShowSellsModal(true)}
        >
          <h4 className="text-sm font-medium text-red-800 mb-3">
            SELLS ({trade.sells.length})
          </h4>
          <div className="space-y-2">
            <div>
              <div className="text-xs text-red-700">Total Amount</div>
              <div className="text-lg font-semibold text-red-900">
                {formatTokenAmount(trade.totalSellAmount)} {trade.token}
              </div>
            </div>
            <div>
              <div className="text-xs text-red-700">Total Value</div>
              <div className="text-sm font-medium text-red-900">
                {formatValue(trade.totalSellValue)}
              </div>
            </div>
            <div>
              <div className="text-xs text-red-700">Avg Price</div>
              <div className="text-sm text-red-800">
                {formatPrice(avgSellPrice)}
              </div>
              <div className="text-xs text-red-600 mt-1">
                MC: {formatMarketCap(avgSellPrice * 1_000_000_000)}
              </div>
            </div>
          </div>
        </div>

        {/* Balance Column */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-800 mb-3">BALANCE</h4>
          <div className="space-y-2">
            <div>
              <div className="text-xs text-gray-700">
                {trade.isComplete ? 'Final Balance' : 'Current Balance'}
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {formatTokenAmount(trade.endBalance)} {trade.token}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-700">Start Time</div>
              <div className="text-sm text-gray-800">{formatTime(trade.startDate)}</div>
            </div>
            {trade.endDate && (
              <div>
                <div className="text-xs text-gray-700">End Time</div>
                <div className="text-sm text-gray-800">{formatTime(trade.endDate)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Buys Modal */}
      {showBuysModal && (
        <TransactionModal
          trades={trade.buys}
          title={`${trade.token} - Buy Transactions (${trade.buys.length})`}
          onClose={() => setShowBuysModal(false)}
        />
      )}

      {/* Sells Modal */}
      {showSellsModal && (
        <TransactionModal
          trades={trade.sells}
          title={`${trade.token} - Sell Transactions (${trade.sells.length})`}
          onClose={() => setShowSellsModal(false)}
        />
      )}
    </div>
  );
}

// Transaction Modal Component
interface TransactionModalProps {
  trades: Trade[];
  title: string;
  onClose: () => void;
}

function TransactionModal({ trades, title, onClose }: TransactionModalProps) {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Transaction List */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="space-y-4">
            {trades.map((trade, index) => {
              const marketCap = trade.priceUSD * 1_000_000_000;
              return (
                <div key={`${trade.signature}-${index}`} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  {/* Timestamp */}
                  <div className="text-sm text-gray-500 mb-2">
                    {formatTimestamp(trade.timestamp)}
                  </div>

                  {/* Token swap details */}
                  <div className="flex items-center gap-2 text-base mb-3">
                    <div className="flex items-center gap-2">
                      {trade.tokenIn.logoURI && (
                        <img
                          src={trade.tokenIn.logoURI}
                          alt={trade.tokenIn.symbol}
                          className="w-5 h-5 rounded-full"
                        />
                      )}
                      <span className="font-medium">{formatNumber(trade.amountIn, 4)}</span>
                      <span className="text-gray-700">{trade.tokenIn.symbol}</span>
                    </div>

                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>

                    <div className="flex items-center gap-2">
                      {trade.tokenOut.logoURI && (
                        <img
                          src={trade.tokenOut.logoURI}
                          alt={trade.tokenOut.symbol}
                          className="w-5 h-5 rounded-full"
                        />
                      )}
                      <span className="font-medium">{formatNumber(trade.amountOut, 4)}</span>
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
                    <span>DEX: <span className="font-medium text-gray-900">{trade.dex}</span></span>
                    <span>Value: <span className="font-medium text-gray-900">${formatNumber(trade.valueUSD)}</span></span>
                  </div>

                  {/* Transaction signature */}
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <a
                      href={`https://solscan.io/tx/${trade.signature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-mono break-all"
                    >
                      {trade.signature}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

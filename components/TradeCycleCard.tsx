import { useState } from 'react';
import { FlattenedTrade } from '@/lib/tradeCycles';
import { formatDuration, formatTime, formatValue, formatTokenAmount, formatMarketCap, formatPrice } from '@/lib/formatters';
import { Trade } from '@/lib/solana-tracker';
import { format } from 'date-fns';

interface TradeCycleCardProps {
  trade: FlattenedTrade;
}

interface JournalData {
  buyCategory: string;
  buyNotes: string;
  sellRating: number;
  sellMistakes: string[];
  sellNotes: string;
  attachment?: string; // Base64 encoded image
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
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalData, setJournalData] = useState<JournalData | null>(null);

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
    // Trim whitespace before parsing
    const newBuyAmount = parseFloat(editedBuyAmount.trim());
    const newSellAmount = parseFloat(editedSellAmount.trim());
    const newBalance = parseFloat(editedBalance.trim());

    // Validation - allow 0 as valid
    if (isNaN(newBuyAmount) || newBuyAmount < 0) {
      alert(`Invalid buy amount: "${editedBuyAmount}". Please enter a valid number (0 or greater).`);
      return;
    }
    if (isNaN(newSellAmount) || newSellAmount < 0) {
      alert(`Invalid sell amount: "${editedSellAmount}". Please enter a valid number (0 or greater).`);
      return;
    }
    if (isNaN(newBalance) || newBalance < 0) {
      alert(`Invalid balance: "${editedBalance}". Please enter a valid number (0 or greater).`);
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

        {/* Balance/Journal Column */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="space-y-2">
            <div>
              <div className="text-xs text-gray-700">
                {trade.isComplete ? 'Final Balance' : 'Current Balance'}
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {formatTokenAmount(trade.endBalance)} {trade.token}
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
                        <span key={i} className="text-yellow-400 text-sm">★</span>
                      ))}
                      <span className="text-xs text-gray-600 ml-1">{journalData.sellRating}/10</span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-3 pt-3 border-t border-gray-300">
              <button
                onClick={() => setShowJournalModal(true)}
                className="w-full px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                {journalData ? 'Edit Journal' : 'Journal'}
              </button>
            </div>
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

      {/* Journal Modal */}
      {showJournalModal && (
        <JournalModal
          trade={trade}
          initialData={journalData}
          onSave={(data) => {
            setJournalData(data);
            setShowJournalModal(false);
          }}
          onClose={() => setShowJournalModal(false)}
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

// Journal Modal Component
interface JournalModalProps {
  trade: FlattenedTrade;
  initialData: JournalData | null;
  onSave: (data: JournalData) => void;
  onClose: () => void;
}

function JournalModal({ trade, initialData, onSave, onClose }: JournalModalProps) {
  const [buyCategory, setBuyCategory] = useState(initialData?.buyCategory || '');
  const [buyNotes, setBuyNotes] = useState(initialData?.buyNotes || '');
  const [sellRating, setSellRating] = useState(initialData?.sellRating || 0);
  const [sellMistakes, setSellMistakes] = useState<string[]>(initialData?.sellMistakes || []);
  const [sellNotes, setSellNotes] = useState(initialData?.sellNotes || '');
  const [attachment, setAttachment] = useState<string | undefined>(initialData?.attachment);

  const buyCategories = [
    'Trend Following',
    'Breakout',
    'Dip Buy',
    'News/Event',
    'Technical Setup',
    'Fundamental Analysis',
    'FOMO',
    'Other'
  ];

  const mistakeOptions = [
    'Entered too early',
    'Entered too late',
    'Position size too large',
    'Position size too small',
    'Didn\'t follow plan',
    'Emotional decision',
    'Ignored stop loss',
    'Held too long',
    'Sold too early',
    'Poor risk management',
    'Didn\'t do enough research',
    'Overtraded',
    'Other'
  ];

  const handleSave = () => {
    onSave({
      buyCategory,
      buyNotes,
      sellRating,
      sellMistakes,
      sellNotes,
      attachment
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachment(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(undefined);
  };

  const toggleMistake = (mistake: string) => {
    setSellMistakes(prev =>
      prev.includes(mistake)
        ? prev.filter(m => m !== mistake)
        : [...prev, mistake]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">{trade.token} - Trade Journal</h3>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-3 text-xs text-gray-600">
                <span>Start: {formatTime(trade.startDate)}</span>
                {trade.endDate && (
                  <>
                    <span>•</span>
                    <span>End: {formatTime(trade.endDate)}</span>
                  </>
                )}
                {trade.duration && (
                  <>
                    <span>•</span>
                    <span>Duration: {formatDuration(trade.duration)}</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-green-600 font-medium">
                  Buy MC: {formatMarketCap((trade.totalBuyAmount > 0 ? trade.totalBuyValue / trade.totalBuyAmount : 0) * 1_000_000_000)}
                </span>
                {trade.totalSellAmount > 0 && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-red-600 font-medium">
                      Sell MC: {formatMarketCap((trade.totalSellValue / trade.totalSellAmount) * 1_000_000_000)}
                    </span>
                  </>
                )}
                <span className="text-gray-400">•</span>
                <span className={`font-bold ${trade.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  P/L: {trade.profitLoss >= 0 ? '+' : ''}{formatValue(trade.profitLoss)}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Journal the Buy Section */}
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Journal the Buy</h4>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={buyCategory}
                onChange={(e) => setBuyCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a category...</option>
                {buyCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={buyNotes}
                onChange={(e) => setBuyNotes(e.target.value)}
                placeholder="Why did you enter this trade? What was your thesis?"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Sell Section */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Sell Analysis</h4>

            {/* Star Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rate this trade</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(star => (
                  <button
                    key={star}
                    onClick={() => setSellRating(star)}
                    className={`text-2xl transition-colors ${
                      star <= sellRating ? 'text-yellow-400' : 'text-gray-300'
                    } hover:text-yellow-500`}
                  >
                    ★
                  </button>
                ))}
                {sellRating > 0 && (
                  <span className="ml-2 text-sm text-gray-600 self-center">{sellRating}/10</span>
                )}
              </div>
            </div>

            {/* Mistakes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Mistakes (select all that apply)</label>
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {mistakeOptions.map(mistake => (
                  <label
                    key={mistake}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={sellMistakes.includes(mistake)}
                      onChange={() => toggleMistake(mistake)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{mistake}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sell Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
              <textarea
                value={sellNotes}
                onChange={(e) => setSellNotes(e.target.value)}
                placeholder="What did you learn? What would you do differently?"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Attachment Section */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Attachment</h4>

            {!attachment ? (
              <div>
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">Click to upload image</p>
                      <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                    </div>
                  </label>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={attachment}
                  alt="Trade attachment"
                  className="w-full rounded-lg border border-gray-200"
                />
                <button
                  onClick={removeAttachment}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Remove image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Save Journal
          </button>
        </div>
      </div>
    </div>
  );
}

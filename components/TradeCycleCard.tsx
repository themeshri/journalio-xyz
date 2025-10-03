'use client';

import { useState, useCallback, memo } from 'react';
import { FlattenedTrade } from '@/lib/tradeCycles';
import { formatDuration, formatValue } from '@/lib/formatters';
import TransactionModal from './TransactionModal';
import JournalModal, { JournalData } from './JournalModal';
import TradeCardHeader from './TradeCard/TradeCardHeader';
import TradeEditForm from './TradeCard/TradeEditForm';
import TradeStatsColumn from './TradeCard/TradeStatsColumn';
import TradeBalanceColumn from './TradeCard/TradeBalanceColumn';

interface TradeCycleCardProps {
  trade: FlattenedTrade;
}

const TradeCycleCard = memo(function TradeCycleCard({ trade: initialTrade }: TradeCycleCardProps) {
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

  // Check if there's a mismatch between buy and sell amounts (potential issue)
  const amountDifference = Math.abs(trade.totalBuyAmount - trade.totalSellAmount);
  const hasMismatch = trade.isComplete && amountDifference > 100;

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(() => {
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
  }, [editedBuyAmount, editedSellAmount, editedBalance, trade]);

  const handleReset = useCallback(() => {
    if (confirm('Are you sure you want to reset to original amounts?')) {
      setTrade(initialTrade);
      setEditedBuyAmount(initialTrade.totalBuyAmount.toString());
      setEditedSellAmount(initialTrade.totalSellAmount.toString());
      setEditedBalance(initialTrade.endBalance.toString());
      setHasBeenEdited(false);
    }
  }, [initialTrade]);

  const handleCancel = useCallback(() => {
    // Reset to current values
    setEditedBuyAmount(trade.totalBuyAmount.toString());
    setEditedSellAmount(trade.totalSellAmount.toString());
    setEditedBalance(trade.endBalance.toString());
    setIsEditing(false);
  }, [trade]);

  const handleJournalSave = useCallback((data: JournalData) => {
    setJournalData(data);
    setShowJournalModal(false);
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <TradeCardHeader
          token={trade.token}
          globalTradeNumber={trade.globalTradeNumber}
          isComplete={trade.isComplete}
          hasMismatch={hasMismatch}
          hasBeenEdited={hasBeenEdited}
          onEdit={handleEdit}
          onReset={handleReset}
        />

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div
              className={`text-lg font-bold ${trade.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}
              aria-label={`Profit/Loss: ${trade.profitLoss >= 0 ? '+' : ''}${formatValue(trade.profitLoss)}`}
            >
              {trade.profitLoss >= 0 ? '+' : ''}
              {formatValue(trade.profitLoss)}
            </div>
            {trade.duration && (
              <div className="text-xs text-gray-500" aria-label={`Duration: ${formatDuration(trade.duration)}`}>
                {formatDuration(trade.duration)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Mode */}
      {isEditing && (
        <TradeEditForm
          editedBuyAmount={editedBuyAmount}
          editedSellAmount={editedSellAmount}
          editedBalance={editedBalance}
          onBuyAmountChange={setEditedBuyAmount}
          onSellAmountChange={setEditedSellAmount}
          onBalanceChange={setEditedBalance}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {/* Three-Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Buys Column */}
        <TradeStatsColumn
          type="buy"
          count={trade.buys.length}
          totalAmount={trade.totalBuyAmount}
          totalValue={trade.totalBuyValue}
          avgPrice={avgBuyPrice}
          token={trade.token}
          onClick={() => setShowBuysModal(true)}
        />

        {/* Sells Column */}
        <TradeStatsColumn
          type="sell"
          count={trade.sells.length}
          totalAmount={trade.totalSellAmount}
          totalValue={trade.totalSellValue}
          avgPrice={avgSellPrice}
          token={trade.token}
          onClick={() => setShowSellsModal(true)}
        />

        {/* Balance/Journal Column */}
        <TradeBalanceColumn
          isComplete={trade.isComplete}
          endBalance={trade.endBalance}
          token={trade.token}
          journalData={journalData}
          onJournalClick={() => setShowJournalModal(true)}
        />
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
          onSave={handleJournalSave}
          onClose={() => setShowJournalModal(false)}
        />
      )}
    </div>
  );
});

export default TradeCycleCard;

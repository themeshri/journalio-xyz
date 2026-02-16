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

  const amountDifference = Math.abs(trade.totalBuyAmount - trade.totalSellAmount);
  const hasMismatch = trade.isComplete && amountDifference > 100;

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSave = useCallback(() => {
    const newBuyAmount = parseFloat(editedBuyAmount.trim());
    const newSellAmount = parseFloat(editedSellAmount.trim());
    const newBalance = parseFloat(editedBalance.trim());

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
    <div className="rounded-md border border-border p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <TradeCardHeader
          token={trade.token}
          globalTradeNumber={trade.globalTradeNumber}
          isComplete={trade.isComplete}
          hasMismatch={hasMismatch}
          hasBeenEdited={hasBeenEdited}
          onEdit={handleEdit}
          onReset={handleReset}
        />

        <div className="text-right">
          <div
            className={`font-mono tabular-nums text-base font-semibold ${
              trade.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {trade.profitLoss >= 0 ? '+' : ''}
            {formatValue(trade.profitLoss)}
          </div>
          {trade.duration && (
            <div className="text-xs text-muted-foreground font-mono tabular-nums">
              {formatDuration(trade.duration)}
            </div>
          )}
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <TradeStatsColumn
          type="buy"
          count={trade.buys.length}
          totalAmount={trade.totalBuyAmount}
          totalValue={trade.totalBuyValue}
          avgPrice={avgBuyPrice}
          token={trade.token}
          onClick={() => setShowBuysModal(true)}
        />

        <TradeStatsColumn
          type="sell"
          count={trade.sells.length}
          totalAmount={trade.totalSellAmount}
          totalValue={trade.totalSellValue}
          avgPrice={avgSellPrice}
          token={trade.token}
          onClick={() => setShowSellsModal(true)}
        />

        <TradeBalanceColumn
          isComplete={trade.isComplete}
          endBalance={trade.endBalance}
          token={trade.token}
          journalData={journalData}
          onJournalClick={() => setShowJournalModal(true)}
        />
      </div>

      {/* Modals */}
      {showBuysModal && (
        <TransactionModal
          trades={trade.buys}
          title={`${trade.token} - Buy Transactions (${trade.buys.length})`}
          onClose={() => setShowBuysModal(false)}
        />
      )}

      {showSellsModal && (
        <TransactionModal
          trades={trade.sells}
          title={`${trade.token} - Sell Transactions (${trade.sells.length})`}
          onClose={() => setShowSellsModal(false)}
        />
      )}

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

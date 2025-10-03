'use client';

import { useState } from 'react';
import WalletInput from '@/components/WalletInput';
import TransactionList from '@/components/TransactionList';
import SummaryView from '@/components/SummaryView';
import PaperedPlays from '@/components/PaperedPlays';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { getWalletTrades, Trade } from '@/lib/solana-tracker';

type ViewMode = 'transactions' | 'summary' | 'papered';

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentWallet, setCurrentWallet] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('transactions');

  const handleSearch = async (address: string) => {
    setIsLoading(true);
    setError('');
    setTrades([]);
    setCurrentWallet(address);

    try {
      const fetchedTrades = await getWalletTrades(address, 50);

      // Sort by timestamp (newest first)
      const sortedTrades = fetchedTrades.sort((a, b) => b.timestamp - a.timestamp);

      setTrades(sortedTrades);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Solana Wallet Tracker
          </h1>
          <p className="text-lg text-gray-600">
            Track wallet transactions and token balances on Solana
          </p>
        </div>

        {/* Wallet Input */}
        <WalletInput onSearch={handleSearch} isLoading={isLoading} />

        {/* Current Wallet Display with View Tabs */}
        {currentWallet && (
          <div className="max-w-6xl mx-auto mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-4">
                <span className="font-medium">Viewing transactions for:</span>{' '}
                <span className="font-mono">{currentWallet}</span>
              </p>

              {/* View Mode Tabs */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('transactions')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    viewMode === 'transactions'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  Transactions
                </button>
                <button
                  onClick={() => setViewMode('summary')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    viewMode === 'summary'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setViewMode('papered')}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    viewMode === 'papered'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-blue-800 hover:bg-blue-100'
                  }`}
                >
                  Papered Plays
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && <LoadingSpinner />}

        {/* Error State */}
        {error && <ErrorMessage message={error} />}

        {/* Transaction List or Summary View or Papered Plays */}
        {!isLoading && !error && (
          <>
            {viewMode === 'transactions' && trades.length > 0 && <TransactionList trades={trades} />}
            {viewMode === 'summary' && trades.length > 0 && <SummaryView trades={trades} walletAddress={currentWallet} />}
            {viewMode === 'papered' && <PaperedPlays />}
          </>
        )}

        {/* Empty State (when not loading, no error, but no results) */}
        {!isLoading && !error && currentWallet && trades.length === 0 && viewMode !== 'papered' && (
          <div className="max-w-6xl mx-auto mt-8">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <p className="text-gray-600">No transactions found for this wallet.</p>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!currentWallet && (
          <div className="max-w-3xl mx-auto mt-12">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">How to use:</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Enter a valid Solana wallet address in the input field above</li>
                <li>Click "Search" to fetch the latest transactions</li>
                <li>View detailed transaction information including:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                    <li>Token swap details (from token → to token)</li>
                    <li>Transaction amounts and USD values</li>
                    <li>Timestamp and DEX used</li>
                    <li>Transaction signature with link to Solana Explorer</li>
                  </ul>
                </li>
              </ol>
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Make sure to add your Solana Tracker API key to the{' '}
                  <code className="bg-yellow-100 px-1 py-0.5 rounded">.env.local</code> file.
                  Get your API key from{' '}
                  <a
                    href="https://docs.solanatracker.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-900 underline hover:text-yellow-700"
                  >
                    Solana Tracker Documentation
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

'use client';

import { useState } from 'react';
import WalletInput from '@/components/WalletInput';
import TransactionList from '@/components/TransactionList';
import SummaryView from '@/components/SummaryView';
import PaperedPlays from '@/components/PaperedPlays';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
// Using generic transaction type for flexibility

type ViewMode = 'transactions' | 'summary' | 'papered';

export default function Home() {
  const [trades, setTrades] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentWallet, setCurrentWallet] = useState('');
  const [currentChain, setCurrentChain] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('transactions');
  const [cacheInfo, setCacheInfo] = useState<{ cached: boolean; cachedAt?: Date } | null>(null);

  const handleSearch = async (address: string, chain: string = 'ethereum', forceRefresh = false) => {
    setIsLoading(true);
    setError('');
    setTrades([]);
    setCurrentWallet(address);
    setCurrentChain(chain);
    setCacheInfo(null);

    try {
      // Always use database API endpoint (no auth required)
      const url = `/api/trades?address=${encodeURIComponent(address)}&chain=${encodeURIComponent(chain)}${forceRefresh ? '&refresh=true' : ''}`;
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error('Failed to fetch trades from database');
      }

      const data = await res.json();
      const sortedTrades = data.trades.sort((a: any, b: any) => b.timestamp - a.timestamp);

      setTrades(sortedTrades);
      setCacheInfo({
        cached: data.cached,
        cachedAt: data.cachedAt ? new Date(data.cachedAt) : undefined,
      });
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
            Track Solana wallet swaps and analyze your trading history
          </p>
        </div>

        {/* Wallet Input */}
        <WalletInput onSearch={handleSearch} isLoading={isLoading} />

        {/* Current Wallet Display with View Tabs */}
        {currentWallet && (
          <div className="max-w-6xl mx-auto mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Viewing transactions for:</span>{' '}
                  <span className="font-mono">{currentWallet}</span>
                  {currentChain && (
                    <span className="ml-2 text-xs bg-green-200 px-2 py-1 rounded capitalize">
                      {currentChain}
                    </span>
                  )}
                  {cacheInfo && cacheInfo.cached && (
                    <span className="ml-2 text-xs bg-blue-200 px-2 py-1 rounded">
                      Cached {cacheInfo.cachedAt ? `(${new Date(cacheInfo.cachedAt).toLocaleTimeString()})` : ''}
                    </span>
                  )}
                </p>
                <button
                  onClick={() => handleSearch(currentWallet, currentChain, true)}
                  disabled={isLoading}
                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  title="Refresh from API"
                >
                  🔄 Refresh
                </button>
              </div>

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
                <li>Enter a Solana wallet address</li>
                <li>Click "Search" to fetch the latest swap transactions</li>
                <li>View detailed transaction information including:
                  <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                    <li>Token swaps with buy/sell information</li>
                    <li>Transaction amounts and USD values</li>
                    <li>Timestamp and DEX used</li>
                    <li>Transaction hash with link to Solana explorer</li>
                  </ul>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

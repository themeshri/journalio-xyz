'use client';

import { useState } from 'react';
import { isValidAddress, type Chain } from '@/lib/chains';

function isValidWalletAddress(address: string, chain?: string): boolean {
  if (chain && ['solana', 'base', 'bnb'].includes(chain)) {
    return isValidAddress(address, chain as Chain);
  }
  return (['solana', 'base', 'bnb'] as Chain[]).some(c => isValidAddress(address, c));
}

interface WalletInputProps {
  onSearch: (address: string, chain: string) => void;
  isLoading?: boolean;
}

export default function WalletInput({ onSearch, isLoading }: WalletInputProps) {
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState('solana');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!address.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    if (!isValidWalletAddress(address.trim(), chain)) {
      setError(`Invalid ${chain} wallet address`);
      return;
    }

    onSearch(address.trim(), chain);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="chain" className="block text-sm font-medium text-gray-700 mb-2">
            Blockchain Network
          </label>
          <select
            id="chain"
            value={chain}
            onChange={(e) => {
              setChain(e.target.value);
              setError('');
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            disabled={isLoading}
          >
            <option value="solana">Solana (Moralis Swaps API)</option>
          </select>
        </div>
        <div>
          <label htmlFor="wallet" className="block text-sm font-medium text-gray-700 mb-2">
            Wallet Address
          </label>
          <div className="flex gap-2">
            <input
              id="wallet"
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setError('');
              }}
              placeholder="Enter Solana wallet address (e.g., 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Loading...' : 'Search'}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>
      </form>
    </div>
  );
}

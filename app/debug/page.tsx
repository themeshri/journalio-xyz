'use client';

import { useState } from 'react';
import axios from 'axios';

export default function DebugPage() {
  const [walletAddress, setWalletAddress] = useState('2oubkNmatGszLi7vUPPAGdTQMSVrLdaoXJfu7zHZkbqz');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [error, setError] = useState('');

  const fetchRawData = async () => {
    setError('');
    setApiResponse(null);

    try {
      // Use secure server-side proxy endpoint instead of direct API call
      const response = await axios.get(
        `/api/solana/wallet/${walletAddress}/trades`,
        {
          params: {
            limit: 50,
          },
        }
      );

      setApiResponse(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch');
    }
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">API Debug Page</h1>

        <div className="bg-white rounded-lg p-6 shadow mb-6">
          <label className="block text-sm font-medium mb-2">Wallet Address:</label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />
          <button
            onClick={fetchRawData}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Fetch Raw API Data
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {apiResponse && (
          <div className="bg-white rounded-lg p-6 shadow">
            <h2 className="text-xl font-bold mb-4">Raw API Response:</h2>
            <div className="bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-[600px] font-mono text-sm">
              <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-bold mb-2">Summary:</h3>
              <p>Total trades: {apiResponse.trades?.length || 0}</p>

              {apiResponse.trades && apiResponse.trades.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-bold mb-2">First Trade Structure:</h4>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
                    {JSON.stringify(apiResponse.trades[0], null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

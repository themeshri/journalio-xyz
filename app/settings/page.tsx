'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSettings, saveSettings, resetSettings, isValidSolanaAddress } from '@/lib/settings';

export default function Settings() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [defaultWallet, setDefaultWallet] = useState('');
  const [transactionLimit, setTransactionLimit] = useState('50');
  const [showUSDValues, setShowUSDValues] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [walletError, setWalletError] = useState('');

  // Load settings on mount
  useEffect(() => {
    const settings = getSettings();
    setDisplayName(settings.displayName);
    setEmail(settings.email);
    setDefaultWallet(settings.defaultWallet);
    setTransactionLimit(settings.transactionLimit);
    setShowUSDValues(settings.showUSDValues);
    setDarkMode(settings.darkMode);
  }, []);

  const handleWalletChange = (value: string) => {
    setDefaultWallet(value);
    // Validate wallet address if provided
    if (value && !isValidSolanaAddress(value)) {
      setWalletError('Invalid Solana wallet address format');
    } else {
      setWalletError('');
    }
  };

  const handleSave = () => {
    // Don't save if wallet is invalid
    if (defaultWallet && walletError) {
      return;
    }

    setSaveStatus('saving');

    const settings = {
      displayName,
      email,
      defaultWallet,
      transactionLimit,
      showUSDValues,
      darkMode,
    };

    saveSettings(settings);

    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      resetSettings();
      setDisplayName('');
      setEmail('');
      setDefaultWallet('');
      setTransactionLimit('50');
      setShowUSDValues(true);
      setDarkMode(false);
      setWalletError('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-600 mt-1">Manage your profile and preferences</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Back
          </button>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Profile
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Wallet Preferences */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Wallet Preferences
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="defaultWallet" className="block text-sm font-medium text-gray-700 mb-1">
                  Default Wallet Address
                </label>
                <input
                  type="text"
                  id="defaultWallet"
                  value={defaultWallet}
                  onChange={(e) => handleWalletChange(e.target.value)}
                  placeholder="Enter Solana wallet address"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
                    walletError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {walletError ? (
                  <p className="mt-1 text-xs text-red-600">{walletError}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    This wallet will be automatically loaded when you open the app
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="transactionLimit" className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Fetch Limit
                </label>
                <select
                  id="transactionLimit"
                  value={transactionLimit}
                  onChange={(e) => setTransactionLimit(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="25">25 transactions</option>
                  <option value="50">50 transactions</option>
                  <option value="100">100 transactions</option>
                  <option value="200">200 transactions</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Number of recent transactions to fetch per wallet
                </p>
              </div>
            </div>
          </div>

          {/* Display Preferences */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Display Preferences
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="showUSDValues" className="block text-sm font-medium text-gray-700">
                    Show USD Values
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Display transaction amounts in USD
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUSDValues(!showUSDValues)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    showUSDValues ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showUSDValues ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="darkMode" className="block text-sm font-medium text-gray-700">
                    Dark Mode
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Switch to dark theme (coming soon)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDarkMode(!darkMode)}
                  disabled
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors opacity-50 cursor-not-allowed ${
                    darkMode ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleReset}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Reset to Default
            </button>
            <button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                saveStatus === 'saved'
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && '✓ Saved'}
              {saveStatus === 'idle' && 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

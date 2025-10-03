'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface PaperedPlay {
  id: string;
  coinName: string;
  mcWhenSaw: string;
  ath: string;
  reasonMissed: string;
  createdAt: string;
}

export default function PaperedPlays() {
  const { data: session, status } = useSession();
  const [plays, setPlays] = useState<PaperedPlay[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [coinName, setCoinName] = useState('');
  const [mcWhenSaw, setMcWhenSaw] = useState('');
  const [ath, setAth] = useState('');
  const [reasonMissed, setReasonMissed] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch plays on mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchPlays();
    } else if (status === 'unauthenticated') {
      setIsLoading(false);
    }
  }, [status]);

  const fetchPlays = async () => {
    try {
      const res = await fetch('/api/papered-plays');
      if (res.ok) {
        const data = await res.json();
        setPlays(data);
      }
    } catch (error) {
      console.error('Failed to fetch papered plays:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!coinName.trim() || !mcWhenSaw.trim() || !ath.trim() || !reasonMissed.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch('/api/papered-plays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coinName: coinName.trim(),
          mcWhenSaw: mcWhenSaw.trim(),
          ath: ath.trim(),
          reasonMissed: reasonMissed.trim(),
        }),
      });

      if (res.ok) {
        const newPlay = await res.json();
        setPlays([newPlay, ...plays]);

        // Reset form
        setCoinName('');
        setMcWhenSaw('');
        setAth('');
        setReasonMissed('');
        setShowForm(false);
      } else {
        alert('Failed to save papered play');
      }
    } catch (error) {
      console.error('Error saving papered play:', error);
      alert('Failed to save papered play');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    try {
      const res = await fetch(`/api/papered-plays/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPlays(plays.filter(play => play.id !== id));
      } else {
        alert('Failed to delete entry');
      }
    } catch (error) {
      console.error('Error deleting papered play:', error);
      alert('Failed to delete entry');
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto mt-8">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth prompt if not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="max-w-6xl mx-auto mt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
          <p className="text-blue-800 mb-4">Please sign in to track papered plays</p>
          <a
            href="/auth/signin"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Papered Plays</h2>
          <p className="text-sm text-gray-600 mt-1">Track the trades you missed</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Papered Play'}
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Papered Play</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="coinName" className="block text-sm font-medium text-gray-700 mb-2">Coin Name</label>
                <input
                  id="coinName"
                  type="text"
                  value={coinName}
                  onChange={(e) => setCoinName(e.target.value)}
                  placeholder="e.g., BONK, PEPE"
                  maxLength={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="mcWhenSaw" className="block text-sm font-medium text-gray-700 mb-2">MC When I Saw</label>
                <input
                  id="mcWhenSaw"
                  type="text"
                  value={mcWhenSaw}
                  onChange={(e) => setMcWhenSaw(e.target.value)}
                  placeholder="e.g., $500K, 1M"
                  maxLength={30}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="ath" className="block text-sm font-medium text-gray-700 mb-2">ATH</label>
                <input
                  id="ath"
                  type="text"
                  value={ath}
                  onChange={(e) => setAth(e.target.value)}
                  placeholder="e.g., $50M, 100M"
                  maxLength={30}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reasonMissed" className="block text-sm font-medium text-gray-700 mb-2">Reason Why I Missed</label>
              <textarea
                id="reasonMissed"
                value={reasonMissed}
                onChange={(e) => setReasonMissed(e.target.value)}
                maxLength={500}
                placeholder="Why didn't you ape? What made you hesitate?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Add Entry'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Plays List */}
      {plays.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No papered plays yet. Add one to start tracking missed opportunities!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {plays.map((play) => (
            <div
              key={play.id}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{play.coinName}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(play.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(play.id)}
                  className="text-red-500 hover:text-red-700 transition-colors"
                  title="Delete entry"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-xs text-blue-700 mb-1">MC When I Saw</div>
                  <div className="text-lg font-semibold text-blue-900">{play.mcWhenSaw}</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-xs text-green-700 mb-1">ATH</div>
                  <div className="text-lg font-semibold text-green-900">{play.ath}</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <div className="text-xs text-purple-700 mb-1">Potential Gain</div>
                  <div className="text-lg font-semibold text-purple-900">
                    {calculateGain(play.mcWhenSaw, play.ath)}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-xs text-gray-700 font-medium mb-2">Reason Missed</div>
                <p className="text-sm text-gray-800">{play.reasonMissed}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to calculate potential gain
function calculateGain(mcWhenSaw: string, ath: string): string {
  try {
    const parseValue = (str: string): number => {
      const cleaned = str.replace(/[$,\s]/g, '').toUpperCase();
      if (cleaned.includes('K')) {
        return parseFloat(cleaned.replace('K', '')) * 1000;
      } else if (cleaned.includes('M')) {
        return parseFloat(cleaned.replace('M', '')) * 1000000;
      } else if (cleaned.includes('B')) {
        return parseFloat(cleaned.replace('B', '')) * 1000000000;
      }
      return parseFloat(cleaned);
    };

    const sawValue = parseValue(mcWhenSaw);
    const athValue = parseValue(ath);

    if (isNaN(sawValue) || isNaN(athValue) || sawValue === 0) {
      return '-';
    }

    const multiplier = athValue / sawValue;
    return `${multiplier.toFixed(1)}x`;
  } catch {
    return '-';
  }
}

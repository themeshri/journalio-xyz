import { useState, useEffect, useRef, memo } from 'react';
import { Trade, getWalletTokens, WalletToken } from '@/lib/solana-tracker';
import { calculateTradeCycles, flattenTradeCycles } from '@/lib/tradeCycles';
import TradeCycleCard from './TradeCycleCard';

interface SummaryViewProps {
  trades: Trade[];
  walletAddress: string;
}

// Cache to store wallet balances and avoid rate limiting
const balanceCache = new Map<string, { tokens: WalletToken[], timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute cache

const SummaryView = memo(function SummaryView({ trades, walletAddress }: SummaryViewProps) {
  const [walletTokens, setWalletTokens] = useState<WalletToken[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [balancesFetched, setBalancesFetched] = useState(false);
  const [error, setError] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchWalletBalances = async (signal: AbortSignal) => {
    setLoadingBalances(true);
    setError('');

    try {
      // Check cache first
      const cached = balanceCache.get(walletAddress);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < CACHE_DURATION) {
        console.log('Using cached wallet balances');
        if (!signal.aborted) {
          setWalletTokens(cached.tokens);
          setBalancesFetched(true);
          setLoadingBalances(false);
        }
        return;
      }

      // Check if request was aborted before fetch
      if (signal.aborted) {
        console.log('Request aborted before fetch');
        return;
      }

      // Fetch from API
      console.log('Fetching fresh wallet balances');
      const tokens = await getWalletTokens(walletAddress);

      // Check if request was aborted after fetch
      if (signal.aborted) {
        console.log('Request aborted after fetch, ignoring results');
        return;
      }

      setWalletTokens(tokens);
      setBalancesFetched(true);

      // Store in cache
      balanceCache.set(walletAddress, { tokens, timestamp: now });
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }

      console.error('Failed to fetch wallet balances:', error);

      if (!signal.aborted) {
        setError(error instanceof Error ? error.message : 'Failed to fetch balances');

        // On rate limit error, try to use stale cache if available
        const cached = balanceCache.get(walletAddress);
        if (cached) {
          console.log('Using stale cache due to error');
          setWalletTokens(cached.tokens);
          setBalancesFetched(true);
        }
      }
    } finally {
      if (!signal.aborted) {
        setLoadingBalances(false);
      }
    }
  };

  // Auto-fetch balances 1 second after component mounts
  useEffect(() => {
    // Abort any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(() => {
      fetchWalletBalances(controller.signal);
    }, 1000);

    return () => {
      clearTimeout(timer);
      // Abort on unmount or wallet change
      controller.abort();
    };
  }, [walletAddress]);

  if (trades.length === 0) {
    return (
      <div className="max-w-6xl mx-auto mt-8">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No trade cycles to display.</p>
        </div>
      </div>
    );
  }

  // Calculate trade cycles
  const tradeCycles = calculateTradeCycles(trades);
  let flattenedTrades = flattenTradeCycles(tradeCycles);

  // Update cycle completion based on actual wallet balances
  if (balancesFetched && !loadingBalances) {
    flattenedTrades = flattenedTrades.map(trade => {
      // Find if this token exists in wallet
      const walletToken = walletTokens.find(t => t.address === trade.tokenMint);

      // If token doesn't exist in wallet or balance < 100, mark as complete
      if (!walletToken || walletToken.balance < 100) {
        return {
          ...trade,
          isComplete: true,
          endBalance: walletToken?.balance || 0,
          endDate: trade.endDate || trade.startDate,
          duration: trade.duration || 0,
        };
      }

      // Update with actual balance from wallet
      return {
        ...trade,
        endBalance: walletToken.balance,
      };
    });
  }

  if (flattenedTrades.length === 0) {
    return (
      <div className="max-w-6xl mx-auto mt-8">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">No complete trade cycles found.</p>
        </div>
      </div>
    );
  }

  // Calculate summary statistics
  const totalTrades = flattenedTrades.length;
  const completedTrades = flattenedTrades.filter(t => t.isComplete).length;
  const activeTrades = totalTrades - completedTrades;
  const totalProfitLoss = flattenedTrades.reduce((sum, t) => sum + t.profitLoss, 0);
  const profitableTrades = flattenedTrades.filter(t => t.profitLoss > 0).length;

  return (
    <div className="max-w-6xl mx-auto mt-8">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-600 mb-1">Total Cycles</div>
          <div className="text-2xl font-bold text-gray-900">{totalTrades}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-600 mb-1">Completed</div>
          <div className="text-2xl font-bold text-blue-600">{completedTrades}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-600 mb-1">Active</div>
          <div className="text-2xl font-bold text-yellow-600">{activeTrades}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-600 mb-1">Win Rate</div>
          <div className="text-2xl font-bold text-gray-900">
            {totalTrades > 0 ? ((profitableTrades / totalTrades) * 100).toFixed(0) : 0}%
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs text-gray-600 mb-1">Total P/L</div>
          <div className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalProfitLoss >= 0 ? '+' : ''}${totalProfitLoss.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Trade Cycles Header */}
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Trade Cycles</h2>

      {/* Trade Cycle Cards */}
      <div className="space-y-4">
        {flattenedTrades.map((trade) => (
          <TradeCycleCard key={`${trade.tokenMint}-${trade.tradeNumber}`} trade={trade} />
        ))}
      </div>
    </div>
  );
});

export default SummaryView;

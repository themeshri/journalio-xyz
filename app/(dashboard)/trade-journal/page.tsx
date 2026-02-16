'use client'

import { useState, useEffect, useRef } from 'react'
import { useWallet } from '@/lib/wallet-context'
import { getWalletTokens } from '@/lib/solana-tracker'
import { calculateTradeCycles, flattenTradeCycles } from '@/lib/tradeCycles'
import { formatValue } from '@/lib/formatters'
import TradeCycleCard from '@/components/TradeCycleCard'

const balanceCache = new Map<string, { tokens: any[]; timestamp: number }>()
const CACHE_DURATION = 60000

export default function TradeJournalPage() {
  const { currentWallet, trades, isLoading, error } = useWallet()
  const [walletTokens, setWalletTokens] = useState<any[]>([])
  const [loadingBalances, setLoadingBalances] = useState(false)
  const [balancesFetched, setBalancesFetched] = useState(false)
  const [balanceError, setBalanceError] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!currentWallet || trades.length === 0) return

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    const timer = setTimeout(() => {
      fetchBalances(controller.signal)
    }, 1000)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [currentWallet, trades])

  async function fetchBalances(signal: AbortSignal) {
    setLoadingBalances(true)
    setBalanceError('')
    try {
      const cached = balanceCache.get(currentWallet)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        if (!signal.aborted) {
          setWalletTokens(cached.tokens)
          setBalancesFetched(true)
          setLoadingBalances(false)
        }
        return
      }
      if (signal.aborted) return
      const tokens = await getWalletTokens(currentWallet)
      if (signal.aborted) return
      setWalletTokens(tokens)
      setBalancesFetched(true)
      balanceCache.set(currentWallet, { tokens, timestamp: Date.now() })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      if (!signal.aborted) {
        setBalanceError(
          err instanceof Error ? err.message : 'Failed to fetch balances'
        )
        const cached = balanceCache.get(currentWallet)
        if (cached) {
          setWalletTokens(cached.tokens)
          setBalancesFetched(true)
        }
      }
    } finally {
      if (!signal.aborted) setLoadingBalances(false)
    }
  }

  if (!currentWallet) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Trade Journal</h1>
        <p className="text-sm text-muted-foreground">
          Enter a wallet address in the sidebar to view and journal your trade cycles.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="pt-8">
        <p className="text-sm text-muted-foreground">Loading trades...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pt-8">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  if (trades.length === 0) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Trade Journal</h1>
        <p className="text-sm text-muted-foreground">No trade cycles to display.</p>
      </div>
    )
  }

  const tradeCycles = calculateTradeCycles(trades)
  let flattenedTrades = flattenTradeCycles(tradeCycles)

  if (balancesFetched && !loadingBalances) {
    flattenedTrades = flattenedTrades.map((trade) => {
      const walletToken = walletTokens.find(
        (t) => t.address === trade.tokenMint
      )
      const actualBalance = walletToken?.balance || 0
      const usdValue = walletToken?.valueUSD || 0
      const finalBalance = usdValue < 1 ? 0 : actualBalance

      if (!walletToken || (walletToken.balance || 0) < 100) {
        return {
          ...trade,
          isComplete: true,
          endBalance: finalBalance,
          endDate: trade.endDate || trade.startDate,
          duration: trade.duration || 0,
        }
      }

      return { ...trade, endBalance: finalBalance }
    })
  }

  if (flattenedTrades.length === 0) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Trade Journal</h1>
        <p className="text-sm text-muted-foreground">
          No complete trade cycles found.
        </p>
      </div>
    )
  }

  const totalTrades = flattenedTrades.length
  const completedTrades = flattenedTrades.filter((t) => t.isComplete).length
  const activeTrades = totalTrades - completedTrades
  const totalProfitLoss = flattenedTrades.reduce(
    (sum, t) => sum + t.profitLoss,
    0
  )
  const profitableTrades = flattenedTrades.filter(
    (t) => t.profitLoss > 0
  ).length

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Trade Journal</h1>

      <div className="flex flex-wrap gap-x-10 gap-y-2 mb-8 text-sm">
        <div>
          <span className="text-muted-foreground">Total Cycles</span>
          <span className="ml-2 font-mono tabular-nums font-semibold">
            {totalTrades}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Completed</span>
          <span className="ml-2 font-mono tabular-nums font-semibold">
            {completedTrades}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Active</span>
          <span className="ml-2 font-mono tabular-nums font-semibold">
            {activeTrades}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Win Rate</span>
          <span className="ml-2 font-mono tabular-nums font-semibold">
            {totalTrades > 0
              ? ((profitableTrades / totalTrades) * 100).toFixed(0)
              : 0}
            %
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Total P/L</span>
          <span
            className={`ml-2 font-mono tabular-nums font-semibold ${
              totalProfitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {totalProfitLoss >= 0 ? '+' : ''}
            {formatValue(totalProfitLoss)}
          </span>
        </div>
      </div>

      {balanceError && (
        <p className="text-xs text-destructive mb-4">{balanceError}</p>
      )}

      <h2 className="text-sm font-semibold mb-4">Trade Cycles</h2>
      <div className="space-y-4">
        {flattenedTrades.map((trade) => (
          <TradeCycleCard
            key={`${trade.tokenMint}-${trade.tradeNumber}`}
            trade={trade}
          />
        ))}
      </div>
    </div>
  )
}

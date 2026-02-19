'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useWallet } from '@/lib/wallet-context'
import { getWalletTokens } from '@/lib/solana-tracker'
import { calculateTradeCycles, flattenTradeCycles, FlattenedTrade } from '@/lib/tradeCycles'
import { formatValue, formatDuration, formatPrice, formatPercentage } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import TransactionModal from '@/components/TransactionModal'
import JournalModal, { JournalData } from '@/components/JournalModal'
import { StatStripSkeleton, TableRowsSkeleton } from '@/components/skeletons'
import { toast } from 'sonner'

const balanceCache = new Map<string, { tokens: any[]; timestamp: number }>()
const CACHE_DURATION = 60000

type StatusFilter = 'all' | 'completed' | 'active'
type JournalFilter = 'all' | 'journaled' | 'not-journaled'
type SortOption = 'recent' | 'pl-high' | 'pl-low' | 'duration'

function jKey(wallet: string, tokenMint: string, tradeNumber: number) {
  return `journalio_journal_${wallet}_${tokenMint}_${tradeNumber}`
}

function loadAllJournals(wallet: string, trades: FlattenedTrade[]): Record<string, JournalData> {
  if (typeof window === 'undefined') return {}
  const map: Record<string, JournalData> = {}
  for (const t of trades) {
    try {
      const raw = localStorage.getItem(jKey(wallet, t.tokenMint, t.tradeNumber))
      if (raw) map[`${t.tokenMint}-${t.tradeNumber}`] = JSON.parse(raw)
    } catch { /* ignore */ }
  }
  return map
}

function relativeTime(timestamp: number): string {
  const now = Date.now() / 1000
  const diff = now - timestamp
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}D ago`
  const d = new Date(timestamp * 1000)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function truncateAddress(addr: string) {
  if (addr.length <= 10) return addr
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`
}

export default function TradeJournalPage() {
  const { currentWallet, currentChain, trades, isLoading, error } = useWallet()
  const [walletTokens, setWalletTokens] = useState<any[]>([])
  const [loadingBalances, setLoadingBalances] = useState(false)
  const [balancesFetched, setBalancesFetched] = useState(false)
  const [balanceError, setBalanceError] = useState('')
  const abortControllerRef = useRef<AbortController | null>(null)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [journalFilter, setJournalFilter] = useState<JournalFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('recent')

  // Modal state
  const [buysModalTrade, setBuysModalTrade] = useState<FlattenedTrade | null>(null)
  const [sellsModalTrade, setSellsModalTrade] = useState<FlattenedTrade | null>(null)
  const [journalModalTrade, setJournalModalTrade] = useState<FlattenedTrade | null>(null)

  // Journal data from localStorage
  const [journalMap, setJournalMap] = useState<Record<string, JournalData>>({})

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

  const flattenedTrades = useMemo(() => {
    if (trades.length === 0) return []
    const tradeCycles = calculateTradeCycles(trades, currentChain)
    let flattened = flattenTradeCycles(tradeCycles)

    if (balancesFetched && !loadingBalances) {
      flattened = flattened.map((trade) => {
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

    return flattened
  }, [trades, balancesFetched, loadingBalances, walletTokens])

  // Load journals when trades change
  useEffect(() => {
    if (currentWallet && flattenedTrades.length > 0) {
      setJournalMap(loadAllJournals(currentWallet, flattenedTrades))
    }
  }, [currentWallet, flattenedTrades])

  const getJournal = useCallback((trade: FlattenedTrade) => {
    return journalMap[`${trade.tokenMint}-${trade.tradeNumber}`] || null
  }, [journalMap])

  const handleJournalSave = useCallback((data: JournalData) => {
    if (!journalModalTrade) return
    const key = `${journalModalTrade.tokenMint}-${journalModalTrade.tradeNumber}`
    localStorage.setItem(
      jKey(currentWallet, journalModalTrade.tokenMint, journalModalTrade.tradeNumber),
      JSON.stringify(data)
    )
    setJournalMap((prev) => ({ ...prev, [key]: data }))
    setJournalModalTrade(null)
  }, [journalModalTrade, currentWallet])

  const handleJournalSaveAndNext = useCallback((data: JournalData) => {
    if (!journalModalTrade) return
    const key = `${journalModalTrade.tokenMint}-${journalModalTrade.tradeNumber}`
    localStorage.setItem(
      jKey(currentWallet, journalModalTrade.tokenMint, journalModalTrade.tradeNumber),
      JSON.stringify(data)
    )
    const updatedMap = { ...journalMap, [key]: data }
    setJournalMap(updatedMap)

    // Find next un-journaled trade
    const currentIdx = flattenedTrades.indexOf(journalModalTrade)
    const nextTrade = flattenedTrades.find(
      (t, i) => i > currentIdx && !updatedMap[`${t.tokenMint}-${t.tradeNumber}`]
    )

    if (nextTrade) {
      setJournalModalTrade(nextTrade)
    } else {
      setJournalModalTrade(null)
      toast.success('All trades journaled!')
    }
  }, [journalModalTrade, currentWallet, journalMap, flattenedTrades])

  // Apply filters and sorting
  const displayTrades = useMemo(() => {
    let result = [...flattenedTrades]

    if (statusFilter === 'completed') {
      result = result.filter((t) => t.isComplete)
    } else if (statusFilter === 'active') {
      result = result.filter((t) => !t.isComplete)
    }

    if (journalFilter === 'journaled') {
      result = result.filter((t) => getJournal(t) !== null)
    } else if (journalFilter === 'not-journaled') {
      result = result.filter((t) => getJournal(t) === null)
    }

    switch (sortOption) {
      case 'pl-high':
        result.sort((a, b) => b.profitLoss - a.profitLoss)
        break
      case 'pl-low':
        result.sort((a, b) => a.profitLoss - b.profitLoss)
        break
      case 'duration':
        result.sort((a, b) => (b.duration || 0) - (a.duration || 0))
        break
      case 'recent':
      default:
        break
    }

    return result
  }, [flattenedTrades, statusFilter, journalFilter, sortOption, getJournal])

  // Stats
  const totalTrades = flattenedTrades.length
  const completedTrades = flattenedTrades.filter((t) => t.isComplete).length
  const activeTrades = totalTrades - completedTrades
  const totalProfitLoss = flattenedTrades.reduce((sum, t) => sum + t.profitLoss, 0)
  const profitableTrades = flattenedTrades.filter((t) => t.profitLoss > 0).length
  const journaledCount = Object.keys(journalMap).length

  if (!currentWallet) {
    return (
      <div className="max-w-xl pt-8">
        <h1 className="text-xl font-semibold mb-2">Trade Journal</h1>
        <p className="text-sm text-muted-foreground">
          Go to Wallet Management to add a wallet and start journaling.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="pt-8">
        <h1 className="text-xl font-semibold mb-6">Trade Journal</h1>
        <StatStripSkeleton count={6} />
        <TableRowsSkeleton rows={5} cols={8} />
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

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Trade Journal</h1>

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-10 gap-y-2 mb-6 text-sm">
        <div>
          <span className="text-muted-foreground">Total</span>
          <span className="ml-2 font-mono tabular-nums font-semibold">{totalTrades}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Completed</span>
          <span className="ml-2 font-mono tabular-nums font-semibold">{completedTrades}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Active</span>
          <span className="ml-2 font-mono tabular-nums font-semibold">{activeTrades}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Win Rate</span>
          <span className="ml-2 font-mono tabular-nums font-semibold">
            {totalTrades > 0 ? ((profitableTrades / totalTrades) * 100).toFixed(0) : 0}%
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">P/L</span>
          <span
            className={`ml-2 font-mono tabular-nums font-semibold ${
              totalProfitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {totalProfitLoss >= 0 ? '+' : ''}{formatValue(totalProfitLoss)}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Journaled</span>
          <span className="ml-2 font-mono tabular-nums font-semibold">
            {journaledCount}/{totalTrades}
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground mr-1">Status:</span>
          {(['all', 'completed', 'active'] as StatusFilter[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setStatusFilter(opt)}
              className={`px-2 py-1 rounded transition-colors ${
                statusFilter === opt
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt === 'all' ? 'All' : opt === 'completed' ? 'Completed' : 'Active'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground mr-1">Journal:</span>
          {(['all', 'journaled', 'not-journaled'] as JournalFilter[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setJournalFilter(opt)}
              className={`px-2 py-1 rounded transition-colors ${
                journalFilter === opt
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt === 'all' ? 'All' : opt === 'journaled' ? 'Journaled' : 'Not Journaled'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground mr-1">Sort:</span>
          {([
            ['recent', 'Recent'],
            ['pl-high', 'P/L \u2191'],
            ['pl-low', 'P/L \u2193'],
            ['duration', 'Duration'],
          ] as [SortOption, string][]).map(([opt, label]) => (
            <button
              key={opt}
              onClick={() => setSortOption(opt)}
              className={`px-2 py-1 rounded transition-colors ${
                sortOption === opt
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {balanceError && (
        <p className="text-xs text-destructive mb-4">{balanceError}</p>
      )}

      {/* Table */}
      {displayTrades.length === 0 ? (
        <p className="text-sm text-muted-foreground">No trades match your filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Token</TableHead>
                <TableHead className="text-right min-w-[100px]">PnL</TableHead>
                <TableHead className="text-right min-w-[80px]">Balance</TableHead>
                <TableHead className="text-right min-w-[70px]">Duration</TableHead>
                <TableHead className="text-right min-w-[100px]">Bought</TableHead>
                <TableHead className="text-right min-w-[100px]">Sold</TableHead>
                <TableHead className="text-center min-w-[80px]">Buys/Sells</TableHead>
                <TableHead className="text-center min-w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayTrades.map((trade) => {
                const avgBuyPrice = trade.totalBuyAmount > 0 ? trade.totalBuyValue / trade.totalBuyAmount : 0
                const avgSellPrice = trade.totalSellAmount > 0 ? trade.totalSellValue / trade.totalSellAmount : 0
                const plPercent = trade.totalBuyValue > 0 ? (trade.profitLoss / trade.totalBuyValue) * 100 : 0
                const journal = getJournal(trade)
                const tokenLogo = trade.buys[0]?.tokenOut?.logoURI || trade.sells[0]?.tokenIn?.logoURI || null

                return (
                  <TableRow key={`${trade.tokenMint}-${trade.tradeNumber}`}>
                    {/* Token */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {tokenLogo ? (
                          <img
                            src={tokenLogo}
                            alt={trade.token}
                            className="w-7 h-7 rounded-full shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-muted shrink-0 flex items-center justify-center text-xs font-medium text-muted-foreground">
                            {trade.token.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-sm">{trade.token}</div>
                          <div className="text-xs text-muted-foreground">
                            {relativeTime(trade.startDate)} | {truncateAddress(trade.tokenMint)}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* PnL */}
                    <TableCell className="text-right">
                      <div
                        className={`font-mono tabular-nums text-sm font-medium ${
                          trade.profitLoss >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {trade.profitLoss >= 0 ? '+' : ''}{formatValue(trade.profitLoss)}
                      </div>
                      <div
                        className={`font-mono tabular-nums text-xs ${
                          plPercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {formatPercentage(plPercent)}
                      </div>
                    </TableCell>

                    {/* Balance */}
                    <TableCell className="text-right">
                      {trade.isComplete ? (
                        <span className="text-xs text-muted-foreground">Sold all</span>
                      ) : (
                        <div className="font-mono tabular-nums text-sm">
                          {trade.endBalance > 0
                            ? trade.endBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })
                            : '0'}
                        </div>
                      )}
                    </TableCell>

                    {/* Duration */}
                    <TableCell className="text-right font-mono tabular-nums text-xs text-muted-foreground">
                      {trade.duration ? formatDuration(trade.duration) : '-'}
                    </TableCell>

                    {/* Bought */}
                    <TableCell className="text-right">
                      <div className="font-mono tabular-nums text-sm">
                        {formatValue(trade.totalBuyValue)}
                      </div>
                      <div className="font-mono tabular-nums text-xs text-muted-foreground">
                        {formatPrice(avgBuyPrice)}
                      </div>
                    </TableCell>

                    {/* Sold */}
                    <TableCell className="text-right">
                      <div className="font-mono tabular-nums text-sm">
                        {formatValue(trade.totalSellValue)}
                      </div>
                      <div className="font-mono tabular-nums text-xs text-muted-foreground">
                        {avgSellPrice > 0 ? formatPrice(avgSellPrice) : '-'}
                      </div>
                    </TableCell>

                    {/* Buys/Sells */}
                    <TableCell className="text-center">
                      <span className="font-mono tabular-nums text-sm">
                        <button
                          className="text-emerald-600 hover:underline underline-offset-2"
                          onClick={() => setBuysModalTrade(trade)}
                        >
                          {trade.buys.length}
                        </button>
                        <span className="text-muted-foreground mx-1">|</span>
                        <button
                          className="text-red-600 hover:underline underline-offset-2"
                          onClick={() => setSellsModalTrade(trade)}
                        >
                          {trade.sells.length}
                        </button>
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-center">
                      <Button
                        variant={journal ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setJournalModalTrade(trade)}
                      >
                        Journal
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modals */}
      {buysModalTrade && (
        <TransactionModal
          trades={buysModalTrade.buys}
          title={`${buysModalTrade.token} - Buy Transactions (${buysModalTrade.buys.length})`}
          onClose={() => setBuysModalTrade(null)}
        />
      )}
      {sellsModalTrade && (
        <TransactionModal
          trades={sellsModalTrade.sells}
          title={`${sellsModalTrade.token} - Sell Transactions (${sellsModalTrade.sells.length})`}
          onClose={() => setSellsModalTrade(null)}
        />
      )}
      {journalModalTrade && (() => {
        const hasNextUnjournaled = flattenedTrades.some(
          (t) => t !== journalModalTrade && !journalMap[`${t.tokenMint}-${t.tradeNumber}`]
        )
        return (
          <JournalModal
            key={`${journalModalTrade.tokenMint}-${journalModalTrade.tradeNumber}`}
            trade={journalModalTrade}
            initialData={getJournal(journalModalTrade)}
            tokenLogo={journalModalTrade.buys[0]?.tokenOut?.logoURI || journalModalTrade.sells[0]?.tokenIn?.logoURI || null}
            onSave={handleJournalSave}
            onSaveAndNext={hasNextUnjournaled ? handleJournalSaveAndNext : undefined}
            onClose={() => setJournalModalTrade(null)}
          />
        )
      })()}
    </div>
  )
}

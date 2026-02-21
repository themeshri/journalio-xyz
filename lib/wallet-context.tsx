'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { type Chain } from './chains'
import { type FlattenedTrade } from './tradeCycles'
import { loadTradeComments, type TradeComment } from './trade-comments'
import { loadStrategies, type Strategy } from './strategies'
import { computeJournalingStreak, type StreakResult } from './streaks'
import { getWalletTokens } from './solana-tracker'

interface CacheInfo {
  cached: boolean
  cachedAt?: Date
}

import { APP_FEE_RATES } from './constants'

export type WalletKey = string // "chain:address"

export function makeWalletKey(address: string, chain: Chain): WalletKey {
  return `${chain}:${address}`
}

export interface SavedWallet {
  address: string
  chain: Chain
  nickname: string
  dex: string
}

export interface WalletSlot {
  address: string
  chain: Chain
  dex: string
  nickname: string
  trades: any[]
  flattenedTrades: FlattenedTrade[]
  isLoading: boolean
  error: string
  isStale: boolean
  cacheInfo: CacheInfo | null
}

interface WalletContextValue {
  // Multi-wallet data
  walletSlots: Record<WalletKey, WalletSlot>

  // Aggregated convenience values
  allTrades: any[]
  flattenedTrades: FlattenedTrade[]
  activeWallets: SavedWallet[]
  isAnyLoading: boolean
  isAnyStale: boolean
  hasActiveWallets: boolean

  // Shared localStorage state (loaded once, updated on storage events)
  tradeComments: TradeComment[]
  strategies: Strategy[]
  journalMap: Record<string, any>
  streak: StreakResult

  // Shared balance data (cached in provider)
  walletTokens: Map<string, any[]>
  loadingBalances: boolean
  balancesFetched: boolean
  balanceError: string

  // Actions
  setWalletActive: (address: string, chain: Chain, active: boolean) => void
  refreshWallet: (address: string, chain: Chain) => Promise<void>
  refreshAll: () => Promise<void>
  updateJournalEntry: (key: string, storageKey: string, data: any) => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}

/** Build query string params for analytics API endpoints from active wallets */
export function buildWalletQueryParams(wallets: SavedWallet[]): string {
  if (wallets.length === 0) return ''
  const addresses = wallets.map((w) => w.address).join(',')
  const chains = wallets.map((w) => w.chain).join(',')
  const dexes = wallets.map((w) => w.dex).join(',')
  return `addresses=${encodeURIComponent(addresses)}&chains=${encodeURIComponent(chains)}&dexes=${encodeURIComponent(dexes)}`
}

const SAVED_WALLETS_KEY = 'journalio_saved_wallets'
const ACTIVE_WALLETS_KEY = 'journalio_active_wallets'

function loadSavedWallets(): SavedWallet[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SAVED_WALLETS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function loadActiveWalletKeys(): { address: string; chain: Chain }[] | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(ACTIVE_WALLETS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveActiveWalletKeys(keys: { address: string; chain: Chain }[]) {
  localStorage.setItem(ACTIVE_WALLETS_KEY, JSON.stringify(keys))
}

async function fetchTradesForWallet(
  address: string,
  chain: Chain,
  dex: string,
  forceRefresh: boolean = false
): Promise<{ trades: any[]; flattenedTrades?: FlattenedTrade[]; cached: boolean; cachedAt?: string; stale?: boolean }> {
  const url = `/api/trades?address=${encodeURIComponent(address)}&chain=${chain}&cycles=true&dex=${encodeURIComponent(dex)}${forceRefresh ? '&refresh=true' : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch trades')
  return res.json()
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletSlots, setWalletSlots] = useState<Record<WalletKey, WalletSlot>>({})
  const [activeWallets, setActiveWallets] = useState<SavedWallet[]>([])
  const [initialized, setInitialized] = useState(false)

  // Initialize on mount: load saved/active wallets and fetch trades
  useEffect(() => {
    const saved = loadSavedWallets()
    const activeKeys = loadActiveWalletKeys()

    // If no active wallets key exists, default to all saved wallets
    let active: SavedWallet[]
    if (activeKeys === null) {
      active = saved
    } else {
      active = saved.filter((w) =>
        activeKeys.some((k) => k.address === w.address && k.chain === w.chain)
      )
    }

    setActiveWallets(active)
    setInitialized(true)

    // Fetch trades for all active wallets in parallel
    Promise.all(
      active.map(w => fetchAndSetTrades(w.address, w.chain, w.dex, w.nickname, false))
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Listen for changes to saved wallets (e.g. from wallet management page)
  useEffect(() => {
    if (!initialized) return

    function onStorage(e: StorageEvent) {
      if (e.key === SAVED_WALLETS_KEY) {
        // Saved wallets changed — re-sync active wallets
        const saved = loadSavedWallets()
        setActiveWallets((prev) => {
          // Keep only active wallets that still exist in saved
          const filtered = prev.filter((a) =>
            saved.some((s) => s.address === a.address && s.chain === a.chain)
          )
          // Update nickname/dex from saved
          const updated = filtered.map((a) => {
            const match = saved.find((s) => s.address === a.address && s.chain === a.chain)
            return match ? { ...a, nickname: match.nickname, dex: match.dex } : a
          })
          saveActiveWalletKeys(updated.map((w) => ({ address: w.address, chain: w.chain })))
          return updated
        })
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [initialized])

  const fetchAndSetTrades = useCallback(
    async (address: string, chain: Chain, dex: string, nickname: string, forceRefresh: boolean) => {
      const key = makeWalletKey(address, chain)

      // Set loading state
      setWalletSlots((prev) => ({
        ...prev,
        [key]: {
          address,
          chain,
          dex,
          nickname,
          trades: prev[key]?.trades || [],
          flattenedTrades: prev[key]?.flattenedTrades || [],
          isLoading: true,
          error: '',
          isStale: prev[key]?.isStale || false,
          cacheInfo: prev[key]?.cacheInfo || null,
        },
      }))

      try {
        const data = await fetchTradesForWallet(address, chain, dex, forceRefresh)
        const sortedTrades = data.trades.sort(
          (a: any, b: any) => b.timestamp - a.timestamp
        )

        // Apply app fee deduction (for raw trades display)
        const feeRate = APP_FEE_RATES[dex] || 0
        const adjustedTrades = feeRate > 0
          ? sortedTrades.map((t: any) => ({
              ...t,
              valueUSD: t.valueUSD * (1 - feeRate),
              _chain: chain,
              _walletAddress: address,
            }))
          : sortedTrades.map((t: any) => ({
              ...t,
              _chain: chain,
              _walletAddress: address,
            }))

        setWalletSlots((prev) => ({
          ...prev,
          [key]: {
            address,
            chain,
            dex,
            nickname,
            trades: adjustedTrades,
            flattenedTrades: data.flattenedTrades || [],
            isLoading: false,
            error: '',
            isStale: !!data.stale,
            cacheInfo: {
              cached: data.cached,
              cachedAt: data.cachedAt ? new Date(data.cachedAt) : undefined,
            },
          },
        }))
      } catch (err) {
        setWalletSlots((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            address,
            chain,
            dex,
            nickname,
            flattenedTrades: prev[key]?.flattenedTrades || [],
            isLoading: false,
            isStale: prev[key]?.isStale || false,
            error: err instanceof Error ? err.message : 'An unexpected error occurred',
          },
        }))
      }
    },
    []
  )

  const setWalletActive = useCallback(
    (address: string, chain: Chain, active: boolean) => {
      setActiveWallets((prev) => {
        let next: SavedWallet[]
        if (active) {
          // Add if not already active
          if (prev.some((w) => w.address === address && w.chain === chain)) {
            return prev
          }
          const saved = loadSavedWallets()
          const wallet = saved.find((w) => w.address === address && w.chain === chain)
          if (!wallet) return prev
          next = [...prev, wallet]

          // Fetch trades for newly activated wallet
          fetchAndSetTrades(wallet.address, wallet.chain, wallet.dex, wallet.nickname, false)
        } else {
          // Remove
          next = prev.filter((w) => !(w.address === address && w.chain === chain))
          // Clean up slot
          const key = makeWalletKey(address, chain)
          setWalletSlots((prev) => {
            const { [key]: _, ...rest } = prev
            return rest
          })
        }
        saveActiveWalletKeys(next.map((w) => ({ address: w.address, chain: w.chain })))
        return next
      })
    },
    [fetchAndSetTrades]
  )

  const refreshWallet = useCallback(
    async (address: string, chain: Chain) => {
      const wallet = activeWallets.find((w) => w.address === address && w.chain === chain)
      if (!wallet) return
      await fetchAndSetTrades(address, chain, wallet.dex, wallet.nickname, true)
    },
    [activeWallets, fetchAndSetTrades]
  )

  const refreshAll = useCallback(async () => {
    await Promise.all(
      activeWallets.map((w) =>
        fetchAndSetTrades(w.address, w.chain, w.dex, w.nickname, true)
      )
    )
  }, [activeWallets, fetchAndSetTrades])

  // Merge all active wallets' trades, sorted by timestamp desc
  const allTrades = useMemo(() => {
    const merged: any[] = []
    for (const w of activeWallets) {
      const key = makeWalletKey(w.address, w.chain)
      const slot = walletSlots[key]
      if (slot?.trades) {
        merged.push(...slot.trades)
      }
    }
    return merged.sort((a, b) => b.timestamp - a.timestamp)
  }, [activeWallets, walletSlots])

  const flattenedTrades = useMemo(() => {
    const allFlattened = activeWallets.flatMap((w) => {
      const key = makeWalletKey(w.address, w.chain)
      const slot = walletSlots[key]
      return slot?.flattenedTrades || []
    })
    return allFlattened.sort((a, b) => b.startDate - a.startDate)
  }, [activeWallets, walletSlots])

  const isAnyLoading = useMemo(() => {
    return activeWallets.some((w) => {
      const key = makeWalletKey(w.address, w.chain)
      return walletSlots[key]?.isLoading
    })
  }, [activeWallets, walletSlots])

  const isAnyStale = useMemo(() => {
    return activeWallets.some((w) => {
      const key = makeWalletKey(w.address, w.chain)
      return walletSlots[key]?.isStale
    })
  }, [activeWallets, walletSlots])

  const hasActiveWallets = activeWallets.length > 0

  // ─── Shared localStorage state ───────────────────────────────────────
  const [tradeComments, setTradeComments] = useState<TradeComment[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [journalMap, setJournalMap] = useState<Record<string, any>>({})
  const [streak, setStreak] = useState<StreakResult>({ current: 0, longest: 0 })

  // Load shared localStorage state once on mount
  useEffect(() => {
    setTradeComments(loadTradeComments())
    setStrategies(loadStrategies())
    setStreak(computeJournalingStreak())
  }, [])

  // Rebuild journalMap when flattenedTrades change
  useEffect(() => {
    if (flattenedTrades.length === 0) {
      setJournalMap({})
      return
    }
    const map: Record<string, any> = {}
    for (const t of flattenedTrades) {
      try {
        const raw = localStorage.getItem(`journalio_journal_${t.walletAddress}_${t.tokenMint}_${t.tradeNumber}`)
        if (raw) map[`${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`] = JSON.parse(raw)
      } catch { /* ignore */ }
    }
    setJournalMap(map)
  }, [flattenedTrades])

  // Listen for storage events to keep shared state in sync
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'journalio_trade_comments') {
        setTradeComments(loadTradeComments())
      }
      if (e.key === 'journalio_strategies') {
        setStrategies(loadStrategies())
      }
      if (e.key?.startsWith('journalio_journal_')) {
        // Rebuild the journal map
        const map: Record<string, any> = {}
        for (const t of flattenedTrades) {
          try {
            const raw = localStorage.getItem(`journalio_journal_${t.walletAddress}_${t.tokenMint}_${t.tradeNumber}`)
            if (raw) map[`${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`] = JSON.parse(raw)
          } catch { /* ignore */ }
        }
        setJournalMap(map)
        setStreak(computeJournalingStreak())
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [flattenedTrades])

  // Imperative update for same-tab journal saves (StorageEvent only fires cross-tab)
  const updateJournalEntry = useCallback((key: string, storageKey: string, data: any) => {
    setJournalMap((prev) => ({ ...prev, [key]: data }))
    setStreak(computeJournalingStreak())
  }, [])

  // ─── Shared balance data ─────────────────────────────────────────────
  const [walletTokens, setWalletTokens] = useState<Map<string, any[]>>(new Map())
  const [loadingBalances, setLoadingBalances] = useState(false)
  const [balancesFetched, setBalancesFetched] = useState(false)
  const [balanceError, setBalanceError] = useState('')
  const balanceCacheRef = useRef<Map<string, { tokens: any[]; timestamp: number }>>(new Map())
  const balanceAbortRef = useRef<AbortController | null>(null)
  const BALANCE_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  useEffect(() => {
    if (!hasActiveWallets || allTrades.length === 0) return

    if (balanceAbortRef.current) {
      balanceAbortRef.current.abort()
    }

    const controller = new AbortController()
    balanceAbortRef.current = controller

    fetchBalances(controller.signal)

    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveWallets, allTrades.length, activeWallets])

  async function fetchBalances(signal: AbortSignal) {
    setLoadingBalances(true)
    setBalanceError('')
    try {
      const results = new Map<string, any[]>()

      for (let i = 0; i < activeWallets.length; i++) {
        const w = activeWallets[i]
        if (signal.aborted) return

        if (i > 0) await new Promise((r) => setTimeout(r, 200))

        const cacheKey = `${w.chain}:${w.address}`
        const cached = balanceCacheRef.current.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < BALANCE_CACHE_DURATION) {
          results.set(cacheKey, cached.tokens)
          continue
        }

        try {
          const tokens = await getWalletTokens(w.address)
          if (signal.aborted) return
          results.set(cacheKey, tokens)
          balanceCacheRef.current.set(cacheKey, { tokens, timestamp: Date.now() })
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return
        }
      }

      if (!signal.aborted) {
        setWalletTokens(results)
        setBalancesFetched(true)
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      if (!signal.aborted) {
        setBalanceError(err instanceof Error ? err.message : 'Failed to fetch balances')
      }
    } finally {
      if (!signal.aborted) setLoadingBalances(false)
    }
  }

  return (
    <WalletContext.Provider
      value={{
        walletSlots,
        allTrades,
        flattenedTrades,
        activeWallets,
        isAnyLoading,
        isAnyStale,
        hasActiveWallets,
        tradeComments,
        strategies,
        journalMap,
        streak,
        walletTokens,
        loadingBalances,
        balancesFetched,
        balanceError,
        setWalletActive,
        refreshWallet,
        refreshAll,
        updateJournalEntry,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

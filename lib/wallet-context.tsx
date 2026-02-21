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
import { loadJournals, type JournalRecord } from './journals'
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

  // Shared state (loaded from API)
  tradeComments: TradeComment[]
  strategies: Strategy[]
  journalMap: Record<string, any>
  streak: { current: number; longest: number }

  // Shared balance data (cached in provider)
  walletTokens: Map<string, any[]>
  loadingBalances: boolean
  balancesFetched: boolean
  balanceError: string

  // Actions
  setWalletActive: (address: string, chain: Chain, active: boolean) => void
  refreshWallet: (address: string, chain: Chain) => Promise<void>
  refreshAll: () => Promise<void>
  updateJournalEntry: (key: string, data: any) => void
  reloadStrategies: () => Promise<void>
  reloadTradeComments: () => Promise<void>
  reloadJournals: () => Promise<void>
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

/** Build journal map from API data, keyed by "tokenMint-tradeNumber-walletAddress" */
function buildJournalMap(journals: JournalRecord[]): Record<string, any> {
  const map: Record<string, any> = {}
  for (const j of journals) {
    const key = `${j.tokenMint}-${j.tradeNumber}-${j.walletAddress}`
    map[key] = j
  }
  return map
}

/** Compute streak from journal entries' journaledAt dates */
function computeStreakFromJournals(journals: JournalRecord[]): { current: number; longest: number } {
  const dates = new Set<string>()
  for (const j of journals) {
    if (j.journaledAt) {
      dates.add(j.journaledAt.slice(0, 10))
    }
  }
  if (dates.size === 0) return { current: 0, longest: 0 }

  const sortedDates = [...dates].sort().reverse()
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  let current = 0
  let checkDate = ''
  if (sortedDates[0] === today) checkDate = today
  else if (sortedDates[0] === yesterday) checkDate = yesterday

  if (checkDate) {
    const dateSet = new Set(sortedDates)
    const d = new Date(checkDate + 'T00:00:00')
    let day = d
    while (dateSet.has(day.toISOString().slice(0, 10))) {
      current++
      day = new Date(day.getTime() - 86400000)
    }
  }

  const allDatesAsc = [...dates].sort()
  let longest = 0
  let streak = 1
  for (let i = 1; i < allDatesAsc.length; i++) {
    const prev = new Date(allDatesAsc[i - 1] + 'T00:00:00')
    const curr = new Date(allDatesAsc[i] + 'T00:00:00')
    if ((curr.getTime() - prev.getTime()) / 86400000 === 1) {
      streak++
    } else {
      longest = Math.max(longest, streak)
      streak = 1
    }
  }
  longest = Math.max(longest, streak, current)

  return { current, longest }
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

  // ─── Shared API state ───────────────────────────────────────────
  const [tradeComments, setTradeComments] = useState<TradeComment[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [journalMap, setJournalMap] = useState<Record<string, any>>({})
  const [streak, setStreak] = useState<{ current: number; longest: number }>({ current: 0, longest: 0 })
  const journalsRef = useRef<JournalRecord[]>([])

  // Load shared data from API on mount
  useEffect(() => {
    loadTradeComments().then(setTradeComments)
    loadStrategies(true).then(setStrategies)
  }, [])

  // Fetch journals when active wallets change
  useEffect(() => {
    if (activeWallets.length === 0) {
      setJournalMap({})
      setStreak({ current: 0, longest: 0 })
      journalsRef.current = []
      return
    }

    // Fetch journals for all active wallets
    Promise.all(
      activeWallets.map((w) => loadJournals(w.address))
    ).then((results) => {
      const all = results.flat()
      journalsRef.current = all
      setJournalMap(buildJournalMap(all))
      setStreak(computeStreakFromJournals(all))
    })
  }, [activeWallets])

  // Imperative update for same-tab journal saves
  const updateJournalEntry = useCallback((key: string, data: any) => {
    setJournalMap((prev) => ({ ...prev, [key]: data }))
    // Update streak optimistically
    if (data?.journaledAt) {
      const updated = [...journalsRef.current]
      // Add or update the entry
      const existing = updated.findIndex(
        (j) => `${j.tokenMint}-${j.tradeNumber}-${j.walletAddress}` === key
      )
      if (existing >= 0) {
        updated[existing] = { ...updated[existing], ...data }
      } else {
        updated.push(data)
      }
      journalsRef.current = updated
      setStreak(computeStreakFromJournals(updated))
    }
  }, [])

  const reloadStrategies = useCallback(async () => {
    const strats = await loadStrategies(true)
    setStrategies(strats)
  }, [])

  const reloadTradeComments = useCallback(async () => {
    const comments = await loadTradeComments()
    setTradeComments(comments)
  }, [])

  const reloadJournals = useCallback(async () => {
    if (activeWallets.length === 0) return
    const results = await Promise.all(
      activeWallets.map((w) => loadJournals(w.address))
    )
    const all = results.flat()
    journalsRef.current = all
    setJournalMap(buildJournalMap(all))
    setStreak(computeStreakFromJournals(all))
  }, [activeWallets])

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

  const contextValue = useMemo<WalletContextValue>(() => ({
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
    reloadStrategies,
    reloadTradeComments,
    reloadJournals,
  }), [
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
    reloadStrategies,
    reloadTradeComments,
    reloadJournals,
  ])

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}

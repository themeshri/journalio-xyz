'use client'

import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { type Chain } from '../chains'
import { type FlattenedTrade } from '../tradeCycles'
import { loadTradeComments, type TradeComment } from '../trade-comments'
import { loadStrategies, type Strategy } from '../strategies'
import { loadJournals, type JournalRecord } from '../journals'
import { getWalletTokens } from '../solana-tracker'
import { APP_FEE_RATES } from '../constants'

import {
  WalletIdentityContext,
  type SavedWallet,
  type WalletKey,
  makeWalletKey,
} from './wallet-context'
import { TradeContext, type WalletSlot } from './trade-context'
import { MetadataContext } from './metadata-context'
import { BalanceContext } from './balance-context'

// Re-export everything consumers need
export { useWalletIdentity, buildWalletQueryParams, makeWalletKey } from './wallet-context'
export type { SavedWallet, WalletKey } from './wallet-context'
export { useTrades } from './trade-context'
export type { WalletSlot } from './trade-context'
export { useMetadata } from './metadata-context'
export { useBalances } from './balance-context'

// ─── Helpers ────────────────────────────────────────────────────

const ACTIVE_WALLETS_KEY = 'journalio_active_wallets'

async function fetchSavedWalletsFromAPI(): Promise<SavedWallet[]> {
  try {
    const res = await fetch('/api/wallets')
    if (!res.ok) return []
    const data = await res.json()
    return data.map((w: any) => ({
      address: w.address,
      chain: w.chain as Chain,
      nickname: w.nickname || '',
      dex: w.dex || 'other',
    }))
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

function buildJournalMap(journals: JournalRecord[]): Record<string, any> {
  const map: Record<string, any> = {}
  for (const j of journals) {
    const key = `${j.tokenMint}-${j.tradeNumber}-${j.walletAddress}`
    map[key] = j
  }
  return map
}

function computeStreakFromJournals(journals: JournalRecord[]): { current: number; longest: number } {
  const dates = new Set<string>()
  for (const j of journals) {
    if (j.journaledAt) dates.add(j.journaledAt.slice(0, 10))
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
    let day = new Date(checkDate + 'T00:00:00')
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

// ─── DashboardProviders ─────────────────────────────────────────

export function DashboardProviders({ children }: { children: ReactNode }) {
  // ─── Wallet Identity ──────────────────────────────────
  const [savedWallets, setSavedWallets] = useState<SavedWallet[]>([])
  const [activeWallets, setActiveWallets] = useState<SavedWallet[]>([])
  const [initialized, setInitialized] = useState(false)

  // ─── Trades ───────────────────────────────────────────
  const [walletSlots, setWalletSlots] = useState<Record<WalletKey, WalletSlot>>({})

  // ─── Metadata ─────────────────────────────────────────
  const [tradeComments, setTradeComments] = useState<TradeComment[]>([])
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [journalMap, setJournalMap] = useState<Record<string, any>>({})
  const [streak, setStreak] = useState<{ current: number; longest: number }>({ current: 0, longest: 0 })
  const journalsRef = useRef<JournalRecord[]>([])

  // ─── Balances ─────────────────────────────────────────
  const [walletTokens, setWalletTokens] = useState<Map<string, any[]>>(new Map())
  const [loadingBalances, setLoadingBalances] = useState(false)
  const [balancesFetched, setBalancesFetched] = useState(false)
  const [balanceError, setBalanceError] = useState('')
  const balanceCacheRef = useRef<Map<string, { tokens: any[]; timestamp: number }>>(new Map())
  const balanceAbortRef = useRef<AbortController | null>(null)
  const BALANCE_CACHE_DURATION = 5 * 60 * 1000

  // ─── Reload callbacks ─────────────────────────────────

  const reloadWallets = useCallback(async () => {
    const wallets = await fetchSavedWalletsFromAPI()
    setSavedWallets(wallets)
    setActiveWallets((prev) => {
      const filtered = prev.filter((a) =>
        wallets.some((s) => s.address === a.address && s.chain === a.chain)
      )
      const updated = filtered.map((a) => {
        const match = wallets.find((s) => s.address === a.address && s.chain === a.chain)
        return match ? { ...a, nickname: match.nickname, dex: match.dex } : a
      })
      saveActiveWalletKeys(updated.map((w) => ({ address: w.address, chain: w.chain })))
      return updated
    })
  }, [])

  const fetchAndSetTrades = useCallback(
    async (address: string, chain: Chain, dex: string, nickname: string, forceRefresh: boolean) => {
      const key = makeWalletKey(address, chain)

      setWalletSlots((prev) => ({
        ...prev,
        [key]: {
          address, chain, dex, nickname,
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
        const sortedTrades = data.trades.sort((a: any, b: any) => b.timestamp - a.timestamp)

        const feeRate = APP_FEE_RATES[dex] || 0
        const adjustedTrades = sortedTrades.map((t: any) => ({
          ...t,
          valueUSD: feeRate > 0 ? t.valueUSD * (1 - feeRate) : t.valueUSD,
          _chain: chain,
          _walletAddress: address,
        }))

        setWalletSlots((prev) => ({
          ...prev,
          [key]: {
            address, chain, dex, nickname,
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
            address, chain, dex, nickname,
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

  // ─── Init ─────────────────────────────────────────────

  useEffect(() => {
    async function init() {
      const saved = await fetchSavedWalletsFromAPI()
      setSavedWallets(saved)
      const activeKeys = loadActiveWalletKeys()

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

      if (active.length === 0) return

      try {
        const addresses = active.map((w) => w.address).join(',')
        const chains = active.map((w) => w.chain).join(',')
        const dexes = active.map((w) => w.dex).join(',')
        const dashRes = await fetch(
          `/api/dashboard?addresses=${encodeURIComponent(addresses)}&chains=${encodeURIComponent(chains)}&dexes=${encodeURIComponent(dexes)}`
        )

        if (dashRes.ok) {
          const data = await dashRes.json()

          // Hydrate wallet slots
          const newSlots: Record<WalletKey, WalletSlot> = {}
          for (const w of active) {
            const key = makeWalletKey(w.address, w.chain)
            const walletData = data.walletTrades[key]
            if (walletData) {
              const feeRate = APP_FEE_RATES[w.dex] || 0
              const trades = (walletData.trades || []).map((t: any) => ({
                ...t,
                valueUSD: feeRate > 0 ? t.valueUSD * (1 - feeRate) : t.valueUSD,
                _chain: w.chain,
                _walletAddress: w.address,
              }))
              newSlots[key] = {
                address: w.address, chain: w.chain, dex: w.dex, nickname: w.nickname,
                trades: trades.sort((a: any, b: any) => b.timestamp - a.timestamp),
                flattenedTrades: walletData.flattenedTrades || [],
                isLoading: false, error: '', isStale: false,
                cacheInfo: { cached: walletData.cached, cachedAt: walletData.cachedAt ? new Date(walletData.cachedAt) : undefined },
              }
            } else {
              newSlots[key] = {
                address: w.address, chain: w.chain, dex: w.dex, nickname: w.nickname,
                trades: [], flattenedTrades: [],
                isLoading: false, error: '', isStale: false, cacheInfo: null,
              }
            }
          }
          setWalletSlots(newSlots)

          // Hydrate metadata
          if (data.tradeComments) setTradeComments(data.tradeComments)
          if (data.strategies) setStrategies(data.strategies)
          if (data.journals) {
            journalsRef.current = data.journals
            setJournalMap(buildJournalMap(data.journals))
          }
          if (data.streak) setStreak(data.streak)

          // Trigger external fetch for wallets with no cached trades
          for (const w of active) {
            const key = makeWalletKey(w.address, w.chain)
            const walletData = data.walletTrades[key]
            if (!walletData || (walletData.trades || []).length === 0) {
              fetchAndSetTrades(w.address, w.chain, w.dex, w.nickname, true)
            }
          }
        } else {
          Promise.all(active.map(w => fetchAndSetTrades(w.address, w.chain, w.dex, w.nickname, false)))
        }
      } catch {
        Promise.all(active.map(w => fetchAndSetTrades(w.address, w.chain, w.dex, w.nickname, false)))
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Wallet active toggle ─────────────────────────────

  const setWalletActive = useCallback(
    (address: string, chain: Chain, active: boolean) => {
      setActiveWallets((prev) => {
        let next: SavedWallet[]
        if (active) {
          if (prev.some((w) => w.address === address && w.chain === chain)) return prev
          const wallet = savedWallets.find((w) => w.address === address && w.chain === chain)
          if (!wallet) return prev
          next = [...prev, wallet]
          fetchAndSetTrades(wallet.address, wallet.chain, wallet.dex, wallet.nickname, false)
        } else {
          next = prev.filter((w) => !(w.address === address && w.chain === chain))
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
    [fetchAndSetTrades, savedWallets]
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
      activeWallets.map((w) => fetchAndSetTrades(w.address, w.chain, w.dex, w.nickname, true))
    )
  }, [activeWallets, fetchAndSetTrades])

  // ─── Derived trade values ─────────────────────────────

  const allTrades = useMemo(() => {
    const merged: any[] = []
    for (const w of activeWallets) {
      const key = makeWalletKey(w.address, w.chain)
      const slot = walletSlots[key]
      if (slot?.trades) merged.push(...slot.trades)
    }
    return merged.sort((a, b) => b.timestamp - a.timestamp)
  }, [activeWallets, walletSlots])

  const flattenedTrades = useMemo(() => {
    return activeWallets
      .flatMap((w) => walletSlots[makeWalletKey(w.address, w.chain)]?.flattenedTrades || [])
      .sort((a, b) => b.startDate - a.startDate)
  }, [activeWallets, walletSlots])

  const isAnyLoading = useMemo(() => {
    return activeWallets.some((w) => walletSlots[makeWalletKey(w.address, w.chain)]?.isLoading)
  }, [activeWallets, walletSlots])

  const isAnyStale = useMemo(() => {
    return activeWallets.some((w) => walletSlots[makeWalletKey(w.address, w.chain)]?.isStale)
  }, [activeWallets, walletSlots])

  const hasActiveWallets = activeWallets.length > 0

  // ─── Metadata callbacks ───────────────────────────────

  const updateJournalEntry = useCallback((key: string, data: any) => {
    setJournalMap((prev) => ({ ...prev, [key]: data }))
    if (data?.journaledAt) {
      const updated = [...journalsRef.current]
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
    const results = await Promise.all(activeWallets.map((w) => loadJournals(w.address)))
    const all = results.flat()
    journalsRef.current = all
    setJournalMap(buildJournalMap(all))
    setStreak(computeStreakFromJournals(all))
  }, [activeWallets])

  // ─── Balance fetching ─────────────────────────────────

  useEffect(() => {
    if (!hasActiveWallets || allTrades.length === 0) return

    if (balanceAbortRef.current) balanceAbortRef.current.abort()

    const controller = new AbortController()
    balanceAbortRef.current = controller

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

    fetchBalances(controller.signal)
    return () => { controller.abort() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveWallets, allTrades.length, activeWallets])

  // ─── Context values (memoized separately) ─────────────

  const walletIdentityValue = useMemo(() => ({
    savedWallets,
    activeWallets,
    hasActiveWallets,
    setWalletActive,
    reloadWallets,
  }), [savedWallets, activeWallets, hasActiveWallets, setWalletActive, reloadWallets])

  const tradeValue = useMemo(() => ({
    walletSlots,
    allTrades,
    flattenedTrades,
    isAnyLoading,
    isAnyStale,
    refreshWallet,
    refreshAll,
  }), [walletSlots, allTrades, flattenedTrades, isAnyLoading, isAnyStale, refreshWallet, refreshAll])

  const metadataValue = useMemo(() => ({
    tradeComments,
    strategies,
    journalMap,
    streak,
    updateJournalEntry,
    reloadStrategies,
    reloadTradeComments,
    reloadJournals,
  }), [tradeComments, strategies, journalMap, streak, updateJournalEntry, reloadStrategies, reloadTradeComments, reloadJournals])

  const balanceValue = useMemo(() => ({
    walletTokens,
    loadingBalances,
    balancesFetched,
    balanceError,
  }), [walletTokens, loadingBalances, balancesFetched, balanceError])

  return (
    <WalletIdentityContext.Provider value={walletIdentityValue}>
      <TradeContext.Provider value={tradeValue}>
        <MetadataContext.Provider value={metadataValue}>
          <BalanceContext.Provider value={balanceValue}>
            {children}
          </BalanceContext.Provider>
        </MetadataContext.Provider>
      </TradeContext.Provider>
    </WalletIdentityContext.Provider>
  )
}

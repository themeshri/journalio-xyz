'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { type Chain } from './chains'
import { calculateTradeCycles, flattenTradeCycles, type FlattenedTrade } from './tradeCycles'

interface CacheInfo {
  cached: boolean
  cachedAt?: Date
}

// Known app fee rates (deducted from valueUSD)
const APP_FEE_RATES: Record<string, number> = {
  fomo: 0.01, // 1% fee
}

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
  isLoading: boolean
  error: string
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
  hasActiveWallets: boolean

  // Actions
  setWalletActive: (address: string, chain: Chain, active: boolean) => void
  refreshWallet: (address: string, chain: Chain) => Promise<void>
  refreshAll: () => Promise<void>
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
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
  forceRefresh: boolean = false
): Promise<{ trades: any[]; cached: boolean; cachedAt?: string }> {
  const url = `/api/trades?address=${encodeURIComponent(address)}&chain=${chain}${forceRefresh ? '&refresh=true' : ''}`
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
    for (const w of active) {
      fetchAndSetTrades(w.address, w.chain, w.dex, w.nickname, false)
    }
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
          isLoading: true,
          error: '',
          cacheInfo: prev[key]?.cacheInfo || null,
        },
      }))

      try {
        const data = await fetchTradesForWallet(address, chain, forceRefresh)
        const sortedTrades = data.trades.sort(
          (a: any, b: any) => b.timestamp - a.timestamp
        )

        // Apply app fee deduction
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
            isLoading: false,
            error: '',
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
            isLoading: false,
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
      if (!slot?.trades?.length) return []
      const cycles = calculateTradeCycles(slot.trades, w.chain, w.address)
      return flattenTradeCycles(cycles)
    })
    return allFlattened.sort((a, b) => b.startDate - a.startDate)
  }, [activeWallets, walletSlots])

  const isAnyLoading = useMemo(() => {
    return activeWallets.some((w) => {
      const key = makeWalletKey(w.address, w.chain)
      return walletSlots[key]?.isLoading
    })
  }, [activeWallets, walletSlots])

  const hasActiveWallets = activeWallets.length > 0

  return (
    <WalletContext.Provider
      value={{
        walletSlots,
        allTrades,
        flattenedTrades,
        activeWallets,
        isAnyLoading,
        hasActiveWallets,
        setWalletActive,
        refreshWallet,
        refreshAll,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

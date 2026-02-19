'use client'

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { type Chain } from './chains'

interface CacheInfo {
  cached: boolean
  cachedAt?: Date
}

// Known app fee rates (deducted from valueUSD)
const APP_FEE_RATES: Record<string, number> = {
  fomo: 0.01, // 1% fee
}

interface WalletContextValue {
  currentWallet: string
  currentChain: Chain
  currentDex: string
  trades: any[]
  isLoading: boolean
  error: string
  cacheInfo: CacheInfo | null
  searchWallet: (address: string, chain?: Chain, forceRefresh?: boolean, dex?: string) => Promise<void>
  clearWallet: () => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [currentWallet, setCurrentWallet] = useState('')
  const [currentChain, setCurrentChain] = useState<Chain>('solana')
  const [currentDex, setCurrentDex] = useState('other')
  const [trades, setTrades] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const searchWallet = useCallback(
    async (address: string, chain: Chain = 'solana', forceRefresh = false, dex: string = 'other') => {
      setIsLoading(true)
      setError('')
      setTrades([])
      setCurrentWallet(address)
      setCurrentChain(chain)
      setCurrentDex(dex)
      setCacheInfo(null)

      // Sync to URL
      const params = new URLSearchParams(searchParams.toString())
      params.set('wallet', address)
      params.set('chain', chain)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })

      try {
        const url = `/api/trades?address=${encodeURIComponent(address)}&chain=${chain}${forceRefresh ? '&refresh=true' : ''}`
        const res = await fetch(url)

        if (!res.ok) {
          throw new Error('Failed to fetch trades')
        }

        const data = await res.json()
        const sortedTrades = data.trades.sort(
          (a: any, b: any) => b.timestamp - a.timestamp
        )

        // Apply app fee deduction (e.g. Fomo 1% fee)
        const feeRate = APP_FEE_RATES[dex] || 0
        const adjustedTrades = feeRate > 0
          ? sortedTrades.map((t: any) => ({ ...t, valueUSD: t.valueUSD * (1 - feeRate) }))
          : sortedTrades

        setTrades(adjustedTrades)
        setCacheInfo({
          cached: data.cached,
          cachedAt: data.cachedAt ? new Date(data.cachedAt) : undefined,
        })
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An unexpected error occurred'
        )
      } finally {
        setIsLoading(false)
      }
    },
    [searchParams, router, pathname]
  )

  const clearWallet = useCallback(() => {
    setCurrentWallet('')
    setCurrentChain('solana')
    setCurrentDex('other')
    setTrades([])
    setError('')
    setCacheInfo(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('wallet')
    params.delete('chain')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  // Read wallet + chain from URL on mount, restore dex from saved wallets
  useEffect(() => {
    const walletParam = searchParams.get('wallet')
    const chainParam = (searchParams.get('chain') || 'solana') as Chain
    if (walletParam && !currentWallet) {
      let dex = 'other'
      try {
        const raw = localStorage.getItem('journalio_saved_wallets')
        const saved = raw ? JSON.parse(raw) : []
        const match = saved.find((w: any) => w.address === walletParam && w.chain === chainParam)
        if (match?.dex) dex = match.dex
      } catch {}
      searchWallet(walletParam, chainParam, false, dex)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <WalletContext.Provider
      value={{
        currentWallet,
        currentChain,
        currentDex,
        trades,
        isLoading,
        error,
        cacheInfo,
        searchWallet,
        clearWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

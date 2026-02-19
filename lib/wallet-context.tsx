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

interface WalletContextValue {
  currentWallet: string
  currentChain: Chain
  trades: any[]
  isLoading: boolean
  error: string
  cacheInfo: CacheInfo | null
  searchWallet: (address: string, chain?: Chain, forceRefresh?: boolean) => Promise<void>
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
  const [trades, setTrades] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const searchWallet = useCallback(
    async (address: string, chain: Chain = 'solana', forceRefresh = false) => {
      setIsLoading(true)
      setError('')
      setTrades([])
      setCurrentWallet(address)
      setCurrentChain(chain)
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

        setTrades(sortedTrades)
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
    setTrades([])
    setError('')
    setCacheInfo(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('wallet')
    params.delete('chain')
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  // Read wallet + chain from URL on mount
  useEffect(() => {
    const walletParam = searchParams.get('wallet')
    const chainParam = (searchParams.get('chain') || 'solana') as Chain
    if (walletParam && !currentWallet) {
      searchWallet(walletParam, chainParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <WalletContext.Provider
      value={{
        currentWallet,
        currentChain,
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

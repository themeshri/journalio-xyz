'use client'

import { createContext, useContext } from 'react'
import { type Chain } from '../chains'
import { type FlattenedTrade } from '../tradeCycles'
import { type WalletKey } from './wallet-context'

interface CacheInfo {
  cached: boolean
  cachedAt?: Date
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

export interface TradeContextValue {
  walletSlots: Record<WalletKey, WalletSlot>
  allTrades: any[]
  flattenedTrades: FlattenedTrade[]
  isAnyLoading: boolean
  isAnyStale: boolean
  refreshWallet: (address: string, chain: Chain) => Promise<void>
  refreshAll: () => Promise<void>
}

export const TradeContext = createContext<TradeContextValue | null>(null)

export function useTrades() {
  const ctx = useContext(TradeContext)
  if (!ctx) throw new Error('useTrades must be used within DashboardProviders')
  return ctx
}

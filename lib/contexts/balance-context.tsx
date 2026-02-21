'use client'

import { createContext, useContext } from 'react'

export interface BalanceContextValue {
  walletTokens: Map<string, any[]>
  loadingBalances: boolean
  balancesFetched: boolean
  balanceError: string
}

export const BalanceContext = createContext<BalanceContextValue | null>(null)

export function useBalances() {
  const ctx = useContext(BalanceContext)
  if (!ctx) throw new Error('useBalances must be used within DashboardProviders')
  return ctx
}

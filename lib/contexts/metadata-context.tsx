'use client'

import { createContext, useContext } from 'react'
import { type TradeComment } from '../trade-comments'
import { type Strategy } from '../strategies'

export interface MetadataContextValue {
  tradeComments: TradeComment[]
  strategies: Strategy[]
  journalMap: Record<string, any>
  streak: { current: number; longest: number }
  updateJournalEntry: (key: string, data: any) => void
  reloadStrategies: () => Promise<void>
  reloadTradeComments: () => Promise<void>
  reloadJournals: () => Promise<void>
}

export const MetadataContext = createContext<MetadataContextValue | null>(null)

export function useMetadata() {
  const ctx = useContext(MetadataContext)
  if (!ctx) throw new Error('useMetadata must be used within DashboardProviders')
  return ctx
}

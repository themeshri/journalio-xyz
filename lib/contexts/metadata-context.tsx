'use client'

import { createContext, useContext } from 'react'
import { type TradeComment } from '../trade-comments'
import { type Strategy } from '../strategies'
import { type MissedTradeEntry } from '../analytics'
import { type TimePreset, type TimeRange } from '../time-filters'

export interface MetadataContextValue {
  tradeComments: TradeComment[]
  strategies: Strategy[]
  journalMap: Record<string, any>
  streak: { current: number; longest: number }
  preSessionDone: boolean
  missedTrades: MissedTradeEntry[]
  updateJournalEntry: (key: string, data: any) => void
  reloadStrategies: () => Promise<void>
  reloadTradeComments: () => Promise<void>
  reloadJournals: () => Promise<void>
  reloadPreSessionStatus: () => Promise<void>
  reloadMissedTrades: () => Promise<void>
  timeRange: TimeRange
  timePreset: TimePreset
  setTimeFilter: (range: TimeRange, preset: TimePreset) => void
}

export const MetadataContext = createContext<MetadataContextValue | null>(null)

export function useMetadata() {
  const ctx = useContext(MetadataContext)
  if (!ctx) throw new Error('useMetadata must be used within DashboardProviders')
  return ctx
}

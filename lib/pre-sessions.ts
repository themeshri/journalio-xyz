// Pre-session types and async API helpers

import type { NarrativeStage, WatchlistItem } from './session-framework'

export interface MarketSnapshot {
  btcPrice: number | null
  ethPrice: number | null
  solPrice: number | null
  bnbPrice: number | null
  fearGreedIndex: number | null
  onchainVolume24h: number | null
}

export interface PreSessionData {
  id?: string
  energyLevel: number
  emotionalState: string
  sessionIntent: string
  maxTrades: string
  maxLoss: string
  timeLimit: string
  defaultPositionSize: string
  hasOpenPositions: boolean | null
  marketSentiment: string
  solTrend: string
  majorNews: boolean | null
  majorNewsNote: string
  normalVolume: boolean | null
  rulesChecked: string[]
  date: string
  time: string
  savedAt: string
  marketSnapshot: MarketSnapshot
  // ── Framework fields (see lib/session-framework.ts) ──
  /** Market-wide narrative lifecycle read for the day. */
  narrativeStage: NarrativeStage | ''
  narrativeNotes: string
  /** 1-10; 0 = unset. */
  conviction: number
  setupsWorking: string
  planAdherenceIntent: string
  watchlist: WatchlistItem[]
  sectors: string[]
  communities: string[]
}

export const defaultMarketSnapshot: MarketSnapshot = {
  btcPrice: null,
  ethPrice: null,
  solPrice: null,
  bnbPrice: null,
  fearGreedIndex: null,
  onchainVolume24h: null,
}

export const defaultPreSessionData: PreSessionData = {
  energyLevel: 0,
  emotionalState: '',
  sessionIntent: '',
  maxTrades: '',
  maxLoss: '',
  timeLimit: '',
  defaultPositionSize: '',
  hasOpenPositions: null,
  marketSentiment: '',
  solTrend: '',
  majorNews: null,
  majorNewsNote: '',
  normalVolume: null,
  rulesChecked: [],
  date: '',
  time: '',
  savedAt: '',
  marketSnapshot: defaultMarketSnapshot,
  narrativeStage: '',
  narrativeNotes: '',
  conviction: 0,
  setupsWorking: '',
  planAdherenceIntent: '',
  watchlist: [],
  sectors: [],
  communities: [],
}

export async function loadPreSessions(from?: string, to?: string): Promise<PreSessionData[]> {
  try {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const query = params.toString()
    const res = await fetch(`/api/pre-sessions${query ? `?${query}` : ''}`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function loadPreSession(date: string): Promise<PreSessionData | null> {
  try {
    const res = await fetch(`/api/pre-sessions/${date}`)
    if (!res.ok) return null
    const data = await res.json()
    return data // null if not found
  } catch {
    return null
  }
}

export async function savePreSession(data: PreSessionData): Promise<PreSessionData | null> {
  try {
    const res = await fetch('/api/pre-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

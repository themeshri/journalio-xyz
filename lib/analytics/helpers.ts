import type { FlattenedTrade, TradingSession, WhatIfStats } from './types'

export const HOUR_LABELS = [
  '12am','1am','2am','3am','4am','5am','6am','7am','8am','9am','10am','11am',
  '12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm','9pm','10pm','11pm',
]

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function computeStats(trades: FlattenedTrade[]): WhatIfStats {
  const total = trades.length
  if (total === 0) return { totalTrades: 0, totalPnL: 0, winRate: 0, profitFactor: 0, avgPnL: 0 }
  const totalPnL = trades.reduce((s, t) => s + t.profitLoss, 0)
  const wins = trades.filter((t) => t.profitLoss > 0)
  const losses = trades.filter((t) => t.profitLoss < 0)
  const grossProfit = wins.reduce((s, t) => s + t.profitLoss, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profitLoss, 0))
  return {
    totalTrades: total,
    totalPnL: Math.round(totalPnL * 100) / 100,
    winRate: Math.round((wins.length / total) * 100),
    profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? 999.99 : 0,
    avgPnL: Math.round((totalPnL / total) * 100) / 100,
  }
}

export function isHourInSession(hour: number, session: TradingSession): boolean {
  if (session.startHour < session.endHour) {
    return hour >= session.startHour && hour < session.endHour
  }
  // Wraps midnight
  return hour >= session.startHour || hour < session.endHour
}

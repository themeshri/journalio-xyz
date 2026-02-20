import type {
  FlattenedTrade,
  MissedTradeEntry,
  MissReasonBreakdown,
  MissedTradeAnalytics,
  HesitationCostAnalysis,
} from './types'

export function computeMissedTradeStats(missedTrades: MissedTradeEntry[]): MissedTradeAnalytics {
  const totalMissed = missedTrades.length
  const totalMissedPnL = missedTrades.reduce((s, t) => s + (t.potentialPnL || 0), 0)
  const withMultiplier = missedTrades.filter((t) => t.potentialMultiplier != null)
  const avgMultiplier = withMultiplier.length > 0
    ? withMultiplier.reduce((s, t) => s + t.potentialMultiplier!, 0) / withMultiplier.length
    : 0
  const winCount = missedTrades.filter((t) => t.outcome === 'win').length

  // Reason breakdown
  const reasonMap = new Map<string, MissReasonBreakdown>()
  for (const t of missedTrades) {
    const reason = t.missReason || 'unknown'
    const entry = reasonMap.get(reason) || { reason, count: 0, totalMissedPnL: 0, avgMultiplier: 0, winCount: 0 }
    entry.count++
    entry.totalMissedPnL += t.potentialPnL || 0
    if (t.outcome === 'win') entry.winCount++
    reasonMap.set(reason, entry)
  }
  // Fill avgMultiplier per reason
  for (const [reason, entry] of reasonMap) {
    const reasonTrades = missedTrades.filter((t) => (t.missReason || 'unknown') === reason && t.potentialMultiplier != null)
    entry.avgMultiplier = reasonTrades.length > 0
      ? reasonTrades.reduce((s, t) => s + t.potentialMultiplier!, 0) / reasonTrades.length
      : 0
    reasonMap.set(reason, entry)
  }

  // Strategy breakdown
  const stratMap = new Map<string, { count: number; totalPnL: number }>()
  for (const t of missedTrades) {
    if (!t.strategyId) continue
    const entry = stratMap.get(t.strategyId) || { count: 0, totalPnL: 0 }
    entry.count++
    entry.totalPnL += t.potentialPnL || 0
    stratMap.set(t.strategyId, entry)
  }

  // Monthly trend
  const monthMap = new Map<string, { count: number; missedPnL: number }>()
  for (const t of missedTrades) {
    const d = new Date(t.createdAt)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const entry = monthMap.get(key) || { count: 0, missedPnL: 0 }
    entry.count++
    entry.missedPnL += t.potentialPnL || 0
    monthMap.set(key, entry)
  }

  return {
    totalMissed,
    totalMissedPnL: Math.round(totalMissedPnL * 100) / 100,
    avgMultiplier: Math.round(avgMultiplier * 100) / 100,
    winCount,
    reasonBreakdown: [...reasonMap.values()].sort((a, b) => b.count - a.count),
    strategyBreakdown: [...stratMap.entries()].map(([strategyId, d]) => ({
      strategyId,
      count: d.count,
      totalPnL: Math.round(d.totalPnL * 100) / 100,
    })),
    monthlyTrend: [...monthMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, d]) => ({ month, count: d.count, missedPnL: Math.round(d.missedPnL * 100) / 100 })),
  }
}

export function computeHesitationCost(
  missedTrades: MissedTradeEntry[],
  actualTrades: FlattenedTrade[]
): HesitationCostAnalysis {
  const totalActualPnL = actualTrades.reduce((s, t) => s + t.profitLoss, 0)
  const totalMissedPnL = missedTrades.reduce((s, t) => s + (t.potentialPnL || 0), 0)
  const actualWins = actualTrades.filter((t) => t.profitLoss > 0).length
  const missedWins = missedTrades.filter((t) => t.outcome === 'win').length

  return {
    totalActualPnL: Math.round(totalActualPnL * 100) / 100,
    totalMissedPnL: Math.round(totalMissedPnL * 100) / 100,
    hesitationCost: Math.round(totalMissedPnL * 100) / 100,
    missedWinRate: missedTrades.length > 0 ? Math.round((missedWins / missedTrades.length) * 100) : 0,
    actualWinRate: actualTrades.length > 0 ? Math.round((actualWins / actualTrades.length) * 100) : 0,
    missedPerActual: actualTrades.length > 0 ? Math.round((missedTrades.length / actualTrades.length) * 100) / 100 : 0,
  }
}

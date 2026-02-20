import type {
  FlattenedTrade,
  JournalData,
  StrategyPerformance,
  RulePerformance,
  CompletionBucket,
} from './types'

export function computeStrategyPerformance(
  trades: FlattenedTrade[],
  journalMap: Record<string, JournalData>,
  strategies: { id: string; name: string }[]
): StrategyPerformance[] {
  const stratMap = new Map<string, { trades: FlattenedTrade[]; followRates: number[] }>()

  for (const t of trades) {
    const key = `${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`
    const journal = journalMap[key]
    if (!journal?.strategyId) continue

    const entry = stratMap.get(journal.strategyId) || { trades: [], followRates: [] }
    entry.trades.push(t)

    // Compute follow rate from ruleResults
    if (journal.ruleResults && journal.ruleResults.length > 0) {
      const followed = journal.ruleResults.filter((r) => r.followed).length
      entry.followRates.push(Math.round((followed / journal.ruleResults.length) * 100))
    }

    stratMap.set(journal.strategyId, entry)
  }

  const nameMap = new Map(strategies.map((s) => [s.id, s.name]))

  return [...stratMap.entries()].map(([strategyId, data]) => {
    const { trades: sTrades, followRates } = data
    const wins = sTrades.filter((t) => t.profitLoss > 0)
    const losses = sTrades.filter((t) => t.profitLoss < 0)
    const grossProfit = wins.reduce((s, t) => s + t.profitLoss, 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profitLoss, 0))
    const totalPnL = sTrades.reduce((s, t) => s + t.profitLoss, 0)

    return {
      strategyId,
      strategyName: nameMap.get(strategyId) || 'Unknown',
      tradeCount: sTrades.length,
      totalPnL: Math.round(totalPnL * 100) / 100,
      avgPnL: Math.round((totalPnL / sTrades.length) * 100) / 100,
      winRate: Math.round((wins.length / sTrades.length) * 100),
      wins: wins.length,
      losses: losses.length,
      profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? Infinity : 0,
      avgFollowRate: followRates.length > 0
        ? Math.round(followRates.reduce((s, r) => s + r, 0) / followRates.length)
        : 0,
      bestTrade: sTrades.length > 0 ? Math.round(Math.max(...sTrades.map((t) => t.profitLoss)) * 100) / 100 : 0,
      worstTrade: sTrades.length > 0 ? Math.round(Math.min(...sTrades.map((t) => t.profitLoss)) * 100) / 100 : 0,
    }
  }).sort((a, b) => b.totalPnL - a.totalPnL)
}

export function computeRuleImpact(
  trades: FlattenedTrade[],
  journalMap: Record<string, JournalData>,
  strategies: { id: string; name: string; ruleGroups: { id: string; name: string; rules: { id: string; text: string }[] }[] }[]
): RulePerformance[] {
  // Build rule info map
  const ruleInfo = new Map<string, { text: string; groupName: string }>()
  for (const s of strategies) {
    for (const g of s.ruleGroups) {
      for (const r of g.rules) {
        ruleInfo.set(r.id, { text: r.text, groupName: g.name })
      }
    }
  }

  const ruleData = new Map<string, { followedPnL: number[]; skippedPnL: number[] }>()

  for (const t of trades) {
    const key = `${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`
    const journal = journalMap[key]
    if (!journal?.ruleResults) continue

    for (const result of journal.ruleResults) {
      const entry = ruleData.get(result.ruleId) || { followedPnL: [], skippedPnL: [] }
      if (result.followed) {
        entry.followedPnL.push(t.profitLoss)
      } else {
        entry.skippedPnL.push(t.profitLoss)
      }
      ruleData.set(result.ruleId, entry)
    }
  }

  return [...ruleData.entries()]
    .filter(([, d]) => d.followedPnL.length + d.skippedPnL.length >= 2)
    .map(([ruleId, d]) => {
      const info = ruleInfo.get(ruleId) || { text: ruleId, groupName: 'Unknown' }
      const avgFollowed = d.followedPnL.length > 0
        ? d.followedPnL.reduce((s, v) => s + v, 0) / d.followedPnL.length
        : 0
      const avgSkipped = d.skippedPnL.length > 0
        ? d.skippedPnL.reduce((s, v) => s + v, 0) / d.skippedPnL.length
        : 0

      return {
        ruleId,
        ruleText: info.text,
        groupName: info.groupName,
        followedCount: d.followedPnL.length,
        skippedCount: d.skippedPnL.length,
        avgPnLWhenFollowed: Math.round(avgFollowed * 100) / 100,
        avgPnLWhenSkipped: Math.round(avgSkipped * 100) / 100,
        impact: Math.round((avgFollowed - avgSkipped) * 100) / 100,
      }
    })
    .sort((a, b) => b.impact - a.impact)
}

export function computeCompletionVsPerformance(
  trades: FlattenedTrade[],
  journalMap: Record<string, JournalData>
): CompletionBucket[] {
  const bucketDefs = [
    { range: '0-25%', minPct: 0, maxPct: 25 },
    { range: '26-50%', minPct: 26, maxPct: 50 },
    { range: '51-75%', minPct: 51, maxPct: 75 },
    { range: '76-100%', minPct: 76, maxPct: 100 },
  ]

  const bucketData = bucketDefs.map((b) => ({ ...b, trades: [] as FlattenedTrade[] }))

  for (const t of trades) {
    const key = `${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`
    const journal = journalMap[key]
    if (!journal?.ruleResults || journal.ruleResults.length === 0) continue

    const followed = journal.ruleResults.filter((r) => r.followed).length
    const pct = Math.round((followed / journal.ruleResults.length) * 100)

    for (const bucket of bucketData) {
      if (pct >= bucket.minPct && pct <= bucket.maxPct) {
        bucket.trades.push(t)
        break
      }
    }
  }

  return bucketData.map((b) => {
    const wins = b.trades.filter((t) => t.profitLoss > 0).length
    const totalPnL = b.trades.reduce((s, t) => s + t.profitLoss, 0)
    return {
      range: b.range,
      minPct: b.minPct,
      maxPct: b.maxPct,
      tradeCount: b.trades.length,
      avgPnL: b.trades.length > 0 ? Math.round((totalPnL / b.trades.length) * 100) / 100 : 0,
      winRate: b.trades.length > 0 ? Math.round((wins / b.trades.length) * 100) : 0,
    }
  })
}

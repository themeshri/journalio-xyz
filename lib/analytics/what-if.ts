import type {
  FlattenedTrade,
  JournalData,
  TradeComment,
  WhatIfFilter,
  WhatIfResult,
  WhatIfEquityPoint,
} from './types'
import { computeStats } from './helpers'

export function computeWhatIf(
  trades: FlattenedTrade[],
  journalMap: Record<string, JournalData>,
  comments: TradeComment[],
  filter: WhatIfFilter
): WhatIfResult {
  const commentMap = new Map<string, TradeComment>()
  for (const c of comments) commentMap.set(c.id, c)

  const original = computeStats(trades)

  const filtered = trades.filter((trade) => {
    const key = `${trade.tokenMint}-${trade.tradeNumber}-${trade.walletAddress}`
    const journal = journalMap[key]

    // Exclude by comment IDs
    if (filter.excludeComments.length > 0 && journal) {
      const ids = [journal.entryCommentId, journal.exitCommentId, journal.managementCommentId]
      if (ids.some((id) => id && filter.excludeComments.includes(id))) return false
    }

    // Exclude by comment ratings
    if (filter.excludeRatings.length > 0 && journal) {
      const ids = [journal.entryCommentId, journal.exitCommentId, journal.managementCommentId]
      for (const id of ids) {
        if (!id) continue
        const comment = commentMap.get(id)
        if (comment && filter.excludeRatings.includes(comment.rating)) return false
      }
    }

    // Exclude by emotion tags
    if (filter.excludeTags.length > 0 && journal?.emotionTag) {
      if (filter.excludeTags.includes(journal.emotionTag)) return false
    }

    // Exclude by strategy
    if (filter.excludeStrategies.length > 0 && journal?.strategy) {
      if (filter.excludeStrategies.includes(journal.strategy)) return false
    }

    // Exclude undisciplined (any negative comment)
    if (filter.excludeUndisciplined && journal) {
      const ids = [journal.entryCommentId, journal.exitCommentId, journal.managementCommentId]
      for (const id of ids) {
        if (!id) continue
        const comment = commentMap.get(id)
        if (comment?.rating === 'negative') return false
      }
    }

    return true
  })

  const filteredStats = computeStats(filtered)

  return {
    original,
    filtered: filteredStats,
    tradesRemoved: trades.length - filtered.length,
    pnlDifference: Math.round((filteredStats.totalPnL - original.totalPnL) * 100) / 100,
  }
}

export function computeWhatIfEquity(
  trades: FlattenedTrade[],
  journalMap: Record<string, JournalData>,
  comments: TradeComment[],
  filter: WhatIfFilter
): WhatIfEquityPoint[] {
  const commentMap = new Map<string, TradeComment>()
  for (const c of comments) commentMap.set(c.id, c)

  const sorted = [...trades]
    .filter((t) => t.isComplete && t.endDate)
    .sort((a, b) => (a.endDate || 0) - (b.endDate || 0))

  let actualCum = 0
  let filteredCum = 0
  const results: WhatIfEquityPoint[] = []

  for (let i = 0; i < sorted.length; i++) {
    const trade = sorted[i]
    actualCum += trade.profitLoss

    // Check if this trade passes the filter
    const key = `${trade.tokenMint}-${trade.tradeNumber}-${trade.walletAddress}`
    const journal = journalMap[key]
    let included = true

    if (filter.excludeComments.length > 0 && journal) {
      const ids = [journal.entryCommentId, journal.exitCommentId, journal.managementCommentId]
      if (ids.some((id) => id && filter.excludeComments.includes(id))) included = false
    }
    if (included && filter.excludeRatings.length > 0 && journal) {
      const ids = [journal.entryCommentId, journal.exitCommentId, journal.managementCommentId]
      for (const id of ids) {
        if (!id) continue
        const comment = commentMap.get(id)
        if (comment && filter.excludeRatings.includes(comment.rating)) { included = false; break }
      }
    }
    if (included && filter.excludeTags.length > 0 && journal?.emotionTag) {
      if (filter.excludeTags.includes(journal.emotionTag)) included = false
    }
    if (included && filter.excludeStrategies.length > 0 && journal?.strategy) {
      if (filter.excludeStrategies.includes(journal.strategy)) included = false
    }
    if (included && filter.excludeUndisciplined && journal) {
      const ids = [journal.entryCommentId, journal.exitCommentId, journal.managementCommentId]
      for (const id of ids) {
        if (!id) continue
        const comment = commentMap.get(id)
        if (comment?.rating === 'negative') { included = false; break }
      }
    }

    if (included) filteredCum += trade.profitLoss

    const d = new Date((trade.endDate || trade.startDate) * 1000)
    results.push({
      tradeIndex: i + 1,
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      actualPnL: Math.round(actualCum * 100) / 100,
      filteredPnL: Math.round(filteredCum * 100) / 100,
    })
  }

  return results
}

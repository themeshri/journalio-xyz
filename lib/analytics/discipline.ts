import type {
  FlattenedTrade,
  JournalData,
  TradeComment,
  CommentPerformance,
  EfficiencyPoint,
  DisciplineEquityPoint,
} from './types'

export function computeCommentPerformance(
  trades: FlattenedTrade[],
  journalMap: Record<string, JournalData>,
  comments: TradeComment[]
): CommentPerformance[] {
  const commentMap = new Map<string, TradeComment>()
  for (const c of comments) commentMap.set(c.id, c)

  const agg = new Map<string, { totalPnL: number; count: number; wins: number }>()

  for (const trade of trades) {
    const key = `${trade.tokenMint}-${trade.tradeNumber}-${trade.walletAddress}`
    const journal = journalMap[key]
    if (!journal) continue

    const commentIds = [
      journal.entryCommentId,
      journal.exitCommentId,
      journal.managementCommentId,
    ].filter((id): id is string => !!id)

    for (const id of commentIds) {
      if (!commentMap.has(id)) continue
      const entry = agg.get(id) || { totalPnL: 0, count: 0, wins: 0 }
      entry.totalPnL += trade.profitLoss
      entry.count += 1
      if (trade.profitLoss > 0) entry.wins += 1
      agg.set(id, entry)
    }
  }

  const results: CommentPerformance[] = []
  for (const [id, data] of agg) {
    const comment = commentMap.get(id)!
    results.push({
      commentId: id,
      label: comment.label,
      category: comment.category,
      rating: comment.rating,
      totalPnL: Math.round(data.totalPnL * 100) / 100,
      avgPnL: Math.round((data.totalPnL / data.count) * 100) / 100,
      tradeCount: data.count,
      winRate: Math.round((data.wins / data.count) * 100),
    })
  }

  return results.sort((a, b) => b.totalPnL - a.totalPnL)
}

export function computeEfficiency(
  trades: FlattenedTrade[],
  journalMap: Record<string, JournalData>,
  comments: TradeComment[],
  windowSize = 20
): EfficiencyPoint[] {
  const commentMap = new Map<string, TradeComment>()
  for (const c of comments) commentMap.set(c.id, c)

  const sorted = [...trades]
    .filter((t) => t.isComplete && t.endDate)
    .sort((a, b) => (a.endDate || 0) - (b.endDate || 0))

  let cumPositive = 0
  let cumNegative = 0
  const recentRatings: ('positive' | 'negative')[] = []
  const results: EfficiencyPoint[] = []

  for (let i = 0; i < sorted.length; i++) {
    const trade = sorted[i]
    const key = `${trade.tokenMint}-${trade.tradeNumber}-${trade.walletAddress}`
    const journal = journalMap[key]

    if (journal) {
      const ids = [journal.entryCommentId, journal.exitCommentId, journal.managementCommentId]
      for (const id of ids) {
        if (!id) continue
        const comment = commentMap.get(id)
        if (!comment || comment.rating === 'neutral') continue
        if (comment.rating === 'positive') cumPositive++
        else cumNegative++
        recentRatings.push(comment.rating)
      }
    }

    const cumTotal = cumPositive + cumNegative
    const cumulativeEfficiency = cumTotal > 0 ? Math.round((cumPositive / cumTotal) * 100) : 0

    // Rolling window
    const windowRatings = recentRatings.slice(-windowSize * 3) // ~3 ratings per trade max
    const wPos = windowRatings.filter((r) => r === 'positive').length
    const wNeg = windowRatings.filter((r) => r === 'negative').length
    const wTotal = wPos + wNeg
    const rollingEfficiency = wTotal > 0 ? Math.round((wPos / wTotal) * 100) : 0

    const d = new Date((trade.endDate || trade.startDate) * 1000)
    results.push({
      tradeIndex: i + 1,
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      cumulativeEfficiency,
      rollingEfficiency,
    })
  }

  return results
}

export function computeDisciplineEquity(
  trades: FlattenedTrade[],
  journalMap: Record<string, JournalData>,
  comments: TradeComment[],
  windowSize = 5
): DisciplineEquityPoint[] {
  const commentMap = new Map<string, TradeComment>()
  for (const c of comments) commentMap.set(c.id, c)

  const sorted = [...trades]
    .filter((t) => t.isComplete && t.endDate)
    .sort((a, b) => (a.endDate || 0) - (b.endDate || 0))

  let cumPnL = 0
  const scores: number[] = []
  const results: DisciplineEquityPoint[] = []

  for (let i = 0; i < sorted.length; i++) {
    const trade = sorted[i]
    cumPnL += trade.profitLoss

    const key = `${trade.tokenMint}-${trade.tradeNumber}-${trade.walletAddress}`
    const journal = journalMap[key]

    let tradeScore = 50 // default neutral
    if (journal) {
      const ids = [journal.entryCommentId, journal.exitCommentId, journal.managementCommentId]
      let score = 0
      let hasAny = false
      for (const id of ids) {
        if (!id) continue
        const comment = commentMap.get(id)
        if (!comment) continue
        hasAny = true
        if (comment.rating === 'positive') score += 1
        else if (comment.rating === 'negative') score -= 1
      }
      if (hasAny) {
        tradeScore = ((score + 3) / 6) * 100
      }
    }
    scores.push(tradeScore)

    // Rolling window average
    const window = scores.slice(-windowSize)
    const avg = window.reduce((s, v) => s + v, 0) / window.length

    const d = new Date((trade.endDate || trade.startDate) * 1000)
    results.push({
      tradeIndex: i + 1,
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      cumulativePnL: Math.round(cumPnL * 100) / 100,
      disciplineScore: Math.round(avg),
    })
  }

  return results
}

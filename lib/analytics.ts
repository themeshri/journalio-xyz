import { FlattenedTrade } from './tradeCycles'
import type { JournalData } from '@/components/JournalModal'
import type { TradeComment } from '@/lib/trade-comments'

export interface DurationBucket {
  bucket: string
  count: number
  avgPL: number
}

export interface CumulativePLPoint {
  date: string
  cumulativePL: number
  tradePL: number
  token: string
}

export interface TradingHourData {
  hour: string
  count: number
  avgPL: number
  totalPL: number
}

const HOUR_LABELS = [
  '12am','1am','2am','3am','4am','5am','6am','7am','8am','9am','10am','11am',
  '12pm','1pm','2pm','3pm','4pm','5pm','6pm','7pm','8pm','9pm','10pm','11pm',
]

export function computeDurationBuckets(trades: FlattenedTrade[]): DurationBucket[] {
  const completed = trades.filter((t) => t.isComplete && t.duration && t.duration > 0)

  const buckets: { label: string; max: number }[] = [
    { label: '<1h', max: 60 * 60 * 1000 },
    { label: '1-6h', max: 6 * 60 * 60 * 1000 },
    { label: '6-24h', max: 24 * 60 * 60 * 1000 },
    { label: '1-3d', max: 3 * 24 * 60 * 60 * 1000 },
    { label: '3-7d', max: 7 * 24 * 60 * 60 * 1000 },
    { label: '7d+', max: Infinity },
  ]

  return buckets.map(({ label, max }, i) => {
    const min = i === 0 ? 0 : buckets[i - 1].max
    const inBucket = completed.filter(
      (t) => t.duration! >= min && t.duration! < max
    )
    const avgPL =
      inBucket.length > 0
        ? inBucket.reduce((s, t) => s + t.profitLoss, 0) / inBucket.length
        : 0

    return { bucket: label, count: inBucket.length, avgPL }
  })
}

export function computeCumulativePL(trades: FlattenedTrade[]): CumulativePLPoint[] {
  const completed = trades
    .filter((t) => t.isComplete && t.endDate)
    .sort((a, b) => (a.endDate || 0) - (b.endDate || 0))

  let cumulative = 0
  return completed.map((t) => {
    cumulative += t.profitLoss
    const d = new Date((t.endDate || t.startDate) * 1000)
    return {
      date: `${d.getMonth() + 1}/${d.getDate()}`,
      cumulativePL: Math.round(cumulative * 100) / 100,
      tradePL: Math.round(t.profitLoss * 100) / 100,
      token: t.token,
    }
  })
}

export function computeTradingHours(trades: FlattenedTrade[]): TradingHourData[] {
  const hourMap = new Map<number, { count: number; totalPL: number }>()

  for (let h = 0; h < 24; h++) {
    hourMap.set(h, { count: 0, totalPL: 0 })
  }

  for (const trade of trades) {
    const hour = new Date(trade.startDate * 1000).getHours()
    const entry = hourMap.get(hour)!
    entry.count += 1
    entry.totalPL += trade.profitLoss
  }

  return Array.from(hourMap.entries()).map(([hour, data]) => ({
    hour: HOUR_LABELS[hour],
    count: data.count,
    avgPL: data.count > 0 ? Math.round((data.totalPL / data.count) * 100) / 100 : 0,
    totalPL: Math.round(data.totalPL * 100) / 100,
  }))
}

export function computeAvgDuration(trades: FlattenedTrade[]): number {
  const completed = trades.filter((t) => t.isComplete && t.duration && t.duration > 0)
  if (completed.length === 0) return 0
  return completed.reduce((s, t) => s + t.duration!, 0) / completed.length
}

export interface CommentPerformance {
  commentId: string
  label: string
  category: 'entry' | 'exit' | 'management'
  rating: 'positive' | 'neutral' | 'negative'
  totalPnL: number
  avgPnL: number
  tradeCount: number
  winRate: number
}

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

// --- Item 6: Efficiency Graph ---

export interface EfficiencyPoint {
  tradeIndex: number
  date: string
  cumulativeEfficiency: number
  rollingEfficiency: number
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

// --- Item 7: Discipline + Equity Overlay ---

export interface DisciplineEquityPoint {
  tradeIndex: number
  date: string
  cumulativePnL: number
  disciplineScore: number
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

// --- Item 8: What-If Scenario ---

export interface WhatIfFilter {
  excludeComments: string[]
  excludeRatings: ('positive' | 'neutral' | 'negative')[]
  excludeTags: string[]
  excludeStrategies: string[]
  excludeUndisciplined: boolean
}

export interface WhatIfStats {
  totalTrades: number
  totalPnL: number
  winRate: number
  profitFactor: number
  avgPnL: number
}

export interface WhatIfResult {
  original: WhatIfStats
  filtered: WhatIfStats
  tradesRemoved: number
  pnlDifference: number
}

function computeStats(trades: FlattenedTrade[]): WhatIfStats {
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
    profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? Infinity : 0,
    avgPnL: Math.round((totalPnL / total) * 100) / 100,
  }
}

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

// --- Item 9: Automated Pattern Detection ---

export interface DetectedPattern {
  id: string
  type: 'positive' | 'negative' | 'neutral'
  title: string
  description: string
  severity: 'info' | 'warning' | 'critical'
}

export function detectPatterns(
  trades: FlattenedTrade[],
  journalMap: Record<string, JournalData>,
  comments: TradeComment[]
): DetectedPattern[] {
  const commentMap = new Map<string, TradeComment>()
  for (const c of comments) commentMap.set(c.id, c)
  const patterns: DetectedPattern[] = []

  if (trades.length < 3) return patterns

  // Helper: get journal for trade
  const getJ = (t: FlattenedTrade) => journalMap[`${t.tokenMint}-${t.tradeNumber}-${t.walletAddress}`]

  // 1. Discipline Premium
  const disciplined: FlattenedTrade[] = []
  const undisciplined: FlattenedTrade[] = []
  for (const t of trades) {
    const j = getJ(t)
    if (!j) continue
    const ids = [j.entryCommentId, j.exitCommentId, j.managementCommentId].filter(Boolean)
    if (ids.length === 0) continue
    const hasNeg = ids.some((id) => {
      const c = commentMap.get(id!)
      return c?.rating === 'negative'
    })
    if (hasNeg) undisciplined.push(t)
    else disciplined.push(t)
  }

  if (disciplined.length >= 3 && undisciplined.length >= 3) {
    const dAvg = disciplined.reduce((s, t) => s + t.profitLoss, 0) / disciplined.length
    const uAvg = undisciplined.reduce((s, t) => s + t.profitLoss, 0) / undisciplined.length
    const dWR = Math.round((disciplined.filter((t) => t.profitLoss > 0).length / disciplined.length) * 100)
    const uWR = Math.round((undisciplined.filter((t) => t.profitLoss > 0).length / undisciplined.length) * 100)
    if (dAvg > uAvg) {
      patterns.push({
        id: 'discipline-premium',
        type: 'positive',
        title: 'Discipline pays off',
        description: `Disciplined trades: ${dWR}% WR, $${dAvg.toFixed(2)} avg. Undisciplined: ${uWR}% WR, $${uAvg.toFixed(2)} avg. Discipline earns you +$${(dAvg - uAvg).toFixed(2)}/trade.`,
        severity: 'info',
      })
    }
  }

  // 2. Emotion tag cost (FOMO, revenge)
  const emotionGroups = new Map<string, FlattenedTrade[]>()
  for (const t of trades) {
    const j = getJ(t)
    if (!j?.emotionTag) continue
    const arr = emotionGroups.get(j.emotionTag) || []
    arr.push(t)
    emotionGroups.set(j.emotionTag, arr)
  }

  for (const [tag, tagTrades] of emotionGroups) {
    if (tagTrades.length < 3) continue
    const avgPL = tagTrades.reduce((s, t) => s + t.profitLoss, 0) / tagTrades.length
    const totalPL = tagTrades.reduce((s, t) => s + t.profitLoss, 0)
    if (avgPL < 0 && (tag === 'fomo' || tag === 'revenge' || tag === 'greedy' || tag === 'bored')) {
      patterns.push({
        id: `emotion-${tag}`,
        type: 'negative',
        title: `${tag.charAt(0).toUpperCase() + tag.slice(1)} trades are costing you`,
        description: `${tagTrades.length} ${tag} trades lost $${Math.abs(totalPL).toFixed(2)} total (avg $${avgPL.toFixed(2)}/trade).`,
        severity: totalPL < -500 ? 'critical' : 'warning',
      })
    }
  }

  // 3. Best/worst trading hour
  const hourMap = new Map<number, { count: number; totalPL: number }>()
  for (const t of trades) {
    const hour = new Date(t.startDate * 1000).getHours()
    const e = hourMap.get(hour) || { count: 0, totalPL: 0 }
    e.count++
    e.totalPL += t.profitLoss
    hourMap.set(hour, e)
  }

  let bestHour = -1, bestAvg = -Infinity, worstHour = -1, worstAvg = Infinity
  for (const [hour, data] of hourMap) {
    if (data.count < 3) continue
    const avg = data.totalPL / data.count
    if (avg > bestAvg) { bestAvg = avg; bestHour = hour }
    if (avg < worstAvg) { worstAvg = avg; worstHour = hour }
  }

  if (bestHour >= 0 && bestAvg > 0) {
    const fmt = (h: number) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`
    patterns.push({
      id: 'best-hour',
      type: 'positive',
      title: `Best trading hour: ${fmt(bestHour)}-${fmt(bestHour + 1)}`,
      description: `Avg +$${bestAvg.toFixed(2)}/trade during this hour (${hourMap.get(bestHour)!.count} trades).`,
      severity: 'info',
    })
  }

  if (worstHour >= 0 && worstAvg < 0) {
    const fmt = (h: number) => `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`
    patterns.push({
      id: 'worst-hour',
      type: 'negative',
      title: `Worst trading hour: ${fmt(worstHour)}-${fmt(worstHour + 1)}`,
      description: `Avg $${worstAvg.toFixed(2)}/trade during this hour (${hourMap.get(worstHour)!.count} trades). Consider avoiding this time.`,
      severity: 'warning',
    })
  }

  // 4. Holding time sweet spot
  const buckets = [
    { label: '<1h', max: 3600000, trades: [] as FlattenedTrade[] },
    { label: '1-6h', max: 21600000, trades: [] as FlattenedTrade[] },
    { label: '6-24h', max: 86400000, trades: [] as FlattenedTrade[] },
    { label: '1-3d', max: 259200000, trades: [] as FlattenedTrade[] },
    { label: '3d+', max: Infinity, trades: [] as FlattenedTrade[] },
  ]
  for (const t of trades.filter((t) => t.isComplete && t.duration)) {
    for (let i = 0; i < buckets.length; i++) {
      const min = i === 0 ? 0 : buckets[i - 1].max
      if (t.duration! >= min && t.duration! < buckets[i].max) {
        buckets[i].trades.push(t)
        break
      }
    }
  }

  const validBuckets = buckets.filter((b) => b.trades.length >= 3)
  if (validBuckets.length >= 2) {
    const best = validBuckets.reduce((a, b) => {
      const aAvg = a.trades.reduce((s, t) => s + t.profitLoss, 0) / a.trades.length
      const bAvg = b.trades.reduce((s, t) => s + t.profitLoss, 0) / b.trades.length
      return bAvg > aAvg ? b : a
    })
    const bestAvg = best.trades.reduce((s, t) => s + t.profitLoss, 0) / best.trades.length
    if (bestAvg > 0) {
      patterns.push({
        id: 'hold-sweet-spot',
        type: 'positive',
        title: `Best hold time: ${best.label}`,
        description: `Trades held ${best.label} average +$${bestAvg.toFixed(2)} (${best.trades.length} trades).`,
        severity: 'info',
      })
    }
  }

  // 5. Revenge trading (trade within 15min of a loss)
  const sorted = [...trades].sort((a, b) => a.startDate - b.startDate)
  const revengeTrades: FlattenedTrade[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    if (prev.profitLoss < 0 && prev.endDate) {
      const gap = curr.startDate - prev.endDate
      if (gap >= 0 && gap < 900) { // 15 min in seconds
        revengeTrades.push(curr)
      }
    }
  }

  if (revengeTrades.length >= 2) {
    const totalPL = revengeTrades.reduce((s, t) => s + t.profitLoss, 0)
    const wr = Math.round((revengeTrades.filter((t) => t.profitLoss > 0).length / revengeTrades.length) * 100)
    patterns.push({
      id: 'revenge-trading',
      type: 'negative',
      title: 'Revenge trading detected',
      description: `${revengeTrades.length} trades entered <15min after a loss. Win rate: ${wr}%, total: $${totalPL.toFixed(2)}.`,
      severity: totalPL < -200 ? 'critical' : 'warning',
    })
  }

  // 6. Strategy comparison
  const stratMap = new Map<string, FlattenedTrade[]>()
  for (const t of trades) {
    const j = getJ(t)
    if (!j?.strategy) continue
    const arr = stratMap.get(j.strategy) || []
    arr.push(t)
    stratMap.set(j.strategy, arr)
  }

  const stratEntries = [...stratMap.entries()].filter(([, ts]) => ts.length >= 3)
  if (stratEntries.length >= 2) {
    const ranked = stratEntries
      .map(([name, ts]) => {
        const avg = ts.reduce((s, t) => s + t.profitLoss, 0) / ts.length
        const wr = Math.round((ts.filter((t) => t.profitLoss > 0).length / ts.length) * 100)
        return { name, count: ts.length, avg, wr }
      })
      .sort((a, b) => b.avg - a.avg)

    const best = ranked[0]
    const worst = ranked[ranked.length - 1]
    if (best.avg > 0) {
      patterns.push({
        id: 'best-strategy',
        type: 'positive',
        title: `Best strategy: "${best.name}"`,
        description: `${best.wr}% WR, avg +$${best.avg.toFixed(2)}/trade (${best.count} trades). Worst: "${worst.name}" at $${worst.avg.toFixed(2)} avg.`,
        severity: 'info',
      })
    }
  }

  return patterns
}

// --- Item 10: What-If Equity Curve ---

export interface WhatIfEquityPoint {
  tradeIndex: number
  date: string
  actualPnL: number
  filteredPnL: number
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

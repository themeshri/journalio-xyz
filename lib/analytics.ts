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

// =============================================
// P/L Calendar (Task 8)
// =============================================

export interface CalendarDay {
  date: string // YYYY-MM-DD
  pnl: number
  tradeCount: number
  wins: number
  losses: number
}

export interface CalendarWeek {
  days: (CalendarDay | null)[] // 7 entries, null for days outside the month
  weeklyPnL: number
}

export interface CalendarMonth {
  year: number
  month: number // 0-indexed
  weeks: CalendarWeek[]
  totalPnL: number
  totalTrades: number
  bestDay: CalendarDay | null
  worstDay: CalendarDay | null
}

export function computeCalendarData(
  trades: FlattenedTrade[],
  year: number,
  month: number
): CalendarMonth {
  const completed = trades.filter((t) => t.isComplete && t.endDate)

  // Group trades by date string
  const dayMap = new Map<string, CalendarDay>()
  for (const t of completed) {
    const d = new Date((t.endDate || t.startDate) * 1000)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (d.getFullYear() !== year || d.getMonth() !== month) continue
    const existing = dayMap.get(key) || { date: key, pnl: 0, tradeCount: 0, wins: 0, losses: 0 }
    existing.pnl += t.profitLoss
    existing.tradeCount += 1
    if (t.profitLoss > 0) existing.wins += 1
    else if (t.profitLoss < 0) existing.losses += 1
    dayMap.set(key, existing)
  }

  // Build weeks
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay() // 0=Sun
  const daysInMonth = lastDay.getDate()

  const weeks: CalendarWeek[] = []
  let currentWeek: (CalendarDay | null)[] = new Array(startDow).fill(null)

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    currentWeek.push(dayMap.get(key) || { date: key, pnl: 0, tradeCount: 0, wins: 0, losses: 0 })
    if (currentWeek.length === 7) {
      const weeklyPnL = currentWeek.reduce((s, d) => s + (d?.pnl || 0), 0)
      weeks.push({ days: currentWeek, weeklyPnL })
      currentWeek = []
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null)
    const weeklyPnL = currentWeek.reduce((s, d) => s + (d?.pnl || 0), 0)
    weeks.push({ days: currentWeek, weeklyPnL })
  }

  const allDays = [...dayMap.values()]
  const tradingDays = allDays.filter((d) => d.tradeCount > 0)

  return {
    year,
    month,
    weeks,
    totalPnL: Math.round(allDays.reduce((s, d) => s + d.pnl, 0) * 100) / 100,
    totalTrades: allDays.reduce((s, d) => s + d.tradeCount, 0),
    bestDay: tradingDays.length > 0 ? tradingDays.reduce((a, b) => (b.pnl > a.pnl ? b : a)) : null,
    worstDay: tradingDays.length > 0 ? tradingDays.reduce((a, b) => (b.pnl < a.pnl ? b : a)) : null,
  }
}

export function computeYearlyHeatmap(trades: FlattenedTrade[], year: number): CalendarDay[] {
  const completed = trades.filter((t) => t.isComplete && t.endDate)
  const dayMap = new Map<string, CalendarDay>()

  for (const t of completed) {
    const d = new Date((t.endDate || t.startDate) * 1000)
    if (d.getFullYear() !== year) continue
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const existing = dayMap.get(key) || { date: key, pnl: 0, tradeCount: 0, wins: 0, losses: 0 }
    existing.pnl += t.profitLoss
    existing.tradeCount += 1
    if (t.profitLoss > 0) existing.wins += 1
    else if (t.profitLoss < 0) existing.losses += 1
    dayMap.set(key, existing)
  }

  return [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export function getDayColorClass(pnl: number, maxPnl: number, maxLoss: number): string {
  if (pnl === 0) return 'bg-zinc-800'
  if (pnl > 0) {
    const intensity = Math.min(pnl / (maxPnl || 1), 1)
    if (intensity > 0.66) return 'bg-emerald-500'
    if (intensity > 0.33) return 'bg-emerald-600/70'
    return 'bg-emerald-700/50'
  }
  const intensity = Math.min(Math.abs(pnl) / (maxLoss || 1), 1)
  if (intensity > 0.66) return 'bg-red-500'
  if (intensity > 0.33) return 'bg-red-600/70'
  return 'bg-red-700/50'
}

// =============================================
// Time Analytics (Task 10)
// =============================================

export interface HourlyPerformance {
  hour: number
  label: string
  tradeCount: number
  totalPnL: number
  avgPnL: number
  winRate: number
  wins: number
  losses: number
}

export interface DayOfWeekPerformance {
  day: number // 0=Sun
  label: string
  tradeCount: number
  totalPnL: number
  avgPnL: number
  winRate: number
  wins: number
  losses: number
}

export interface TradingSession {
  name: string
  startHour: number
  endHour: number
  color: string
}

export const DEFAULT_TRADING_SESSIONS: TradingSession[] = [
  { name: 'Morning Degen', startHour: 5, endHour: 9, color: '#f59e0b' },
  { name: 'Peak Hours', startHour: 9, endHour: 14, color: '#10b981' },
  { name: 'Afternoon', startHour: 14, endHour: 18, color: '#3b82f6' },
  { name: 'Evening', startHour: 18, endHour: 22, color: '#8b5cf6' },
  { name: 'Late Night', startHour: 22, endHour: 2, color: '#ef4444' },
  { name: 'Early AM', startHour: 2, endHour: 5, color: '#6b7280' },
]

export interface SessionPerformance {
  session: TradingSession
  tradeCount: number
  totalPnL: number
  avgPnL: number
  winRate: number
  wins: number
  losses: number
  profitFactor: number
}

export interface DayHourPerformance {
  day: number
  hour: number
  tradeCount: number
  avgPnL: number
  totalPnL: number
}

export interface EnhancedDurationBucket {
  bucket: string
  count: number
  avgPL: number
  winRate: number
  profitFactor: number
  totalPnL: number
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function computeHourlyPerformance(trades: FlattenedTrade[]): HourlyPerformance[] {
  const hourData = new Map<number, { count: number; total: number; wins: number; losses: number }>()
  for (let h = 0; h < 24; h++) hourData.set(h, { count: 0, total: 0, wins: 0, losses: 0 })

  for (const t of trades) {
    const hour = new Date(t.startDate * 1000).getHours()
    const d = hourData.get(hour)!
    d.count++
    d.total += t.profitLoss
    if (t.profitLoss > 0) d.wins++
    else if (t.profitLoss < 0) d.losses++
  }

  return Array.from(hourData.entries()).map(([hour, d]) => ({
    hour,
    label: HOUR_LABELS[hour],
    tradeCount: d.count,
    totalPnL: Math.round(d.total * 100) / 100,
    avgPnL: d.count > 0 ? Math.round((d.total / d.count) * 100) / 100 : 0,
    winRate: d.count > 0 ? Math.round((d.wins / d.count) * 100) : 0,
    wins: d.wins,
    losses: d.losses,
  }))
}

export function computeDayOfWeekPerformance(trades: FlattenedTrade[]): DayOfWeekPerformance[] {
  const dayData = new Map<number, { count: number; total: number; wins: number; losses: number }>()
  for (let d = 0; d < 7; d++) dayData.set(d, { count: 0, total: 0, wins: 0, losses: 0 })

  for (const t of trades) {
    const day = new Date(t.startDate * 1000).getDay()
    const d = dayData.get(day)!
    d.count++
    d.total += t.profitLoss
    if (t.profitLoss > 0) d.wins++
    else if (t.profitLoss < 0) d.losses++
  }

  return Array.from(dayData.entries()).map(([day, d]) => ({
    day,
    label: DAY_LABELS[day],
    tradeCount: d.count,
    totalPnL: Math.round(d.total * 100) / 100,
    avgPnL: d.count > 0 ? Math.round((d.total / d.count) * 100) / 100 : 0,
    winRate: d.count > 0 ? Math.round((d.wins / d.count) * 100) : 0,
    wins: d.wins,
    losses: d.losses,
  }))
}

function isHourInSession(hour: number, session: TradingSession): boolean {
  if (session.startHour < session.endHour) {
    return hour >= session.startHour && hour < session.endHour
  }
  // Wraps midnight
  return hour >= session.startHour || hour < session.endHour
}

export function computeSessionPerformance(
  trades: FlattenedTrade[],
  sessions: TradingSession[] = DEFAULT_TRADING_SESSIONS
): SessionPerformance[] {
  return sessions.map((session) => {
    const sessionTrades = trades.filter((t) => {
      const hour = new Date(t.startDate * 1000).getHours()
      return isHourInSession(hour, session)
    })

    const wins = sessionTrades.filter((t) => t.profitLoss > 0)
    const losses = sessionTrades.filter((t) => t.profitLoss < 0)
    const grossProfit = wins.reduce((s, t) => s + t.profitLoss, 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profitLoss, 0))
    const totalPnL = sessionTrades.reduce((s, t) => s + t.profitLoss, 0)

    return {
      session,
      tradeCount: sessionTrades.length,
      totalPnL: Math.round(totalPnL * 100) / 100,
      avgPnL: sessionTrades.length > 0 ? Math.round((totalPnL / sessionTrades.length) * 100) / 100 : 0,
      winRate: sessionTrades.length > 0 ? Math.round((wins.length / sessionTrades.length) * 100) : 0,
      wins: wins.length,
      losses: losses.length,
      profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? Infinity : 0,
    }
  })
}

export function computeDayHourHeatmap(trades: FlattenedTrade[]): DayHourPerformance[] {
  const map = new Map<string, { count: number; total: number }>()

  for (const t of trades) {
    const d = new Date(t.startDate * 1000)
    const key = `${d.getDay()}-${d.getHours()}`
    const entry = map.get(key) || { count: 0, total: 0 }
    entry.count++
    entry.total += t.profitLoss
    map.set(key, entry)
  }

  const results: DayHourPerformance[] = []
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const entry = map.get(`${day}-${hour}`) || { count: 0, total: 0 }
      results.push({
        day,
        hour,
        tradeCount: entry.count,
        avgPnL: entry.count > 0 ? Math.round((entry.total / entry.count) * 100) / 100 : 0,
        totalPnL: Math.round(entry.total * 100) / 100,
      })
    }
  }
  return results
}

export function computeEnhancedDurationBuckets(trades: FlattenedTrade[]): EnhancedDurationBucket[] {
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
    const inBucket = completed.filter((t) => t.duration! >= min && t.duration! < max)
    const wins = inBucket.filter((t) => t.profitLoss > 0)
    const losses = inBucket.filter((t) => t.profitLoss < 0)
    const grossProfit = wins.reduce((s, t) => s + t.profitLoss, 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.profitLoss, 0))
    const totalPnL = inBucket.reduce((s, t) => s + t.profitLoss, 0)

    return {
      bucket: label,
      count: inBucket.length,
      avgPL: inBucket.length > 0 ? Math.round((totalPnL / inBucket.length) * 100) / 100 : 0,
      winRate: inBucket.length > 0 ? Math.round((wins.length / inBucket.length) * 100) : 0,
      profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? Infinity : 0,
      totalPnL: Math.round(totalPnL * 100) / 100,
    }
  })
}

// =============================================
// Missed Trade Analytics (Task 13)
// =============================================

export interface MissedTradeEntry {
  id: string
  missReason: string | null
  strategyId: string | null
  outcome: string | null
  potentialPnL: number | null
  potentialMultiplier: number | null
  createdAt: string
}

export interface MissReasonBreakdown {
  reason: string
  count: number
  totalMissedPnL: number
  avgMultiplier: number
  winCount: number
}

export interface MissedTradeAnalytics {
  totalMissed: number
  totalMissedPnL: number
  avgMultiplier: number
  winCount: number
  reasonBreakdown: MissReasonBreakdown[]
  strategyBreakdown: { strategyId: string; count: number; totalPnL: number }[]
  monthlyTrend: { month: string; count: number; missedPnL: number }[]
}

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

export interface HesitationCostAnalysis {
  totalActualPnL: number
  totalMissedPnL: number
  hesitationCost: number // what you could have made
  missedWinRate: number
  actualWinRate: number
  missedPerActual: number // ratio
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

// =============================================
// Strategy Performance Analytics (Task 15)
// =============================================

export interface StrategyPerformance {
  strategyId: string
  strategyName: string
  tradeCount: number
  totalPnL: number
  avgPnL: number
  winRate: number
  wins: number
  losses: number
  profitFactor: number
  avgFollowRate: number
  bestTrade: number
  worstTrade: number
}

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

// =============================================
// Rule Impact Analysis (Task 16)
// =============================================

export interface RulePerformance {
  ruleId: string
  ruleText: string
  groupName: string
  followedCount: number
  skippedCount: number
  avgPnLWhenFollowed: number
  avgPnLWhenSkipped: number
  impact: number // difference
}

export interface CompletionBucket {
  range: string // e.g. "0-25%"
  minPct: number
  maxPct: number
  tradeCount: number
  avgPnL: number
  winRate: number
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

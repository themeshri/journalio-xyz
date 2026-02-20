import type { FlattenedTrade, JournalData, TradeComment, DetectedPattern } from './types'

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
    const bestBucketAvg = best.trades.reduce((s, t) => s + t.profitLoss, 0) / best.trades.length
    if (bestBucketAvg > 0) {
      patterns.push({
        id: 'hold-sweet-spot',
        type: 'positive',
        title: `Best hold time: ${best.label}`,
        description: `Trades held ${best.label} average +$${bestBucketAvg.toFixed(2)} (${best.trades.length} trades).`,
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

    const bestStrat = ranked[0]
    const worst = ranked[ranked.length - 1]
    if (bestStrat.avg > 0) {
      patterns.push({
        id: 'best-strategy',
        type: 'positive',
        title: `Best strategy: "${bestStrat.name}"`,
        description: `${bestStrat.wr}% WR, avg +$${bestStrat.avg.toFixed(2)}/trade (${bestStrat.count} trades). Worst: "${worst.name}" at $${worst.avg.toFixed(2)} avg.`,
        severity: 'info',
      })
    }
  }

  return patterns
}

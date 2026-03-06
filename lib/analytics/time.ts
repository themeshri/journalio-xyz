import type {
  FlattenedTrade,
  TradingSession,
  HourlyPerformance,
  DayOfWeekPerformance,
  SessionPerformance,
  DayHourPerformance,
  EnhancedDurationBucket,
} from './types'
import { HOUR_LABELS, DAY_LABELS, isHourInSession } from './helpers'

export const DEFAULT_TRADING_SESSIONS: TradingSession[] = [
  { name: 'Morning Degen', startHour: 5, endHour: 9, color: '#f59e0b' },
  { name: 'Peak Hours', startHour: 9, endHour: 14, color: '#F59E0B' },
  { name: 'Afternoon', startHour: 14, endHour: 18, color: '#3b82f6' },
  { name: 'Evening', startHour: 18, endHour: 22, color: '#8b5cf6' },
  { name: 'Late Night', startHour: 22, endHour: 2, color: '#ef4444' },
  { name: 'Early AM', startHour: 2, endHour: 5, color: '#6b7280' },
]

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

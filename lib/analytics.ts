import { FlattenedTrade } from './tradeCycles'

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

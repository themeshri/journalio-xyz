import { NextRequest, NextResponse } from 'next/server'
import { parseWalletParams, resolveFlattenedTrades, sanitizeForJSON } from '@/lib/server/resolve-trades'
import { getCached, setCached } from '@/lib/server/analytics-cache'
import {
  computeHourlyPerformance,
  computeDayOfWeekPerformance,
  computeSessionPerformance,
  computeEnhancedDurationBuckets,
} from '@/lib/analytics/time'

export async function GET(request: NextRequest) {
  try {
    const params = parseWalletParams(new URL(request.url).searchParams)
    if (params.addresses.length === 0) {
      return NextResponse.json({ error: 'No addresses provided' }, { status: 400 })
    }

    const cacheKey = `time:${params.addresses.join(',')}:${params.dexes.join(',')}`
    const cached = getCached<any>(cacheKey)
    if (cached) return NextResponse.json(cached)

    const trades = await resolveFlattenedTrades(params)

    const result = sanitizeForJSON({
      hourlyPerformance: computeHourlyPerformance(trades),
      dayOfWeekPerformance: computeDayOfWeekPerformance(trades),
      sessionPerformance: computeSessionPerformance(trades),
      enhancedDurationBuckets: computeEnhancedDurationBuckets(trades),
    })

    setCached(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Analytics time error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute analytics' },
      { status: 500 }
    )
  }
}

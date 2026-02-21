import { NextRequest, NextResponse } from 'next/server'
import { parseWalletParams, resolveFlattenedTrades, sanitizeForJSON } from '@/lib/server/resolve-trades'
import { getCached, setCached } from '@/lib/server/analytics-cache'
import { computeStats } from '@/lib/analytics/helpers'
import {
  computeDurationBuckets,
  computeCumulativePL,
  computeTradingHours,
  computeAvgDuration,
} from '@/lib/analytics/core'

export async function GET(request: NextRequest) {
  try {
    const params = parseWalletParams(new URL(request.url).searchParams)
    if (params.addresses.length === 0) {
      return NextResponse.json({ error: 'No addresses provided' }, { status: 400 })
    }

    const cacheKey = `overview:${params.addresses.join(',')}:${params.dexes.join(',')}`
    const cached = getCached<any>(cacheKey)
    if (cached) return NextResponse.json(cached)

    const trades = await resolveFlattenedTrades(params)

    const result = sanitizeForJSON({
      stats: computeStats(trades),
      cumulativePL: computeCumulativePL(trades),
      durationBuckets: computeDurationBuckets(trades),
      tradingHours: computeTradingHours(trades),
      avgDuration: computeAvgDuration(trades),
    })

    setCached(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Analytics overview error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute analytics' },
      { status: 500 }
    )
  }
}

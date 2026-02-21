import { NextRequest, NextResponse } from 'next/server'
import { parseWalletParamsFromBody, resolveFlattenedTrades, sanitizeForJSON } from '@/lib/server/resolve-trades'
import { getCached, setCached } from '@/lib/server/analytics-cache'
import {
  computeStrategyPerformance,
  computeRuleImpact,
  computeCompletionVsPerformance,
} from '@/lib/analytics/strategy'
import { createHash } from 'crypto'

function hashBody(body: Record<string, unknown>): string {
  return createHash('md5').update(JSON.stringify(body)).digest('hex').slice(0, 12)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const params = parseWalletParamsFromBody(body)
    if (params.addresses.length === 0) {
      return NextResponse.json({ error: 'No addresses provided' }, { status: 400 })
    }

    const cacheKey = `strategy:${params.addresses.join(',')}:${hashBody(body)}`
    const cached = getCached<unknown>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const journalMap = body.journalMap || {}
    const strategies = body.strategies || []

    const trades = await resolveFlattenedTrades(params)

    const result = sanitizeForJSON({
      strategyPerformance: computeStrategyPerformance(
        trades,
        journalMap,
        strategies.map((s: any) => ({ id: s.id, name: s.name }))
      ),
      ruleImpact: computeRuleImpact(trades, journalMap, strategies),
      completionVsPerformance: computeCompletionVsPerformance(trades, journalMap),
    })

    setCached(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Analytics strategy error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute analytics' },
      { status: 500 }
    )
  }
}

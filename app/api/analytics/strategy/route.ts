import { NextRequest, NextResponse } from 'next/server'
import { parseWalletParamsFromBody, resolveFlattenedTrades, applyDateFilter, sanitizeForJSON } from '@/lib/server/resolve-trades'
import { getCached, setCached } from '@/lib/server/analytics-cache'
import { requireAuth } from '@/lib/auth-helper'
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
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const body = await request.json()
    const params = parseWalletParamsFromBody(body, userId)
    if (params.addresses.length === 0) {
      return NextResponse.json({ error: 'No addresses provided' }, { status: 400 })
    }

    const cacheKey = `strategy:${userId}:${params.addresses.join(',')}:${hashBody(body)}`
    const cached = getCached<unknown>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const journalMap = body.journalMap || {}
    const strategies = body.strategies || []

    const { searchParams } = new URL(request.url)
    const trades = applyDateFilter(await resolveFlattenedTrades(params), searchParams)

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
      { error: 'Failed to compute analytics' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { parseWalletParamsFromBody, resolveFlattenedTrades, sanitizeForJSON } from '@/lib/server/resolve-trades'
import { getCached, setCached } from '@/lib/server/analytics-cache'
import {
  computeCommentPerformance,
  computeEfficiency,
  computeDisciplineEquity,
} from '@/lib/analytics/discipline'
import { computeWhatIf, computeWhatIfEquity } from '@/lib/analytics/what-if'
import { detectPatterns } from '@/lib/analytics/patterns'
import type { WhatIfFilter } from '@/lib/analytics/types'
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

    const cacheKey = `discipline:${params.addresses.join(',')}:${hashBody(body)}`
    const cached = getCached<unknown>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const journalMap = body.journalMap || {}
    const tradeComments = body.tradeComments || []
    const whatIfFilter: WhatIfFilter | undefined = body.whatIfFilter

    const trades = await resolveFlattenedTrades(params)

    const result: any = {
      commentPerformance: computeCommentPerformance(trades, journalMap, tradeComments),
      efficiency: computeEfficiency(trades, journalMap, tradeComments),
      disciplineEquity: computeDisciplineEquity(trades, journalMap, tradeComments),
      patterns: detectPatterns(trades, journalMap, tradeComments),
    }

    if (whatIfFilter) {
      result.whatIf = computeWhatIf(trades, journalMap, tradeComments, whatIfFilter)
      if (result.whatIf.tradesRemoved > 0) {
        result.whatIfEquity = computeWhatIfEquity(trades, journalMap, tradeComments, whatIfFilter)
      }
    }

    const sanitized = sanitizeForJSON(result)
    setCached(cacheKey, sanitized)
    return NextResponse.json(sanitized)
  } catch (error) {
    console.error('Analytics discipline error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute analytics' },
      { status: 500 }
    )
  }
}

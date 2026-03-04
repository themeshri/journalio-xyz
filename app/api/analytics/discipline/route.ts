import { NextRequest, NextResponse } from 'next/server'
import { parseWalletParamsFromBody, resolveFlattenedTrades, applyDateFilter, sanitizeForJSON } from '@/lib/server/resolve-trades'
import { getCached, setCached } from '@/lib/server/analytics-cache'
import { requireAuth } from '@/lib/auth-helper'
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
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const body = await request.json()
    const params = parseWalletParamsFromBody(body, userId)
    if (params.addresses.length === 0) {
      return NextResponse.json({ error: 'No addresses provided' }, { status: 400 })
    }

    const cacheKey = `discipline:${userId}:${params.addresses.join(',')}:${hashBody(body)}`
    const cached = getCached<unknown>(cacheKey)
    if (cached) {
      return NextResponse.json(cached)
    }

    const journalMap = body.journalMap || {}
    const tradeComments = body.tradeComments || []
    const whatIfFilter: WhatIfFilter | undefined = body.whatIfFilter

    const { searchParams } = new URL(request.url)
    const trades = applyDateFilter(await resolveFlattenedTrades(params), searchParams)

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
      { error: 'Failed to compute analytics' },
      { status: 500 }
    )
  }
}

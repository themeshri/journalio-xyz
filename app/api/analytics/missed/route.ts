import { NextRequest, NextResponse } from 'next/server'
import { parseWalletParams, resolveFlattenedTrades, applyDateFilter, sanitizeForJSON } from '@/lib/server/resolve-trades'
import { getCached, setCached } from '@/lib/server/analytics-cache'
import { requireAuth } from '@/lib/auth-helper'
import { prisma } from '@/lib/prisma'
import { computeMissedTradeStats, computeHesitationCost } from '@/lib/analytics/missed-trades'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { searchParams } = new URL(request.url)
    const params = parseWalletParams(searchParams, userId)
    if (params.addresses.length === 0) {
      return NextResponse.json({ error: 'No addresses provided' }, { status: 400 })
    }

    const cacheKey = `missed:${userId}:${params.addresses.join(',')}:${params.dexes.join(',')}:${searchParams.get('startDate') || ''}:${searchParams.get('endDate') || ''}`
    const cached = getCached<any>(cacheKey)
    if (cached) return NextResponse.json(cached)

    // Fetch papered plays from DB
    const paperedPlays = await prisma.paperedPlay.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    const missedTrades = paperedPlays.map((p) => ({
      id: p.id,
      missReason: p.missReason,
      strategyId: p.strategyId,
      outcome: p.outcome,
      potentialPnL: p.potentialPnL,
      potentialMultiplier: p.potentialMultiplier,
      createdAt: p.createdAt.toISOString(),
    }))

    const trades = applyDateFilter(await resolveFlattenedTrades(params), searchParams)

    const result = sanitizeForJSON({
      missedStats: computeMissedTradeStats(missedTrades),
      hesitationCost: computeHesitationCost(missedTrades, trades),
    })

    setCached(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Analytics missed error:', error)
    return NextResponse.json(
      { error: 'Failed to compute analytics' },
      { status: 500 }
    )
  }
}

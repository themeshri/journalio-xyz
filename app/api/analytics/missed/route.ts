import { NextRequest, NextResponse } from 'next/server'
import { parseWalletParams, resolveFlattenedTrades, sanitizeForJSON } from '@/lib/server/resolve-trades'
import { getCached, setCached } from '@/lib/server/analytics-cache'
import { prisma } from '@/lib/prisma'
import { computeMissedTradeStats, computeHesitationCost } from '@/lib/analytics/missed-trades'

export async function GET(request: NextRequest) {
  try {
    const params = parseWalletParams(new URL(request.url).searchParams)
    if (params.addresses.length === 0) {
      return NextResponse.json({ error: 'No addresses provided' }, { status: 400 })
    }

    const cacheKey = `missed:${params.addresses.join(',')}:${params.dexes.join(',')}`
    const cached = getCached<any>(cacheKey)
    if (cached) return NextResponse.json(cached)

    // Fetch papered plays from DB
    const paperedPlays = await prisma.paperedPlay.findMany({
      where: { userId: 'default-user' },
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

    const trades = await resolveFlattenedTrades(params)

    const result = sanitizeForJSON({
      missedStats: computeMissedTradeStats(missedTrades),
      hesitationCost: computeHesitationCost(missedTrades, trades),
    })

    setCached(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Analytics missed error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute analytics' },
      { status: 500 }
    )
  }
}

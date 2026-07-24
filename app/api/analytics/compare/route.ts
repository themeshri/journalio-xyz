import { NextRequest, NextResponse } from 'next/server'
import { parseWalletParams, resolveFlattenedTrades, sanitizeForJSON } from '@/lib/server/resolve-trades'
import { getCached, setCached } from '@/lib/server/analytics-cache'
import { requireAuth } from '@/lib/auth-helper'
import { rateLimitByUser } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { computeStats } from '@/lib/analytics/helpers'
import { computeCumulativePL } from '@/lib/analytics/core'
import { parseTradeFilters, applyTradeFilters, type TradeFilterSet } from '@/lib/trade-filters'
import { journalKey } from '@/lib/journal-utils'
import type { JournalData } from '@/lib/types/journal'
import type { WhatIfStats } from '@/lib/analytics/types'

const checkUserRate = rateLimitByUser({ limit: 30, windowSeconds: 60, prefix: 'analytics-compare' })

/** Signed difference between two cohorts, B relative to A. */
function delta(a: WhatIfStats, b: WhatIfStats) {
  const round = (n: number) => Math.round(n * 100) / 100
  return {
    totalTrades: b.totalTrades - a.totalTrades,
    totalPnL: round(b.totalPnL - a.totalPnL),
    winRate: b.winRate - a.winRate,
    profitFactor: round(b.profitFactor - a.profitFactor),
    avgPnL: round(b.avgPnL - a.avgPnL),
  }
}

/**
 * GET /api/analytics/compare?a.outcome=win&b.outcome=loss&...
 *
 * Two independently-filtered cohorts side by side (docs §3.5 — one of the two
 * features Journalio lacked entirely). Filters are namespaced "a." and "b." in
 * the URL so the whole comparison is shareable and back-button-correct.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const limited = checkUserRate(userId)
    if (limited) return limited

    const { searchParams } = new URL(request.url)
    const params = parseWalletParams(searchParams, userId)
    if (params.addresses.length === 0) {
      return NextResponse.json({ error: 'No addresses provided' }, { status: 400 })
    }

    const filtersA = parseTradeFilters(searchParams, 'a.')
    const filtersB = parseTradeFilters(searchParams, 'b.')

    const cacheKey = `compare:${userId}:${params.addresses.join(',')}:${params.dexes.join(',')}:${JSON.stringify(filtersA)}:${JSON.stringify(filtersB)}`
    const cached = getCached<unknown>(cacheKey)
    if (cached) return NextResponse.json(cached)

    const allTrades = await resolveFlattenedTrades(params)

    // Journal context is only fetched when a cohort actually filters on it.
    const needsJournals = [filtersA, filtersB].some(
      (f: TradeFilterSet) =>
        f.strategyId !== undefined ||
        f.tagIds !== undefined ||
        f.minRating !== undefined ||
        f.reviewed !== undefined
    )

    let ctx = {}
    if (needsJournals) {
      const [journalRows, links] = await Promise.all([
        prisma.journalEntry.findMany({
          where: { userId, walletAddress: { in: params.addresses } },
        }),
        prisma.journalEntryTag.findMany({
          where: { journalEntry: { userId } },
          select: { journalEntryId: true, tagId: true },
        }),
      ])

      const journalMap: Record<string, JournalData & { id: string }> = {}
      for (const j of journalRows) {
        journalMap[journalKey(j)] = { ...j, id: j.id } as unknown as JournalData & { id: string }
      }
      const tagsByJournalId: Record<string, string[]> = {}
      for (const l of links) {
        const arr = tagsByJournalId[l.journalEntryId]
        if (arr) arr.push(l.tagId)
        else tagsByJournalId[l.journalEntryId] = [l.tagId]
      }
      ctx = { journalMap, tagsByJournalId }
    }

    const tradesA = applyTradeFilters(allTrades, filtersA, ctx)
    const tradesB = applyTradeFilters(allTrades, filtersB, ctx)

    const statsA = computeStats(tradesA)
    const statsB = computeStats(tradesB)

    const result = sanitizeForJSON({
      a: { filters: filtersA, stats: statsA, cumulativePL: computeCumulativePL(tradesA) },
      b: { filters: filtersB, stats: statsB, cumulativePL: computeCumulativePL(tradesB) },
      delta: delta(statsA, statsB),
      totalTrades: allTrades.length,
    })

    setCached(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Analytics compare error:', error)
    return NextResponse.json({ error: 'Failed to compare cohorts' }, { status: 500 })
  }
}

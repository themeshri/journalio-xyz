import { NextRequest, NextResponse } from 'next/server'
import { parseWalletParams, resolveFlattenedTrades, applyDateFilter, sanitizeForJSON } from '@/lib/server/resolve-trades'
import { getCached, setCached } from '@/lib/server/analytics-cache'
import { requireAuth } from '@/lib/auth-helper'
import { rateLimitByUser } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { computeTagCost } from '@/lib/analytics/discipline'
import { journalKey } from '@/lib/journal-utils'
import type { JournalData } from '@/lib/types/journal'

const checkUserRate = rateLimitByUser({ limit: 30, windowSeconds: 60, prefix: 'analytics-tags' })

/**
 * GET /api/analytics/tags — "what is costing me money".
 *
 * The payoff of the mistake/custom tag split (docs §2): the most compelling
 * insight a journal can show, as a plain aggregation.
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

    const cacheKey = `tags:${userId}:${params.addresses.join(',')}:${params.dexes.join(',')}:${searchParams.get('startDate') || ''}:${searchParams.get('endDate') || ''}`
    const cached = getCached<unknown>(cacheKey)
    if (cached) return NextResponse.json(cached)

    const [trades, journalRows, tagRows, links] = await Promise.all([
      resolveFlattenedTrades(params).then((t) => applyDateFilter(t, searchParams)),
      prisma.journalEntry.findMany({
        where: { userId, walletAddress: { in: params.addresses } },
      }),
      prisma.tradeTag.findMany({ where: { userId } }),
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

    const tagsById: Record<string, { label: string; kind: 'mistake' | 'custom' }> = {}
    for (const t of tagRows) {
      tagsById[t.id] = { label: t.label, kind: t.kind as 'mistake' | 'custom' }
    }

    const all = computeTagCost(trades, journalMap, tagsByJournalId, tagsById)

    const result = sanitizeForJSON({
      tags: all,
      mistakes: all.filter((t) => t.kind === 'mistake'),
      custom: all.filter((t) => t.kind === 'custom'),
      /** The headline: the three costliest mistakes. */
      topMistakes: all.filter((t) => t.kind === 'mistake' && t.totalPnL < 0).slice(0, 3),
    })

    setCached(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Analytics tags error:', error)
    return NextResponse.json({ error: 'Failed to compute tag analytics' }, { status: 500 })
  }
}

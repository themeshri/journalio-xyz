import { validateBody, upsertAdherenceSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'
import { rateLimitByUser } from '@/lib/rate-limit'
import { parseWalletParams, resolveFlattenedTrades } from '@/lib/server/resolve-trades'
import { backfillAdherence } from '@/lib/server/adherence'
import { computeAllRuleStats, computePeriodScore } from '@/lib/analytics/rule-stats'
import { getTradingDay } from '@/lib/trading-day'
import { journalKey } from '@/lib/journal-utils'
import type { RuleType } from '@/lib/rules-engine'
import type { JournalData } from '@/lib/types/journal'

export const maxDuration = 60

const checkUserRate = rateLimitByUser({ limit: 30, windowSeconds: 60, prefix: 'adherence' })

function parseJournal(j: { ruleResultsJson: string; sellMistakesJson: string }) {
  return {
    ...j,
    ruleResults: JSON.parse(j.ruleResultsJson || '[]'),
    sellMistakes: JSON.parse(j.sellMistakesJson || '[]'),
  } as unknown as JournalData
}

/**
 * GET /api/rules/adherence?from=YYYY-MM-DD&to=YYYY-MM-DD&addresses=...
 *
 * Returns adherence rows plus per-rule stats for the Progress Tracker.
 * Re-evaluates recent trading days first so history is populated rather than
 * only accumulating from the moment the feature shipped.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const limited = checkUserRate(userId)
    if (limited) return limited

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from') || undefined
    const to = searchParams.get('to') || undefined

    const [rules, settings] = await Promise.all([
      prisma.globalRule.findMany({ where: { userId }, orderBy: { sortOrder: 'asc' } }),
      prisma.userSettings.findUnique({
        where: { userId },
        select: { timezone: true, tradingStartTime: true },
      }),
    ])

    const timezone = settings?.timezone || 'UTC'
    const tradingStartTime = settings?.tradingStartTime || '09:00'

    if (rules.length > 0) {
      const params = parseWalletParams(searchParams, userId)
      if (params.addresses.length > 0) {
        const trades = await resolveFlattenedTrades(params)
        const journalRows = await prisma.journalEntry.findMany({
          where: { userId, walletAddress: { in: params.addresses } },
        })
        const journalMap: Record<string, JournalData> = {}
        for (const j of journalRows) {
          journalMap[journalKey(j)] = parseJournal(j)
        }

        await backfillAdherence({
          userId,
          rules,
          trades,
          journalMap,
          timezone,
          tradingStartTime,
        })
      }
    }

    const records = await prisma.ruleAdherence.findMany({
      where: {
        userId,
        ...(from || to
          ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
          : {}),
      },
      orderBy: { date: 'desc' },
    })

    const adherence = records.map((r) => ({
      ruleId: r.ruleId,
      date: r.date,
      followed: r.followed,
      actual: r.actual,
      source: r.source as 'auto' | 'manual',
    }))

    const today = getTradingDay(timezone, tradingStartTime)
    const stats = computeAllRuleStats(
      rules.map((r) => ({ id: r.id, type: r.type as RuleType })),
      adherence,
      today
    )

    return NextResponse.json({
      rules,
      adherence,
      stats,
      periodScore: computePeriodScore(adherence),
      today,
    })
  } catch (error) {
    return handleApiError(error, 'Failed to fetch rule adherence')
  }
}

/**
 * POST /api/rules/adherence — manual override for one rule on one day.
 * Writes `source: "manual"`, which auto-evaluation will not overwrite.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const limited = checkUserRate(userId)
    if (limited) return limited

    const body = await request.json()
    const validation = validateBody(upsertAdherenceSchema, body)
    if ('error' in validation) return validation.error
    const v = validation.data

    await ensureUserExists(userId, auth.email)

    // Ownership check — 404 rather than 403 (CLAUDE.md § Security).
    const rule = await prisma.globalRule.findUnique({ where: { id: v.ruleId } })
    if (!rule || rule.userId !== userId) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    const record = await prisma.ruleAdherence.upsert({
      where: { userId_ruleId_date: { userId, ruleId: v.ruleId, date: v.date } },
      update: { followed: v.followed, actual: v.actual, source: 'manual' },
      create: {
        userId,
        ruleId: v.ruleId,
        date: v.date,
        followed: v.followed,
        actual: v.actual,
        source: 'manual',
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Failed to record rule adherence')
  }
}

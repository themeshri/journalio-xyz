import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'
import { rateLimitByUser } from '@/lib/rate-limit'
import { parseWalletParams, mapDbRowsToTradeInput } from '@/lib/server/resolve-trades'
import { calculateTradeCycles, flattenTradeCycles } from '@/lib/tradeCycles'
import { APP_FEE_RATES } from '@/lib/constants'
import { DEFAULT_TRADE_COMMENTS } from '@/lib/trade-comments'
import { type Chain } from '@/lib/chains'
import { getTradingDay } from '@/lib/trading-day'
import { computeStreakFromDates } from '@/lib/streaks'
import { computeAllRuleStats } from '@/lib/analytics/rule-stats'
import { type RuleType } from '@/lib/rules-engine'

export const maxDuration = 60

function parseStrategy(s: any) {
  return {
    ...s,
    ruleGroups: JSON.parse(s.ruleGroupsJson || '[]'),
    ruleGroupsJson: undefined,
  }
}

function parseJournal(j: any) {
  return {
    ...j,
    ruleResults: JSON.parse(j.ruleResultsJson || '[]'),
    sellMistakes: JSON.parse(j.sellMistakesJson || '[]'),
    tagIds: Array.isArray(j.tags) ? j.tags.map((t: { tagId: string }) => t.tagId) : undefined,
    ruleResultsJson: undefined,
    sellMistakesJson: undefined,
    tags: undefined,
  }
}


/**
 * Batch-fetch all wallet trades in a single DB query, then group by wallet.
 */
async function batchResolveWalletTrades(
  walletParams: { address: string; chain: Chain; dex: string }[],
  userId: string
): Promise<Record<string, { trades: any[]; flattenedTrades: any[]; cached: boolean; cachedAt?: string }>> {
  if (walletParams.length === 0) return {}

  // Single query: fetch all matching wallets with their trades
  const wallets = await prisma.wallet.findMany({
    where: {
      userId,
      OR: walletParams.map((p) => ({ address: p.address, chain: p.chain })),
    },
    include: {
      trades: { orderBy: { timestamp: 'desc' } },
    },
  })

  // Index wallets by address:chain for fast lookup
  const walletMap = new Map<string, typeof wallets[0]>()
  for (const w of wallets) {
    walletMap.set(`${w.chain}:${w.address}`, w)
  }

  const result: Record<string, { trades: any[]; flattenedTrades: any[]; cached: boolean; cachedAt?: string }> = {}

  for (const p of walletParams) {
    const key = `${p.chain}:${p.address}`
    const wallet = walletMap.get(key)

    if (!wallet || wallet.trades.length === 0) {
      result[key] = { trades: [], flattenedTrades: [], cached: false }
      continue
    }

    const feeRate = APP_FEE_RATES[p.dex] || 0
    const trades = mapDbRowsToTradeInput(wallet.trades, { address: p.address, feeRate })

    const cycles = calculateTradeCycles(trades, p.chain, p.address)
    const flattenedTrades = flattenTradeCycles(cycles)

    const latestIndexedAt = wallet.trades.reduce((latest, t) => {
      const d = new Date(t.indexedAt)
      return d > latest ? d : latest
    }, new Date(0))

    result[key] = {
      trades,
      flattenedTrades,
      cached: true,
      cachedAt: latestIndexedAt.toISOString(),
    }
  }

  return result
}

// GET /api/dashboard?addresses=a1,a2&chains=solana,base&dexes=fomo,other
const checkUserRate = rateLimitByUser({ limit: 30, windowSeconds: 60, prefix: 'dashboard' })

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const userLimited = checkUserRate(userId)
    if (userLimited) return userLimited

    await ensureUserExists(userId, auth.email, true)

    const { searchParams } = new URL(request.url)
    const params = parseWalletParams(searchParams, userId)

    // If no addresses provided, fetch all saved wallets for this user
    const allSavedWallets = await prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    const savedWalletsResponse = allSavedWallets.map((w) => ({
      address: w.address,
      chain: w.chain,
      nickname: w.nickname || '',
      dex: w.dex || 'other',
    }))

    // Use provided addresses or fall back to all saved wallets
    const walletParams: { address: string; chain: Chain; dex: string }[] =
      params.addresses.length > 0
        ? params.addresses.map((address, i) => ({
            address,
            chain: (params.chains[i] || 'solana') as Chain,
            dex: params.dexes[i] || 'other',
          }))
        : allSavedWallets.map((w) => ({
            address: w.address,
            chain: w.chain as Chain,
            dex: w.dex || 'other',
          }))

    const emptyResponse = {
      walletTrades: {},
      tradeComments: [],
      strategies: [],
      journals: [],
      streak: { current: 0, longest: 0 },
      preSessionDone: false,
      postSessionDone: false,
      missedTrades: [],
      settings: { timezone: 'UTC', tradingStartTime: '09:00', onboardingStep: null as number | null },
      yearlyPreSessions: [],
      yearlyPostSessions: [],
      savedWallets: savedWalletsResponse,
      rules: [],
      adherence: [],
      ruleStats: [],
      tags: [],
      tagsByJournalId: {},
    }

    if (walletParams.length === 0) {
      return NextResponse.json(emptyResponse)
    }

    // Fetch user settings for timezone-aware trading day
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: userId },
      select: { timezone: true, tradingStartTime: true, onboardingStep: true },
    })
    const timezone = userSettings?.timezone || 'UTC'
    const tradingStartTime = userSettings?.tradingStartTime || '09:00'
    const todayDate = getTradingDay(timezone, tradingStartTime)

    // Current year range for yearly session queries.
    //
    // Derived from todayDate (the user's TRADING day), not from
    // new Date().getFullYear() (the server's UTC calendar year). Those can
    // disagree — e.g. a UTC+9 user just after New Year, or any user before
    // their tradingStartTime on Jan 1, has a trading day in the previous year.
    // Taking the year from todayDate guarantees the range contains todayDate,
    // which the preSessionDone/postSessionDone derivations below rely on.
    const year = Number(todayDate.slice(0, 4))
    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    // Addresses for journal queries
    const addresses = walletParams.map((p) => p.address)

    // Run all queries in parallel (batched wallet trades + metadata)
    // NOTE: today's pre/post-session status is NOT queried separately — it is
    // derived from the yearly arrays below, which are guaranteed to contain
    // todayDate (see the year derivation above). That removes two queries from
    // this fan-out; both appeared in the P2024 pool-timeout logs.
    const [walletTrades, tradeCommentsRaw, strategiesRaw, journalResults, missedTrades, yearlyPreSessionsRaw, yearlyPostSessionsRaw, rulesRaw, adherenceRaw, tagsRaw, tagLinksRaw] = await Promise.all([
      // Batched wallet trades (single DB query)
      batchResolveWalletTrades(walletParams, userId),
      // Trade comments (with one-time auto-seed).
      //
      // The seeding branch fires exactly once per user, ever. It used to do
      // findMany -> createMany -> findMany, i.e. acquire a pool connection
      // three times mid-fan-out (and perform a WRITE inside a read fan-out),
      // which is why tradeComment.createMany showed up in the P2024 logs.
      // The third query is now gone: createMany returns nothing useful, so we
      // re-read only when we must, and that read is the same one we already
      // needed. Steady state is a single findMany.
      (async () => {
        const comments = await prisma.tradeComment.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
        })
        if (comments.length > 0) return comments

        await prisma.tradeComment.createMany({
          data: DEFAULT_TRADE_COMMENTS.map((c) => ({
            userId,
            category: c.category,
            label: c.label,
            rating: c.rating,
          })),
        })
        // Re-read once so the response carries real ids/createdAt for the
        // rows just inserted — the client keys off comment.id.
        return prisma.tradeComment.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
        })
      })(),
      // Strategies
      prisma.strategy.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Journals for all wallet addresses (batched)
      prisma.journalEntry.findMany({
        where: { userId, walletAddress: { in: addresses } },
        orderBy: { createdAt: 'desc' },
        include: { tags: { select: { tagId: true } } },
      }),
      // Missed trades (papered plays)
      prisma.paperedPlay.findMany({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
      }),
      // Yearly pre-sessions for ActivityCalendar
      prisma.preSession.findMany({
        where: { userId, date: { gte: yearStart, lte: yearEnd } },
        select: { date: true, savedAt: true },
        orderBy: { date: 'asc' },
      }),
      // Yearly post-sessions for ActivityCalendar
      prisma.postSession.findMany({
        where: { userId, date: { gte: yearStart, lte: yearEnd } },
        select: { date: true },
        orderBy: { date: 'asc' },
      }),
      // Typed rules — drive the daily checklist and Progress Tracker badge
      prisma.globalRule.findMany({
        where: { userId },
        orderBy: { sortOrder: 'asc' },
      }),
      // This year's adherence, for the explainable ActivityCalendar score
      prisma.ruleAdherence.findMany({
        where: { userId, date: { gte: yearStart, lte: yearEnd } },
        select: { ruleId: true, date: true, followed: true, actual: true, source: true },
      }),
      // Tags + their journal links, for the mistake-cost summary
      prisma.tradeTag.findMany({
        where: { userId },
        orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
      }),
      prisma.journalEntryTag.findMany({
        where: { journalEntry: { userId } },
        select: { journalEntryId: true, tagId: true },
      }),
    ])

    // Parse strategies
    const strategies = strategiesRaw.map(parseStrategy)

    // Parse journals
    const allJournals = journalResults.map(parseJournal)

    // Compute streak from journaled dates
    const streak = computeStreakFromDates(
      allJournals.map((j) => j.journaledAt).filter(Boolean)
    )

    // Per-rule streak / follow-rate / average, so the sidebar and Progress
    // Tracker badge read from context rather than fetching separately.
    const adherence = adherenceRaw.map((a) => ({
      ruleId: a.ruleId,
      date: a.date,
      followed: a.followed,
      actual: a.actual,
      source: a.source as 'auto' | 'manual',
    }))
    const ruleStats = computeAllRuleStats(
      rulesRaw.map((r) => ({ id: r.id, type: r.type as RuleType })),
      adherence,
      todayDate
    )

    const tagsByJournalId: Record<string, string[]> = {}
    for (const l of tagLinksRaw) {
      const arr = tagsByJournalId[l.journalEntryId]
      if (arr) arr.push(l.tagId)
      else tagsByJournalId[l.journalEntryId] = [l.tagId]
    }

    const response = {
      walletTrades,
      tradeComments: tradeCommentsRaw,
      strategies,
      journals: allJournals,
      streak,
      rules: rulesRaw,
      adherence,
      ruleStats,
      tags: tagsRaw,
      tagsByJournalId,
      // Derived from the yearly arrays rather than two dedicated queries.
      // Semantics are unchanged: preSessionDone still requires a savedAt (a
      // started-but-unsaved pre-session does not count), postSessionDone still
      // only requires the row to exist.
      preSessionDone: !!yearlyPreSessionsRaw.find((s) => s.date === todayDate)?.savedAt,
      postSessionDone: yearlyPostSessionsRaw.some((s) => s.date === todayDate),
      missedTrades,
      settings: { timezone, tradingStartTime, onboardingStep: userSettings?.onboardingStep ?? null },
      yearlyPreSessions: yearlyPreSessionsRaw,
      yearlyPostSessions: yearlyPostSessionsRaw,
      savedWallets: savedWalletsResponse,
    }

    return NextResponse.json(response)
  } catch (error) {
    return handleApiError(error, 'Failed to load dashboard data')
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'
import { rateLimitByUser } from '@/lib/rate-limit'
import { parseWalletParams } from '@/lib/server/resolve-trades'
import { calculateTradeCycles, flattenTradeCycles, type TradeInput } from '@/lib/tradeCycles'
import { APP_FEE_RATES } from '@/lib/constants'
import { DEFAULT_TRADE_COMMENTS } from '@/lib/trade-comments'
import { type Chain } from '@/lib/chains'
import { getTradingDay } from '@/lib/trading-day'

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
    ruleResultsJson: undefined,
    sellMistakesJson: undefined,
  }
}

function computeStreak(journals: any[]): { current: number; longest: number } {
  const dates = new Set<string>()
  for (const j of journals) {
    if (j.journaledAt) dates.add(j.journaledAt.slice(0, 10))
  }
  if (dates.size === 0) return { current: 0, longest: 0 }

  const sortedDates = [...dates].sort().reverse()
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  let current = 0
  let checkDate = ''
  if (sortedDates[0] === today) checkDate = today
  else if (sortedDates[0] === yesterday) checkDate = yesterday

  if (checkDate) {
    const dateSet = new Set(sortedDates)
    let day = new Date(checkDate + 'T00:00:00')
    while (dateSet.has(day.toISOString().slice(0, 10))) {
      current++
      day = new Date(day.getTime() - 86400000)
    }
  }

  const allDatesAsc = [...dates].sort()
  let longest = 0
  let streak = 1
  for (let i = 1; i < allDatesAsc.length; i++) {
    const prev = new Date(allDatesAsc[i - 1] + 'T00:00:00')
    const curr = new Date(allDatesAsc[i] + 'T00:00:00')
    if ((curr.getTime() - prev.getTime()) / 86400000 === 1) {
      streak++
    } else {
      longest = Math.max(longest, streak)
      streak = 1
    }
  }
  longest = Math.max(longest, streak, current)

  return { current, longest }
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
    const trades: TradeInput[] = wallet.trades.map((t) => ({
      signature: t.signature,
      timestamp: t.timestamp,
      type: t.type,
      tokenIn: t.tokenInData ? JSON.parse(t.tokenInData) : null,
      tokenOut: t.tokenOutData ? JSON.parse(t.tokenOutData) : null,
      amountIn: t.amountIn ?? 0,
      amountOut: t.amountOut ?? 0,
      priceUSD: t.priceUSD ?? 0,
      valueUSD: feeRate > 0 ? t.valueUSD * (1 - feeRate) : t.valueUSD,
      dex: t.dex,
      maker: p.address,
    }))

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

    // Current year range for yearly session queries
    const year = new Date().getFullYear()
    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    // Addresses for journal queries
    const addresses = walletParams.map((p) => p.address)

    // Run all queries in parallel (batched wallet trades + metadata)
    const [walletTrades, tradeCommentsRaw, strategiesRaw, journalResults, todayPreSession, todayPostSession, missedTrades, yearlyPreSessionsRaw, yearlyPostSessionsRaw] = await Promise.all([
      // Batched wallet trades (single DB query)
      batchResolveWalletTrades(walletParams, userId),
      // Trade comments (with auto-seed)
      (async () => {
        let comments = await prisma.tradeComment.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
        })
        if (comments.length === 0) {
          await prisma.tradeComment.createMany({
            data: DEFAULT_TRADE_COMMENTS.map((c) => ({
              userId,
              category: c.category,
              label: c.label,
              rating: c.rating,
            })),
          })
          comments = await prisma.tradeComment.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'asc' },
          })
        }
        return comments
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
      }),
      // Today's pre-session status
      prisma.preSession.findFirst({
        where: { userId: userId, date: todayDate },
        select: { savedAt: true },
      }),
      // Today's post-session status
      prisma.postSession.findFirst({
        where: { userId: userId, date: todayDate },
        select: { id: true },
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
    ])

    // Parse strategies
    const strategies = strategiesRaw.map(parseStrategy)

    // Parse journals
    const allJournals = journalResults.map(parseJournal)

    // Compute streak
    const streak = computeStreak(allJournals)

    const response = {
      walletTrades,
      tradeComments: tradeCommentsRaw,
      strategies,
      journals: allJournals,
      streak,
      preSessionDone: !!(todayPreSession?.savedAt),
      postSessionDone: !!todayPostSession,
      missedTrades,
      settings: { timezone, tradingStartTime, onboardingStep: userSettings?.onboardingStep ?? null },
      yearlyPreSessions: yearlyPreSessionsRaw,
      yearlyPostSessions: yearlyPostSessionsRaw,
      savedWallets: savedWalletsResponse,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in dashboard endpoint:', error)
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}

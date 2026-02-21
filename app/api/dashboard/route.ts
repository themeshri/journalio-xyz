import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseWalletParams, resolveFlattenedTrades, sanitizeForJSON } from '@/lib/server/resolve-trades'
import { calculateTradeCycles, flattenTradeCycles } from '@/lib/tradeCycles'
import { APP_FEE_RATES } from '@/lib/constants'
import { DEFAULT_TRADE_COMMENTS } from '@/lib/trade-comments'
import { type Chain } from '@/lib/chains'

const defaultUserId = 'default-user'

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

async function resolveWalletTradesWithRaw(
  address: string,
  chain: Chain,
  dex: string
): Promise<{ trades: any[]; flattenedTrades: any[]; cached: boolean; cachedAt?: string }> {
  const wallet = await prisma.wallet.findFirst({
    where: { address, chain, userId: defaultUserId },
  })
  if (!wallet) return { trades: [], flattenedTrades: [], cached: false }

  const CACHE_TTL_MS = 5 * 60 * 1000
  const isFresh = wallet.updatedAt && (Date.now() - new Date(wallet.updatedAt).getTime()) < CACHE_TTL_MS

  const dbTrades = await prisma.trade.findMany({
    where: { walletId: wallet.id },
    orderBy: { timestamp: 'desc' },
  })

  if (dbTrades.length === 0) return { trades: [], flattenedTrades: [], cached: false }

  const feeRate = APP_FEE_RATES[dex] || 0
  const trades = dbTrades.map((t) => ({
    signature: t.signature,
    timestamp: t.timestamp,
    type: t.type,
    tokenIn: t.tokenInData ? JSON.parse(t.tokenInData) : null,
    tokenOut: t.tokenOutData ? JSON.parse(t.tokenOutData) : null,
    amountIn: t.amountIn,
    amountOut: t.amountOut,
    priceUSD: t.priceUSD,
    valueUSD: feeRate > 0 ? t.valueUSD * (1 - feeRate) : t.valueUSD,
    dex: t.dex,
    maker: address,
    _chain: chain,
    _walletAddress: address,
  }))

  const cycles = calculateTradeCycles(trades, chain, address)
  const flattenedTrades = flattenTradeCycles(cycles)

  // Find latest indexedAt for cache info
  const latestIndexedAt = dbTrades.reduce((latest, t) => {
    const d = new Date(t.indexedAt)
    return d > latest ? d : latest
  }, new Date(0))

  return {
    trades,
    flattenedTrades,
    cached: true,
    cachedAt: latestIndexedAt.toISOString(),
  }
}

// GET /api/dashboard?addresses=a1,a2&chains=solana,base&dexes=fomo,other
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = parseWalletParams(searchParams)

    if (params.addresses.length === 0) {
      return NextResponse.json({
        walletTrades: {},
        tradeComments: [],
        strategies: [],
        journals: [],
        streak: { current: 0, longest: 0 },
        preSessionDone: false,
        missedTrades: [],
      })
    }

    const todayDate = new Date().toISOString().slice(0, 10)

    // Run all queries in parallel
    const [walletTradeResults, tradeCommentsRaw, strategiesRaw, journalResults, todayPreSession, missedTrades] = await Promise.all([
      // Trades per wallet
      Promise.all(
        params.addresses.map((address, i) => {
          const chain = (params.chains[i] || 'solana') as Chain
          const dex = params.dexes[i] || 'other'
          return resolveWalletTradesWithRaw(address, chain, dex).then((result) => ({
            key: `${chain}:${address}`,
            ...result,
          }))
        })
      ),
      // Trade comments (with auto-seed)
      (async () => {
        let comments = await prisma.tradeComment.findMany({
          where: { userId: defaultUserId },
          orderBy: { createdAt: 'asc' },
        })
        if (comments.length === 0) {
          await prisma.user.upsert({
            where: { id: defaultUserId },
            create: { id: defaultUserId, email: 'default@example.com', name: 'Default User' },
            update: {},
          })
          await prisma.tradeComment.createMany({
            data: DEFAULT_TRADE_COMMENTS.map((c) => ({
              userId: defaultUserId,
              category: c.category,
              label: c.label,
              rating: c.rating,
            })),
          })
          comments = await prisma.tradeComment.findMany({
            where: { userId: defaultUserId },
            orderBy: { createdAt: 'asc' },
          })
        }
        return comments
      })(),
      // Strategies
      prisma.strategy.findMany({
        where: { userId: defaultUserId },
        orderBy: { createdAt: 'desc' },
      }),
      // Journals for all wallet addresses
      Promise.all(
        params.addresses.map((address) =>
          prisma.journalEntry.findMany({
            where: { userId: defaultUserId, walletAddress: address },
            orderBy: { createdAt: 'desc' },
          })
        )
      ),
      // Today's pre-session status
      prisma.preSession.findFirst({
        where: { userId: defaultUserId, date: todayDate },
        select: { savedAt: true },
      }),
      // Missed trades (papered plays)
      prisma.paperedPlay.findMany({
        where: { userId: defaultUserId },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    // Build walletTrades map
    const walletTrades: Record<string, any> = {}
    for (const result of walletTradeResults) {
      walletTrades[result.key] = {
        trades: result.trades,
        flattenedTrades: result.flattenedTrades,
        cached: result.cached,
        cachedAt: result.cachedAt,
      }
    }

    // Parse strategies
    const strategies = strategiesRaw.map(parseStrategy)

    // Parse and flatten journals
    const allJournals = journalResults.flat().map(parseJournal)

    // Compute streak
    const streak = computeStreak(allJournals)

    const response = {
      walletTrades,
      tradeComments: tradeCommentsRaw,
      strategies,
      journals: allJournals,
      streak,
      preSessionDone: !!(todayPreSession?.savedAt),
      missedTrades,
    }

    return NextResponse.json(sanitizeForJSON(response))
  } catch (error) {
    console.error('Error in dashboard endpoint:', error)
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}

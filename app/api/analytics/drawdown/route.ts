import { NextRequest, NextResponse } from 'next/server'
import { parseWalletParams, resolveFlattenedTrades, applyDateFilter, sanitizeForJSON } from '@/lib/server/resolve-trades'
import { getCached, setCached } from '@/lib/server/analytics-cache'
import { requireAuth } from '@/lib/auth-helper'
import { rateLimitByUser } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { computeDrawdown } from '@/lib/analytics/drawdown'

const checkUserRate = rateLimitByUser({ limit: 30, windowSeconds: 60, prefix: 'analytics-drawdown' })

/**
 * GET /api/analytics/drawdown — account balance curve and max drawdown.
 *
 * Returns `hasInitialBalance: false` when no wallet has one set, so the UI can
 * render a named empty state ("Please add an initial balance") rather than a
 * misleading curve anchored at zero.
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

    const cacheKey = `drawdown:${userId}:${params.addresses.join(',')}:${params.dexes.join(',')}:${searchParams.get('startDate') || ''}:${searchParams.get('endDate') || ''}`
    const cached = getCached<unknown>(cacheKey)
    if (cached) return NextResponse.json(cached)

    const [trades, wallets] = await Promise.all([
      resolveFlattenedTrades(params).then((t) => applyDateFilter(t, searchParams)),
      prisma.wallet.findMany({
        where: { userId, address: { in: params.addresses } },
        select: { address: true, initialBalance: true },
      }),
    ])

    // Combined starting equity across the selected wallets. Wallets with no
    // balance set contribute nothing rather than defaulting to zero.
    const withBalance = wallets.filter((w) => w.initialBalance != null)
    const initialBalance = withBalance.reduce((s, w) => s + (w.initialBalance || 0), 0)

    if (withBalance.length === 0 || initialBalance <= 0) {
      return NextResponse.json({
        hasInitialBalance: false,
        walletsMissingBalance: wallets.map((w) => w.address),
      })
    }

    const result = sanitizeForJSON({
      hasInitialBalance: true,
      walletsMissingBalance: wallets
        .filter((w) => w.initialBalance == null)
        .map((w) => w.address),
      ...computeDrawdown(trades, initialBalance),
    })

    setCached(cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Analytics drawdown error:', error)
    return NextResponse.json({ error: 'Failed to compute drawdown' }, { status: 500 })
  }
}

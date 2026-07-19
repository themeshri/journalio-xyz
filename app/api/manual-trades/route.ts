import { validateBody, createManualTradesSchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'
import { rateLimitByUser } from '@/lib/rate-limit'

const checkRateLimit = rateLimitByUser({ limit: 20, windowSeconds: 60, prefix: 'manual-trades' })

// POST - Create manual trade entries
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const limited = checkRateLimit(userId)
    if (limited) return limited

    await ensureUserExists(userId, auth.email)

    const body = await request.json()
    const validation = validateBody(createManualTradesSchema, body)
    if ('error' in validation) return validation.error
    const { trades } = validation.data

    // Resolve each distinct wallet address once (create if missing), rather
    // than querying/creating per-trade.
    const walletIdByAddress = new Map<string, string>()
    for (const t of trades) {
      if (walletIdByAddress.has(t.walletAddress)) continue
      let wallet = await prisma.wallet.findFirst({
        where: { address: t.walletAddress, userId },
      })
      if (!wallet) {
        wallet = await prisma.wallet.create({
          data: {
            address: t.walletAddress,
            chain: t.chain || 'solana',
            userId,
          },
        })
      }
      walletIdByAddress.set(t.walletAddress, wallet.id)
    }

    const rows = trades.map((t) => ({
      walletId: walletIdByAddress.get(t.walletAddress)!,
      signature: t.signature,
      timestamp: t.timestamp,
      type: t.type || 'trade',
      status: 'confirmed',
      direction: 'out',
      chain: t.chain || 'solana',
      tokenInData: t.tokenIn ? JSON.stringify(t.tokenIn) : null,
      tokenOutData: t.tokenOut ? JSON.stringify(t.tokenOut) : null,
      amountIn: t.amountIn || 0,
      amountOut: t.amountOut || 0,
      priceUSD: t.priceUSD || 0,
      valueUSD: t.valueUSD || 0,
      dex: t.dex || 'Manual',
    }))

    // Batch insert; skipDuplicates avoids the whole request 500ing when a
    // signature already exists for the wallet (@@unique([walletId, signature])).
    const result = await prisma.trade.createMany({
      data: rows,
      skipDuplicates: true,
    })

    return NextResponse.json({ created: result.count, submitted: rows.length })
  } catch (error) {
    console.error('Manual trade creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create manual trade' },
      { status: 500 }
    )
  }
}

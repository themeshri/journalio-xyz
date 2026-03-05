import { validateBody, createManualTradesSchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'

// POST - Create manual trade entries
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId
    const body = await request.json()
    const validation = validateBody(createManualTradesSchema, body)
    if ('error' in validation) return validation.error
    const { trades } = validation.data

    const results = []

    for (const t of trades) {
      // Find wallet by address
      let wallet = await prisma.wallet.findFirst({
        where: { address: t.walletAddress, userId: userId },
      })

      if (!wallet) {
        // Create wallet if it doesn't exist
        wallet = await prisma.wallet.create({
          data: {
            address: t.walletAddress,
            chain: t.chain || 'solana',
            userId: userId,
          },
        })
      }

      const trade = await prisma.trade.create({
        data: {
          walletId: wallet.id,
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
        },
      })

      results.push(trade)
    }

    return NextResponse.json({ trades: results })
  } catch (error) {
    console.error('Manual trade creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create manual trade' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Create manual trade entries
export async function POST(request: NextRequest) {
  try {
    const defaultUserId = 'default-user'
    const { trades } = await request.json()

    if (!Array.isArray(trades) || trades.length === 0) {
      return NextResponse.json({ error: 'trades array is required' }, { status: 400 })
    }

    const results = []

    for (const t of trades) {
      // Find wallet by address
      let wallet = await prisma.wallet.findFirst({
        where: { address: t.walletAddress, userId: defaultUserId },
      })

      if (!wallet) {
        // Create wallet if it doesn't exist
        wallet = await prisma.wallet.create({
          data: {
            address: t.walletAddress,
            chain: t.chain || 'solana',
            userId: defaultUserId,
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
  } catch (error: any) {
    console.error('Manual trade creation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create manual trade' },
      { status: 500 }
    )
  }
}

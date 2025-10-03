import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWalletTrades } from '@/lib/solana-tracker'

// GET - Get trades for a wallet (from cache or API)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('address')
    const forceRefresh = searchParams.get('refresh') === 'true'

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    // Find or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: {
        userId_address: {
          userId: session.user.id,
          address: walletAddress,
        },
      },
    })

    if (!wallet) {
      // Auto-create wallet if it doesn't exist
      wallet = await prisma.wallet.create({
        data: {
          userId: session.user.id,
          address: walletAddress,
        },
      })
    }

    // Check cache freshness (5 minutes)
    const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
    const cachedTrades = await prisma.trade.findMany({
      where: {
        walletId: wallet.id,
      },
      orderBy: {
        timestamp: 'desc',
      },
    })

    const cacheAge = cachedTrades.length > 0
      ? Date.now() - cachedTrades[0].indexedAt.getTime()
      : Infinity

    // Return cached data if fresh and not forcing refresh
    if (!forceRefresh && cacheAge < CACHE_DURATION && cachedTrades.length > 0) {
      const trades = cachedTrades.map(trade => ({
        signature: trade.signature,
        timestamp: trade.timestamp,
        type: trade.type,
        tokenIn: JSON.parse(trade.tokenInData),
        tokenOut: JSON.parse(trade.tokenOutData),
        amountIn: trade.amountIn,
        amountOut: trade.amountOut,
        priceUSD: trade.priceUSD,
        valueUSD: trade.valueUSD,
        dex: trade.dex,
        maker: walletAddress,
      }))

      return NextResponse.json({
        trades,
        cached: true,
        cachedAt: cachedTrades[0].indexedAt
      })
    }

    // Fetch fresh data from API
    try {
      const apiTrades = await getWalletTrades(walletAddress, 50)

      // Cache new trades (upsert to avoid duplicates)
      for (const trade of apiTrades) {
        await prisma.trade.upsert({
          where: {
            signature: trade.signature,
          },
          create: {
            walletId: wallet.id,
            signature: trade.signature,
            timestamp: trade.timestamp,
            type: trade.type,
            tokenInData: JSON.stringify(trade.tokenIn),
            tokenOutData: JSON.stringify(trade.tokenOut),
            amountIn: trade.amountIn,
            amountOut: trade.amountOut,
            priceUSD: trade.priceUSD,
            valueUSD: trade.valueUSD,
            dex: trade.dex,
          },
          update: {
            // Update indexed time
            indexedAt: new Date(),
          },
        })
      }

      return NextResponse.json({
        trades: apiTrades,
        cached: false,
        fetchedAt: new Date()
      })
    } catch (apiError) {
      // If API fails, return cached data even if stale
      if (cachedTrades.length > 0) {
        const trades = cachedTrades.map(trade => ({
          signature: trade.signature,
          timestamp: trade.timestamp,
          type: trade.type,
          tokenIn: JSON.parse(trade.tokenInData),
          tokenOut: JSON.parse(trade.tokenOutData),
          amountIn: trade.amountIn,
          amountOut: trade.amountOut,
          priceUSD: trade.priceUSD,
          valueUSD: trade.valueUSD,
          dex: trade.dex,
          maker: walletAddress,
        }))

        return NextResponse.json({
          trades,
          cached: true,
          stale: true,
          cachedAt: cachedTrades[0].indexedAt,
          error: 'API unavailable, showing cached data'
        })
      }

      throw apiError
    }
  } catch (error) {
    console.error('Error fetching trades:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch trades'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

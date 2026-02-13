import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWalletTrades } from '@/lib/moralis'

// GET - Get trades for a wallet (from cache or API)
export async function GET(request: NextRequest) {
  try {
    // Authentication removed - app works without sign-in
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }
    
    // Use a default user ID for all requests
    const defaultUserId = 'default-user'

    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('address')
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    // Auto-detect chain if not provided
    let chain = searchParams.get('chain')
    if (!chain && walletAddress) {
      // Auto-detect chain based on address format
      if (/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        chain = 'ethereum'
      } else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(walletAddress)) {
        chain = 'solana'
      } else {
        chain = 'ethereum' // Default fallback
      }
    } else if (!chain) {
      chain = 'ethereum' // Default to Ethereum
    }

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    console.log('Processing request for wallet:', walletAddress, 'chain:', chain)

    // Find or create wallet (with chain support)
    let wallet = await prisma.wallet.findFirst({
      where: {
        userId: defaultUserId,
        address: walletAddress,
        chain: chain,
      },
    })

    if (!wallet) {
      // First ensure the default user exists
      await prisma.user.upsert({
        where: { id: defaultUserId },
        create: { 
          id: defaultUserId,
          email: 'default@example.com',
          name: 'Default User'
        },
        update: {},
      })
      
      // Auto-create wallet if it doesn't exist
      wallet = await prisma.wallet.create({
        data: {
          userId: defaultUserId,
          address: walletAddress,
          chain: chain,
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
        tokenIn: trade.tokenInData ? JSON.parse(trade.tokenInData) : null,
        tokenOut: trade.tokenOutData ? JSON.parse(trade.tokenOutData) : null,
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

    // Fetch fresh data from Moralis API
    try {
      console.log('Fetching trades for:', walletAddress, 'chain:', chain);
      const apiTrades = await getWalletTrades(walletAddress, 50);
      console.log('Retrieved', apiTrades?.length || 0, 'trades from Moralis');

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
            status: "confirmed",
            direction: trade.type === 'buy' ? 'in' : 'out',
            chain: chain,
            tokenInData: trade.tokenIn ? JSON.stringify(trade.tokenIn) : null,
            tokenOutData: trade.tokenOut ? JSON.stringify(trade.tokenOut) : null,
            amountIn: trade.amountIn,
            amountOut: trade.amountOut,
            priceUSD: trade.priceUSD,
            valueUSD: trade.valueUSD,
            dex: trade.dex,
            protocol: trade.dex,
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
      console.error('Moralis API error:', apiError);
      
      // If API fails, return cached data even if stale
      if (cachedTrades.length > 0) {
        const trades = cachedTrades.map(trade => ({
          signature: trade.signature,
          timestamp: trade.timestamp,
          type: trade.type,
          tokenIn: trade.tokenInData ? JSON.parse(trade.tokenInData) : null,
          tokenOut: trade.tokenOutData ? JSON.parse(trade.tokenOutData) : null,
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

      // Return more specific error
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown API error';
      throw new Error(`Moralis API failed: ${errorMessage}`)
    }
  } catch (error) {
    console.error('Error fetching trades:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    const message = error instanceof Error ? error.message : 'Failed to fetch trades'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

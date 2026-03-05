import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'
import { rateLimitByUser } from '@/lib/rate-limit'
import { getWalletTrades as getSolanaWalletTrades } from '@/lib/solana-tracker'
import { getWalletTrades as getEvmWalletTrades } from '@/lib/zerion'
import { type Chain, isEvmChain } from '@/lib/chains'
import { calculateTradeCycles, flattenTradeCycles, type TradeInput } from '@/lib/tradeCycles'
import { APP_FEE_RATES } from '@/lib/constants'
import { invalidatePrefix } from '@/lib/server/analytics-cache'
import { type FlattenedTrade } from '@/lib/tradeCycles'

interface TradesResponse {
  trades: TradeInput[]
  cached: boolean
  cachedAt: Date | string
  stale?: boolean
  error?: string
  flattenedTrades?: FlattenedTrade[]
}

// Allow up to 60s for fetching trades from external APIs
export const maxDuration = 60

const checkUserRate = rateLimitByUser({ limit: 30, windowSeconds: 60, prefix: 'trades' })

// GET - Get trades for a wallet (from cache or API)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const userLimited = checkUserRate(userId)
    if (userLimited) return userLimited

    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('address')
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    // Read chain from query param (default to solana for backward compat)
    const chain = (searchParams.get('chain') || 'solana') as Chain
    const wantCycles = searchParams.get('cycles') === 'true'
    const dex = searchParams.get('dex') || ''

    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 })
    }

    // Find or create wallet (with chain support)
    let wallet = await prisma.wallet.findFirst({
      where: {
        userId: userId,
        address: walletAddress,
        chain: chain,
      },
    })

    if (!wallet) {
      // Ensure the user exists in DB
      await ensureUserExists(userId, auth.email)
      
      // Auto-create wallet if it doesn't exist
      wallet = await prisma.wallet.create({
        data: {
          userId: userId,
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

    // Determine cache age from the most recently indexed trade (not the most recent by timestamp)
    const lastIndexed = await prisma.trade.findFirst({
      where: { walletId: wallet.id },
      orderBy: { indexedAt: 'desc' },
      select: { indexedAt: true },
    })
    const cacheAge = lastIndexed
      ? Date.now() - lastIndexed.indexedAt.getTime()
      : Infinity

    // Return cached data if fresh and not forcing refresh
    if (!forceRefresh && cacheAge < CACHE_DURATION && cachedTrades.length > 0) {
      const trades: TradeInput[] = cachedTrades.map(trade => ({
        signature: trade.signature,
        timestamp: trade.timestamp,
        type: trade.type,
        tokenIn: trade.tokenInData ? JSON.parse(trade.tokenInData) : null,
        tokenOut: trade.tokenOutData ? JSON.parse(trade.tokenOutData) : null,
        amountIn: trade.amountIn ?? 0,
        amountOut: trade.amountOut ?? 0,
        priceUSD: trade.priceUSD ?? 0,
        valueUSD: trade.valueUSD,
        dex: trade.dex,
        maker: walletAddress,
      }))

      const response: TradesResponse = { trades, cached: true, cachedAt: cachedTrades[0].indexedAt }
      if (wantCycles) {
        const feeRate = APP_FEE_RATES[dex] || 0
        const adjusted = feeRate > 0
          ? trades.map(t => ({ ...t, valueUSD: t.valueUSD * (1 - feeRate), _chain: chain, _walletAddress: walletAddress }))
          : trades.map(t => ({ ...t, _chain: chain, _walletAddress: walletAddress }))
        const cycles = calculateTradeCycles(adjusted, chain, walletAddress)
        response.flattenedTrades = flattenTradeCycles(cycles)
      }
      return NextResponse.json(response)
    }

    // Fetch fresh data from appropriate API
    try {
      const apiTrades = isEvmChain(chain)
        ? await getEvmWalletTrades(walletAddress, 1000, chain)
        : await getSolanaWalletTrades(walletAddress, 1000);
      // Find existing trade signatures to only process new ones
      const existingSignatures = new Set(cachedTrades.map(t => t.signature));
      const newTrades = apiTrades.filter(trade => !existingSignatures.has(trade.signature));
      
      // Cache new trades in batches (pgBouncer can timeout on large single inserts)
      if (newTrades.length > 0) {
        const BATCH_SIZE = 200
        const tradeData = newTrades.map(trade => ({
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
          indexedAt: new Date(),
        }))

        let storedCount = 0
        for (let i = 0; i < tradeData.length; i += BATCH_SIZE) {
          const batch = tradeData.slice(i, i + BATCH_SIZE)
          try {
            const result = await prisma.trade.createMany({
              data: batch,
              skipDuplicates: true,
            })
            storedCount += result.count
          } catch (batchError) {
            console.error(`Failed to store batch ${i / BATCH_SIZE + 1}:`, batchError instanceof Error ? batchError.message : batchError)
          }
        }
      }

      // Invalidate analytics cache for this wallet on fresh fetch
      invalidatePrefix(walletAddress)

      const freshResponse: TradesResponse = { trades: apiTrades, cached: false, cachedAt: new Date().toISOString() }
      if (wantCycles) {
        const feeRate = APP_FEE_RATES[dex] || 0
        const adjusted = feeRate > 0
          ? apiTrades.map(t => ({ ...t, valueUSD: t.valueUSD * (1 - feeRate), _chain: chain, _walletAddress: walletAddress }))
          : apiTrades.map(t => ({ ...t, _chain: chain, _walletAddress: walletAddress }))
        const cycles = calculateTradeCycles(adjusted, chain, walletAddress)
        freshResponse.flattenedTrades = flattenTradeCycles(cycles)
      }
      return NextResponse.json(freshResponse)
    } catch (apiError) {
      console.error(`${isEvmChain(chain) ? 'Zerion' : 'Solana Tracker'} API error:`, apiError);
      
      // If API fails, return cached data even if stale
      if (cachedTrades.length > 0) {
        const trades: TradeInput[] = cachedTrades.map(trade => ({
          signature: trade.signature,
          timestamp: trade.timestamp,
          type: trade.type,
          tokenIn: trade.tokenInData ? JSON.parse(trade.tokenInData) : null,
          tokenOut: trade.tokenOutData ? JSON.parse(trade.tokenOutData) : null,
          amountIn: trade.amountIn ?? 0,
          amountOut: trade.amountOut ?? 0,
          priceUSD: trade.priceUSD ?? 0,
          valueUSD: trade.valueUSD,
          dex: trade.dex,
          maker: walletAddress,
        }))

        const staleResponse: TradesResponse = {
          trades,
          cached: true,
          stale: true,
          cachedAt: cachedTrades[0].indexedAt,
          error: 'API unavailable, showing cached data'
        }
        if (wantCycles) {
          const feeRate = APP_FEE_RATES[dex] || 0
          const adjusted = feeRate > 0
            ? trades.map(t => ({ ...t, valueUSD: t.valueUSD * (1 - feeRate), _chain: chain, _walletAddress: walletAddress }))
            : trades.map(t => ({ ...t, _chain: chain, _walletAddress: walletAddress }))
          const cycles = calculateTradeCycles(adjusted, chain, walletAddress)
          staleResponse.flattenedTrades = flattenTradeCycles(cycles)
        }
        return NextResponse.json(staleResponse)
      }

      // Log details server-side, return generic message to client
      const errorMessage = apiError instanceof Error ? apiError.message : 'Unknown API error';
      const apiName = isEvmChain(chain) ? 'Zerion' : 'Solana Tracker';
      console.error(`${apiName} API failed:`, errorMessage)
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 502 })
    }
  } catch (error) {
    console.error('Error fetching trades:', error)
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
  }
}

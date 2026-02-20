// Shared server utility: fetch cached trades from DB, compute trade cycles, apply fee deduction
import { prisma } from '@/lib/prisma'
import { calculateTradeCycles, flattenTradeCycles, type FlattenedTrade } from '@/lib/tradeCycles'
import { APP_FEE_RATES } from '@/lib/constants'
import { type Chain } from '@/lib/chains'

export interface WalletParams {
  addresses: string[]
  chains: Chain[]
  dexes: string[]
}

/** Parse wallet params from query string (GET endpoints) */
export function parseWalletParams(searchParams: URLSearchParams): WalletParams {
  const addresses = (searchParams.get('addresses') || '').split(',').filter(Boolean)
  const chains = (searchParams.get('chains') || '').split(',').filter(Boolean) as Chain[]
  const dexes = (searchParams.get('dexes') || '').split(',').filter(Boolean)
  return { addresses, chains, dexes }
}

/** Parse wallet params from POST body */
export function parseWalletParamsFromBody(body: any): WalletParams {
  return {
    addresses: body.addresses || [],
    chains: body.chains || [],
    dexes: body.dexes || [],
  }
}

// --- In-flight deduplication + TTL cache for resolved trades ---

const CACHE_TTL_MS = 60_000 // 1 minute
const ttlCache = new Map<string, { data: FlattenedTrade[]; expiresAt: number }>()
const inflightCache = new Map<string, Promise<FlattenedTrade[]>>()

function getCached(key: string): FlattenedTrade[] | null {
  const entry = ttlCache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    ttlCache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key: string, data: FlattenedTrade[]): void {
  ttlCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

/** Resolve flattened trades for a single wallet from DB cache */
async function resolveWalletTrades(
  address: string,
  chain: Chain,
  dex: string
): Promise<FlattenedTrade[]> {
  const wallet = await prisma.wallet.findFirst({
    where: { address, chain, userId: 'default-user' },
  })
  if (!wallet) return []

  const dbTrades = await prisma.trade.findMany({
    where: { walletId: wallet.id },
    orderBy: { timestamp: 'desc' },
  })
  if (dbTrades.length === 0) return []

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
  return flattenTradeCycles(cycles)
}

/** Resolve flattened trades for one or more wallets from DB cache */
export async function resolveFlattenedTrades(params: WalletParams): Promise<FlattenedTrade[]> {
  const { addresses, chains, dexes } = params
  if (addresses.length === 0) return []

  const cacheKey = `trades:${addresses.join(',')}:${dexes.join(',')}`

  // Check TTL cache first
  const cached = getCached(cacheKey)
  if (cached) return cached

  // Check in-flight deduplication — reuse the same promise if another
  // request for the same wallets is already running
  const inflight = inflightCache.get(cacheKey)
  if (inflight) return inflight

  const promise = (async () => {
    // Parallelize wallet queries with Promise.all
    const results = await Promise.all(
      addresses.map((address, i) => {
        const chain = (chains[i] || 'solana') as Chain
        const dex = dexes[i] || ''
        return resolveWalletTrades(address, chain, dex)
      })
    )
    return results.flat().sort((a, b) => b.startDate - a.startDate)
  })()

  inflightCache.set(cacheKey, promise)

  try {
    const result = await promise
    setCached(cacheKey, result)
    return result
  } finally {
    inflightCache.delete(cacheKey)
  }
}

/**
 * Replace Infinity values with null for JSON serialization.
 * JSON.stringify silently converts Infinity to null, but we do it explicitly
 * so the client can distinguish and display "∞".
 */
export function sanitizeForJSON(obj: unknown): unknown {
  return JSON.parse(
    JSON.stringify(obj, (_key, value) =>
      value === Infinity ? null : value === -Infinity ? null : value
    )
  )
}

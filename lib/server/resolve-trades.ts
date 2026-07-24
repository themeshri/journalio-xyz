// Shared server utility: fetch cached trades from DB, compute trade cycles, apply fee deduction
import { prisma } from '@/lib/prisma'
import { calculateTradeCycles, flattenTradeCycles, type FlattenedTrade, type TradeInput } from '@/lib/tradeCycles'
import { APP_FEE_RATES } from '@/lib/constants'
import { type Chain } from '@/lib/chains'
import { parseTradeFilters, applyTradeFilters } from '@/lib/trade-filters'

export interface WalletParams {
  addresses: string[]
  chains: Chain[]
  dexes: string[]
  userId: string
}

/** Parse wallet params from query string (GET endpoints) */
export function parseWalletParams(searchParams: URLSearchParams, userId: string): WalletParams {
  const addresses = (searchParams.get('addresses') || '').split(',').filter(Boolean)
  const chains = (searchParams.get('chains') || '').split(',').filter(Boolean) as Chain[]
  const dexes = (searchParams.get('dexes') || '').split(',').filter(Boolean)
  return { addresses, chains, dexes, userId }
}

/** Parse wallet params from POST body */
export function parseWalletParamsFromBody(body: any, userId: string): WalletParams {
  return {
    addresses: body.addresses || [],
    chains: body.chains || [],
    dexes: body.dexes || [],
    userId,
  }
}

/** Minimal shape of a cached DB Trade row consumed by the row→TradeInput projection. */
export interface DbTradeRow {
  signature: string
  timestamp: number
  type: string
  tokenInData: string | null
  tokenOutData: string | null
  amountIn: number | null
  amountOut: number | null
  priceUSD: number | null
  valueUSD: number
  dex: string
}

/**
 * Project cached DB trade rows into the `TradeInput` shape used by
 * `calculateTradeCycles`. This is the single source of the row-mapping logic
 * that previously lived (copy-pasted) in dashboard/route.ts, trades/route.ts,
 * and resolveWalletTrades below.
 *
 * @param opts.address  becomes the `maker` on each TradeInput.
 * @param opts.feeRate  when > 0, `valueUSD` is multiplied by (1 - feeRate)
 *   ("fee-inside", as used by dashboard + resolveWalletTrades). DEFAULTS TO 0
 *   (raw valueUSD) — trades/route.ts relies on this and applies its fee later,
 *   at cycle time. Passing a non-zero feeRate here AND applying the fee again
 *   downstream would double-count it.
 */
export function mapDbRowsToTradeInput(
  rows: DbTradeRow[],
  opts: { address: string; feeRate?: number }
): TradeInput[] {
  const feeRate = opts.feeRate ?? 0
  return rows.map((t) => ({
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
    maker: opts.address,
  }))
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
  dex: string,
  userId: string
): Promise<FlattenedTrade[]> {
  const wallet = await prisma.wallet.findFirst({
    where: { address, chain, userId },
  })
  if (!wallet) return []

  const dbTrades = await prisma.trade.findMany({
    where: { walletId: wallet.id },
    orderBy: { timestamp: 'desc' },
  })
  if (dbTrades.length === 0) return []

  const feeRate = APP_FEE_RATES[dex] || 0
  const trades = mapDbRowsToTradeInput(dbTrades, { address, feeRate })

  const cycles = calculateTradeCycles(trades, chain, address)
  return flattenTradeCycles(cycles)
}

/** Resolve flattened trades for one or more wallets from DB cache */
export async function resolveFlattenedTrades(params: WalletParams): Promise<FlattenedTrade[]> {
  const { addresses, chains, dexes, userId } = params
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
        return resolveWalletTrades(address, chain, dex, userId)
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
 * Apply optional startDate/endDate filters from search params.
 *
 * Thin wrapper over `applyTradeFilters` (lib/trade-filters.ts), which
 * generalises this to the full filter vocabulary for the Compare view. Kept as
 * its own export so the six /api/analytics/* routes are untouched — this reads
 * ONLY the date keys, exactly as it always did.
 */
export function applyDateFilter(trades: FlattenedTrade[], searchParams: URLSearchParams): FlattenedTrade[] {
  const { startDate, endDate } = parseTradeFilters(searchParams)
  return applyTradeFilters(trades, { startDate, endDate })
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

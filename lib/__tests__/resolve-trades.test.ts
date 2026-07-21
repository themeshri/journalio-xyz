/**
 * @jest-environment node
 *
 * Characterization tests for the shared DB-row→TradeInput projection
 * (lib/server/resolve-trades.ts:mapDbRowsToTradeInput). resolve-trades.ts
 * imports @/lib/prisma at module load, so use the node env.
 *
 * Pins BOTH fee strategies:
 *   - fee-inside (feeRate > 0): valueUSD multiplied in the map — as used by
 *     dashboard/route.ts and resolveWalletTrades.
 *   - fee-off (default): raw valueUSD — as used by trades/route.ts, which
 *     applies the fee later at cycle time. A regression that flipped the
 *     default to fee-inside would DOUBLE-COUNT the fee on the trades route.
 */
import { mapDbRowsToTradeInput, type DbTradeRow } from '../server/resolve-trades'

const tokenIn = { address: 'InMint', symbol: 'IN', decimals: 6 }
const tokenOut = { address: 'OutMint', symbol: 'OUT', decimals: 9 }

const row = (over: Partial<DbTradeRow> = {}): DbTradeRow => ({
  signature: 'sig1',
  timestamp: 1000,
  type: 'buy',
  tokenInData: JSON.stringify(tokenIn),
  tokenOutData: JSON.stringify(tokenOut),
  amountIn: 5,
  amountOut: 7,
  priceUSD: 2,
  valueUSD: 100,
  dex: 'fomo',
  ...over,
})

describe('mapDbRowsToTradeInput', () => {
  it('projects all fields and parses token JSON; maker = address', () => {
    const [t] = mapDbRowsToTradeInput([row()], { address: 'WALLET' })
    expect(t).toEqual({
      signature: 'sig1',
      timestamp: 1000,
      type: 'buy',
      tokenIn,
      tokenOut,
      amountIn: 5,
      amountOut: 7,
      priceUSD: 2,
      valueUSD: 100, // fee off by default → raw
      dex: 'fomo',
      maker: 'WALLET',
    })
  })

  it('default (no feeRate) keeps valueUSD RAW — the trades-route contract', () => {
    const [t] = mapDbRowsToTradeInput([row({ valueUSD: 250 })], { address: 'W' })
    expect(t.valueUSD).toBe(250)
  })

  it('feeRate > 0 applies fee INSIDE the map — the dashboard/resolve contract', () => {
    const [t] = mapDbRowsToTradeInput([row({ valueUSD: 100 })], { address: 'W', feeRate: 0.01 })
    expect(t.valueUSD).toBeCloseTo(99, 10) // 100 * (1 - 0.01)
  })

  it('feeRate = 0 explicitly is treated as raw (no multiply)', () => {
    const [t] = mapDbRowsToTradeInput([row({ valueUSD: 100 })], { address: 'W', feeRate: 0 })
    expect(t.valueUSD).toBe(100)
  })

  it('null token data → null; nullish numeric fields → 0', () => {
    const [t] = mapDbRowsToTradeInput(
      [row({ tokenInData: null, tokenOutData: null, amountIn: null, amountOut: null, priceUSD: null })],
      { address: 'W' }
    )
    expect(t.tokenIn).toBeNull()
    expect(t.tokenOut).toBeNull()
    expect(t.amountIn).toBe(0)
    expect(t.amountOut).toBe(0)
    expect(t.priceUSD).toBe(0)
  })

  it('preserves row order and count', () => {
    const rows = [row({ signature: 'a' }), row({ signature: 'b' }), row({ signature: 'c' })]
    const out = mapDbRowsToTradeInput(rows, { address: 'W' })
    expect(out.map((t) => t.signature)).toEqual(['a', 'b', 'c'])
  })
})

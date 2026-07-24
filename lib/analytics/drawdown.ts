/**
 * Account balance curve and drawdown.
 *
 * Phase B4 of the TradeZella refactor (doc §3.1 — "Account balance", "Drawdown"
 * are listed as missing from Journalio's dashboard).
 *
 * Requires `Wallet.initialBalance`; without it the curve has no origin, which
 * is why the UI shows a named empty state ("Please add an initial balance")
 * rather than a misleading curve starting at zero.
 */

import type { FlattenedTrade } from '../tradeCycles'

export interface BalancePoint {
  /** YYYY-MM-DD of the cycle's close. */
  date: string
  tradeIndex: number
  balance: number
  /** Running peak balance up to this point. */
  peak: number
  /** Percentage below peak, >= 0. 0 means at a new high. */
  drawdownPct: number
  /** Absolute USD below peak, >= 0. */
  drawdownUSD: number
}

export interface DrawdownResult {
  points: BalancePoint[]
  startingBalance: number
  endingBalance: number
  /** Worst drawdown over the period, as a positive percentage. */
  maxDrawdownPct: number
  maxDrawdownUSD: number
  maxDrawdownDate: string | null
  peakBalance: number
}

function dateKey(ts: number): string {
  const d = new Date(ts * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

/**
 * Walk completed cycles in close order, tracking balance, running peak, and
 * drawdown from that peak.
 *
 * @param initialBalance  starting equity in USD. Must be > 0 for percentage
 *                        drawdown to be meaningful.
 */
export function computeDrawdown(
  trades: FlattenedTrade[],
  initialBalance: number
): DrawdownResult {
  const completed = trades
    .filter((t) => t.isComplete && t.endDate)
    .sort((a, b) => (a.endDate || 0) - (b.endDate || 0))

  const empty: DrawdownResult = {
    points: [],
    startingBalance: initialBalance,
    endingBalance: initialBalance,
    maxDrawdownPct: 0,
    maxDrawdownUSD: 0,
    maxDrawdownDate: null,
    peakBalance: initialBalance,
  }
  if (completed.length === 0) return empty

  let balance = initialBalance
  let peak = initialBalance
  let maxDrawdownPct = 0
  let maxDrawdownUSD = 0
  let maxDrawdownDate: string | null = null

  const points: BalancePoint[] = []

  for (let i = 0; i < completed.length; i++) {
    const trade = completed[i]
    balance += trade.profitLoss
    if (balance > peak) peak = balance

    const drawdownUSD = Math.max(0, peak - balance)
    // Guard the divide: a non-positive peak (possible if the account is blown
    // past zero) has no meaningful percentage drawdown.
    const drawdownPct = peak > 0 ? (drawdownUSD / peak) * 100 : 0

    const date = dateKey(trade.endDate || trade.startDate)

    if (drawdownPct > maxDrawdownPct) {
      maxDrawdownPct = drawdownPct
      maxDrawdownDate = date
    }
    if (drawdownUSD > maxDrawdownUSD) maxDrawdownUSD = drawdownUSD

    points.push({
      date,
      tradeIndex: i + 1,
      balance: Math.round(balance * 100) / 100,
      peak: Math.round(peak * 100) / 100,
      drawdownPct: Math.round(drawdownPct * 100) / 100,
      drawdownUSD: Math.round(drawdownUSD * 100) / 100,
    })
  }

  return {
    points,
    startingBalance: initialBalance,
    endingBalance: Math.round(balance * 100) / 100,
    maxDrawdownPct: Math.round(maxDrawdownPct * 100) / 100,
    maxDrawdownUSD: Math.round(maxDrawdownUSD * 100) / 100,
    maxDrawdownDate,
    peakBalance: Math.round(peak * 100) / 100,
  }
}

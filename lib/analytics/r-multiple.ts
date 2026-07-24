/**
 * R-multiple: profit or loss expressed in units of initial risk.
 *
 * Phase B3 of the TradeZella refactor. The analysis doc lists R-multiple as a
 * first-class stored field (§2) because it is what makes trades of different
 * sizes comparable — a +$50 win on $25 of risk (+2R) and a +$500 win on $1000
 * of risk (+0.5R) are very different trades.
 *
 * Journalio derives cycles from on-chain swaps, so there is no broker-reported
 * entry/stop. Risk is reconstructed from the user's journalled `stopLoss`
 * (a price) against the cycle's average entry price.
 */

import type { FlattenedTrade } from '../tradeCycles'
import type { JournalData } from '../types/journal'

/** Average USD price paid per token across the cycle's buys. */
export function computeAvgEntryPrice(trade: FlattenedTrade): number | null {
  if (!trade.totalBuyAmount || trade.totalBuyAmount <= 0) return null
  if (!Number.isFinite(trade.totalBuyValue)) return null
  return trade.totalBuyValue / trade.totalBuyAmount
}

/**
 * R-multiple for one cycle, or null when risk cannot be established.
 *
 * risk    = (avgEntryPrice - stopLoss) * totalBuyAmount   // USD at risk
 * rMultiple = profitLoss / risk
 *
 * Returns null when:
 *  - no stopLoss was journalled
 *  - the stop is at or above the entry (non-positive risk — cannot divide)
 *  - the cycle has no buys, or is still open
 */
export function computeRMultiple(
  trade: FlattenedTrade,
  journal: Pick<JournalData, 'stopLoss'> | null | undefined
): number | null {
  if (!journal) return null
  const stopLoss = journal.stopLoss
  if (stopLoss === null || stopLoss === undefined || !Number.isFinite(stopLoss)) return null
  if (!trade.isComplete) return null

  const avgEntry = computeAvgEntryPrice(trade)
  if (avgEntry === null || avgEntry <= 0) return null

  // A stop at or above entry means no downside was defined — not a 0R trade,
  // an unmeasurable one. Guards the divide-by-zero explicitly.
  const riskPerToken = avgEntry - stopLoss
  if (riskPerToken <= 0) return null

  const riskUSD = riskPerToken * trade.totalBuyAmount
  if (riskUSD <= 0) return null

  return Math.round((trade.profitLoss / riskUSD) * 100) / 100
}

export interface RMultipleBucket {
  /** Inclusive lower bound in R; -Infinity for the leftmost bucket. */
  min: number
  /** Exclusive upper bound in R; Infinity for the rightmost bucket. */
  max: number
  label: string
  count: number
  totalPnL: number
}

const BUCKET_EDGES = [-3, -2, -1, 0, 1, 2, 3]

/**
 * Distribution of R-multiples across trades, for the reports tier.
 * Trades without a computable R are excluded, not bucketed as zero.
 */
export function computeRMultipleDistribution(
  trades: FlattenedTrade[],
  journalMap: Record<string, JournalData>,
  keyFor: (t: FlattenedTrade) => string
): RMultipleBucket[] {
  const buckets: RMultipleBucket[] = []
  const edges = [-Infinity, ...BUCKET_EDGES, Infinity]
  for (let i = 0; i < edges.length - 1; i++) {
    const min = edges[i]
    const max = edges[i + 1]
    const label =
      min === -Infinity ? `< ${max}R` : max === Infinity ? `${min}R+` : `${min} to ${max}R`
    buckets.push({ min, max, label, count: 0, totalPnL: 0 })
  }

  for (const trade of trades) {
    const r = computeRMultiple(trade, journalMap[keyFor(trade)])
    if (r === null) continue
    const bucket = buckets.find((b) => r >= b.min && r < b.max)
    if (!bucket) continue
    bucket.count += 1
    bucket.totalPnL = Math.round((bucket.totalPnL + trade.profitLoss) * 100) / 100
  }

  return buckets
}

/** Mean R across trades that have one. Null when none are computable. */
export function computeAvgRMultiple(
  trades: FlattenedTrade[],
  journalMap: Record<string, JournalData>,
  keyFor: (t: FlattenedTrade) => string
): number | null {
  const values = trades
    .map((t) => computeRMultiple(t, journalMap[keyFor(t)]))
    .filter((r): r is number => r !== null)
  if (values.length === 0) return null
  return Math.round((values.reduce((s, r) => s + r, 0) / values.length) * 100) / 100
}

import type { FlattenedTrade } from './tradeCycles'

export interface PerformanceScore {
  /** Composite 0–100 score, or null when there aren't enough trades. */
  score: number | null
  /** Component sub-scores (0–100 each) for transparency. */
  components: {
    winRate: number
    profitFactor: number
    drawdown: number
  }
}

/**
 * A single composite "performance score" (0–100) — a simplified, crypto-
 * adapted analog of TradeZella's Zella Score. It is DISTINCT from the
 * discipline score (which measures rule-following); this measures results.
 *
 * Composed from three metrics we can compute directly from completed trades:
 *   - Win rate           → 40%  (0% → 0, 60%+ → 100)
 *   - Profit factor      → 35%  (1.0 → 50, 2.0+ → 100, <1 scaled down)
 *   - Max drawdown (rel) → 25%  (0% dd → 100, ≥50% of peak equity → 0)
 *
 * NOTE: this is a transparent, simplified score — not a claim to replicate
 * Zella's exact six-metric weighting. Returns null below 5 completed trades
 * (too little signal).
 */
export function computePerformanceScore(trades: FlattenedTrade[]): PerformanceScore {
  const completed = trades.filter((t) => t.isComplete)
  const empty = { winRate: 0, profitFactor: 0, drawdown: 0 }

  if (completed.length < 5) {
    return { score: null, components: empty }
  }

  // Win rate component
  const wins = completed.filter((t) => t.profitLoss > 0)
  const winRatePct = (wins.length / completed.length) * 100
  const winRateScore = clamp((winRatePct / 60) * 100)

  // Profit factor component
  const grossProfit = wins.reduce((s, t) => s + t.profitLoss, 0)
  const grossLoss = Math.abs(
    completed.filter((t) => t.profitLoss < 0).reduce((s, t) => s + t.profitLoss, 0),
  )
  const pf = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 3 : 0
  // pf 1.0 → 50, 2.0 → 100, 0 → 0 (linear through those points, clamped)
  const pfScore = clamp(pf <= 1 ? pf * 50 : 50 + (pf - 1) * 50)

  // Max-drawdown component (relative to peak equity along the P/L sequence)
  const sorted = [...completed].sort(
    (a, b) => (a.endDate || a.startDate) - (b.endDate || b.startDate),
  )
  let equity = 0
  let peak = 0
  let maxDrawdown = 0
  for (const t of sorted) {
    equity += t.profitLoss
    if (equity > peak) peak = equity
    const dd = peak - equity
    if (dd > maxDrawdown) maxDrawdown = dd
  }
  // Relative drawdown: drawdown as a fraction of peak equity. 0% → 100, ≥50% → 0.
  const relDd = peak > 0 ? maxDrawdown / peak : maxDrawdown > 0 ? 1 : 0
  const drawdownScore = clamp((1 - relDd / 0.5) * 100)

  const score = Math.round(winRateScore * 0.4 + pfScore * 0.35 + drawdownScore * 0.25)

  return {
    score,
    components: {
      winRate: Math.round(winRateScore),
      profitFactor: Math.round(pfScore),
      drawdown: Math.round(drawdownScore),
    },
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, n))
}

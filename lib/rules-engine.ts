/**
 * Typed rule evaluation engine.
 *
 * Phase B1 of the TradeZella refactor (docs/TRADEZELLA-JOURNAL-ANALYSIS.md §3.8).
 * Turns Journalio's untyped `GlobalRule` strings into a behaviour-change engine:
 * each rule declares a `type` and a `condition`, and is evaluated automatically
 * against a day's trades and session data where the data allows.
 *
 * Pure and I/O-free so it can be unit-tested and run either server-side (to
 * persist `RuleAdherence` rows) or client-side (for an optimistic preview).
 */

import type { FlattenedTrade } from './tradeCycles'
import type { JournalData } from './types/journal'
import { formatTimeInZone } from './trading-day'

export type RuleType = 'manual' | 'time' | 'percentage' | 'currency' | 'count'

export interface TypedRule {
  id: string
  text: string
  type: RuleType
  /** "09:30" for time, "100" for percentage/currency/count. */
  condition: string
  isActive: boolean
  sortOrder: number
}

export interface DayContext {
  /** Trading day, YYYY-MM-DD. */
  date: string
  /** Completed cycles attributed to this trading day. */
  trades: FlattenedTrade[]
  /** Journals for those trades, in the same order where available. */
  journals: JournalData[]
  timezone: string
  /**
   * Manual check-off state by rule id, from the pre-session checklist.
   * Only consulted for `type: "manual"` rules.
   */
  manualChecks?: Record<string, boolean>
}

export interface RuleAdherenceResult {
  ruleId: string
  followed: boolean
  /** Observed value, for the "09:26 / 09:30" display. Empty when unevaluable. */
  actual: string
  source: 'auto' | 'manual'
  /** False when the rule could not be evaluated (e.g. no trades that day). */
  evaluated: boolean
}

/** "$1,234.50" — matches the currency style used in rule conditions. */
function formatUSD(n: number): string {
  const sign = n < 0 ? '-' : ''
  return `${sign}$${Math.abs(n).toFixed(2)}`
}

function parseNumber(condition: string): number | null {
  // Tolerate "$100", "100%", " 100 " — conditions are user-entered.
  const cleaned = condition.replace(/[$%,\s]/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/**
 * Evaluate one rule against a day's context.
 *
 * Semantics per type:
 *  - time       — the day's FIRST trade must occur at or before `condition`
 *                 ("start my day by 09:30"). No trades = not evaluable.
 *  - currency   — no single trade may lose more than `condition`
 *                 ("net max loss /trade"). Compares the worst loss.
 *  - percentage — share of trades linked to a strategy must be >= `condition`
 *                 ("link trades to playbook", typically 100%).
 *  - count      — number of trades must not exceed `condition` ("max trades/day").
 *  - manual     — falls through to the user's checkbox.
 */
export function evaluateRule(rule: TypedRule, ctx: DayContext): RuleAdherenceResult {
  const unevaluable = (actual = ''): RuleAdherenceResult => ({
    ruleId: rule.id,
    followed: false,
    actual,
    source: 'auto',
    evaluated: false,
  })

  if (rule.type === 'manual') {
    const checked = ctx.manualChecks?.[rule.id]
    return {
      ruleId: rule.id,
      followed: checked === true,
      actual: '',
      source: 'manual',
      // A manual rule is only "evaluated" once the user has actually answered it.
      evaluated: checked !== undefined,
    }
  }

  const completed = ctx.trades.filter((t) => t.isComplete)

  switch (rule.type) {
    case 'time': {
      if (ctx.trades.length === 0) return unevaluable()
      if (!/^\d{1,2}:\d{2}$/.test(rule.condition.trim())) return unevaluable()
      const firstTs = Math.min(...ctx.trades.map((t) => t.startDate))
      const actual = formatTimeInZone(new Date(firstTs * 1000), ctx.timezone)
      // Zero-pad so "9:30" and "09:30" compare correctly as strings.
      const target = rule.condition.trim().padStart(5, '0')
      return {
        ruleId: rule.id,
        followed: actual <= target,
        actual,
        source: 'auto',
        evaluated: true,
      }
    }

    case 'currency': {
      const limit = parseNumber(rule.condition)
      if (limit === null) return unevaluable()
      if (completed.length === 0) return unevaluable()
      // Worst single-trade P&L. A day with no losses trivially passes.
      const worst = Math.min(...completed.map((t) => t.profitLoss), 0)
      return {
        ruleId: rule.id,
        followed: Math.abs(worst) <= limit,
        actual: formatUSD(worst),
        source: 'auto',
        evaluated: true,
      }
    }

    case 'percentage': {
      const target = parseNumber(rule.condition)
      if (target === null) return unevaluable()
      if (completed.length === 0) return unevaluable()
      const linked = ctx.journals.filter((j) => !!j?.strategyId).length
      const pct = Math.round((linked / completed.length) * 100)
      return {
        ruleId: rule.id,
        followed: pct >= target,
        actual: `${pct}%`,
        source: 'auto',
        evaluated: true,
      }
    }

    case 'count': {
      const limit = parseNumber(rule.condition)
      if (limit === null) return unevaluable()
      if (ctx.trades.length === 0) return unevaluable()
      return {
        ruleId: rule.id,
        followed: ctx.trades.length <= limit,
        actual: String(ctx.trades.length),
        source: 'auto',
        evaluated: true,
      }
    }

    default:
      return unevaluable()
  }
}

/** Evaluate every active rule against a day. Inactive rules are skipped. */
export function evaluateRules(rules: TypedRule[], ctx: DayContext): RuleAdherenceResult[] {
  return rules.filter((r) => r.isActive).map((r) => evaluateRule(r, ctx))
}

/**
 * The day's score: how many rules were followed out of those that could be
 * evaluated. Drives the "Today's progress 1/5" display.
 */
export function computeDayScore(results: RuleAdherenceResult[]): {
  followed: number
  total: number
  percentage: number
} {
  const evaluated = results.filter((r) => r.evaluated)
  const followed = evaluated.filter((r) => r.followed).length
  const total = evaluated.length
  return {
    followed,
    total,
    percentage: total === 0 ? 0 : Math.round((followed / total) * 100),
  }
}

/**
 * The five defaults from docs §3.8 — they encode a whole methodology:
 * start on time, link every trade to a playbook, always set a stop,
 * cap per-trade loss, cap daily loss.
 *
 * "Always set a stop" ships as `manual` because Journalio derives trades from
 * on-chain swaps and cannot observe whether a stop was intended; the user
 * confirms it in the pre-session checklist.
 */
export const DEFAULT_TYPED_RULES: Omit<TypedRule, 'id'>[] = [
  { text: 'Start my day by', type: 'time', condition: '09:30', isActive: true, sortOrder: 0 },
  { text: 'Link trades to a playbook', type: 'percentage', condition: '100', isActive: true, sortOrder: 1 },
  { text: 'Set a stop loss on every trade', type: 'manual', condition: '', isActive: true, sortOrder: 2 },
  { text: 'Net max loss / trade', type: 'currency', condition: '100', isActive: true, sortOrder: 3 },
  { text: 'Max trades / day', type: 'count', condition: '5', isActive: true, sortOrder: 4 },
]

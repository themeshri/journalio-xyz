/**
 * Per-rule statistics over persisted RuleAdherence rows.
 *
 * Phase B1 of the TradeZella refactor. Produces the Current Rules table from
 * docs/TRADEZELLA-JOURNAL-ANALYSIS.md §3.8:
 *
 *   RULE                        CONDITION  STREAK  AVERAGE  FOLLOW RATE
 *   Start my day by 09:30       09:30      1       09:26    4%
 */

import { computeStreakFromDates } from '../streaks'
import type { RuleType } from '../rules-engine'

export interface AdherenceRecord {
  ruleId: string
  date: string
  followed: boolean
  actual: string
  source: 'auto' | 'manual'
}

export interface RuleStats {
  ruleId: string
  /** Consecutive days followed, counting back from today. */
  streak: number
  longestStreak: number
  /** Days followed ÷ days evaluated, as a 0-100 integer. */
  followRate: number
  daysFollowed: number
  daysEvaluated: number
  /** Type-aware mean of `actual` ("09:26", "$42.10", "80%", "3"). */
  average: string
}

/**
 * Mean of the `actual` values, formatted back into the rule's own units.
 * Returns '' when there is nothing meaningful to average.
 */
export function computeAverageActual(records: AdherenceRecord[], type: RuleType): string {
  const values = records.map((r) => r.actual).filter((a) => a !== '')
  if (values.length === 0) return ''

  switch (type) {
    case 'time': {
      // Average minutes-since-midnight, then format back to HH:mm.
      const minutes = values
        .map((v) => {
          const m = /^(\d{1,2}):(\d{2})$/.exec(v)
          return m ? Number(m[1]) * 60 + Number(m[2]) : null
        })
        .filter((n): n is number => n !== null)
      if (minutes.length === 0) return ''
      const avg = Math.round(minutes.reduce((s, n) => s + n, 0) / minutes.length)
      const hh = String(Math.floor(avg / 60)).padStart(2, '0')
      const mm = String(avg % 60).padStart(2, '0')
      return `${hh}:${mm}`
    }
    case 'currency': {
      const nums = values
        .map((v) => Number(v.replace(/[$,]/g, '')))
        .filter((n) => Number.isFinite(n))
      if (nums.length === 0) return ''
      const avg = nums.reduce((s, n) => s + n, 0) / nums.length
      const sign = avg < 0 ? '-' : ''
      return `${sign}$${Math.abs(avg).toFixed(2)}`
    }
    case 'percentage': {
      const nums = values
        .map((v) => Number(v.replace('%', '')))
        .filter((n) => Number.isFinite(n))
      if (nums.length === 0) return ''
      return `${Math.round(nums.reduce((s, n) => s + n, 0) / nums.length)}%`
    }
    case 'count': {
      const nums = values.map(Number).filter((n) => Number.isFinite(n))
      if (nums.length === 0) return ''
      return String(Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 10) / 10)
    }
    default:
      // `manual` rules carry no observed value.
      return ''
  }
}

/**
 * Stats for a single rule.
 *
 * The streak reuses `computeStreakFromDates` (lib/streaks.ts) rather than a
 * second implementation — it already handles gaps, unsorted input, duplicates,
 * and the today/yesterday anchor UTC-safely.
 *
 * @param todayOverride  YYYY-MM-DD to treat as "today"; pass the user's trading
 *                       day so the streak does not break at UTC midnight.
 */
export function computeRuleStats(
  ruleId: string,
  type: RuleType,
  records: AdherenceRecord[],
  todayOverride?: string
): RuleStats {
  const forRule = records.filter((r) => r.ruleId === ruleId)
  const followedDays = forRule.filter((r) => r.followed)

  const { current, longest } = computeStreakFromDates(
    followedDays.map((r) => r.date),
    todayOverride
  )

  const daysEvaluated = forRule.length
  const daysFollowed = followedDays.length

  return {
    ruleId,
    streak: current,
    longestStreak: longest,
    // Zero days evaluated is 0%, not NaN — a rule you have never been
    // measured against has not been followed.
    followRate: daysEvaluated === 0 ? 0 : Math.round((daysFollowed / daysEvaluated) * 100),
    daysFollowed,
    daysEvaluated,
    average: computeAverageActual(forRule, type),
  }
}

/** Stats for every rule in one pass. */
export function computeAllRuleStats(
  rules: { id: string; type: RuleType }[],
  records: AdherenceRecord[],
  todayOverride?: string
): RuleStats[] {
  return rules.map((r) => computeRuleStats(r.id, r.type, records, todayOverride))
}

/**
 * Overall adherence across all rules over a period — the "Current period score"
 * gauge. Weighted by rule-day, so a rule evaluated more often counts more.
 */
export function computePeriodScore(records: AdherenceRecord[]): number {
  if (records.length === 0) return 0
  return Math.round((records.filter((r) => r.followed).length / records.length) * 100)
}

/**
 * Server-side rule adherence: evaluate a trading day and persist the result.
 *
 * Phase B6. Sits between the pure engine (lib/rules-engine.ts) and the routes,
 * so /api/rules/adherence and /api/dashboard share one implementation.
 */

import { prisma } from '@/lib/prisma'
import { evaluateRules, type TypedRule, type RuleType } from '@/lib/rules-engine'
import { getTradingDayForDate } from '@/lib/trading-day'
import { journalKey } from '@/lib/journal-utils'
import type { FlattenedTrade } from '@/lib/tradeCycles'
import type { JournalData } from '@/lib/types/journal'

export interface DbGlobalRule {
  id: string
  text: string
  type: string
  condition: string
  isActive: boolean
  sortOrder: number
}

export function toTypedRule(r: DbGlobalRule): TypedRule {
  return {
    id: r.id,
    text: r.text,
    type: r.type as RuleType,
    condition: r.condition,
    isActive: r.isActive,
    sortOrder: r.sortOrder,
  }
}

/**
 * Bucket completed cycles by the trading day they closed in.
 *
 * Uses `getTradingDayForDate` so a cycle closed at 02:00 with a 09:00 trading
 * start is attributed to the previous trading day — consistent with how the
 * dashboard decides what "today" means.
 */
export function groupTradesByTradingDay(
  trades: FlattenedTrade[],
  timezone: string,
  tradingStartTime: string
): Map<string, FlattenedTrade[]> {
  const byDay = new Map<string, FlattenedTrade[]>()
  for (const t of trades) {
    const ts = t.endDate || t.startDate
    if (!ts) continue
    const day = getTradingDayForDate(new Date(ts * 1000), timezone, tradingStartTime)
    const arr = byDay.get(day)
    if (arr) arr.push(t)
    else byDay.set(day, [t])
  }
  return byDay
}

/**
 * Evaluate every active rule for one trading day and upsert the results.
 *
 * Manual overrides are preserved: a row whose `source` is already 'manual' is
 * never overwritten by an auto evaluation, so the user's explicit answer wins.
 * Rules that cannot be evaluated for the day write no row at all — an absent
 * row means "not measured", which is different from "broken".
 */
export async function evaluateAndPersistDay(opts: {
  userId: string
  date: string
  rules: DbGlobalRule[]
  trades: FlattenedTrade[]
  journalMap: Record<string, JournalData>
  timezone: string
}): Promise<void> {
  const { userId, date, rules, trades, journalMap, timezone } = opts
  const active = rules.filter((r) => r.isActive)
  if (active.length === 0) return

  const existing = await prisma.ruleAdherence.findMany({
    where: { userId, date, ruleId: { in: active.map((r) => r.id) } },
    select: { ruleId: true, source: true },
  })
  const manualRuleIds = new Set(
    existing.filter((e) => e.source === 'manual').map((e) => e.ruleId)
  )

  const journals = trades
    .map((t) => journalMap[journalKey(t)])
    .filter((j): j is JournalData => !!j)

  const results = evaluateRules(active.map(toTypedRule), {
    date,
    trades,
    journals,
    timezone,
  })

  for (const result of results) {
    if (!result.evaluated) continue
    // Never clobber an explicit user answer with a derived one.
    if (result.source === 'auto' && manualRuleIds.has(result.ruleId)) continue

    await prisma.ruleAdherence.upsert({
      where: {
        userId_ruleId_date: { userId, ruleId: result.ruleId, date },
      },
      update: {
        followed: result.followed,
        actual: result.actual,
        source: result.source,
      },
      create: {
        userId,
        ruleId: result.ruleId,
        date,
        followed: result.followed,
        actual: result.actual,
        source: result.source,
      },
    })
  }
}

/**
 * Backfill adherence across every trading day that has trades.
 *
 * Runs when the Progress Tracker is opened so historical streaks and follow
 * rates are populated, not just days visited since the feature shipped.
 */
export async function backfillAdherence(opts: {
  userId: string
  rules: DbGlobalRule[]
  trades: FlattenedTrade[]
  journalMap: Record<string, JournalData>
  timezone: string
  tradingStartTime: string
  /** Cap the number of days processed per call to bound request time. */
  maxDays?: number
}): Promise<number> {
  const { userId, rules, trades, journalMap, timezone, tradingStartTime } = opts
  const byDay = groupTradesByTradingDay(
    trades.filter((t) => t.isComplete),
    timezone,
    tradingStartTime
  )

  // Most recent days first — those drive the visible streak.
  const days = [...byDay.keys()].sort().reverse().slice(0, opts.maxDays ?? 120)

  for (const date of days) {
    await evaluateAndPersistDay({
      userId,
      date,
      rules,
      trades: byDay.get(date) || [],
      journalMap,
      timezone,
    })
  }

  return days.length
}

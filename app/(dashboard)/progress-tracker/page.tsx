'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Flame, Target, CheckCircle2, Circle, MinusCircle, Settings } from 'lucide-react'
import { useWallet, useMetadata, buildWalletQueryParams } from '@/lib/wallet-context'
import { useRuleAdherence } from '@/lib/hooks/use-analytics'
import { ActivityCalendar } from '@/components/overview/ActivityCalendar'
import { computeStreakFromDates } from '@/lib/streaks'
import type { RuleStats } from '@/lib/analytics/rule-stats'

/** Score ring — the single number at the top of the screen (docs §5). */
function ScoreGauge({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value))
  const color =
    clamped >= 70 ? 'text-emerald-500' : clamped >= 40 ? 'text-amber-500' : 'text-red-500'
  const circumference = 2 * Math.PI * 30

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-[76px] w-[76px] shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r="30" fill="none" strokeWidth="7" className="stroke-muted" />
          <circle
            cx="38"
            cy="38"
            r="30"
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped / 100)}
            className={`${color} transition-all duration-500`}
            stroke="currentColor"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-mono text-lg font-semibold tabular-nums ${color}`}>
            {clamped}%
          </span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

export default function ProgressTrackerPage() {
  const { activeWallets, flattenedTrades, journalMap } = useWallet()
  const {
    rules,
    ruleStats,
    todayRuleScore,
    yearlyPreSessions,
    yearlyPostSessions,
    timezone,
    tradingStartTime,
  } = useMetadata()

  const walletQueryParams = useMemo(
    () => buildWalletQueryParams(activeWallets) || null,
    [activeWallets]
  )

  // Server re-evaluates recent trading days on read, so history is populated
  // rather than only accumulating from when the feature shipped.
  const { data, isLoading } = useRuleAdherence(walletQueryParams)

  const activeRules = useMemo(() => rules.filter((r) => r.isActive), [rules])
  const statsById = useMemo(() => {
    const map = new Map<string, RuleStats>()
    for (const s of data?.stats ?? ruleStats) map.set(s.ruleId, s)
    return map
  }, [data?.stats, ruleStats])

  const adherence = data?.adherence ?? []
  const today = data?.today

  const todaysRows = useMemo(
    () => adherence.filter((a) => a.date === today),
    [adherence, today]
  )
  const todayByRule = useMemo(() => {
    const map = new Map<string, (typeof adherence)[number]>()
    for (const a of todaysRows) map.set(a.ruleId, a)
    return map
  }, [todaysRows])

  const score = todayRuleScore ?? {
    followed: todaysRows.filter((a) => a.followed).length,
    total: todaysRows.length,
  }

  /** Streak of days where EVERY evaluated rule was followed — a perfect day. */
  const perfectDayStreak = useMemo(() => {
    const byDate = new Map<string, { followed: number; total: number }>()
    for (const a of adherence) {
      const e = byDate.get(a.date) || { followed: 0, total: 0 }
      e.total += 1
      if (a.followed) e.followed += 1
      byDate.set(a.date, e)
    }
    const perfect = [...byDate.entries()]
      .filter(([, v]) => v.total > 0 && v.followed === v.total)
      .map(([d]) => d)
    return computeStreakFromDates(perfect, today)
  }, [adherence, today])

  const periodScore = data?.periodScore ?? 0

  // ── Empty states, each naming the missing thing (docs §5) ──

  if (activeRules.length === 0 && !isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">Progress Tracker</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Target className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">No rules defined yet</p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground">
                Rules turn your trading plan into something measurable — start on time,
                link every trade to a playbook, cap your per-trade loss. Each one is
                tracked with a streak and a follow rate.
              </p>
            </div>
            <Button asChild size="sm">
              <Link href="/settings#rules">
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                Set up your rules
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Progress Tracker</h1>
        <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
          <Link href="/settings#rules">
            <Settings className="mr-1.5 h-3.5 w-3.5" />
            Edit rules
          </Link>
        </Button>
      </div>

      {/* Score-first row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                perfectDayStreak.current > 0
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <Flame className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-semibold leading-none">
                  {perfectDayStreak.current}
                </span>
                <span className="text-xs text-muted-foreground">
                  day{perfectDayStreak.current === 1 ? '' : 's'} clean
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Longest {perfectDayStreak.longest} &middot; every rule followed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <ScoreGauge value={periodScore} label="Overall follow rate across all rules" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Today&apos;s progress
            </p>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-2xl font-semibold leading-none tabular-nums">
                {score.followed}
              </span>
              <span className="text-sm text-muted-foreground">/ {score.total || activeRules.length}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${score.total > 0 ? (score.followed / score.total) * 100 : 0}%`,
                }}
              />
            </div>
            {score.total === 0 && (
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                No rules measured yet today — they evaluate once you trade.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily checklist */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Today&apos;s checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 pb-4">
          {activeRules.map((rule) => {
            const row = todayByRule.get(rule.id)
            const measured = !!row
            return (
              <div
                key={rule.id}
                className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-muted/40"
              >
                {!measured ? (
                  <MinusCircle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                ) : row.followed ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-red-500" />
                )}
                <span
                  className={`flex-1 text-xs ${
                    measured ? '' : 'text-muted-foreground'
                  }`}
                >
                  {rule.text}
                </span>
                {/* The "09:26 / 09:30" actual-vs-target display from docs §3.8 */}
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {measured && row.actual ? (
                    <>
                      <span className={row.followed ? 'text-emerald-500' : 'text-red-500'}>
                        {row.actual}
                      </span>
                      {rule.condition && <span> / {rule.condition}</span>}
                    </>
                  ) : rule.condition ? (
                    <span>&mdash; / {rule.condition}</span>
                  ) : null}
                </span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Current rules table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Current rules</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="pb-1.5 text-left font-medium">Rule</th>
                  <th className="pb-1.5 text-right font-medium">Condition</th>
                  <th className="pb-1.5 text-right font-medium">Streak</th>
                  <th className="pb-1.5 text-right font-medium">Average</th>
                  <th className="pb-1.5 text-right font-medium">Follow rate</th>
                </tr>
              </thead>
              <tbody>
                {activeRules.map((rule) => {
                  const s = statsById.get(rule.id)
                  const rate = s?.followRate ?? 0
                  return (
                    <tr key={rule.id} className="border-b last:border-0">
                      <td className="py-2 pr-2">{rule.text}</td>
                      <td className="py-2 text-right font-mono tabular-nums text-muted-foreground">
                        {rule.condition || '—'}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums">
                        {s?.streak ?? 0}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-muted-foreground">
                        {s?.average || '—'}
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={`font-mono tabular-nums ${
                            rate >= 70
                              ? 'text-emerald-500'
                              : rate >= 40
                                ? 'text-amber-500'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {rate}%
                        </span>
                        {s && s.daysEvaluated === 0 && (
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            (no data)
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ActivityCalendar
        trades={flattenedTrades}
        journalMap={journalMap}
        preSessions={yearlyPreSessions}
        postSessions={yearlyPostSessions}
      />
    </div>
  )
}

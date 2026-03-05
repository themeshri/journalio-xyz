'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, TrendingUp, BookOpen, Shield, CheckCircle2 } from 'lucide-react'
import { loadRules, type GlobalRule } from '@/lib/rules'
import { loadPreSession, type PreSessionData } from '@/lib/pre-sessions'
import { getTradingDay } from '@/lib/trading-day'
import { formatValue } from '@/lib/formatters'
import type { FlattenedTrade } from '@/lib/tradeCycles'
import type { JournalRecord } from '@/lib/journals'
import { journalKey } from '@/lib/journal-utils'

interface SessionHeroProps {
  preSessionDone: boolean
  postSessionDone: boolean
  flattenedTrades: FlattenedTrade[]
  journalMap: Record<string, JournalRecord>
  onJournalClick: () => void
  selectedTab: Tab
  timezone?: string
  tradingStartTime?: string
}

export type Tab = 'pre' | 'active' | 'post'

export function getAutoTab(preSessionDone: boolean, postSessionDone: boolean): Tab {
  if (!preSessionDone) return 'pre'
  if (!postSessionDone) return 'active'
  return 'post'
}

function formatDurationFromDate(savedAt: string): string {
  const start = new Date(savedAt).getTime()
  if (isNaN(start)) return ''
  const diff = Math.max(0, Date.now() - start)
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function PulseDot({ color }: { color: 'blue' | 'green' | 'amber' }) {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
  }
  return (
    <span className="relative flex h-2 w-2">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${colorClasses[color]}`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${colorClasses[color]}`} />
    </span>
  )
}

const tabConfig: { key: Tab; label: string }[] = [
  { key: 'pre', label: 'Pre-Session' },
  { key: 'active', label: 'Active' },
  { key: 'post', label: 'Post-Session' },
]

export function SessionPills({
  selectedTab,
  onTabChange,
  preSessionDone,
  postSessionDone,
}: {
  selectedTab: Tab
  onTabChange: (tab: Tab) => void
  preSessionDone: boolean
  postSessionDone: boolean
}) {
  const autoTab = getAutoTab(preSessionDone, postSessionDone)
  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-black/5 dark:bg-white/5 w-fit">
      {tabConfig.map(({ key, label }) => {
        const isSelected = selectedTab === key
        const isDone = key === 'pre' ? preSessionDone : key === 'post' ? postSessionDone : false
        return (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              isSelected
                ? 'bg-white dark:bg-zinc-800 text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isDone && (
              <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
            )}
            {key === 'active' && autoTab === 'active' && (
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
            )}
            {label}
          </button>
        )
      })}
    </div>
  )
}

export function SessionHero({
  preSessionDone,
  postSessionDone,
  flattenedTrades,
  journalMap,
  onJournalClick,
  selectedTab,
  timezone = 'UTC',
  tradingStartTime = '09:00',
}: SessionHeroProps) {
  const [rules, setRules] = useState<GlobalRule[]>([])
  const [preSessionData, setPreSessionData] = useState<PreSessionData | null>(null)
  const [sessionDuration, setSessionDuration] = useState('')

  // Fetch rules and pre-session data for the active tab
  useEffect(() => {
    let stale = false
    const today = getTradingDay(timezone, tradingStartTime)

    Promise.all([loadRules(), loadPreSession(today)]).then(([r, ps]) => {
      if (stale) return
      setRules(r)
      setPreSessionData(ps)
      if (ps?.savedAt) setSessionDuration(formatDurationFromDate(ps.savedAt))
    })

    return () => { stale = true }
  }, [timezone, tradingStartTime])

  // Update session timer every minute
  useEffect(() => {
    if (!preSessionData?.savedAt) return
    const interval = setInterval(() => {
      setSessionDuration(formatDurationFromDate(preSessionData.savedAt))
    }, 60000)
    return () => clearInterval(interval)
  }, [preSessionData?.savedAt])

  // Compute session-scoped stats: only trades that started after pre-session was saved
  const sessionStartEpoch = preSessionData?.savedAt
    ? new Date(preSessionData.savedAt).getTime() / 1000
    : 0

  const sessionTrades = useMemo(() => {
    if (!sessionStartEpoch) return []
    return flattenedTrades.filter(t => t.startDate >= sessionStartEpoch)
  }, [flattenedTrades, sessionStartEpoch])

  const sessionCompleted = useMemo(() =>
    sessionTrades.filter(t => t.isComplete),
    [sessionTrades]
  )

  const sessionPL = useMemo(() =>
    sessionCompleted.reduce((sum, t) => sum + t.profitLoss, 0),
    [sessionCompleted]
  )

  const tradeCount = sessionTrades.length

  const journalProgress = useMemo(() => {
    const total = sessionCompleted.length
    const done = sessionCompleted.filter(t => !!journalMap[journalKey(t)]).length
    return { done, total }
  }, [sessionCompleted, journalMap])

  const journalDone = journalProgress.total === 0 || journalProgress.done >= journalProgress.total
  const journalRemaining = journalProgress.total - journalProgress.done

  // Gradient + border colors per tab
  const gradients: Record<Tab, string> = {
    pre: 'border-blue-200 dark:border-blue-800/40 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/10',
    active: 'border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/10',
    post: postSessionDone
      ? 'border-emerald-200 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/10'
      : 'border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/10',
  }

  return (
    <div className={`rounded-xl border ${gradients[selectedTab]} p-5 transition-all`}>
      {selectedTab === 'pre' && (
        <PreSessionPanel preSessionDone={preSessionDone} today={getTradingDay(timezone, tradingStartTime)} />
      )}
      {selectedTab === 'active' && (
        <ActivePanel
          preSessionDone={preSessionDone}
          sessionDuration={sessionDuration}
          preSessionData={preSessionData}
          rules={rules}
          tradeCount={tradeCount}
          sessionPL={sessionPL}
          journalProgress={journalProgress}
          journalRemaining={journalRemaining}
          onJournalClick={onJournalClick}
        />
      )}
      {selectedTab === 'post' && (
        <PostSessionPanel
          postSessionDone={postSessionDone}
          journalDone={journalDone}
          journalProgress={journalProgress}
          journalRemaining={journalRemaining}
          onJournalClick={onJournalClick}
        />
      )}
    </div>
  )
}

/* ─── Pre-Session Panel ──────────────────────────────── */

function PreSessionPanel({ preSessionDone, today }: { preSessionDone: boolean; today: string }) {
  if (preSessionDone) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
              <Check className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Pre-session complete</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {today}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            You set your intent for today.
          </p>
        </div>
        <Link
          href="/diary/pre-session"
          className="inline-flex items-center gap-2 rounded-lg border border-border hover:bg-muted text-sm font-medium px-4 py-2 transition-colors shrink-0"
        >
          View or Edit
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <PulseDot color="blue" />
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Not started</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {today}
        </p>
        <h2 className="text-lg font-semibold mb-1">Before you trade, set your intent.</h2>
        <p className="text-sm text-muted-foreground">
          Your best trades come from sessions where you started with a plan.
        </p>
      </div>
      <Link
        href="/diary/pre-session"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 transition-colors shrink-0"
      >
        Start Pre-Session
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

/* ─── Active Panel ───────────────────────────────────── */

function ActivePanel({
  preSessionDone,
  sessionDuration,
  preSessionData,
  rules,
  tradeCount,
  sessionPL,
  journalProgress,
  journalRemaining,
  onJournalClick,
}: {
  preSessionDone: boolean
  sessionDuration: string
  preSessionData: PreSessionData | null
  rules: GlobalRule[]
  tradeCount: number
  sessionPL: number
  journalProgress: { done: number; total: number }
  journalRemaining: number
  onJournalClick: () => void
}) {
  if (!preSessionDone) {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Complete your pre-session first to start your trading session.
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <PulseDot color="green" />
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Session Active{sessionDuration ? ` · ${sessionDuration}` : ''}
            </span>
          </div>
          {journalRemaining > 0 && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
              {journalRemaining} unjournaled
            </span>
          )}
        </div>

        <h2 className="text-lg font-semibold mb-1">Session in progress</h2>
        {preSessionData?.sessionIntent && (
          <p className="text-sm text-muted-foreground mb-3">
            Your plan: <span className="text-foreground font-medium">{preSessionData.sessionIntent}</span>
          </p>
        )}

        {rules.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
            {rules.slice(0, 5).map((rule) => (
              <div key={rule.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="h-3 w-3 text-emerald-500 shrink-0" />
                <span>{rule.text}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="font-mono text-foreground">{tradeCount}</span>
            <span>trades</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="font-mono text-foreground">
              <span className={sessionPL >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                {sessionPL >= 0 ? '+' : ''}{formatValue(sessionPL)}
              </span>
            </span>
            <span>P/L</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="font-mono text-foreground">{journalProgress.done}/{journalProgress.total}</span>
            <span>journaled</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <button
          onClick={onJournalClick}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 transition-colors"
        >
          + Journal Trade
        </button>
        <Link
          href="/diary/post-session"
          className="inline-flex items-center gap-2 rounded-lg border border-border hover:bg-muted text-sm font-medium px-4 py-2 transition-colors"
        >
          End Session
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}

/* ─── Post-Session Panel ─────────────────────────────── */

function PostSessionPanel({
  postSessionDone,
  journalDone,
  journalProgress,
  journalRemaining,
  onJournalClick,
}: {
  postSessionDone: boolean
  journalDone: boolean
  journalProgress: { done: number; total: number }
  journalRemaining: number
  onJournalClick: () => void
}) {
  // All done: post-session complete + journals complete
  if (postSessionDone && journalDone) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
              <Check className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">All Done</span>
          </div>
          <h2 className="text-lg font-semibold mb-1">All caught up for today</h2>
          <p className="text-sm text-muted-foreground">
            Pre-session, post-session, and all {journalProgress.total} trade{journalProgress.total !== 1 ? 's' : ''} journaled. Nice work.
          </p>
        </div>
        <Link
          href="/diary/post-session"
          className="inline-flex items-center gap-2 rounded-lg border border-border hover:bg-muted text-sm font-medium px-4 py-2 transition-colors shrink-0"
        >
          View or Edit
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    )
  }

  // Post-session done but journals remaining
  if (postSessionDone && !journalDone) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PulseDot color="amber" />
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Wrap Up</span>
          </div>
          <h2 className="text-lg font-semibold mb-1">Journal your remaining trades</h2>
          <p className="text-sm text-muted-foreground">
            {journalRemaining} of {journalProgress.total} trade{journalProgress.total !== 1 ? 's' : ''} still need a journal entry.
          </p>
        </div>
        <button
          onClick={onJournalClick}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 transition-colors shrink-0"
        >
          Journal Trades
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  // Post-session not done yet
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <PulseDot color="amber" />
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Not started</span>
        </div>
        <h2 className="text-lg font-semibold mb-1">Close the loop on your session.</h2>
        <p className="text-sm text-muted-foreground">
          Review your day, log your emotions, and plan for tomorrow.
        </p>
      </div>
      <Link
        href="/diary/post-session"
        className="inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium px-4 py-2 transition-colors shrink-0"
      >
        Start Post-Session
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

const MIGRATION_FLAG = 'journalio_migration_v1_complete'

interface MigrationCounts {
  rules: number
  tradeComments: number
  strategies: number
  preSessions: number
  journals: number
}

async function migrateRules(): Promise<number> {
  try {
    const raw = localStorage.getItem('journalio_rules')
    if (!raw) return 0
    const rules: { id: string; text: string }[] = JSON.parse(raw)
    if (!Array.isArray(rules) || rules.length === 0) return 0

    let count = 0
    for (const rule of rules) {
      try {
        const res = await fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: rule.text }),
        })
        if (res.ok) count++
      } catch { /* skip */ }
    }
    return count
  } catch {
    return 0
  }
}

async function migrateTradeComments(): Promise<number> {
  try {
    const raw = localStorage.getItem('journalio_trade_comments')
    if (!raw) return 0
    const comments: any[] = JSON.parse(raw)
    if (!Array.isArray(comments) || comments.length === 0) return 0

    // Only migrate custom comments (not defaults — API seeds those)
    // Default IDs start with e1-e6, x1-x6, m1-m6
    const defaultIds = new Set([
      'e1', 'e2', 'e3', 'e4', 'e5', 'e6',
      'x1', 'x2', 'x3', 'x4', 'x5', 'x6',
      'm1', 'm2', 'm3', 'm4', 'm5', 'm6',
    ])
    const custom = comments.filter((c) => !defaultIds.has(c.id))
    if (custom.length === 0) return 0

    let count = 0
    for (const c of custom) {
      try {
        const res = await fetch('/api/trade-comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: c.category,
            label: c.label,
            rating: c.rating,
          }),
        })
        if (res.ok) count++
      } catch { /* skip */ }
    }
    return count
  } catch {
    return 0
  }
}

async function migrateStrategies(): Promise<number> {
  try {
    const raw = localStorage.getItem('journalio_strategies')
    if (!raw) return 0
    const strategies: any[] = JSON.parse(raw)
    if (!Array.isArray(strategies) || strategies.length === 0) return 0

    let count = 0
    for (const s of strategies) {
      try {
        const res = await fetch('/api/strategies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: s.name,
            description: s.description || '',
            color: s.color || '#10b981',
            icon: s.icon || '📋',
            ruleGroups: s.ruleGroups || [],
            isArchived: s.isArchived || false,
          }),
        })
        if (res.ok) count++
      } catch { /* skip */ }
    }
    return count
  } catch {
    return 0
  }
}

async function migratePreSessions(): Promise<number> {
  try {
    const raw = localStorage.getItem('journalio_pre_sessions')
    if (!raw) return 0
    const index: { date: string }[] = JSON.parse(raw)
    if (!Array.isArray(index) || index.length === 0) return 0

    let count = 0
    for (const summary of index) {
      try {
        const fullRaw = localStorage.getItem(`journalio_pre_session_${summary.date}`)
        if (!fullRaw) continue
        const full = JSON.parse(fullRaw)

        const res = await fetch('/api/pre-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: summary.date,
            time: full.time || '',
            energyLevel: full.energyLevel || 0,
            emotionalState: full.emotionalState || '',
            sessionIntent: full.sessionIntent || '',
            maxTrades: full.maxTrades || '',
            maxLoss: full.maxLoss || '',
            timeLimit: full.timeLimit || '',
            defaultPositionSize: full.defaultPositionSize || '',
            hasOpenPositions: full.hasOpenPositions ?? null,
            marketSentiment: full.marketSentiment || '',
            solTrend: full.solTrend || '',
            majorNews: full.majorNews ?? null,
            majorNewsNote: full.majorNewsNote || '',
            normalVolume: full.normalVolume ?? null,
            marketSnapshot: full.marketSnapshot || {},
            rulesChecked: full.rulesChecked || [],
            savedAt: full.savedAt || '',
          }),
        })
        if (res.ok) count++
      } catch { /* skip */ }
    }
    return count
  } catch {
    return 0
  }
}

async function migrateJournals(): Promise<number> {
  try {
    let count = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('journalio_journal_')) continue
      // Skip non-trade journal keys (like journalio_journal_view_mode)
      const parts = key.replace('journalio_journal_', '').split('_')
      if (parts.length < 3) continue

      try {
        const data = JSON.parse(localStorage.getItem(key)!)
        const tradeNumber = parseInt(parts.pop()!)
        const tokenMint = parts.pop()!
        const walletAddress = parts.join('_')

        if (isNaN(tradeNumber) || !tokenMint || !walletAddress) continue

        const res = await fetch('/api/journals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            tokenMint,
            tradeNumber,
            strategy: data.strategy || data.buyCategory || '',
            strategyId: data.strategyId || null,
            ruleResults: data.ruleResults || [],
            emotionalState: data.emotionalState || '',
            buyNotes: data.buyNotes || '',
            buyRating: data.buyRating || 0,
            exitPlan: data.exitPlan || '',
            sellRating: data.sellRating || 0,
            followedExitRule: data.followedExitRule ?? null,
            sellMistakes: data.sellMistakes || [],
            sellNotes: data.sellNotes || '',
            attachment: data.attachment || null,
            entryCommentId: data.entryCommentId || null,
            exitCommentId: data.exitCommentId || null,
            managementCommentId: data.managementCommentId || null,
            emotionTag: data.emotionTag || null,
            journaledAt: data.journaledAt || '',
          }),
        })
        if (res.ok) count++
      } catch { /* skip */ }
    }
    return count
  } catch {
    return 0
  }
}

export function LocalStorageMigration() {
  const [migrating, setMigrating] = useState(false)

  useEffect(() => {
    // Check if migration already done
    if (typeof window === 'undefined') return
    if (localStorage.getItem(MIGRATION_FLAG)) return

    // Check if there's anything to migrate
    const hasData =
      localStorage.getItem('journalio_rules') ||
      localStorage.getItem('journalio_trade_comments') ||
      localStorage.getItem('journalio_strategies') ||
      localStorage.getItem('journalio_pre_sessions') ||
      Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i))
        .some((k) => k?.startsWith('journalio_journal_'))

    if (!hasData) {
      // No data to migrate, mark as complete
      localStorage.setItem(MIGRATION_FLAG, new Date().toISOString())
      return
    }

    runMigration()
  }, [])

  async function runMigration() {
    setMigrating(true)

    const counts: MigrationCounts = {
      rules: 0,
      tradeComments: 0,
      strategies: 0,
      preSessions: 0,
      journals: 0,
    }

    try {
      counts.rules = await migrateRules()
      counts.tradeComments = await migrateTradeComments()
      counts.strategies = await migrateStrategies()
      counts.preSessions = await migratePreSessions()
      counts.journals = await migrateJournals()

      // Mark migration as complete
      localStorage.setItem(MIGRATION_FLAG, new Date().toISOString())

      const total = Object.values(counts).reduce((a, b) => a + b, 0)
      if (total > 0) {
        toast.success(
          `Migrated ${total} items to database (${counts.rules} rules, ${counts.strategies} strategies, ${counts.preSessions} pre-sessions, ${counts.journals} journals, ${counts.tradeComments} custom comments)`
        )
      }
    } catch (err) {
      console.error('Migration error:', err)
      toast.error('Some data failed to migrate. Try refreshing the page.')
    } finally {
      setMigrating(false)
    }
  }

  if (!migrating) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/90 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium">Migrating your data to the database...</p>
        <p className="text-xs text-muted-foreground">This only happens once</p>
      </div>
    </div>
  )
}

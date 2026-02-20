// Strategy data model and localStorage helpers
// Shared between strategies page, JournalModal, and analytics

import { safeLocalStorage } from './local-storage'

export interface StrategyRule {
  id: string
  text: string
  isRequired: boolean
  showWhen: 'always' | 'winner' | 'loser' | 'breakeven'
  sortOrder: number
}

export interface RuleGroup {
  id: string
  name: string
  rules: StrategyRule[]
  sortOrder: number
}

export interface Strategy {
  id: string
  name: string
  description: string
  color: string
  icon: string
  ruleGroups: RuleGroup[]
  isArchived: boolean
  createdAt: string
  updatedAt: string
}

// Legacy format for migration
interface LegacyStrategy {
  id: string
  name: string
  description: string
  entryConditions?: string[]
  exitConditions?: string[]
  stopLossConditions?: string[]
  active?: boolean
  createdAt: string
}

const STRATEGIES_KEY = 'journalio_strategies'

const PRESET_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
]

function migrateOldStrategy(old: LegacyStrategy): Strategy {
  const groups: RuleGroup[] = []
  const makeRules = (items: string[]): StrategyRule[] =>
    items.filter(Boolean).map((text, i) => ({
      id: crypto.randomUUID(),
      text,
      isRequired: true,
      showWhen: 'always' as const,
      sortOrder: i,
    }))

  if (old.entryConditions?.length) {
    groups.push({ id: crypto.randomUUID(), name: 'Entry Criteria', rules: makeRules(old.entryConditions), sortOrder: 0 })
  }
  if (old.exitConditions?.length) {
    groups.push({ id: crypto.randomUUID(), name: 'Exit Criteria', rules: makeRules(old.exitConditions), sortOrder: 1 })
  }
  if (old.stopLossConditions?.length) {
    groups.push({ id: crypto.randomUUID(), name: 'Stop Loss', rules: makeRules(old.stopLossConditions), sortOrder: 2 })
  }

  return {
    id: old.id,
    name: old.name,
    description: old.description || '',
    color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
    icon: '📋',
    ruleGroups: groups,
    isArchived: old.active === false,
    createdAt: old.createdAt,
    updatedAt: new Date().toISOString(),
  }
}

function isLegacyFormat(data: unknown[]): boolean {
  if (data.length === 0) return false
  const first = data[0] as Record<string, unknown>
  return 'entryConditions' in first && !('ruleGroups' in first)
}

export function loadStrategies(): Strategy[] {
  try {
    const raw = localStorage.getItem(STRATEGIES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    if (isLegacyFormat(parsed)) {
      const migrated = (parsed as LegacyStrategy[]).map(migrateOldStrategy)
      safeLocalStorage.setItem(STRATEGIES_KEY, migrated)
      return migrated
    }
    return parsed as Strategy[]
  } catch {
    return []
  }
}

export function saveStrategies(strategies: Strategy[]) {
  safeLocalStorage.setItem(STRATEGIES_KEY, strategies)
}

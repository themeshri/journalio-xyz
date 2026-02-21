// Strategy data model and API helpers
// Shared between strategies page, JournalModal, and analytics

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

export async function loadStrategies(includeArchived = true): Promise<Strategy[]> {
  try {
    const url = `/api/strategies${includeArchived ? '?includeArchived=true' : ''}`
    const res = await fetch(url)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function createStrategy(data: {
  name: string
  description?: string
  color?: string
  icon?: string
  ruleGroups?: RuleGroup[]
  isArchived?: boolean
}): Promise<Strategy | null> {
  try {
    const res = await fetch('/api/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function updateStrategy(
  id: string,
  data: Partial<{
    name: string
    description: string
    color: string
    icon: string
    ruleGroups: RuleGroup[]
    isArchived: boolean
  }>
): Promise<Strategy | null> {
  try {
    const res = await fetch(`/api/strategies/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function deleteStrategy(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/strategies/${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

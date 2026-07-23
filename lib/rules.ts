// Global rules types and async API helpers

import type { RuleType } from './rules-engine'

export interface GlobalRule {
  id: string
  text: string
  /** manual | time | percentage | currency | count — see lib/rules-engine.ts */
  type: RuleType
  /** Target the rule is measured against: "09:30", "100", "5". */
  condition: string
  isActive: boolean
  sortOrder: number
}

/** Per-type UI metadata for the rule editor. */
export const RULE_TYPE_META: Record<
  RuleType,
  { label: string; placeholder: string; hint: string; unit?: string }
> = {
  manual: {
    label: 'Manual check',
    placeholder: '',
    hint: 'You tick this off yourself in the pre-session checklist.',
  },
  time: {
    label: 'Start by time',
    placeholder: '09:30',
    hint: 'Followed when your first trade of the day is at or before this time.',
  },
  currency: {
    label: 'Max loss ($)',
    placeholder: '100',
    hint: 'Followed when no single trade loses more than this.',
    unit: '$',
  },
  percentage: {
    label: 'Playbook linkage (%)',
    placeholder: '100',
    hint: 'Followed when at least this share of trades is linked to a strategy.',
    unit: '%',
  },
  count: {
    label: 'Max trades / day',
    placeholder: '5',
    hint: 'Followed when you take no more than this many trades in a day.',
  },
}

export async function loadRules(): Promise<GlobalRule[]> {
  try {
    const res = await fetch('/api/rules')
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function createRule(
  text: string,
  opts: { type?: RuleType; condition?: string } = {}
): Promise<GlobalRule | null> {
  try {
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        type: opts.type ?? 'manual',
        condition: opts.condition ?? '',
      }),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function updateRule(
  id: string,
  data: Partial<{
    text: string
    type: RuleType
    condition: string
    isActive: boolean
    sortOrder: number
  }>
): Promise<GlobalRule | null> {
  try {
    const res = await fetch(`/api/rules/${id}`, {
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

export async function deleteRule(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/rules/${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

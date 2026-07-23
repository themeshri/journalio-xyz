// Trade tag types, defaults, and async API helpers.
//
// Two namespaces (`kind`), per docs/TRADEZELLA-JOURNAL-ANALYSIS.md §2:
//  - "mistake" — drives the "what is costing me money" report
//  - "custom"  — freeform user taxonomy
// Splitting these makes mistake-cost a first-class query rather than a text search.

export type TagKind = 'mistake' | 'custom'

export interface TradeTag {
  id: string
  label: string
  kind: TagKind
  color: string
  isArchived: boolean
  sortOrder: number
}

/**
 * Seeded for every user as `kind: "mistake"` tags.
 *
 * This list was previously hardcoded as `mistakeOptions` inside
 * components/JournalModal.tsx. It lives here so the backfill script and the UI
 * cannot drift apart. 'Other' is deliberately dropped — an untyped catch-all
 * defeats the point of a mistake namespace.
 */
export const DEFAULT_MISTAKE_TAGS: string[] = [
  'Entered too early',
  'Entered too late',
  'Position size too large',
  'Position size too small',
  "Didn't follow plan",
  'Emotional decision',
  'Ignored stop loss',
  'Held too long',
  'Sold too early',
  'Poor risk management',
  "Didn't do enough research",
  'Overtraded',
]

export async function loadTags(kind?: TagKind): Promise<TradeTag[]> {
  try {
    const qs = kind ? `?kind=${kind}` : ''
    const res = await fetch(`/api/tags${qs}`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function createTag(
  data: { label: string; kind: TagKind; color?: string }
): Promise<TradeTag | null> {
  try {
    const res = await fetch('/api/tags', {
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

export async function updateTag(
  id: string,
  data: Partial<{ label: string; color: string; isArchived: boolean; sortOrder: number }>
): Promise<TradeTag | null> {
  try {
    const res = await fetch(`/api/tags/${id}`, {
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

export async function deleteTag(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

export function getTagsByKind(tags: TradeTag[], kind: TagKind): TradeTag[] {
  return tags.filter((t) => t.kind === kind && !t.isArchived)
}

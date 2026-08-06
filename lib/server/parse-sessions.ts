/**
 * Row → API shape for the session models.
 *
 * These were copy-pasted between `app/api/pre-sessions/route.ts` and
 * `app/api/pre-sessions/[date]/route.ts`, which meant every new JSON column had
 * to be remembered in two places or one endpoint would silently return the raw
 * string. Extracted so there is one definition per model.
 */

import type { LimitKind } from '../session-framework'

/** Parse a JSON column, falling back to `fallback` on absent or corrupt data. */
function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Parse a JSON array column, yielding [] for absent, corrupt, or non-array data. */
export function safeParseArray<T = string>(raw: string | null | undefined): T[] {
  const parsed = safeParse<unknown>(raw, [])
  return Array.isArray(parsed) ? (parsed as T[]) : []
}

export function parsePreSession(s: any) {
  return {
    ...s,
    marketSnapshot: safeParse(s.marketSnapshotJson, {}),
    rulesChecked: safeParse(s.rulesCheckedJson, [] as string[]),
    watchlist: safeParse(s.watchlistJson, [] as unknown[]),
    sectors: safeParse(s.sectorsJson, [] as string[]),
    communities: safeParse(s.communitiesJson, [] as string[]),
    marketSnapshotJson: undefined,
    rulesCheckedJson: undefined,
    watchlistJson: undefined,
    sectorsJson: undefined,
    communitiesJson: undefined,
  }
}

export function parsePostSession(s: any) {
  return {
    ...s,
    limitsBreached: safeParse(s.limitsBreachedJson, [] as LimitKind[]),
    limitsBreachedJson: undefined,
  }
}

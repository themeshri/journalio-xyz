// Post-session types and async API helpers

import type { LimitKind } from './session-framework'

export interface PostSessionData {
  id?: string
  date: string
  rating: number
  emotionalState: string
  whatWentWell: string
  whatWentWrong: string
  keyLessons: string
  rulesFollowed: boolean | null
  rulesNotes: string
  planForTomorrow: string
  // ── Plan-vs-outcome (graded against the morning pre-session) ──
  followedPlan: boolean | null
  planDeviations: string
  /** Entries taken on FOMO rather than research (framework layer 4). */
  fomoEntries: number
  narrativeCallCorrect: boolean | null
  /** Prefilled from live trade data, then user-confirmed. */
  limitsBreached: LimitKind[]
  /** 1-10 process grade, deliberately separate from P/L; 0 = unset. */
  processRating: number
}

export const defaultPostSessionData: PostSessionData = {
  date: '',
  rating: 0,
  emotionalState: '',
  whatWentWell: '',
  whatWentWrong: '',
  keyLessons: '',
  rulesFollowed: null,
  rulesNotes: '',
  planForTomorrow: '',
  followedPlan: null,
  planDeviations: '',
  fomoEntries: 0,
  narrativeCallCorrect: null,
  limitsBreached: [],
  processRating: 0,
}

export async function loadPostSessions(from?: string, to?: string): Promise<PostSessionData[]> {
  try {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    const query = params.toString()
    const res = await fetch(`/api/post-sessions${query ? `?${query}` : ''}`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function loadPostSession(date: string): Promise<PostSessionData | null> {
  try {
    const res = await fetch(`/api/post-sessions/${date}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function savePostSession(data: PostSessionData): Promise<PostSessionData | null> {
  try {
    const res = await fetch('/api/post-sessions', {
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

// Journal types and async API helpers

import type { JournalData } from '@/lib/types/journal'

export type { JournalData }

export interface JournalRecord extends JournalData {
  id: string
  walletAddress: string
  tokenMint: string
  tradeNumber: number
  createdAt: string
  updatedAt: string
}

export async function loadJournals(walletAddress?: string): Promise<JournalRecord[]> {
  try {
    const params = walletAddress ? `?walletAddress=${encodeURIComponent(walletAddress)}` : ''
    const res = await fetch(`/api/journals${params}`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

/**
 * Server-side reason the last `saveJournal` call failed, or null when the last
 * call succeeded. Callers already branch on the `null` return, so this carries
 * the detail (e.g. "Validation error: buyRating: Too big...") without changing
 * that contract — a silent `null` used to be the only signal, which made a
 * plain 400 indistinguishable from a network drop.
 *
 * Read it immediately after an awaited `saveJournal` that returned null.
 */
let lastSaveError: string | null = null

export function getLastSaveJournalError(): string | null {
  return lastSaveError
}

export async function saveJournal(data: {
  walletAddress: string
  tokenMint: string
  tradeNumber: number
} & JournalData): Promise<JournalRecord | null> {
  lastSaveError = null
  try {
    const res = await fetch('/api/journals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      // The route returns { error } for both validation (400) and server (500)
      // failures; fall back to the status when the body isn't JSON.
      lastSaveError = await res
        .json()
        .then((b) => (typeof b?.error === 'string' ? b.error : null))
        .catch(() => null)
        ?? `Request failed (${res.status})`
      console.error('saveJournal failed:', lastSaveError)
      return null
    }
    return res.json()
  } catch (err) {
    lastSaveError = err instanceof Error ? err.message : 'Network error'
    console.error('saveJournal failed:', lastSaveError)
    return null
  }
}

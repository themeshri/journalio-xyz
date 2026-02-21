// Journal types and async API helpers

import type { JournalData } from '@/components/JournalModal'

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

export async function saveJournal(data: {
  walletAddress: string
  tokenMint: string
  tradeNumber: number
} & JournalData): Promise<JournalRecord | null> {
  try {
    const res = await fetch('/api/journals', {
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

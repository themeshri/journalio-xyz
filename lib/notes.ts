// Notes types and async API helpers

/**
 * Note folders, mirroring the structure in docs §2. "Trade Notes" hold notes
 * linked to a specific trade cycle and render a stat header.
 */
export type NoteFolder = 'trade-notes' | 'daily-journal' | 'sessions-recap' | 'my-notes'

export const NOTE_FOLDERS: { id: NoteFolder; label: string }[] = [
  { id: 'trade-notes', label: 'Trade Notes' },
  { id: 'daily-journal', label: 'Daily Journal' },
  { id: 'sessions-recap', label: 'Sessions Recap' },
  { id: 'my-notes', label: 'My Notes' },
]

export interface NoteData {
  id?: string
  title: string
  content: string
  tags: string[]
  folder?: NoteFolder
  favorite?: boolean
  /**
   * Trade linkage. Mirrors the JournalEntry composite key rather than a
   * synthetic id, because cycles are derived at read time (lib/tradeCycles.ts).
   */
  linkedWalletAddress?: string | null
  linkedTokenMint?: string | null
  linkedTradeNumber?: number | null
  createdAt?: string
  updatedAt?: string
}

/** True when the note points at a specific trade cycle. */
export function isTradeLinked(note: NoteData): boolean {
  return !!(note.linkedWalletAddress && note.linkedTokenMint && note.linkedTradeNumber != null)
}

export async function loadNotes(): Promise<NoteData[]> {
  try {
    const res = await fetch('/api/notes')
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function saveNote(data: NoteData): Promise<NoteData | null> {
  try {
    const res = await fetch('/api/notes', {
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

export async function updateNote(id: string, data: Partial<NoteData>): Promise<NoteData | null> {
  try {
    const res = await fetch(`/api/notes/${id}`, {
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

export async function deleteNote(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
    return res.ok
  } catch {
    return false
  }
}

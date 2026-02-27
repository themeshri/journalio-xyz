// Notes types and async API helpers

export interface NoteData {
  id?: string
  title: string
  content: string
  tags: string[]
  createdAt?: string
  updatedAt?: string
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

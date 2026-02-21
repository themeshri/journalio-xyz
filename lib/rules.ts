// Global rules types and async API helpers

export interface GlobalRule {
  id: string
  text: string
  sortOrder: number
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

export async function createRule(text: string): Promise<GlobalRule | null> {
  try {
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function updateRule(
  id: string,
  data: Partial<{ text: string; sortOrder: number }>
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

export interface TradeComment {
  id: string
  category: 'entry' | 'exit' | 'management'
  label: string
  rating: 'positive' | 'neutral' | 'negative'
  createdAt: string
}

const STORAGE_KEY = 'journalio_trade_comments'

export const DEFAULT_TRADE_COMMENTS: TradeComment[] = [
  // Entry — positive
  { id: 'e1', category: 'entry', label: 'Waited for confirmation', rating: 'positive', createdAt: '' },
  { id: 'e2', category: 'entry', label: 'Good risk/reward setup', rating: 'positive', createdAt: '' },
  // Entry — neutral
  { id: 'e3', category: 'entry', label: 'Followed the plan', rating: 'neutral', createdAt: '' },
  { id: 'e4', category: 'entry', label: 'Average entry', rating: 'neutral', createdAt: '' },
  // Entry — negative
  { id: 'e5', category: 'entry', label: 'FOMO entry', rating: 'negative', createdAt: '' },
  { id: 'e6', category: 'entry', label: 'Chased the pump', rating: 'negative', createdAt: '' },

  // Exit — positive
  { id: 'x1', category: 'exit', label: 'Hit take-profit target', rating: 'positive', createdAt: '' },
  { id: 'x2', category: 'exit', label: 'Scaled out properly', rating: 'positive', createdAt: '' },
  // Exit — neutral
  { id: 'x3', category: 'exit', label: 'Exited at breakeven', rating: 'neutral', createdAt: '' },
  { id: 'x4', category: 'exit', label: 'Partial exit', rating: 'neutral', createdAt: '' },
  // Exit — negative
  { id: 'x5', category: 'exit', label: 'Panic sold', rating: 'negative', createdAt: '' },
  { id: 'x6', category: 'exit', label: 'Held too long', rating: 'negative', createdAt: '' },

  // Management — positive
  { id: 'm1', category: 'management', label: 'Managed position size well', rating: 'positive', createdAt: '' },
  { id: 'm2', category: 'management', label: 'Moved stop to breakeven', rating: 'positive', createdAt: '' },
  // Management — neutral
  { id: 'm3', category: 'management', label: 'No adjustment needed', rating: 'neutral', createdAt: '' },
  { id: 'm4', category: 'management', label: 'Held through volatility', rating: 'neutral', createdAt: '' },
  // Management — negative
  { id: 'm5', category: 'management', label: 'Averaged down recklessly', rating: 'negative', createdAt: '' },
  { id: 'm6', category: 'management', label: 'Ignored stop loss', rating: 'negative', createdAt: '' },
]

export function loadTradeComments(): TradeComment[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  // Seed defaults on first load
  const seeded = DEFAULT_TRADE_COMMENTS.map((c) => ({
    ...c,
    createdAt: new Date().toISOString(),
  }))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
  return seeded
}

export function saveTradeComments(comments: TradeComment[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(comments))
}

export function getCommentsByCategory(
  comments: TradeComment[],
  category: TradeComment['category']
): TradeComment[] {
  return comments.filter((c) => c.category === category)
}

export function getCommentById(
  comments: TradeComment[],
  id: string
): TradeComment | undefined {
  return comments.find((c) => c.id === id)
}

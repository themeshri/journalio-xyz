export type TimePreset = '1d' | '7d' | '30d' | '90d' | 'all' | 'custom'

export interface TimeRange {
  startDate: number | null  // UNIX seconds
  endDate: number | null    // UNIX seconds
}

const PRESET_DAYS: Record<string, number> = {
  '1d': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

export function presetToRange(preset: TimePreset): TimeRange {
  if (preset === 'all' || preset === 'custom') return { startDate: null, endDate: null }
  const now = Math.floor(Date.now() / 1000)
  const days = PRESET_DAYS[preset]
  return { startDate: now - days * 86400, endDate: null }
}

export function filterTradesByRange<T extends { startDate: number }>(
  trades: T[],
  range: TimeRange,
): T[] {
  if (!range.startDate && !range.endDate) return trades
  return trades.filter((t) => {
    if (range.startDate && t.startDate < range.startDate) return false
    if (range.endDate && t.startDate > range.endDate) return false
    return true
  })
}

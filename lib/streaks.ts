/**
 * Journaling streak computation.
 *
 * Scans all `journalio_journal_*` localStorage keys, extracts `journaledAt`
 * timestamps, groups by date, and counts consecutive days backward from today.
 */

export interface StreakResult {
  current: number
  longest: number
}

/**
 * Compute journaling streak from localStorage journal entries.
 * Only entries with a `journaledAt` ISO timestamp are counted.
 */
export function computeJournalingStreak(): StreakResult {
  if (typeof window === 'undefined') return { current: 0, longest: 0 }

  // Collect all unique dates that have journal entries with journaledAt
  const dates = new Set<string>()

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !key.startsWith('journalio_journal_')) continue
    // Skip non-trade journal keys (like journalio_journal_view_mode)
    const parts = key.replace('journalio_journal_', '').split('_')
    if (parts.length < 3) continue

    try {
      const data = JSON.parse(localStorage.getItem(key)!)
      if (data?.journaledAt) {
        // Extract YYYY-MM-DD from the ISO timestamp
        const date = data.journaledAt.slice(0, 10)
        dates.add(date)
      }
    } catch { /* ignore */ }
  }

  if (dates.size === 0) return { current: 0, longest: 0 }

  // Sort dates descending
  const sortedDates = [...dates].sort().reverse()

  // Count current streak: consecutive days backward from today (or yesterday)
  const today = new Date()
  const todayStr = toDateStr(today)
  const yesterdayStr = toDateStr(new Date(today.getTime() - 86400000))

  let current = 0
  // Start from today or yesterday
  let checkDate: string
  if (sortedDates[0] === todayStr) {
    checkDate = todayStr
  } else if (sortedDates[0] === yesterdayStr) {
    checkDate = yesterdayStr
  } else {
    // Most recent journal is older than yesterday — streak is 0
    checkDate = ''
  }

  if (checkDate) {
    const dateSet = new Set(sortedDates)
    let d = new Date(checkDate + 'T00:00:00')
    while (dateSet.has(toDateStr(d))) {
      current++
      d = new Date(d.getTime() - 86400000)
    }
  }

  // Compute longest streak from all dates
  const allDatesAsc = [...dates].sort()
  let longest = 0
  let streak = 1
  for (let i = 1; i < allDatesAsc.length; i++) {
    const prev = new Date(allDatesAsc[i - 1] + 'T00:00:00')
    const curr = new Date(allDatesAsc[i] + 'T00:00:00')
    const diffDays = (curr.getTime() - prev.getTime()) / 86400000
    if (diffDays === 1) {
      streak++
    } else {
      longest = Math.max(longest, streak)
      streak = 1
    }
  }
  longest = Math.max(longest, streak, current)

  return { current, longest }
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

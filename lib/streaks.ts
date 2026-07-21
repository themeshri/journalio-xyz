/**
 * Journaling streak types.
 *
 * NOTE: The former `computeJournalingStreak()` (localStorage-based, pre-DB
 * migration) was removed as dead code — it had no callers. The live streak
 * computation now runs server-side from DB journal records; see
 * `computeStreakFromDates` (added in the refactor's Batch 2).
 */

export interface StreakResult {
  current: number
  longest: number
}

/**
 * Compute the journaling streak (current + longest) from a set of dates.
 *
 * Shared implementation for the server dashboard route and the client
 * dashboard context, which previously carried byte-for-byte copies.
 *
 * @param dateStrings  Any strings; only the first 10 chars (YYYY-MM-DD) are
 *                     used, so full ISO timestamps are accepted. Duplicates
 *                     and unsorted input are fine.
 * @param todayOverride  YYYY-MM-DD to treat as "today" (for testing / a fixed
 *                       clock). Defaults to the current UTC date.
 *
 * Behavior preserved from the originals:
 * - `current` counts consecutive days backward from today, or from yesterday
 *   if today has no entry (0 if the most recent entry is older than yesterday).
 * - `yesterday` is derived UTC-safely (anchored at `today` 12:00Z, minus one
 *   UTC day) — the more correct of the two original derivations.
 * - `longest` is the longest run of consecutive days across all dates, and is
 *   never less than `current`.
 */
export function computeStreakFromDates(
  dateStrings: string[],
  todayOverride?: string
): StreakResult {
  const dates = new Set<string>()
  for (const s of dateStrings) {
    if (s) dates.add(s.slice(0, 10))
  }
  if (dates.size === 0) return { current: 0, longest: 0 }

  const sortedDates = [...dates].sort().reverse()
  const today = todayOverride || new Date().toISOString().slice(0, 10)
  const yesterday = (() => {
    const d = new Date(today + 'T12:00:00Z')
    d.setUTCDate(d.getUTCDate() - 1)
    return d.toISOString().slice(0, 10)
  })()

  let current = 0
  let checkDate = ''
  if (sortedDates[0] === today) checkDate = today
  else if (sortedDates[0] === yesterday) checkDate = yesterday

  if (checkDate) {
    const dateSet = new Set(sortedDates)
    let day = new Date(checkDate + 'T00:00:00')
    while (dateSet.has(day.toISOString().slice(0, 10))) {
      current++
      day = new Date(day.getTime() - 86400000)
    }
  }

  const allDatesAsc = [...dates].sort()
  let longest = 0
  let streak = 1
  for (let i = 1; i < allDatesAsc.length; i++) {
    const prev = new Date(allDatesAsc[i - 1] + 'T00:00:00')
    const curr = new Date(allDatesAsc[i] + 'T00:00:00')
    if ((curr.getTime() - prev.getTime()) / 86400000 === 1) {
      streak++
    } else {
      longest = Math.max(longest, streak)
      streak = 1
    }
  }
  longest = Math.max(longest, streak, current)

  return { current, longest }
}

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

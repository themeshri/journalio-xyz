import { type TradeComment, getCommentById } from './trade-comments'
import { type JournalData } from '@/components/JournalModal'

export function ratingToScore(rating: TradeComment['rating']): number {
  if (rating === 'positive') return 1
  if (rating === 'negative') return -1
  return 0
}

export interface DisciplineResult {
  score: number
  percentage: number
  entryComment: TradeComment | undefined
  exitComment: TradeComment | undefined
  managementComment: TradeComment | undefined
}

export function computeTradeDiscipline(
  journal: JournalData | null,
  comments: TradeComment[]
): DisciplineResult | null {
  if (!journal) return null
  const { entryCommentId, exitCommentId, managementCommentId } = journal
  if (!entryCommentId && !exitCommentId && !managementCommentId) return null

  const entryComment = entryCommentId ? getCommentById(comments, entryCommentId) : undefined
  const exitComment = exitCommentId ? getCommentById(comments, exitCommentId) : undefined
  const managementComment = managementCommentId ? getCommentById(comments, managementCommentId) : undefined

  // Need at least one valid comment
  if (!entryComment && !exitComment && !managementComment) return null

  const score =
    (entryComment ? ratingToScore(entryComment.rating) : 0) +
    (exitComment ? ratingToScore(exitComment.rating) : 0) +
    (managementComment ? ratingToScore(managementComment.rating) : 0)

  // score ranges from -3 to +3, map to 0-100%
  const percentage = ((score + 3) / 6) * 100

  return { score, percentage, entryComment, exitComment, managementComment }
}

export interface RollingDisciplineResult {
  percentage: number
  color: 'red' | 'yellow' | 'gold'
}

export function computeRollingDiscipline(
  journals: (JournalData | null)[],
  comments: TradeComment[],
  windowSize = 5
): RollingDisciplineResult | null {
  const results = journals
    .map((j) => computeTradeDiscipline(j, comments))
    .filter((r): r is DisciplineResult => r !== null)

  if (results.length === 0) return null

  const window = results.slice(-windowSize)
  const avg = window.reduce((sum, r) => sum + r.percentage, 0) / window.length
  const color = disciplineColor(avg)

  return { percentage: avg, color }
}

export function disciplineColor(percentage: number): 'red' | 'yellow' | 'gold' {
  if (percentage <= 33) return 'red'
  if (percentage <= 66) return 'yellow'
  return 'gold'
}

export function disciplineBgClass(percentage: number): string {
  const c = disciplineColor(percentage)
  if (c === 'red') return 'bg-red-500'
  if (c === 'yellow') return 'bg-yellow-500'
  return 'bg-amber-500'
}

export function disciplineColorClass(percentage: number): string {
  const c = disciplineColor(percentage)
  if (c === 'red') return 'text-red-500'
  if (c === 'yellow') return 'text-yellow-500'
  return 'text-amber-500'
}

/**
 * Shared vocabulary for the four-layer trade research framework.
 *
 * The framework runs in two places at two granularities:
 *   - Pre-session (per trading day) asks it market-wide: which narratives are
 *     performing, which sectors have momentum, what setups are working.
 *   - JournalModal (per trade cycle) asks it per-asset, where a specific token
 *     actually exists to be evaluated.
 *
 * This module is the single source for both so the enums can never drift apart
 * — analytics groups on these string values, and a typo in one surface would
 * silently split a bucket.
 */

import type { PreSessionData } from './pre-sessions'

// ── Layer 1: Narrative lifecycle ──────────────────────────────────────────

/**
 * Where a story sits in its lifecycle. The framework's central claim is that
 * this matters as much as asset quality: a good project on an exhausted
 * narrative often underperforms a mediocre one on a fresh narrative.
 */
export type NarrativeStage = 'early' | 'discovery' | 'memed' | 'exhausted'

export interface EnumOption<T extends string> {
  value: T
  label: string
  /** One-line gloss shown under the label so the scale is self-explaining. */
  description: string
}

export const NARRATIVE_STAGES: EnumOption<NarrativeStage>[] = [
  {
    value: 'early',
    label: 'Early',
    description: 'Real trend forming; only builders and researchers have noticed',
  },
  {
    value: 'discovery',
    label: 'Discovery',
    description: 'A wider audience is finding it; attention is accelerating',
  },
  {
    value: 'memed',
    label: 'Memed',
    description: 'Widely known and diluted; derivatives and copies everywhere',
  },
  {
    value: 'exhausted',
    label: 'Exhausted',
    description: 'Attention is leaving; late buyers are the only bid',
  },
]

// ── Layer 4: Entry discipline ─────────────────────────────────────────────

/**
 * The honest reason for the entry. `fomo` exists as a first-class option
 * precisely because naming it is the point of layer 4 — the framework asks
 * whether research supports the entry or whether you are chasing a move that
 * already happened.
 */
export type EntryReason = 'research' | 'continuation' | 'fomo' | 'other'

export const ENTRY_REASONS: EnumOption<EntryReason>[] = [
  {
    value: 'research',
    label: 'Research',
    description: 'The thesis above supports this entry',
  },
  {
    value: 'continuation',
    label: 'Continuation',
    description: 'Adding to a move already validated by the plan',
  },
  {
    value: 'fomo',
    label: 'FOMO',
    description: 'Chasing a move that already happened',
  },
  { value: 'other', label: 'Other', description: 'Something else' },
]

export const NARRATIVE_STAGE_VALUES = NARRATIVE_STAGES.map((s) => s.value)
export const ENTRY_REASON_VALUES = ENTRY_REASONS.map((r) => r.value)

// ── Session limits ────────────────────────────────────────────────────────

/**
 * Pull a number out of a free-text limit field.
 *
 * `maxTrades` / `maxLoss` / `timeLimit` are String columns that have always
 * accepted prose ("3 trades", "$50", "2 hours"), and they hold real historical
 * data. Rather than migrate and risk rewriting it, enforcement parses
 * leniently: the first number wins, and anything unparseable returns null so
 * the caller skips that limit instead of guessing.
 *
 * Returns null for empty, non-numeric, negative, or non-finite input.
 */
export function parseLimit(value: string | null | undefined): number | null {
  if (!value) return null
  // First run of digits with optional decimal, ignoring currency symbols and
  // any trailing unit words.
  const match = value.match(/\d+(?:\.\d+)?/)
  if (!match) return null
  const n = parseFloat(match[0])
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export type LimitKind = 'trades' | 'loss' | 'time'

export interface LimitBreach {
  kind: LimitKind
  /** Human-readable, e.g. "3 of 3 trades used". */
  message: string
}

/**
 * Which of the day's self-imposed limits have been crossed.
 *
 * Advisory only — callers render a warning and never block. A limit that is
 * blank or unparseable is skipped silently rather than treated as zero, which
 * would otherwise make every session instantly "over limit".
 */
export function computeLimitBreaches(input: {
  maxTrades: string
  maxLoss: string
  timeLimit: string
  tradeCount: number
  /** Session P/L in USD; negative means a loss. */
  sessionPL: number
  /** Minutes elapsed since the pre-session was saved. */
  elapsedMinutes: number
}): LimitBreach[] {
  const breaches: LimitBreach[] = []

  const maxTrades = parseLimit(input.maxTrades)
  if (maxTrades !== null && input.tradeCount >= maxTrades) {
    breaches.push({
      kind: 'trades',
      message: `${input.tradeCount} of ${maxTrades} trades used`,
    })
  }

  const maxLoss = parseLimit(input.maxLoss)
  // maxLoss is entered as a positive magnitude ("50" = "stop at -$50").
  if (maxLoss !== null && input.sessionPL <= -maxLoss) {
    breaches.push({
      kind: 'loss',
      message: `Loss limit reached (${input.sessionPL.toFixed(2)} of -${maxLoss})`,
    })
  }

  const timeLimit = parseLimit(input.timeLimit)
  if (timeLimit !== null && input.elapsedMinutes >= timeLimit) {
    breaches.push({
      kind: 'time',
      message: `Time limit reached (${Math.floor(input.elapsedMinutes)} of ${timeLimit} min)`,
    })
  }

  return breaches
}

// ── Pre-session quality ───────────────────────────────────────────────────

/**
 * The seven things a complete pre-session answers. Kept as a list rather than
 * a count so the calendar tooltip can say "4/7 sections" and mean it.
 */
const QUALITY_CHECKS: { key: string; done: (s: PreSessionQualityInput) => boolean }[] = [
  { key: 'energy', done: (s) => (s.energyLevel ?? 0) > 0 },
  { key: 'mindset', done: (s) => Boolean(s.emotionalState) },
  { key: 'intent', done: (s) => Boolean(s.sessionIntent?.trim()) },
  {
    key: 'limits',
    done: (s) => Boolean(s.maxTrades || s.maxLoss || s.timeLimit),
  },
  { key: 'rules', done: (s) => (s.rulesChecked?.length ?? 0) > 0 },
  { key: 'narrative', done: (s) => Boolean(s.narrativeStage) },
  { key: 'conviction', done: (s) => (s.conviction ?? 0) > 0 },
]

/** The subset of a pre-session that quality scoring reads. */
export type PreSessionQualityInput = Partial<
  Pick<
    PreSessionData,
    | 'energyLevel'
    | 'emotionalState'
    | 'sessionIntent'
    | 'maxTrades'
    | 'maxLoss'
    | 'timeLimit'
    | 'rulesChecked'
    | 'narrativeStage'
    | 'conviction'
  >
>

export const PRE_SESSION_QUALITY_CHECK_COUNT = QUALITY_CHECKS.length

/** How many of the seven sections were actually filled in. */
export function countPreSessionSections(session: PreSessionQualityInput | null | undefined): number {
  if (!session) return 0
  return QUALITY_CHECKS.filter((c) => c.done(session)).length
}

/**
 * Completeness of a pre-session, 0-1.
 *
 * Drives the ActivityCalendar point so that a one-field save no longer scores
 * the same as a full framework run.
 */
export function computePreSessionQuality(
  session: PreSessionQualityInput | null | undefined
): number {
  if (!session) return 0
  return countPreSessionSections(session) / QUALITY_CHECKS.length
}

/** Completeness at or above which the calendar awards the pre-session point. */
export const PRE_SESSION_QUALITY_THRESHOLD = 0.6

// ── Watchlist ─────────────────────────────────────────────────────────────

/** One asset being stalked today, carrying its own layer-1 read. */
export interface WatchlistItem {
  symbol: string
  narrativeStage: NarrativeStage | ''
  thesis: string
  /** What would tell you the thesis is wrong. */
  invalidation: string
}

export const emptyWatchlistItem: WatchlistItem = {
  symbol: '',
  narrativeStage: '',
  thesis: '',
  invalidation: '',
}

/** A morning routine, not a research session — keep the list short. */
export const MAX_WATCHLIST_ITEMS = 5

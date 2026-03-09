import { z } from 'zod'
import { NextResponse } from 'next/server'

// Helper to validate request body against a Zod schema
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { data: T } | { error: NextResponse } {
  const result = schema.safeParse(body)
  if (!result.success) {
    const message = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
    return { error: NextResponse.json({ error: `Validation error: ${message}` }, { status: 400 }) }
  }
  return { data: result.data }
}

// ── Papered Plays ──
export const createPaperedPlaySchema = z.object({
  coinName: z.string().min(1, 'coinName is required'),
  contractAddr: z.string().nullish(),
  tokenMint: z.string().nullish(),
  tokenSymbol: z.string().nullish(),
  tokenImage: z.string().nullish(),
  mcWhenSaw: z.string().optional().default(''),
  ath: z.string().optional().default(''),
  reasonMissed: z.string().optional().default(''),
  howToNotMiss: z.string().nullish(),
  attachment: z.string().nullish(),
  entryPrice: z.number().nullish(),
  entryTime: z.string().nullish(),
  exitPrice: z.number().nullish(),
  exitTime: z.string().nullish(),
  hypotheticalPositionSize: z.number().nullish(),
  outcome: z.string().nullish(),
  potentialMultiplier: z.number().nullish(),
  potentialPnL: z.number().nullish(),
  peakMultiplier: z.number().nullish(),
  missReason: z.string().nullish(),
  strategyId: z.string().nullish(),
  rulesMetCount: z.number().int().min(0).nullish(),
  rulesTotalCount: z.number().int().min(0).nullish(),
  notes: z.string().optional().default(''),
})

export const updatePaperedPlaySchema = z.object({
  coinName: z.string().min(1).optional(),
  contractAddr: z.string().nullish(),
  tokenMint: z.string().nullish(),
  tokenSymbol: z.string().nullish(),
  tokenImage: z.string().nullish(),
  mcWhenSaw: z.string().nullish(),
  ath: z.string().nullish(),
  reasonMissed: z.string().nullish(),
  howToNotMiss: z.string().nullish(),
  attachment: z.string().nullish(),
  entryPrice: z.number().nullish(),
  entryTime: z.string().nullish(),
  exitPrice: z.number().nullish(),
  exitTime: z.string().nullish(),
  hypotheticalPositionSize: z.number().nullish(),
  outcome: z.string().nullish(),
  potentialMultiplier: z.number().nullish(),
  potentialPnL: z.number().nullish(),
  peakMultiplier: z.number().nullish(),
  missReason: z.string().nullish(),
  strategyId: z.string().nullish(),
  rulesMetCount: z.number().int().min(0).nullish(),
  rulesTotalCount: z.number().int().min(0).nullish(),
  notes: z.string().nullish(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided' })

// ── Journals ──
export const createJournalSchema = z.object({
  walletAddress: z.string().min(1, 'walletAddress is required'),
  tokenMint: z.string().min(1, 'tokenMint is required'),
  tradeNumber: z.number().int().min(0),
  strategy: z.string().optional().default(''),
  strategyId: z.string().nullish(),
  ruleResults: z.array(z.any()).optional().default([]),
  emotionalState: z.string().optional().default(''),
  buyNotes: z.string().optional().default(''),
  buyRating: z.number().int().min(0).max(5).optional().default(0),
  exitPlan: z.string().optional().default(''),
  sellRating: z.number().int().min(0).max(5).optional().default(0),
  followedExitRule: z.boolean().nullish(),
  sellMistakes: z.array(z.any()).optional().default([]),
  sellNotes: z.string().optional().default(''),
  attachment: z.string().nullish(),
  entryCommentId: z.string().nullish(),
  exitCommentId: z.string().nullish(),
  managementCommentId: z.string().nullish(),
  emotionTag: z.string().nullish(),
  stopLoss: z.number().nullish(),
  takeProfit: z.number().nullish(),
  tradeHigh: z.number().nullish(),
  tradeLow: z.number().nullish(),
  journaledAt: z.string().optional(),
})

// ── Notes ──
export const createNoteSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional().default(''),
  content: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
})

export const updateNoteSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

// ── Pre-Sessions ──
export const createPreSessionSchema = z.object({
  date: z.string().min(1, 'date is required'),
  time: z.string().optional().default(''),
  energyLevel: z.number().int().min(0).max(10).optional().default(0),
  emotionalState: z.string().optional().default(''),
  sessionIntent: z.string().optional().default(''),
  maxTrades: z.string().optional().default(''),
  maxLoss: z.string().optional().default(''),
  timeLimit: z.string().optional().default(''),
  defaultPositionSize: z.string().optional().default(''),
  hasOpenPositions: z.boolean().nullish(),
  marketSentiment: z.string().optional().default(''),
  solTrend: z.string().optional().default(''),
  majorNews: z.boolean().nullish(),
  majorNewsNote: z.string().optional().default(''),
  normalVolume: z.boolean().nullish(),
  marketSnapshot: z.record(z.string(), z.any()).optional().default({}),
  rulesChecked: z.array(z.any()).optional().default([]),
  savedAt: z.string().optional(),
})

// ── Post-Sessions ──
export const createPostSessionSchema = z.object({
  date: z.string().min(1, 'date is required'),
  rating: z.number().int().min(0).max(10).optional().default(0),
  emotionalState: z.string().optional().default(''),
  whatWentWell: z.string().optional().default(''),
  whatWentWrong: z.string().optional().default(''),
  keyLessons: z.string().optional().default(''),
  rulesFollowed: z.boolean().nullish(),
  rulesNotes: z.string().optional().default(''),
  planForTomorrow: z.string().optional().default(''),
})

// ── Trade Edits ──
export const createTradeEditSchema = z.object({
  tradeId: z.string().min(1, 'tradeId is required'),
  editedType: z.string().nullish(),
  editedAmountIn: z.number().nullish(),
  editedAmountOut: z.number().nullish(),
  editedValueUSD: z.number().nullish(),
  notes: z.string().nullish(),
})

// ── Manual Trades ──
const manualTradeSchema = z.object({
  walletAddress: z.string().min(1, 'walletAddress is required'),
  signature: z.string().min(1, 'signature is required'),
  timestamp: z.number().int(),
  chain: z.string().optional().default('solana'),
  type: z.string().optional().default('trade'),
  tokenIn: z.any().nullish(),
  tokenOut: z.any().nullish(),
  amountIn: z.number().optional().default(0),
  amountOut: z.number().optional().default(0),
  priceUSD: z.number().optional().default(0),
  valueUSD: z.number().optional().default(0),
  dex: z.string().optional().default('Manual'),
})

export const createManualTradesSchema = z.object({
  trades: z.array(manualTradeSchema).min(1, 'trades array must not be empty'),
})

// ── Strategies ──
export const createStrategySchema = z.object({
  name: z.string().min(1, 'name is required').transform(s => s.trim()),
  description: z.string().optional().default(''),
  color: z.string().optional().default('#10b981'),
  icon: z.string().optional().default('📋'),
  ruleGroups: z.array(z.any()).optional().default([]),
  isArchived: z.boolean().optional().default(false),
})

export const updateStrategySchema = z.object({
  name: z.string().min(1).transform(s => s.trim()).optional(),
  description: z.string().transform(s => s.trim()).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  ruleGroups: z.array(z.any()).optional(),
  isArchived: z.boolean().optional(),
})

// ── Rules ──
export const createRuleSchema = z.object({
  text: z.string().min(1, 'text is required').transform(s => s.trim()),
})

export const updateRuleSchema = z.object({
  text: z.string().min(1).transform(s => s.trim()).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

// ── Wallets ──
export const createWalletSchema = z.object({
  address: z.string().min(1, 'address is required'),
  nickname: z.string().nullish(),
  isDefault: z.boolean().optional().default(false),
  chain: z.string().optional().default('solana'),
  dex: z.string().optional().default('other'),
})

export const updateWalletSchema = z.object({
  nickname: z.string().nullish(),
  isDefault: z.boolean().optional(),
  dex: z.string().optional(),
})

// ── Trade Comments ──
export const createTradeCommentSchema = z.object({
  label: z.string().min(1, 'label is required').transform(s => s.trim()),
  category: z.enum(['entry', 'exit', 'management'], { message: 'category must be entry, exit, or management' }),
  rating: z.enum(['positive', 'neutral', 'negative'], { message: 'rating must be positive, neutral, or negative' }),
})

export const updateTradeCommentSchema = z.object({
  label: z.string().min(1).transform(s => s.trim()).optional(),
  rating: z.enum(['positive', 'neutral', 'negative']).optional(),
})

// ── Settings ──
export const updateSettingsSchema = z.object({
  displayName: z.string().optional(),
  transactionLimit: z.number().int().min(1).max(1000).optional(),
  showUSDValues: z.boolean().optional(),
  darkMode: z.boolean().optional(),
  timezone: z.string().optional(),
  tradingStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'tradingStartTime must be HH:mm format').optional(),
  onboardingStep: z.number().int().min(0).max(6).nullable().optional(),
})

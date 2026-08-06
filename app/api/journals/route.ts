import { validateBody, createJournalSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'

function parseJournal(j: any) {
  return {
    ...j,
    ruleResults: JSON.parse(j.ruleResultsJson || '[]'),
    sellMistakes: JSON.parse(j.sellMistakesJson || '[]'),
    // Flatten the join rows to plain ids when they were included.
    tagIds: Array.isArray(j.tags) ? j.tags.map((t: { tagId: string }) => t.tagId) : undefined,
    ruleResultsJson: undefined,
    sellMistakesJson: undefined,
    tags: undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')
    const strategyId = searchParams.get('strategyId')

    const where: Record<string, unknown> = { userId }
    if (walletAddress) where.walletAddress = walletAddress
    if (strategyId) where.strategyId = strategyId

    const journals = await prisma.journalEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { tags: { select: { tagId: true } } },
    })

    return NextResponse.json(journals.map(parseJournal))
  } catch (error) {
    return handleApiError(error, 'Failed to fetch journals')
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const body = await request.json()
    const validation = validateBody(createJournalSchema, body)
    if ('error' in validation) return validation.error
    const v = validation.data

    await ensureUserExists(userId, auth.email)

    const data = {
      strategy: v.strategy,
      strategyId: v.strategyId || null,
      ruleResultsJson: JSON.stringify(v.ruleResults),
      emotionalState: v.emotionalState,
      buyNotes: v.buyNotes,
      buyRating: v.buyRating,
      exitPlan: v.exitPlan,
      sellRating: v.sellRating,
      followedExitRule: v.followedExitRule ?? null,
      sellMistakesJson: JSON.stringify(v.sellMistakes),
      sellNotes: v.sellNotes,
      attachment: v.attachment || null,
      entryCommentId: v.entryCommentId || null,
      exitCommentId: v.exitCommentId || null,
      managementCommentId: v.managementCommentId || null,
      emotionTag: v.emotionTag || null,
      stopLoss: v.stopLoss ?? null,
      takeProfit: v.takeProfit ?? null,
      tradeHigh: v.tradeHigh ?? null,
      tradeLow: v.tradeLow ?? null,
      journaledAt: v.journaledAt || new Date().toISOString(),
      rMultiple: v.rMultiple ?? null,
      tradeRating: v.tradeRating ?? null,
      reviewed: v.reviewed ?? false,
      // Four-layer thesis scorecard (lib/session-framework.ts)
      narrativeStage: v.narrativeStage ?? null,
      narrativeThesis: v.narrativeThesis ?? null,
      fundTeam: v.fundTeam ?? null,
      fundUsage: v.fundUsage ?? null,
      fundTokenomics: v.fundTokenomics ?? null,
      riskToZero: v.riskToZero ?? null,
      riskSignal: v.riskSignal ?? null,
      entryReason: v.entryReason ?? null,
    }

    const journal = await prisma.journalEntry.upsert({
      where: {
        userId_walletAddress_tokenMint_tradeNumber: {
          userId,
          walletAddress: v.walletAddress,
          tokenMint: v.tokenMint,
          tradeNumber: v.tradeNumber,
        },
      },
      create: {
        userId,
        walletAddress: v.walletAddress,
        tokenMint: v.tokenMint,
        tradeNumber: v.tradeNumber,
        ...data,
      },
      update: data,
    })

    // Sync tag links when the client sends them. Omitting `tagIds` entirely
    // leaves existing links untouched, so older clients keep working.
    if (v.tagIds !== undefined) {
      // Only accept tags this user actually owns.
      const owned = await prisma.tradeTag.findMany({
        where: { userId, id: { in: v.tagIds } },
        select: { id: true },
      })
      const ownedIds = owned.map((t) => t.id)

      await prisma.journalEntryTag.deleteMany({
        where: { journalEntryId: journal.id, tagId: { notIn: ownedIds } },
      })
      if (ownedIds.length > 0) {
        await prisma.journalEntryTag.createMany({
          data: ownedIds.map((tagId) => ({ journalEntryId: journal.id, tagId })),
          skipDuplicates: true,
        })
      }
    }

    return NextResponse.json(parseJournal(journal), { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Failed to save journal')
  }
}

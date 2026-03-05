import { validateBody, createJournalSchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'

function parseJournal(j: any) {
  return {
    ...j,
    ruleResults: JSON.parse(j.ruleResultsJson || '[]'),
    sellMistakes: JSON.parse(j.sellMistakesJson || '[]'),
    ruleResultsJson: undefined,
    sellMistakesJson: undefined,
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
    })

    return NextResponse.json(journals.map(parseJournal))
  } catch (error) {
    console.error('Error fetching journals:', error)
    return NextResponse.json({ error: 'Failed to fetch journals' }, { status: 500 })
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

    return NextResponse.json(parseJournal(journal), { status: 201 })
  } catch (error) {
    console.error('Error saving journal:', error)
    return NextResponse.json({ error: 'Failed to save journal' }, { status: 500 })
  }
}

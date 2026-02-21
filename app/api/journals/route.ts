import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const defaultUserId = 'default-user'

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
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')
    const strategyId = searchParams.get('strategyId')

    const where: Record<string, unknown> = { userId: defaultUserId }
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
    const body = await request.json()

    if (!body.walletAddress || !body.tokenMint || body.tradeNumber === undefined) {
      return NextResponse.json(
        { error: 'walletAddress, tokenMint, and tradeNumber are required' },
        { status: 400 }
      )
    }

    await prisma.user.upsert({
      where: { id: defaultUserId },
      create: { id: defaultUserId, email: 'default@example.com', name: 'Default User' },
      update: {},
    })

    const data = {
      strategy: body.strategy || '',
      strategyId: body.strategyId || null,
      ruleResultsJson: JSON.stringify(body.ruleResults || []),
      emotionalState: body.emotionalState || '',
      buyNotes: body.buyNotes || '',
      buyRating: body.buyRating ?? 0,
      exitPlan: body.exitPlan || '',
      sellRating: body.sellRating ?? 0,
      followedExitRule: body.followedExitRule ?? null,
      sellMistakesJson: JSON.stringify(body.sellMistakes || []),
      sellNotes: body.sellNotes || '',
      attachment: body.attachment || null,
      entryCommentId: body.entryCommentId || null,
      exitCommentId: body.exitCommentId || null,
      managementCommentId: body.managementCommentId || null,
      emotionTag: body.emotionTag || null,
      journaledAt: body.journaledAt || new Date().toISOString(),
    }

    const journal = await prisma.journalEntry.upsert({
      where: {
        userId_walletAddress_tokenMint_tradeNumber: {
          userId: defaultUserId,
          walletAddress: body.walletAddress,
          tokenMint: body.tokenMint,
          tradeNumber: body.tradeNumber,
        },
      },
      create: {
        userId: defaultUserId,
        walletAddress: body.walletAddress,
        tokenMint: body.tokenMint,
        tradeNumber: body.tradeNumber,
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

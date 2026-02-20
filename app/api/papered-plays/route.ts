import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - List all papered plays with optional filtering
export async function GET(request: NextRequest) {
  try {
    const defaultUserId = 'default-user'
    const { searchParams } = new URL(request.url)

    // Build filter
    const where: Record<string, unknown> = { userId: defaultUserId }

    const missReason = searchParams.get('missReason')
    if (missReason) where.missReason = missReason

    const strategyId = searchParams.get('strategyId')
    if (strategyId) where.strategyId = strategyId

    const outcome = searchParams.get('outcome')
    if (outcome) where.outcome = outcome

    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
      }
    }

    const plays = await prisma.paperedPlay.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(plays)
  } catch (error) {
    console.error('Error fetching papered plays:', error)
    return NextResponse.json({ error: 'Failed to fetch papered plays' }, { status: 500 })
  }
}

// POST - Create a new papered play
export async function POST(request: NextRequest) {
  try {
    const defaultUserId = 'default-user'
    const body = await request.json()

    // coinName is required at minimum
    if (!body.coinName) {
      return NextResponse.json({ error: 'coinName is required' }, { status: 400 })
    }

    // Ensure default user exists
    await prisma.user.upsert({
      where: { id: defaultUserId },
      create: { id: defaultUserId, email: 'default@example.com', name: 'Default User' },
      update: {},
    })

    const play = await prisma.paperedPlay.create({
      data: {
        userId: defaultUserId,
        coinName: body.coinName.trim(),
        contractAddr: body.contractAddr?.trim() || null,
        tokenMint: body.tokenMint?.trim() || null,
        tokenSymbol: body.tokenSymbol?.trim() || null,
        tokenImage: body.tokenImage || null,
        mcWhenSaw: body.mcWhenSaw?.trim() || '',
        ath: body.ath?.trim() || '',
        reasonMissed: body.reasonMissed?.trim() || '',
        howToNotMiss: body.howToNotMiss?.trim() || null,
        attachment: body.attachment || null,
        entryPrice: body.entryPrice ?? null,
        entryTime: body.entryTime ? new Date(body.entryTime) : null,
        exitPrice: body.exitPrice ?? null,
        exitTime: body.exitTime ? new Date(body.exitTime) : null,
        hypotheticalPositionSize: body.hypotheticalPositionSize ?? null,
        outcome: body.outcome || null,
        potentialMultiplier: body.potentialMultiplier ?? null,
        potentialPnL: body.potentialPnL ?? null,
        peakMultiplier: body.peakMultiplier ?? null,
        missReason: body.missReason || null,
        strategyId: body.strategyId || null,
        rulesMetCount: body.rulesMetCount ?? null,
        rulesTotalCount: body.rulesTotalCount ?? null,
        notes: body.notes?.trim() || '',
      },
    })

    return NextResponse.json(play, { status: 201 })
  } catch (error) {
    console.error('Error creating papered play:', error)
    return NextResponse.json({ error: 'Failed to create papered play' }, { status: 500 })
  }
}

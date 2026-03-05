import { validateBody, createPaperedPlaySchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'

// GET - List all papered plays with optional filtering
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { searchParams } = new URL(request.url)

    // Build filter
    const where: Record<string, unknown> = { userId }

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
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const body = await request.json()
    const validation = validateBody(createPaperedPlaySchema, body)
    if ('error' in validation) return validation.error
    const v = validation.data

    // Ensure user exists
    await ensureUserExists(userId, auth.email)

    const play = await prisma.paperedPlay.create({
      data: {
        userId,
        coinName: v.coinName.trim(),
        contractAddr: v.contractAddr?.trim() || null,
        tokenMint: v.tokenMint?.trim() || null,
        tokenSymbol: v.tokenSymbol?.trim() || null,
        tokenImage: v.tokenImage || null,
        mcWhenSaw: v.mcWhenSaw,
        ath: v.ath,
        reasonMissed: v.reasonMissed,
        howToNotMiss: v.howToNotMiss || null,
        attachment: v.attachment || null,
        entryPrice: v.entryPrice ?? null,
        entryTime: v.entryTime ? new Date(v.entryTime) : null,
        exitPrice: v.exitPrice ?? null,
        exitTime: v.exitTime ? new Date(v.exitTime) : null,
        hypotheticalPositionSize: v.hypotheticalPositionSize ?? null,
        outcome: v.outcome || null,
        potentialMultiplier: v.potentialMultiplier ?? null,
        potentialPnL: v.potentialPnL ?? null,
        peakMultiplier: v.peakMultiplier ?? null,
        missReason: v.missReason || null,
        strategyId: v.strategyId || null,
        rulesMetCount: v.rulesMetCount ?? null,
        rulesTotalCount: v.rulesTotalCount ?? null,
        notes: v.notes,
      },
    })

    return NextResponse.json(play, { status: 201 })
  } catch (error) {
    console.error('Error creating papered play:', error)
    return NextResponse.json({ error: 'Failed to create papered play' }, { status: 500 })
  }
}

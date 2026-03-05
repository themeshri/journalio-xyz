import { validateBody, createPreSessionSchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'

function parsePreSession(s: any) {
  return {
    ...s,
    marketSnapshot: JSON.parse(s.marketSnapshotJson || '{}'),
    rulesChecked: JSON.parse(s.rulesCheckedJson || '[]'),
    marketSnapshotJson: undefined,
    rulesCheckedJson: undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: Record<string, unknown> = { userId }
    if (from || to) {
      where.date = {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      }
    }

    const sessions = await prisma.preSession.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(sessions.map(parsePreSession))
  } catch (error) {
    console.error('Error fetching pre-sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch pre-sessions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const validation = validateBody(createPreSessionSchema, body)
    if ('error' in validation) return validation.error
    const v = validation.data

    await ensureUserExists(userId, auth.email)

    const session = await prisma.preSession.upsert({
      where: {
        userId_date: { userId, date: v.date },
      },
      create: {
        userId,
        date: v.date,
        time: v.time,
        energyLevel: v.energyLevel,
        emotionalState: v.emotionalState,
        sessionIntent: v.sessionIntent,
        maxTrades: v.maxTrades,
        maxLoss: v.maxLoss,
        timeLimit: v.timeLimit,
        defaultPositionSize: v.defaultPositionSize,
        hasOpenPositions: v.hasOpenPositions ?? null,
        marketSentiment: v.marketSentiment,
        solTrend: v.solTrend,
        majorNews: v.majorNews ?? null,
        majorNewsNote: v.majorNewsNote,
        normalVolume: v.normalVolume ?? null,
        marketSnapshotJson: JSON.stringify(v.marketSnapshot),
        rulesCheckedJson: JSON.stringify(v.rulesChecked),
        savedAt: v.savedAt || new Date().toISOString(),
      },
      update: {
        time: v.time,
        energyLevel: v.energyLevel,
        emotionalState: v.emotionalState,
        sessionIntent: v.sessionIntent,
        maxTrades: v.maxTrades,
        maxLoss: v.maxLoss,
        timeLimit: v.timeLimit,
        defaultPositionSize: v.defaultPositionSize,
        hasOpenPositions: v.hasOpenPositions ?? null,
        marketSentiment: v.marketSentiment,
        solTrend: v.solTrend,
        majorNews: v.majorNews ?? null,
        majorNewsNote: v.majorNewsNote,
        normalVolume: v.normalVolume ?? null,
        marketSnapshotJson: JSON.stringify(v.marketSnapshot),
        rulesCheckedJson: JSON.stringify(v.rulesChecked),
        savedAt: v.savedAt || new Date().toISOString(),
      },
    })

    return NextResponse.json(parsePreSession(session), { status: 201 })
  } catch (error) {
    console.error('Error saving pre-session:', error)
    return NextResponse.json({ error: 'Failed to save pre-session' }, { status: 500 })
  }
}

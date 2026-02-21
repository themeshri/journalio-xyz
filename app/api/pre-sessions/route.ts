import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const defaultUserId = 'default-user'

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
    const { searchParams } = new URL(request.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const where: Record<string, unknown> = { userId: defaultUserId }
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

    if (!body.date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    await prisma.user.upsert({
      where: { id: defaultUserId },
      create: { id: defaultUserId, email: 'default@example.com', name: 'Default User' },
      update: {},
    })

    const session = await prisma.preSession.upsert({
      where: {
        userId_date: { userId: defaultUserId, date: body.date },
      },
      create: {
        userId: defaultUserId,
        date: body.date,
        time: body.time || '',
        energyLevel: body.energyLevel ?? 0,
        emotionalState: body.emotionalState || '',
        sessionIntent: body.sessionIntent || '',
        maxTrades: body.maxTrades || '',
        maxLoss: body.maxLoss || '',
        timeLimit: body.timeLimit || '',
        defaultPositionSize: body.defaultPositionSize || '',
        hasOpenPositions: body.hasOpenPositions ?? null,
        marketSentiment: body.marketSentiment || '',
        solTrend: body.solTrend || '',
        majorNews: body.majorNews ?? null,
        majorNewsNote: body.majorNewsNote || '',
        normalVolume: body.normalVolume ?? null,
        marketSnapshotJson: JSON.stringify(body.marketSnapshot || {}),
        rulesCheckedJson: JSON.stringify(body.rulesChecked || []),
        savedAt: body.savedAt || new Date().toISOString(),
      },
      update: {
        time: body.time || '',
        energyLevel: body.energyLevel ?? 0,
        emotionalState: body.emotionalState || '',
        sessionIntent: body.sessionIntent || '',
        maxTrades: body.maxTrades || '',
        maxLoss: body.maxLoss || '',
        timeLimit: body.timeLimit || '',
        defaultPositionSize: body.defaultPositionSize || '',
        hasOpenPositions: body.hasOpenPositions ?? null,
        marketSentiment: body.marketSentiment || '',
        solTrend: body.solTrend || '',
        majorNews: body.majorNews ?? null,
        majorNewsNote: body.majorNewsNote || '',
        normalVolume: body.normalVolume ?? null,
        marketSnapshotJson: JSON.stringify(body.marketSnapshot || {}),
        rulesCheckedJson: JSON.stringify(body.rulesChecked || []),
        savedAt: body.savedAt || new Date().toISOString(),
      },
    })

    return NextResponse.json(parsePreSession(session), { status: 201 })
  } catch (error) {
    console.error('Error saving pre-session:', error)
    return NextResponse.json({ error: 'Failed to save pre-session' }, { status: 500 })
  }
}

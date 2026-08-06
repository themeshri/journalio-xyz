import { validateBody, createPreSessionSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'
import { parsePreSession } from '@/lib/server/parse-sessions'

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
    return handleApiError(error, 'Failed to fetch pre-sessions')
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

    // Built once and spread into both branches — these were previously two
    // hand-maintained copies, so a new column could land in `create` and be
    // silently dropped on every subsequent update.
    const data = {
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
      narrativeStage: v.narrativeStage,
      narrativeNotes: v.narrativeNotes,
      conviction: v.conviction,
      setupsWorking: v.setupsWorking,
      planAdherenceIntent: v.planAdherenceIntent,
      watchlistJson: JSON.stringify(v.watchlist),
      sectorsJson: JSON.stringify(v.sectors),
      communitiesJson: JSON.stringify(v.communities),
      savedAt: v.savedAt || new Date().toISOString(),
    }

    const session = await prisma.preSession.upsert({
      where: {
        userId_date: { userId, date: v.date },
      },
      create: { userId, date: v.date, ...data },
      update: data,
    })

    return NextResponse.json(parsePreSession(session), { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Failed to save pre-session')
  }
}

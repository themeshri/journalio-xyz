import { validateBody, createPostSessionSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'
import { parsePostSession } from '@/lib/server/parse-sessions'

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

    const sessions = await prisma.postSession.findMany({
      where,
      orderBy: { date: 'desc' },
    })

    return NextResponse.json(sessions.map(parsePostSession))
  } catch (error) {
    return handleApiError(error, 'Failed to fetch post-sessions')
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const validation = validateBody(createPostSessionSchema, body)
    if ('error' in validation) return validation.error
    const v = validation.data

    await ensureUserExists(userId, auth.email)

    // One object spread into both branches — see the note in the pre-sessions
    // route; the two hand-maintained copies were a standing drift hazard.
    const data = {
      rating: v.rating,
      emotionalState: v.emotionalState,
      whatWentWell: v.whatWentWell,
      whatWentWrong: v.whatWentWrong,
      keyLessons: v.keyLessons,
      rulesFollowed: v.rulesFollowed ?? null,
      rulesNotes: v.rulesNotes,
      planForTomorrow: v.planForTomorrow,
      followedPlan: v.followedPlan ?? null,
      planDeviations: v.planDeviations,
      fomoEntries: v.fomoEntries,
      narrativeCallCorrect: v.narrativeCallCorrect ?? null,
      limitsBreachedJson: JSON.stringify(v.limitsBreached),
      processRating: v.processRating,
    }

    const session = await prisma.postSession.upsert({
      where: {
        userId_date: { userId, date: v.date },
      },
      create: { userId, date: v.date, ...data },
      update: data,
    })

    return NextResponse.json(parsePostSession(session), { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Failed to save post-session')
  }
}

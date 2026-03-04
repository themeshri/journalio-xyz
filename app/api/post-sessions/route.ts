import { validateBody, createPostSessionSchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
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

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Error fetching post-sessions:', error)
    return NextResponse.json({ error: 'Failed to fetch post-sessions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const validation = validateBody(createPostSessionSchema, body)
    if ('error' in validation) return validation.error
    const v = validation.data

    await ensureUserExists(userId, auth.email)

    const session = await prisma.postSession.upsert({
      where: {
        userId_date: { userId, date: v.date },
      },
      create: {
        userId,
        date: v.date,
        rating: v.rating,
        emotionalState: v.emotionalState,
        whatWentWell: v.whatWentWell,
        whatWentWrong: v.whatWentWrong,
        keyLessons: v.keyLessons,
        rulesFollowed: v.rulesFollowed ?? null,
        rulesNotes: v.rulesNotes,
        planForTomorrow: v.planForTomorrow,
      },
      update: {
        rating: v.rating,
        emotionalState: v.emotionalState,
        whatWentWell: v.whatWentWell,
        whatWentWrong: v.whatWentWrong,
        keyLessons: v.keyLessons,
        rulesFollowed: v.rulesFollowed ?? null,
        rulesNotes: v.rulesNotes,
        planForTomorrow: v.planForTomorrow,
      },
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('Error saving post-session:', error)
    return NextResponse.json({ error: 'Failed to save post-session' }, { status: 500 })
  }
}

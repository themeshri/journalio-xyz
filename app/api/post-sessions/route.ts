import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const defaultUserId = 'default-user'

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

    if (!body.date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    await prisma.user.upsert({
      where: { id: defaultUserId },
      create: { id: defaultUserId, email: 'default@example.com', name: 'Default User' },
      update: {},
    })

    const session = await prisma.postSession.upsert({
      where: {
        userId_date: { userId: defaultUserId, date: body.date },
      },
      create: {
        userId: defaultUserId,
        date: body.date,
        rating: body.rating ?? 0,
        emotionalState: body.emotionalState || '',
        whatWentWell: body.whatWentWell || '',
        whatWentWrong: body.whatWentWrong || '',
        keyLessons: body.keyLessons || '',
        rulesFollowed: body.rulesFollowed ?? null,
        rulesNotes: body.rulesNotes || '',
        planForTomorrow: body.planForTomorrow || '',
      },
      update: {
        rating: body.rating ?? 0,
        emotionalState: body.emotionalState || '',
        whatWentWell: body.whatWentWell || '',
        whatWentWrong: body.whatWentWrong || '',
        keyLessons: body.keyLessons || '',
        rulesFollowed: body.rulesFollowed ?? null,
        rulesNotes: body.rulesNotes || '',
        planForTomorrow: body.planForTomorrow || '',
      },
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('Error saving post-session:', error)
    return NextResponse.json({ error: 'Failed to save post-session' }, { status: 500 })
  }
}

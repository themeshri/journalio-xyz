import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - List all papered plays for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const plays = await prisma.paperedPlay.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
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
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { coinName, mcWhenSaw, ath, reasonMissed } = body

    if (!coinName || !mcWhenSaw || !ath || !reasonMissed) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const play = await prisma.paperedPlay.create({
      data: {
        userId: session.user.id,
        coinName: coinName.trim(),
        mcWhenSaw: mcWhenSaw.trim(),
        ath: ath.trim(),
        reasonMissed: reasonMissed.trim(),
      },
    })

    return NextResponse.json(play, { status: 201 })
  } catch (error) {
    console.error('Error creating papered play:', error)
    return NextResponse.json({ error: 'Failed to create papered play' }, { status: 500 })
  }
}

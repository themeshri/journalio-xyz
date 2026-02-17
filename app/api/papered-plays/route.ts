import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - List all papered plays for the current user
export async function GET(request: NextRequest) {
  try {
    // Use default user for all requests
    const defaultUserId = 'default-user'

    const plays = await prisma.paperedPlay.findMany({
      where: {
        userId: defaultUserId,
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
    // Use default user for all requests
    const defaultUserId = 'default-user'

    const body = await request.json()
    const { coinName, contractAddr, mcWhenSaw, ath, reasonMissed, howToNotMiss, attachment } = body

    if (!coinName || !mcWhenSaw || !ath || !reasonMissed) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Ensure default user exists
    await prisma.user.upsert({
      where: { id: defaultUserId },
      create: {
        id: defaultUserId,
        email: 'default@example.com',
        name: 'Default User'
      },
      update: {},
    })

    const play = await prisma.paperedPlay.create({
      data: {
        userId: defaultUserId,
        coinName: coinName.trim(),
        contractAddr: contractAddr?.trim() || null,
        mcWhenSaw: mcWhenSaw.trim(),
        ath: ath.trim(),
        reasonMissed: reasonMissed.trim(),
        howToNotMiss: howToNotMiss?.trim() || null,
        attachment: attachment || null,
      },
    })

    return NextResponse.json(play, { status: 201 })
  } catch (error) {
    console.error('Error creating papered play:', error)
    return NextResponse.json({ error: 'Failed to create papered play' }, { status: 500 })
  }
}

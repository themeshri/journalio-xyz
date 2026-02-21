import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_TRADE_COMMENTS } from '@/lib/trade-comments'

const defaultUserId = 'default-user'

export async function GET() {
  try {
    let comments = await prisma.tradeComment.findMany({
      where: { userId: defaultUserId },
      orderBy: { createdAt: 'asc' },
    })

    // Seed defaults if empty
    if (comments.length === 0) {
      await prisma.user.upsert({
        where: { id: defaultUserId },
        create: { id: defaultUserId, email: 'default@example.com', name: 'Default User' },
        update: {},
      })

      await prisma.tradeComment.createMany({
        data: DEFAULT_TRADE_COMMENTS.map((c) => ({
          userId: defaultUserId,
          category: c.category,
          label: c.label,
          rating: c.rating,
        })),
      })

      comments = await prisma.tradeComment.findMany({
        where: { userId: defaultUserId },
        orderBy: { createdAt: 'asc' },
      })
    }

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Error fetching trade comments:', error)
    return NextResponse.json({ error: 'Failed to fetch trade comments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.label?.trim()) {
      return NextResponse.json({ error: 'label is required' }, { status: 400 })
    }
    if (!body.category || !['entry', 'exit', 'management'].includes(body.category)) {
      return NextResponse.json({ error: 'valid category is required' }, { status: 400 })
    }
    if (!body.rating || !['positive', 'neutral', 'negative'].includes(body.rating)) {
      return NextResponse.json({ error: 'valid rating is required' }, { status: 400 })
    }

    await prisma.user.upsert({
      where: { id: defaultUserId },
      create: { id: defaultUserId, email: 'default@example.com', name: 'Default User' },
      update: {},
    })

    const comment = await prisma.tradeComment.create({
      data: {
        userId: defaultUserId,
        category: body.category,
        label: body.label.trim(),
        rating: body.rating,
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating trade comment:', error)
    return NextResponse.json({ error: 'Failed to create trade comment' }, { status: 500 })
  }
}

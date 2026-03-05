import { validateBody, createTradeCommentSchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_TRADE_COMMENTS } from '@/lib/trade-comments'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    let comments = await prisma.tradeComment.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    })

    // Seed defaults if empty
    if (comments.length === 0) {
      await ensureUserExists(userId, auth.email)

      await prisma.tradeComment.createMany({
        data: DEFAULT_TRADE_COMMENTS.map((c) => ({
          userId,
          category: c.category,
          label: c.label,
          rating: c.rating,
        })),
      })

      comments = await prisma.tradeComment.findMany({
        where: { userId },
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
    const validation = validateBody(createTradeCommentSchema, body)
    if ('error' in validation) return validation.error
    const v = validation.data

    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    await ensureUserExists(userId, auth.email)

    const comment = await prisma.tradeComment.create({
      data: {
        userId,
        category: v.category,
        label: v.label,
        rating: v.rating,
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating trade comment:', error)
    return NextResponse.json({ error: 'Failed to create trade comment' }, { status: 500 })
  }
}

import { validateBody, updateTradeCommentSchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helper'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { id } = await params
    const body = await request.json()
    const validation = validateBody(updateTradeCommentSchema, body)
    if ('error' in validation) return validation.error
    const v = validation.data

    const existing = await prisma.tradeComment.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const comment = await prisma.tradeComment.update({
      where: { id },
      data: {
        ...(v.label !== undefined ? { label: v.label } : {}),
        ...(v.rating !== undefined ? { rating: v.rating } : {}),
      },
    })

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Error updating trade comment:', error)
    return NextResponse.json({ error: 'Failed to update trade comment' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { id } = await params

    const existing = await prisma.tradeComment.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    await prisma.tradeComment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting trade comment:', error)
    return NextResponse.json({ error: 'Failed to delete trade comment' }, { status: 500 })
  }
}

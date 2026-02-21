import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const defaultUserId = 'default-user'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.tradeComment.findUnique({ where: { id } })
    if (!existing || existing.userId !== defaultUserId) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const comment = await prisma.tradeComment.update({
      where: { id },
      data: {
        ...(body.label !== undefined ? { label: body.label.trim() } : {}),
        ...(body.rating !== undefined ? { rating: body.rating } : {}),
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
    const { id } = await params

    const existing = await prisma.tradeComment.findUnique({ where: { id } })
    if (!existing || existing.userId !== defaultUserId) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    await prisma.tradeComment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting trade comment:', error)
    return NextResponse.json({ error: 'Failed to delete trade comment' }, { status: 500 })
  }
}

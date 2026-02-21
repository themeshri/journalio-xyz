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

    const existing = await prisma.globalRule.findUnique({ where: { id } })
    if (!existing || existing.userId !== defaultUserId) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    const rule = await prisma.globalRule.update({
      where: { id },
      data: {
        ...(body.text !== undefined ? { text: body.text.trim() } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      },
    })

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Error updating rule:', error)
    return NextResponse.json({ error: 'Failed to update rule' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.globalRule.findUnique({ where: { id } })
    if (!existing || existing.userId !== defaultUserId) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    await prisma.globalRule.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting rule:', error)
    return NextResponse.json({ error: 'Failed to delete rule' }, { status: 500 })
  }
}

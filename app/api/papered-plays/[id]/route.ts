import { validateBody, updatePaperedPlaySchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helper'

// DELETE - Delete a papered play
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { id } = await params

    const play = await prisma.paperedPlay.findUnique({ where: { id } })
    if (!play || play.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await prisma.paperedPlay.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting papered play:', error)
    return NextResponse.json({ error: 'Failed to delete papered play' }, { status: 500 })
  }
}

// PATCH - Update a papered play (supports all fields)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { id } = await params
    const body = await request.json()
    const validation = validateBody(updatePaperedPlaySchema, body)
    if ('error' in validation) return validation.error

    const play = await prisma.paperedPlay.findUnique({ where: { id } })
    if (!play || play.userId !== userId) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Build update data from all provided fields
    const data: Record<string, unknown> = {}

    // String fields
    const stringFields = ['coinName', 'contractAddr', 'tokenMint', 'tokenSymbol', 'tokenImage',
      'mcWhenSaw', 'ath', 'reasonMissed', 'howToNotMiss', 'attachment', 'outcome', 'missReason',
      'strategyId', 'notes']
    for (const field of stringFields) {
      if (field in body) {
        data[field] = body[field] != null ? String(body[field]).trim() : null
      }
    }

    // Float fields
    const floatFields = ['entryPrice', 'exitPrice', 'hypotheticalPositionSize',
      'potentialMultiplier', 'potentialPnL', 'peakMultiplier']
    for (const field of floatFields) {
      if (field in body) {
        data[field] = body[field] != null ? Number(body[field]) : null
      }
    }

    // Int fields
    const intFields = ['rulesMetCount', 'rulesTotalCount']
    for (const field of intFields) {
      if (field in body) {
        data[field] = body[field] != null ? Number(body[field]) : null
      }
    }

    // DateTime fields
    if ('entryTime' in body) data.entryTime = body.entryTime ? new Date(body.entryTime) : null
    if ('exitTime' in body) data.exitTime = body.exitTime ? new Date(body.exitTime) : null

    const updatedPlay = await prisma.paperedPlay.update({
      where: { id },
      data,
    })

    return NextResponse.json(updatedPlay)
  } catch (error) {
    console.error('Error updating papered play:', error)
    return NextResponse.json({ error: 'Failed to update papered play' }, { status: 500 })
  }
}

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

    // Build the update from validated data only — the schema has already
    // coerced/rejected bad types, so no NaN / Invalid Date can reach Prisma.
    const { entryTime, exitTime, ...rest } = validation.data
    const data: Record<string, unknown> = { ...rest }

    // DateTime fields arrive as validated (ISO) strings; convert to Date.
    if ('entryTime' in validation.data) {
      data.entryTime = entryTime ? new Date(entryTime) : null
    }
    if ('exitTime' in validation.data) {
      data.exitTime = exitTime ? new Date(exitTime) : null
    }

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

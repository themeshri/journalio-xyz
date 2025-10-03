import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// DELETE - Delete a papered play
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership before deleting
    const play = await prisma.paperedPlay.findUnique({
      where: { id },
    })

    if (!play) {
      return NextResponse.json({ error: 'Papered play not found' }, { status: 404 })
    }

    if (play.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.paperedPlay.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting papered play:', error)
    return NextResponse.json({ error: 'Failed to delete papered play' }, { status: 500 })
  }
}

// PATCH - Update a papered play
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { coinName, mcWhenSaw, ath, reasonMissed } = body

    // Verify ownership before updating
    const play = await prisma.paperedPlay.findUnique({
      where: { id },
    })

    if (!play) {
      return NextResponse.json({ error: 'Papered play not found' }, { status: 404 })
    }

    if (play.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updatedPlay = await prisma.paperedPlay.update({
      where: { id },
      data: {
        ...(coinName && { coinName: coinName.trim() }),
        ...(mcWhenSaw && { mcWhenSaw: mcWhenSaw.trim() }),
        ...(ath && { ath: ath.trim() }),
        ...(reasonMissed && { reasonMissed: reasonMissed.trim() }),
      },
    })

    return NextResponse.json(updatedPlay)
  } catch (error) {
    console.error('Error updating papered play:', error)
    return NextResponse.json({ error: 'Failed to update papered play' }, { status: 500 })
  }
}

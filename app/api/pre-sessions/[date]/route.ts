import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helper'

function parsePreSession(s: any) {
  return {
    ...s,
    marketSnapshot: JSON.parse(s.marketSnapshotJson || '{}'),
    rulesChecked: JSON.parse(s.rulesCheckedJson || '[]'),
    marketSnapshotJson: undefined,
    rulesCheckedJson: undefined,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { date } = await params
    const session = await prisma.preSession.findUnique({
      where: { userId_date: { userId, date } },
    })

    if (!session) {
      return NextResponse.json(null)
    }

    return NextResponse.json(parsePreSession(session))
  } catch (error) {
    console.error('Error fetching pre-session:', error)
    return NextResponse.json({ error: 'Failed to fetch pre-session' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { date } = await params

    const existing = await prisma.preSession.findUnique({
      where: { userId_date: { userId, date } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Pre-session not found' }, { status: 404 })
    }

    await prisma.preSession.delete({
      where: { userId_date: { userId, date } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting pre-session:', error)
    return NextResponse.json({ error: 'Failed to delete pre-session' }, { status: 500 })
  }
}

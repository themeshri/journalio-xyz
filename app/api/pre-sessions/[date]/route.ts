import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const defaultUserId = 'default-user'

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
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params
    const session = await prisma.preSession.findUnique({
      where: { userId_date: { userId: defaultUserId, date } },
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
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params

    const existing = await prisma.preSession.findUnique({
      where: { userId_date: { userId: defaultUserId, date } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Pre-session not found' }, { status: 404 })
    }

    await prisma.preSession.delete({
      where: { userId_date: { userId: defaultUserId, date } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting pre-session:', error)
    return NextResponse.json({ error: 'Failed to delete pre-session' }, { status: 500 })
  }
}

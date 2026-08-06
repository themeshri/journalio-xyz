import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helper'
import { parsePreSession } from '@/lib/server/parse-sessions'

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
    return handleApiError(error, 'Failed to fetch pre-session')
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
    return handleApiError(error, 'Failed to delete pre-session')
  }
}

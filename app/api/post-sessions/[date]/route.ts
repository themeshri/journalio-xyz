import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helper'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { date } = await params
    const session = await prisma.postSession.findUnique({
      where: { userId_date: { userId, date } },
    })

    if (!session) {
      return NextResponse.json(null)
    }

    return NextResponse.json(session)
  } catch (error) {
    return handleApiError(error, 'Failed to fetch post-session')
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
    await prisma.postSession.delete({
      where: { userId_date: { userId, date } },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error, 'Failed to delete post-session')
  }
}

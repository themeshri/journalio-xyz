import { NextRequest, NextResponse } from 'next/server'
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
    console.error('Error fetching post-session:', error)
    return NextResponse.json({ error: 'Failed to fetch post-session' }, { status: 500 })
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
    console.error('Error deleting post-session:', error)
    return NextResponse.json({ error: 'Failed to delete post-session' }, { status: 500 })
  }
}

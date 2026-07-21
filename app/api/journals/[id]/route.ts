import { NextRequest, NextResponse } from 'next/server'
import { handleApiError } from '@/lib/api-error'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helper'

function parseJournal(j: any) {
  return {
    ...j,
    ruleResults: JSON.parse(j.ruleResultsJson || '[]'),
    sellMistakes: JSON.parse(j.sellMistakesJson || '[]'),
    ruleResultsJson: undefined,
    sellMistakesJson: undefined,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const journal = await prisma.journalEntry.findUnique({ where: { id } })

    if (!journal || journal.userId !== userId) {
      return NextResponse.json({ error: 'Journal not found' }, { status: 404 })
    }

    return NextResponse.json(parseJournal(journal))
  } catch (error) {
    return handleApiError(error, 'Failed to fetch journal')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const existing = await prisma.journalEntry.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Journal not found' }, { status: 404 })
    }

    await prisma.journalEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Failed to delete journal')
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const defaultUserId = 'default-user'

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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const journal = await prisma.journalEntry.findUnique({ where: { id } })

    if (!journal || journal.userId !== defaultUserId) {
      return NextResponse.json({ error: 'Journal not found' }, { status: 404 })
    }

    return NextResponse.json(parseJournal(journal))
  } catch (error) {
    console.error('Error fetching journal:', error)
    return NextResponse.json({ error: 'Failed to fetch journal' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await prisma.journalEntry.findUnique({ where: { id } })
    if (!existing || existing.userId !== defaultUserId) {
      return NextResponse.json({ error: 'Journal not found' }, { status: 404 })
    }

    await prisma.journalEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting journal:', error)
    return NextResponse.json({ error: 'Failed to delete journal' }, { status: 500 })
  }
}

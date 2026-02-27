import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const defaultUserId = 'default-user'

function parseNote(n: any) {
  return {
    ...n,
    tags: JSON.parse(n.tagsJson || '[]'),
    tagsJson: undefined,
  }
}

export async function GET() {
  try {
    const notes = await prisma.note.findMany({
      where: { userId: defaultUserId },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json(notes.map(parseNote))
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    await prisma.user.upsert({
      where: { id: defaultUserId },
      create: { id: defaultUserId, email: 'default@example.com', name: 'Default User' },
      update: {},
    })

    // If id provided, update existing note
    if (body.id) {
      const note = await prisma.note.update({
        where: { id: body.id },
        data: {
          title: body.title || '',
          content: body.content || '',
          tagsJson: JSON.stringify(body.tags || []),
        },
      })
      return NextResponse.json(parseNote(note))
    }

    // Create new note
    const note = await prisma.note.create({
      data: {
        userId: defaultUserId,
        title: body.title || '',
        content: body.content || '',
        tagsJson: JSON.stringify(body.tags || []),
      },
    })
    return NextResponse.json(parseNote(note), { status: 201 })
  } catch (error) {
    console.error('Error saving note:', error)
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
  }
}

import { validateBody, createNoteSchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'

function parseNote(n: any) {
  return {
    ...n,
    tags: JSON.parse(n.tagsJson || '[]'),
    tagsJson: undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const notes = await prisma.note.findMany({
      where: { userId },
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
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const body = await request.json()
    const validation = validateBody(createNoteSchema, body)
    if ('error' in validation) return validation.error
    const v = validation.data

    await ensureUserExists(userId, auth.email)

    // If id provided, update existing note
    if (v.id) {
      const existing = await prisma.note.findUnique({ where: { id: v.id } })
      if (!existing || existing.userId !== userId) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }

      const note = await prisma.note.update({
        where: { id: v.id },
        data: {
          title: v.title,
          content: v.content,
          tagsJson: JSON.stringify(v.tags),
        },
      })
      return NextResponse.json(parseNote(note))
    }

    // Create new note
    const note = await prisma.note.create({
      data: {
        userId,
        title: v.title,
        content: v.content,
        tagsJson: JSON.stringify(v.tags),
      },
    })
    return NextResponse.json(parseNote(note), { status: 201 })
  } catch (error) {
    console.error('Error saving note:', error)
    return NextResponse.json({ error: 'Failed to save note' }, { status: 500 })
  }
}

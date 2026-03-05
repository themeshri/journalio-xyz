import { validateBody, updateNoteSchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helper'

function parseNote(n: any) {
  return {
    ...n,
    tags: JSON.parse(n.tagsJson || '[]'),
    tagsJson: undefined,
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { id } = await params
    const body = await request.json()
    const validation = validateBody(updateNoteSchema, body)
    if ('error' in validation) return validation.error

    const existing = await prisma.note.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const v = validation.data
    const note = await prisma.note.update({
      where: { id },
      data: {
        ...(v.title !== undefined && { title: v.title }),
        ...(v.content !== undefined && { content: v.content }),
        ...(v.tags !== undefined && { tagsJson: JSON.stringify(v.tags) }),
      },
    })
    return NextResponse.json(parseNote(note))
  } catch (error) {
    console.error('Error updating note:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { id } = await params

    const existing = await prisma.note.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.note.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting note:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}

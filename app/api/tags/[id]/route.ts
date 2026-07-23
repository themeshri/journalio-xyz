import { validateBody, updateTagSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helper'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validation = validateBody(updateTagSchema, body)
    if ('error' in validation) return validation.error
    const v = validation.data

    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    // 404 rather than 403 — see CLAUDE.md § Security (resource enumeration).
    const existing = await prisma.tradeTag.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    const tag = await prisma.tradeTag.update({
      where: { id },
      data: {
        ...(v.label !== undefined ? { label: v.label } : {}),
        ...(v.color !== undefined ? { color: v.color } : {}),
        ...(v.isArchived !== undefined ? { isArchived: v.isArchived } : {}),
        ...(v.sortOrder !== undefined ? { sortOrder: v.sortOrder } : {}),
      },
    })

    return NextResponse.json(tag)
  } catch (error) {
    return handleApiError(error, 'Failed to update tag')
  }
}

/**
 * Archives rather than deletes when the tag is already in use — hard-deleting
 * would cascade away the JournalEntryTag links and silently rewrite history in
 * the mistake-cost report. Unused tags are removed outright.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const existing = await prisma.tradeTag.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    const linkCount = await prisma.journalEntryTag.count({ where: { tagId: id } })

    if (linkCount > 0) {
      const tag = await prisma.tradeTag.update({
        where: { id },
        data: { isArchived: true },
      })
      return NextResponse.json({ success: true, archived: true, tag })
    }

    await prisma.tradeTag.delete({ where: { id } })
    return NextResponse.json({ success: true, archived: false })
  } catch (error) {
    return handleApiError(error, 'Failed to delete tag')
  }
}

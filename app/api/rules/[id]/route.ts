import { validateBody, updateRuleSchema } from '@/lib/validations'
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
    const validation = validateBody(updateRuleSchema, body)
    if ('error' in validation) return validation.error
    const v = validation.data

    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const existing = await prisma.globalRule.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    const rule = await prisma.globalRule.update({
      where: { id },
      data: {
        ...(v.text !== undefined ? { text: v.text } : {}),
        ...(v.sortOrder !== undefined ? { sortOrder: v.sortOrder } : {}),
      },
    })

    return NextResponse.json(rule)
  } catch (error) {
    return handleApiError(error, 'Failed to update rule')
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

    const existing = await prisma.globalRule.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 })
    }

    await prisma.globalRule.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error, 'Failed to delete rule')
  }
}

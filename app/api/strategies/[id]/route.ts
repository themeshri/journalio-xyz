import { validateBody, updateStrategySchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helper'

function parseStrategy(s: any) {
  return {
    ...s,
    ruleGroups: JSON.parse(s.ruleGroupsJson || '[]'),
    ruleGroupsJson: undefined,
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { id } = await params
    const strategy = await prisma.strategy.findUnique({ where: { id } })

    if (!strategy || strategy.userId !== userId) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    return NextResponse.json(parseStrategy(strategy))
  } catch (error) {
    console.error('Error fetching strategy:', error)
    return NextResponse.json({ error: 'Failed to fetch strategy' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { id } = await params
    const body = await request.json()
    const validation = validateBody(updateStrategySchema, body)
    if ('error' in validation) return validation.error
    const v = validation.data

    const existing = await prisma.strategy.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (v.name !== undefined) data.name = v.name
    if (v.description !== undefined) data.description = v.description
    if (v.color !== undefined) data.color = v.color
    if (v.icon !== undefined) data.icon = v.icon
    if (v.ruleGroups !== undefined) data.ruleGroupsJson = JSON.stringify(v.ruleGroups)
    if (v.isArchived !== undefined) data.isArchived = v.isArchived

    const strategy = await prisma.strategy.update({ where: { id }, data })
    return NextResponse.json(parseStrategy(strategy))
  } catch (error) {
    console.error('Error updating strategy:', error)
    return NextResponse.json({ error: 'Failed to update strategy' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { id } = await params

    const existing = await prisma.strategy.findUnique({ where: { id } })
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    await prisma.strategy.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting strategy:', error)
    return NextResponse.json({ error: 'Failed to delete strategy' }, { status: 500 })
  }
}

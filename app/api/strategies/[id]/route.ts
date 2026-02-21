import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const defaultUserId = 'default-user'

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
    const { id } = await params
    const strategy = await prisma.strategy.findUnique({ where: { id } })

    if (!strategy || strategy.userId !== defaultUserId) {
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
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.strategy.findUnique({ where: { id } })
    if (!existing || existing.userId !== defaultUserId) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name.trim()
    if (body.description !== undefined) data.description = body.description.trim()
    if (body.color !== undefined) data.color = body.color
    if (body.icon !== undefined) data.icon = body.icon
    if (body.ruleGroups !== undefined) data.ruleGroupsJson = JSON.stringify(body.ruleGroups)
    if (body.isArchived !== undefined) data.isArchived = body.isArchived

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
    const { id } = await params

    const existing = await prisma.strategy.findUnique({ where: { id } })
    if (!existing || existing.userId !== defaultUserId) {
      return NextResponse.json({ error: 'Strategy not found' }, { status: 404 })
    }

    await prisma.strategy.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting strategy:', error)
    return NextResponse.json({ error: 'Failed to delete strategy' }, { status: 500 })
  }
}

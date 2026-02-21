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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'

    const where: Record<string, unknown> = { userId: defaultUserId }
    if (!includeArchived) {
      where.isArchived = false
    }

    const strategies = await prisma.strategy.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(strategies.map(parseStrategy))
  } catch (error) {
    console.error('Error fetching strategies:', error)
    return NextResponse.json({ error: 'Failed to fetch strategies' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    await prisma.user.upsert({
      where: { id: defaultUserId },
      create: { id: defaultUserId, email: 'default@example.com', name: 'Default User' },
      update: {},
    })

    const strategy = await prisma.strategy.create({
      data: {
        userId: defaultUserId,
        name: body.name.trim(),
        description: body.description?.trim() || '',
        color: body.color || '#10b981',
        icon: body.icon || '📋',
        ruleGroupsJson: JSON.stringify(body.ruleGroups || []),
        isArchived: body.isArchived || false,
      },
    })

    return NextResponse.json(parseStrategy(strategy), { status: 201 })
  } catch (error) {
    console.error('Error creating strategy:', error)
    return NextResponse.json({ error: 'Failed to create strategy' }, { status: 500 })
  }
}

import { validateBody, createStrategySchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'

function parseStrategy(s: any) {
  return {
    ...s,
    ruleGroups: JSON.parse(s.ruleGroupsJson || '[]'),
    ruleGroupsJson: undefined,
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'

    // ?templates=true returns the shared, read-only template library rather
    // than this user's own strategies. Templates are owned by a system user.
    if (searchParams.get('templates') === 'true') {
      const templates = await prisma.strategy.findMany({
        where: { isTemplate: true },
        orderBy: { name: 'asc' },
      })
      return NextResponse.json(templates.map(parseStrategy))
    }

    const where: Record<string, unknown> = { userId, isTemplate: false }
    if (!includeArchived) {
      where.isArchived = false
    }

    const strategies = await prisma.strategy.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(strategies.map(parseStrategy))
  } catch (error) {
    return handleApiError(error, 'Failed to fetch strategies')
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const body = await request.json()
    const validation = validateBody(createStrategySchema, body)
    if ('error' in validation) return validation.error
    const v = validation.data

    await ensureUserExists(userId, auth.email)

    const strategy = await prisma.strategy.create({
      data: {
        userId,
        name: v.name,
        description: v.description,
        color: v.color,
        icon: v.icon,
        ruleGroupsJson: JSON.stringify(v.ruleGroups),
        isArchived: v.isArchived,
      },
    })

    return NextResponse.json(parseStrategy(strategy), { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Failed to create strategy')
  }
}

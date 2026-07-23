import { validateBody, createTagSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'
import { DEFAULT_MISTAKE_TAGS } from '@/lib/tags'

/**
 * GET /api/tags?kind=mistake
 *
 * Auto-seeds the default mistake tags on first read, mirroring how
 * /api/trade-comments seeds DEFAULT_TRADE_COMMENTS.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { searchParams } = new URL(request.url)
    const kind = searchParams.get('kind')

    let tags = await prisma.tradeTag.findMany({
      where: { userId },
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
    })

    if (tags.length === 0) {
      await ensureUserExists(userId, auth.email)
      await prisma.tradeTag.createMany({
        data: DEFAULT_MISTAKE_TAGS.map((label, i) => ({
          userId,
          label,
          kind: 'mistake',
          sortOrder: i,
        })),
        skipDuplicates: true,
      })
      tags = await prisma.tradeTag.findMany({
        where: { userId },
        orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
      })
    }

    // Filter after seeding so a ?kind=custom first-read still seeds mistakes.
    return NextResponse.json(kind ? tags.filter((t) => t.kind === kind) : tags)
  } catch (error) {
    return handleApiError(error, 'Failed to fetch tags')
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const body = await request.json()
    const validation = validateBody(createTagSchema, body)
    if ('error' in validation) return validation.error
    const v = validation.data

    await ensureUserExists(userId, auth.email)

    const maxSort = await prisma.tradeTag.findFirst({
      where: { userId, kind: v.kind },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    // Unique on (userId, label, kind): revive an archived tag rather than
    // erroring, so re-adding a previously deleted label just works.
    const tag = await prisma.tradeTag.upsert({
      where: { userId_label_kind: { userId, label: v.label, kind: v.kind } },
      update: { isArchived: false, color: v.color },
      create: {
        userId,
        label: v.label,
        kind: v.kind,
        color: v.color,
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      },
    })

    return NextResponse.json(tag, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Failed to create tag')
  }
}

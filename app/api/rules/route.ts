import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const defaultUserId = 'default-user'

export async function GET() {
  try {
    const rules = await prisma.globalRule.findMany({
      where: { userId: defaultUserId },
      orderBy: { sortOrder: 'asc' },
    })
    return NextResponse.json(rules)
  } catch (error) {
    console.error('Error fetching rules:', error)
    return NextResponse.json({ error: 'Failed to fetch rules' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.text?.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    await prisma.user.upsert({
      where: { id: defaultUserId },
      create: { id: defaultUserId, email: 'default@example.com', name: 'Default User' },
      update: {},
    })

    // Get the next sortOrder
    const maxSort = await prisma.globalRule.findFirst({
      where: { userId: defaultUserId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const rule = await prisma.globalRule.create({
      data: {
        userId: defaultUserId,
        text: body.text.trim(),
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      },
    })

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error('Error creating rule:', error)
    return NextResponse.json({ error: 'Failed to create rule' }, { status: 500 })
  }
}

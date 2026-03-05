import { validateBody, createTradeEditSchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth-helper'

// GET - Get trade edit for a specific trade
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { searchParams } = new URL(request.url)
    const tradeId = searchParams.get('tradeId')

    if (!tradeId) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 })
    }

    const edit = await prisma.tradeEdit.findUnique({
      where: {
        tradeId_userId: {
          tradeId,
          userId,
        },
      },
    })

    return NextResponse.json(edit || null)
  } catch (error) {
    console.error('Error fetching trade edit:', error)
    return NextResponse.json({ error: 'Failed to fetch trade edit' }, { status: 500 })
  }
}

// POST - Create or update trade edit
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const body = await request.json()
    const validation = validateBody(createTradeEditSchema, body)
    if ('error' in validation) return validation.error
    const { tradeId, editedType, editedAmountIn, editedAmountOut, editedValueUSD, notes } = validation.data

    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: { wallet: { select: { userId: true } } },
    })

    if (!trade || trade.wallet.userId !== userId) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    const edit = await prisma.tradeEdit.upsert({
      where: {
        tradeId_userId: {
          tradeId,
          userId,
        },
      },
      create: {
        tradeId,
        userId,
        editedType,
        editedAmountIn,
        editedAmountOut,
        editedValueUSD,
        notes,
      },
      update: {
        editedType,
        editedAmountIn,
        editedAmountOut,
        editedValueUSD,
        notes,
      },
    })

    return NextResponse.json(edit, { status: 201 })
  } catch (error) {
    console.error('Error saving trade edit:', error)
    return NextResponse.json({ error: 'Failed to save trade edit' }, { status: 500 })
  }
}

// DELETE - Delete trade edit
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { searchParams } = new URL(request.url)
    const tradeId = searchParams.get('tradeId')

    if (!tradeId) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 })
    }

    await prisma.tradeEdit.delete({
      where: {
        tradeId_userId: {
          tradeId,
          userId,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting trade edit:', error)
    return NextResponse.json({ error: 'Failed to delete trade edit' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - Get trade edit for a specific trade
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tradeId = searchParams.get('tradeId')

    if (!tradeId) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 })
    }

    const edit = await prisma.tradeEdit.findUnique({
      where: {
        tradeId_userId: {
          tradeId,
          userId: session.user.id,
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
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tradeId, editedType, editedAmountIn, editedAmountOut, editedValueUSD, notes } = body

    if (!tradeId) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 })
    }

    // Verify the trade exists
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
    })

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    // Upsert the edit
    const edit = await prisma.tradeEdit.upsert({
      where: {
        tradeId_userId: {
          tradeId,
          userId: session.user.id,
        },
      },
      create: {
        tradeId,
        userId: session.user.id,
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
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tradeId = searchParams.get('tradeId')

    if (!tradeId) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 })
    }

    await prisma.tradeEdit.delete({
      where: {
        tradeId_userId: {
          tradeId,
          userId: session.user.id,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting trade edit:', error)
    return NextResponse.json({ error: 'Failed to delete trade edit' }, { status: 500 })
  }
}

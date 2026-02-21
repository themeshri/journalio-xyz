import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const defaultUserId = 'default-user'

// DELETE - Delete a wallet
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const wallet = await prisma.wallet.findUnique({
      where: { id },
    })

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    if (wallet.userId !== defaultUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.wallet.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting wallet:', error)
    return NextResponse.json({ error: 'Failed to delete wallet' }, { status: 500 })
  }
}

// PATCH - Update wallet (nickname, default status, or dex)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nickname, isDefault, dex } = body

    const wallet = await prisma.wallet.findUnique({
      where: { id },
    })

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    if (wallet.userId !== defaultUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.wallet.updateMany({
        where: {
          userId: defaultUserId,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      })
    }

    const updatedWallet = await prisma.wallet.update({
      where: { id },
      data: {
        ...(nickname !== undefined && { nickname }),
        ...(isDefault !== undefined && { isDefault }),
        ...(dex !== undefined && { dex }),
      },
    })

    return NextResponse.json(updatedWallet)
  } catch (error) {
    console.error('Error updating wallet:', error)
    return NextResponse.json({ error: 'Failed to update wallet' }, { status: 500 })
  }
}

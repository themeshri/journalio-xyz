import { validateBody, updateWalletSchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'

// DELETE - Delete a wallet
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { id } = await params

    const wallet = await prisma.wallet.findUnique({
      where: { id },
    })

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    if (wallet.userId !== userId) {
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
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId

    const { id } = await params
    const body = await request.json()
    const validation = validateBody(updateWalletSchema, body)
    if ('error' in validation) return validation.error
    const { nickname, isDefault, dex } = validation.data

    const wallet = await prisma.wallet.findUnique({
      where: { id },
    })

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    if (wallet.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use transaction for default toggle to prevent race conditions
    const updatedWallet = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.wallet.updateMany({
          where: {
            userId: userId,
            isDefault: true,
            id: { not: id },
          },
          data: { isDefault: false },
        })
      }

      return tx.wallet.update({
        where: { id },
        data: {
          ...(nickname !== undefined && { nickname }),
          ...(isDefault !== undefined && { isDefault }),
          ...(dex !== undefined && { dex }),
        },
      })
    })

    return NextResponse.json(updatedWallet)
  } catch (error) {
    console.error('Error updating wallet:', error)
    return NextResponse.json({ error: 'Failed to update wallet' }, { status: 500 })
  }
}

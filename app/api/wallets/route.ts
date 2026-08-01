import { validateBody, createWalletSchema } from '@/lib/validations'
import { handleApiError } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'
import { type Chain, isValidAddress as isValidChainAddress } from '@/lib/chains'

// GET - List all wallets for the current user
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId
    await ensureUserExists(userId, auth.email, true)

    const wallets = await prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(wallets)
  } catch (error) {
    return handleApiError(error, 'Failed to fetch wallets')
  }
}

// POST - Add a new wallet
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId
    await ensureUserExists(userId, auth.email)

    const body = await request.json()
    const validation = validateBody(createWalletSchema, body)
    if ('error' in validation) return validation.error
    const { address, nickname, isDefault, chain, dex } = validation.data

    // `chain` is validated against the Chain union by createWalletSchema, so
    // the address pattern comes straight from CHAIN_CONFIG — no second
    // allowlist to drift out of sync with lib/chains.
    if (!isValidChainAddress(address, chain as Chain)) {
      return NextResponse.json({ error: `Invalid ${chain} wallet address` }, { status: 400 })
    }

    // Check if wallet already exists for this user
    const existing = await prisma.wallet.findUnique({
      where: {
        userId_address_chain: {
          userId: userId,
          address,
          chain,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'Wallet already added' }, { status: 400 })
    }

    // Use transaction to prevent race conditions with default toggle
    const wallet = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.wallet.updateMany({
          where: { userId: userId, isDefault: true },
          data: { isDefault: false },
        })
      }

      return tx.wallet.create({
        data: {
          userId: userId,
          address,
          chain,
          dex,
          nickname: nickname || null,
          isDefault: isDefault || false,
        },
      })
    })

    return NextResponse.json(wallet, { status: 201 })
  } catch (error) {
    return handleApiError(error, 'Failed to create wallet')
  }
}

import { validateBody, createWalletSchema } from '@/lib/validations'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, ensureUserExists } from '@/lib/auth-helper'

// GET - List all wallets for the current user
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth
    const userId = auth.userId
    await ensureUserExists(userId, auth.email)

    const wallets = await prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(wallets)
  } catch (error) {
    console.error('Error fetching wallets:', error)
    return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 })
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

    // Validate wallet address format based on chain
    const isValidAddress = (addr: string, chainType: string): boolean => {
      switch (chainType.toLowerCase()) {
        case 'ethereum':
        case 'polygon':
        case 'arbitrum':
        case 'optimism':
        case 'base':
        case 'avalanche':
        case 'bsc':
          return /^0x[a-fA-F0-9]{40}$/.test(addr)
        case 'solana':
          return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)
        case 'bitcoin':
          return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(addr)
        default:
          return /^0x[a-fA-F0-9]{40}$/.test(addr)
      }
    }

    if (!isValidAddress(address, chain)) {
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
    console.error('Error creating wallet:', error)
    return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 })
  }
}
